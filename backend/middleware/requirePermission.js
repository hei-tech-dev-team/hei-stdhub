/**
 * Centralized RBAC middleware for Express routes.
 *
 * Uses the shared permission model from `lib/permissions.js` so backend and
 * frontend share one `can()` implementation.
 *
 * Convention respectee : reponse 403 uniforme au format de l'API existant
 * (`res.status(403).json({ error: "forbidden" })`).
 */

const { can, canOwn, canModerateCommentOnOwnPost } = require("../lib/permissions");

/**
 * Express middleware factory.
 *
 * @param {string}  action    e.g. "post:edit", "user:delete",
 *                            "system:purgeGlobalMessages"
 * @param {string}  resource  Targeted resource, e.g. "post", "comment",
 *                            "message", "user".
 * @param {Function} [getContext] Optional resolved context passed to the
 *                            ownership / moderation helpers. Receives `(req)`
 *                            and must return an object (or null/undefined).
 *
 *                            Common patterns :
 *                            - ownership : () => ({ ownerId: <target author id>, userId: req.user.id })
 *                            - post-author moderation :
 *                              () => ({ postAuthorId: <post author id>, userId: req.user.id })
 */
function requirePermission(action, resource, getContext) {
  if (typeof action !== "string") {
    throw new TypeError("requirePermission: action must be a string");
  }
  if (typeof resource !== "string") {
    throw new TypeError("requirePermission: resource must be a string");
  }

  return function permissionMiddleware(req, res, next) {
    // Marqueur inspectable pour la traçabilité (utilisé par les tests
    // d'audit de couverture des routes par rôle).
    req.requiredPermission = { action, resource, getContext };

    const user = req.user;
    const context = getContext ? getContext(req) : undefined;

    if (canOwn(user, action, resource, context)) {
      return next();
    }
    if (canModerateCommentOnOwnPost(user, action, resource, context)) {
      return next();
    }
    if (can(user, action, resource, context)) {
      return next();
    }

    return res.status(403).json({ error: "forbidden" });
  };
}

module.exports = requirePermission;
