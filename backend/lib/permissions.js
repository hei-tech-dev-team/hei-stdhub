/**
 * Central RBAC model shared by backend (Express middleware) and frontend
 * (React display conditions).
 *
 * Conventions: CommonJS, JS vanilla, 2-space indent, double quotes,
 * deny-by-default, no external dependencies.
 */

// Strict hierarchy: developer > admin > (bde | teacher) > student.
// Ordering of keys is meaningless; decisions use explicit ranks.
const ROLE_RANK = {
  student: 0,
  teacher: 1,
  bde: 1,
  admin: 2,
  developer: 3,
};

// Known roles. An unknown role resolves to false (deny by default).
const KNOWN_ROLES = Object.keys(ROLE_RANK);

// Explicit permissions, sourced from existing routes (`routes/*`) and
// existing middlewares (`developerOnly`, `developerOrAdmin`, inline `adminOnly`).
// These old middlewares are no longer used as route guards; the note remains as
// historical provenance only. Do not edit it away without updating the rest of
// the file accordingly.
const ACTIONS = new Map();

// ---------------------------------------------------------------------------
// Definition helpers
// ---------------------------------------------------------------------------

/**
 * Allow all roles at or above `minRoleName`.
 */
function addMinRole(actionKey, minRoleName) {
  ACTIONS.set(actionKey, { mode: "minRole", minRoleName });
}

/**
 * Allow only the listed roles.
 */
function addRoles(actionKey, roleList) {
  ACTIONS.set(actionKey, { mode: "roles", roles: new Set(roleList) });
}

// User-generated content (ownership: author_id === user.id).

// message
addMinRole("message:send", "student");
addMinRole("message:read", "student");
addMinRole("message:seen", "student");
addMinRole("message:unread", "student");
addMinRole("message:react", "student");
addMinRole("message:delete", "student"); // ownership checked by caller
addMinRole("message:attachment", "student");
addMinRole("message:favorites", "student");

// shared permissions for bde and teacher (both above student, and both below admin)
addRoles("message:send", ["student", "teacher", "bde", "admin", "developer"]);
addRoles("message:read", ["student", "teacher", "bde", "admin", "developer"]);
addRoles("message:seen", ["student", "teacher", "bde", "admin", "developer"]);

// comment (attached to a post)
addMinRole("comment:create", "student");
addMinRole("comment:read", "student");
addMinRole("comment:edit", "student"); // ownership checked by caller
addMinRole("comment:delete", "student"); // ownership checked by caller

// support ticket (any authenticated user can create)
addMinRole("supportTicket:create", "student");
addRoles("supportTicket:read", ["developer", "admin"]);
addRoles("supportTicket:update", ["developer", "admin"]);
addRoles("supportTicket:respond", ["developer", "admin"]);
addRoles("supportTicket:delete", ["developer", "admin"]);

// bug report (any authenticated user can create)
addMinRole("bugReport:create", "student");
addRoles("bugReport:read", ["developer", "admin"]);
addRoles("bugReport:update", ["developer", "admin"]);
addRoles("bugReport:delete", ["developer", "admin"]);

// suggestion
addRoles("suggestion:create", ["student", "teacher", "admin"]);
addRoles("suggestion:read", ["teacher", "admin"]);
addRoles("suggestion:vote", ["teacher", "admin"]);
addRoles("suggestion:review", ["bde"]); // change status / add justification
addRoles("suggestion:confirm", ["bde"]);
addRoles("suggestion:report", ["bde"]);

// ping
addMinRole("ping:send", "student");
addMinRole("ping:read", "student");
addMinRole("ping:accept", "student");
addMinRole("ping:refuse", "student");

// push
addMinRole("push:subscribe", "student");
addMinRole("push:unsubscribe", "student");
addMinRole("push:notifications:list", "student");
addMinRole("push:notifications:markRead", "student");
addMinRole("push:notifications:unreadCount", "student");

// Admin / user-account management (admin + developer side).

// Read-only user listing
addRoles("user:read", ["admin", "developer"]);

// Modify another account (role, email, ues, delete, upgrade)
addRoles("user:edit", ["admin", "developer"]);
addRoles("user:delete", ["admin", "developer"]);
addRoles("user:inviteCreate", ["admin", "developer"]);
addRoles("user:inviteBulkCreate", ["admin", "developer"]);
addRoles("user:ueAssign", ["admin"]); // PATCH /users/:id/ues (formerly inline adminOnly)
addRoles("user:roleUpgrade", ["admin", "developer"]); // upgrade to bde role

// comments posted by others on the author’s own post
addMinRole("comment:moderate", "student");

