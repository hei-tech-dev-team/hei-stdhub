/**
 * Central RBAC model shared by backend (Express middleware) and frontend
 * (React display conditions).
 *
 * Conventions: CommonJS, vanilla JS, 2-space indent, double quotes,
 * deny-by-default, zero external dependencies.
 *
 * Role hierarchy (strict): dev > admin > bde / teacher > student
 * Permissions derived from actual route implementations in `backend/routes/*`.
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

// ---------------------------------------------------------------------------
// Permission definitions (aligned with actual route implementations)
// ---------------------------------------------------------------------------

// ============ MESSAGE (routes/messages.js) ============
// Any authenticated user can send/read/react to messages
addMinRole("message:send", "student");
addMinRole("message:read", "student");
addMinRole("message:seen", "student");
addMinRole("message:unread", "student");
addMinRole("message:react", "student");
addMinRole("message:delete", "student"); // ownership checked by caller (sender only)
addMinRole("message:attachment", "student");
addMinRole("message:favorites", "student");

// ============ POST (routes/post.js) ============
// Posts: any authenticated user can read/create
addMinRole("post:read", "student");
addMinRole("post:create", "student");
// Announcements: only admin, bde, teacher can create
addRoles("post:create:announcement", ["admin", "bde", "teacher"]);
// Edit/delete: owner OR admin (checked via canOwn in middleware)
addMinRole("post:edit", "student");
addMinRole("post:delete", "student");

// Reactions: any authenticated user
addMinRole("post:reaction", "student");

// ============ COMMENT (routes/post.js - comments would be here or separate) ============
// Any authenticated user can create/read comments
addMinRole("comment:create", "student");
addMinRole("comment:read", "student");
// Edit/delete: owner OR admin (checked via canOwn)
addMinRole("comment:edit", "student");
addMinRole("comment:delete", "student");
// Post author can moderate (delete/hide) comments on their own post
addMinRole("comment:moderate", "student");
addMinRole("comment:hide", "student");

// ============ SUGGESTION (routes/suggestions.js) ============
// Create: student, teacher, admin
addRoles("suggestion:create", ["student", "teacher", "admin"]);
// Read/review: bde only
addRoles("suggestion:read", ["bde"]);
addRoles("suggestion:review", ["bde"]); // change status / add justification
addRoles("suggestion:confirm", ["bde"]); // confirm all & post to chat
addRoles("suggestion:report", ["bde", "admin"]); // generate PDF report

// ============ SUPPORT TICKET (routes/supportTickets.js) ============
// Create: any authenticated user
addMinRole("supportTicket:create", "student");
// Read/update/respond/delete: developer + admin only (via requirePermission)
addRoles("supportTicket:read", ["developer", "admin"]);
addRoles("supportTicket:update", ["developer", "admin"]);
addRoles("supportTicket:respond", ["developer", "admin"]);
addRoles("supportTicket:delete", ["developer", "admin"]);

// ============ BUG REPORT (routes/bugReports.js) ============
// Create: any authenticated user
addMinRole("bugReport:create", "student");
// Read/update/delete: developer + admin only (via developerOrAdmin)
addRoles("bugReport:read", ["developer", "admin"]);
addRoles("bugReport:update", ["developer", "admin"]);
addRoles("bugReport:delete", ["developer", "admin"]);

// ============ PING (routes/pings.js) ============
// Any authenticated user
addMinRole("ping:send", "student");
addMinRole("ping:read", "student");
addMinRole("ping:accept", "student");
addMinRole("ping:refuse", "student");

// ============ PUSH (routes/push.js) ============
// Any authenticated user
addMinRole("push:subscribe", "student");
addMinRole("push:unsubscribe", "student");
addMinRole("push:notifications:list", "student");
addMinRole("push:notifications:markRead", "student");
addMinRole("push:notifications:unreadCount", "student");

// ============ SUPPORTS (routes/supports.js) ============
// Read: public (no auth)
// Create/delete: teacher + admin
addRoles("support:read", ["student", "teacher", "admin", "bde", "developer"]); // public GET
addRoles("support:create", ["teacher", "admin"]);
addRoles("support:delete", ["teacher", "admin"]);

// ============ CUSTOM UES (routes/custom-ues.js) ============
// Read: public
addRoles("customUe:read", ["student", "teacher", "admin", "bde", "developer"]);
// Create/delete: admin + developer (via requirePermission)
addRoles("customUe:create", ["admin", "developer"]);
addRoles("customUe:delete", ["admin", "developer"]);

// ============ ADMIN / USER MANAGEMENT (routes/admin.js) ============
// User listing: admin + developer (via developerOrAdmin)
addRoles("user:read", ["admin", "developer"]);
// Modify another account: admin + developer (via developerOrAdmin + loadManageableTarget)
addRoles("user:edit", ["admin", "developer"]);
addRoles("user:delete", ["admin", "developer"]);
addRoles("user:inviteCreate", ["admin", "developer"]);
addRoles("user:inviteBulkCreate", ["admin", "developer"]);
// UE assignment: admin only (inline adminOnly middleware)
addRoles("user:ueAssign", ["admin"]);
// Role upgrade to bde: admin + developer
addRoles("user:roleUpgrade", ["admin", "developer"]);

// ============ SYSTEM (server.js socket handlers) ============
// Purge global messages: admin + developer
addRoles("system:purgeGlobalMessages", ["admin", "developer"]);

// ============ BDE KANBAN (server.js socket handlers) ============
// Only bde can join bde room and broadcast updates
addRoles("bde:kanban:join", ["bde"]);
addRoles("bde:kanban:update", ["bde"]);

// ---------------------------------------------------------------------------
// Public API
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
 * Relevant actions: `comment:delete` and `comment:hide`.
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
// Export (dual CommonJS / ES Module compatible)
// ---------------------------------------------------------------------------

module.exports = { can, canOwn, canModerateCommentOnOwnPost, ROLE_RANK };