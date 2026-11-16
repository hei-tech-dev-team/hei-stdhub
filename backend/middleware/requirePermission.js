/**
 * Centralized RBAC middleware for Express routes.
 *
 * Uses the shared permission model from `shared/permissions.js` so backend
 * and frontend share one `can()` implementation.
 *
 * Convention respectee : reponse 403 uniforme au format de l'API existant
 * (`res.status(403).json({ error: "forbidden" })`).
 */

const { can, canOwn, canModerateCommentOnOwnPost } = require("../../shared/permissions");

/**
 * Express middleware factory.
 *
 * @param {string}  action    e.g. "post:edit", "user:manage",
 *                            "system:purgeGlobalMessages"
 * @param {string}  resource  Targeted resource, e.g. "post", "comment",
 *                            "message", "user".
 * @param {Function} [getContext] Optional context passed to the
 *                            ownership / moderation helpers. Receives `(req)`
 *                            and may be synchronous or asynchronous (the
 *                            ownership context is usually resolved from the
 *                            database). Returns an object (or null/undefined).
 *
 *                            Common patterns :
 *                            - ownership : async () => ({ ownerId: <target author id>, userId: req.user.id })
 *                            - post-author moderation :
 *                              () => ({ postAuthorId: <post author id>, userId: req.user.id })
 * @param {Object}  [options]
 * @param {Function} [options.when] Predicate `(req) => boolean`. When it
 *                            returns false the guard is skipped (used for
 *                            body-dependent permissions such as announcement
 *                            creation on POST /posts).
 *
 * @returns {Function} Express middleware exposing an inspectable static
 *                            `requiredPermission` marker so route audit tests
 *                            can read the declared permission without
 *                            invoking the middleware.
 */
function requirePermission(action, resource, getContext, options = {}) {
  if (typeof action !== "string") {
    throw new TypeError("requirePermission: action must be a string");
  }
  if (typeof resource !== "string") {
    throw new TypeError("requirePermission: resource must be a string");
  }
  if (getContext != null && typeof getContext !== "function") {
    throw new TypeError("requirePermission: getContext must be a function");
  }
  const when = options.when;
  if (when != null && typeof when !== "function") {
    throw new TypeError("requirePermission: options.when must be a function");
  }

  async function permissionMiddleware(req, res, next) {
    // Marqueur inspectable pour la traçabilité (utilisé par les tests
    // d'audit de couverture des routes par rôle).
    req.requiredPermission = { action, resource, getContext };

    let allowed;
    try {
      if (when && !when(req)) {
        // Conditional guard not applicable to this request.
        allowed = true;
      } else {
        const user = req.user;
        const context = getContext ? await getContext(req) : undefined;
        allowed =
          canOwn(user, action, resource, context) ||
          canModerateCommentOnOwnPost(user, action, resource, context) ||
          can(user, action, resource, context);
      }
    } catch (err) {
      // Context resolution failed (e.g. database error): never fall through
      // to an authorization decision, report a server error instead.
      console.error(
        `[requirePermission] ${action}:${resource} context resolution failed:`,
        err.message,
      );
      return res.status(500).json({ error: "Erreur serveur." });
    }

    if (allowed) return next();
    return res.status(403).json({ error: "forbidden" });
  }

  // Static marker: lets route audit tests inspect the declared permission
  // from the router stack without invoking the middleware.
  permissionMiddleware.requiredPermission = {
    action,
    resource,
    hasContext: Boolean(getContext),
    conditional: Boolean(when),
  };

  return permissionMiddleware;
}

module.exports = requirePermission;