// shared resource labels used by route declarations
addRoles("support:read", ["teacher", "admin"]);
addRoles("support:create", ["teacher", "admin"]);
addRoles("support:delete", ["teacher", "admin"]);
addRoles("bug:read", ["teacher", "admin"]);
addRoles("bug:create", ["teacher", "admin"]);
addRoles("bug:close", ["teacher", "admin"]);
addRoles("ticket:read", ["teacher", "admin"]);
addRoles("ticket:create", ["teacher", "admin"]);
addRoles("ticket:close", ["teacher", "admin"]);
addRoles("ticket:reply", ["teacher", "admin"]);
addRoles("ticket:assign", ["teacher", "admin"]);
addRoles("ticket:reopen", ["teacher", "admin"]);
addRoles("ticket:purge", ["teacher", "admin"]);
addRoles("suggestion:read", ["teacher", "admin"]);
addRoles("suggestion:vote", ["teacher", "admin"]);
addMinRole("post:read", "student");
addMinRole("post:create", "student");
addMinRole("post:edit", "student");
addMinRole("post:delete", "student");
addMinRole("comment:read", "student");
addMinRole("comment:create", "student");
addMinRole("comment:delete", "student");
addMinRole("comment:hide", "student");
addMinRole("push:subscribe", "student");
addRoles("system:purgeGlobalMessages", ["admin", "developer"]);



// Post author can moderate comments attached to their own post.

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Returns whether `user` may perform `action` on `resource` within the
 * optional `context`. Always returns a boolean (deny by default).
 *
 * @param {object|null} user
 * @param {string} action   e.g. "post:edit", "user:delete",
 *                          "system:purgeGlobalMessages"
 * @param {string} resource Targeted resource, used by ownership/moderation checks,
 *                          e.g. "post", "comment", "message".
 * @param {object} [context] Extra context used by ownership/moderation rules:
 *                          - { ownerId, userId } for self-content actions
 *                          - { postAuthorId, userId } for post-author comment moderation
 * @returns {boolean}
 */
function can(user, action, resource, context = {}) {
  if (!user || typeof user !== "object") return false;
  if (typeof action !== "string") return false;
  if (typeof resource !== "string") return false;

  const role = user.role;
  if (typeof role !== "string") return false;
  if (!KNOWN_ROLES.includes(role)) return false;

  const rule = ACTIONS.get(action);
  if (!rule) return false; // unknown action => deny

  switch (rule.mode) {
    case "minRole": {
      return roleRank(role) >= roleRank(rule.minRoleName);
    }
    case "roles": {
      return rule.roles.has(role);
    }
    default:
      return false;
  }
}

/**
 * Ownership variant: returns true when the role is generically allowed on the
 * resource AND the action targets content owned by the user.
 *
 * Used for `post:edit`, `post:delete`, `comment:edit`, `comment:delete`,
 * `message:delete`.
 *
 * @param {object} user
 * @param {string} action
 * @param {string} resource
 * @param {object} context { ownerId: number, userId: number }
 * @returns {boolean}
 */
function canOwn(user, action, resource, context) {
  if (context == null) return false;
  const ownerId = context.ownerId;
  const userId = context.userId;
  if (ownerId == null || userId == null) return false;

  const isOwner =
    Number.isInteger(ownerId) &&
    Number.isInteger(userId) &&
    ownerId === userId;

  if (!isOwner) return false;
  return can(user, action, resource, context);
}

/**
 * Post-author moderation: the author of a post may delete or hide comments
 * attached to their own post, even when the comment has a different author.
 *
 * Relevant actions: `comment:delete` and, if added later, `comment:hide`.
 *
 * @param {object} user
 * @param {string} action   "comment:delete" or "comment:hide"
 * @param {string} resource "comment"
 * @param {object} context  { postAuthorId: number, userId: number }
 * @returns {boolean}
 */
function canModerateCommentOnOwnPost(user, action, resource, context) {
  if (context == null) return false;
  const postAuthorId = context.postAuthorId;
  const userId = context.userId;
  if (postAuthorId == null || userId == null) return false;

  const isPostAuthor =
    Number.isInteger(postAuthorId) &&
    Number.isInteger(userId) &&
    postAuthorId === userId;
  if (!isPostAuthor) {
    // An admin/dev may also moderate, even on a post that is not theirs.
    const role = user.role;
    if (role === "admin" || role === "developer") {
      return can(user, action, resource, context);
    }
    return false;
  }

  // Accepted in "post-author moderation" mode:
  // comment deletion and hiding.
  if (action === "comment:delete" || action === "comment:hide") {
    return true;
  }

  return false;
}

// Internal helpers.

function roleRank(roleName) {
  const rank = ROLE_RANK[roleName];
  // Unknown role: -1 so any valid minRole (>= 0) rejects it.
  return rank == null ? -1 : rank;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = { can, canOwn, canModerateCommentOnOwnPost, ROLE_RANK };
