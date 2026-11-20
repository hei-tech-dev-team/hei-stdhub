/**
 * Guarantees that permission decisions rely on the database role, not on a
 * possibly stale or client-influenced JWT payload.
 *
 * Existing `verifyAccessToken` already reloads `role` (and `ref`, `pseudo`,
 * `ues`, `token_version`) from `users` on every verification and overwrites
 * the decoded JWT payload. This module makes that contract explicit and
 * provides helpers to use in routes / middleware.
 */

const { verifyAccessToken } = require("./tokenAuth");

/**
 * Standard authentication middleware for routes that need a valid user.
 *
 * It reuses the existing contract where role is loaded from the database and
 * never trusted from the JWT alone.
 */
function auth(req, res, next) {
  return require("../middleware/auth")(req, res, next);
}

/**
 * Returns true when `req.user` was built through the DB-authoritative path.
 *
 * Used as a safety net during the RBAC migration. If a route somehow receives
 * a user object that did not come from `verifyAccessToken`, the permission
 * layer still works because role is taken from `req.user.role`, but this
 * helper lets us audit / fail fast in tests.
 */
function isDbAuthoritativeUser(user) {
  if (!user || typeof user !== "object") return false;
  // verifyAccessToken always overwrites these fields from the DB row.
  return (
    typeof user.id === "number" &&
    typeof user.role === "string" &&
    typeof user.ref === "string" &&
    typeof user.pseudo === "string"
  );
}

/**
 * Lightweight wrapper around `verifyAccessToken` for places that need to
 * verify a token manually (for example, optional auth or delayed lookups).
 *
 * Role, ref, pseudo and ues are always returned from the database.
 */
async function verifyToken(token) {
  return verifyAccessToken(token);
}

module.exports = { auth, isDbAuthoritativeUser, verifyToken };
