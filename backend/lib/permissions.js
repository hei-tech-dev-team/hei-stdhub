/**
 * @file permissions.js
 * @description Central RBAC permission model shared by backend (Express
 * middleware in `middleware/`) and frontend (React display conditions).
 *
 * Conventions du projet respectees :
 * - CommonJS (`module.exports`) pour coller au reste du projet (package.json
 *   "type": "commonjs", pas de ESM, pas de TS).
 * - JavaScript vanilla, indentation 2 espaces, guillemets doubles.
 * - Deny by default : utilisateur null, role inconnu ou action non explicite
 *   => false.
 * - Zéro dependance externe (aucun import Express / React / DB).
 */

// Hiérarchie stricte : dev > admin > (bde | teacher) > student.
// L'ordre des clés n'a pas de sens par lui-même ; on se base sur le rang.
const ROLE_RANK = {
  student: 0,
  teacher: 1,
  bde: 1,
  admin: 2,
  developer: 3,
};

// Ensemble des roles connus. Un role absent de cette liste est traite comme
// "inconnu" => deny by default.
const KNOWN_ROLES = Object.keys(ROLE_RANK);

// Permissions definies explicitement. Chaque entreée dit quels rôles peuvent
// executer quoi. Quand on parle d'un rang minimal, on l'indique via
// `minRole` ; quand c'est un role exact, on utilise `roles`.
//
// Sourcing : routes existantes (`routes/*`) + middlewares existants
// (`middleware/developerOnly`, `developerOrAdmin`, `adminOnly`).
const ACTIONS = new Map();

// ---------------------------------------------------------------------------
// Helpers de définition
// ---------------------------------------------------------------------------

/**
 * Autorise tous les roles d'un rang >= `minRoleName`.
 */
function addMinRole(actionKey, minRoleName) {
  ACTIONS.set(actionKey, { mode: "minRole", minRoleName });
}

/**
 * Autorise uniquement les roles listés.
 */
function addRoles(actionKey, roleList) {
  ACTIONS.set(actionKey, { mode: "roles", roles: new Set(roleList) });
}

// ---------------------------------------------------------------------------
// Ressources "contenu utilisateur" (ownership : author_id == user.id)
// ---------------------------------------------------------------------------

// post
addMinRole("post:create", "student"); // tout authentifié peut créer un post
addMinRole("post:read", "student");
addMinRole("post:edit", "student"); // ownership checked by caller
addMinRole("post:delete", "student"); // ownership checked by caller
addMinRole("post:react", "student");
addMinRole("post:removeReaction", "student");
addRoles("post:createAnnouncement", ["admin", "bde", "teacher"]);

// comment (attaché à un post)
addMinRole("comment:create", "student");
addMinRole("comment:read", "student");
addMinRole("comment:edit", "student"); // ownership checked by caller
addMinRole("comment:delete", "student"); // ownership checked by caller

// message (global / privé / reaction / suppression propre)
addMinRole("message:send", "student");
addMinRole("message:read", "student");
addMinRole("message:delete", "student"); // ownership checked by caller
addMinRole("message:react", "student");

// support ticket (réclamation) — any authenticated user can create
addMinRole("supportTicket:create", "student");
addRoles("supportTicket:read", ["developer", "admin"]);
addRoles("supportTicket:update", ["developer", "admin"]);
addRoles("supportTicket:respond", ["developer", "admin"]);
addRoles("supportTicket:delete", ["developer", "admin"]);

// bug report — any can create
addMinRole("bugReport:create", "student");
addRoles("bugReport:read", ["developer", "admin"]);
addRoles("bugReport:update", ["developer", "admin"]);
addRoles("bugReport:delete", ["developer", "admin"]);

// suggestion
addRoles("suggestion:create", ["student", "teacher", "admin"]);
addRoles("suggestion:read", ["bde"]);
addRoles("suggestion:review", ["bde"]); // changer statut / justifier
addRoles("suggestion:confirm", ["bde"]);
addRoles("suggestion:report", ["bde"]);

// ---------------------------------------------------------------------------
// Administration / gére du compte utilisateur (admin/dev side)
// ---------------------------------------------------------------------------

// Lecture seule de la liste des utilisateurs
addRoles("user:read", ["admin", "developer"]);

// Modification d'un autre compte (role, email, ues, suppression, upgrade)
addRoles("user:edit", ["admin", "developer"]);
addRoles("user:delete", ["admin", "developer"]);
addRoles("user:inviteCreate", ["admin", "developer"]);
addRoles("user:inviteBulkCreate", ["admin", "developer"]);
addRoles("user:ueAssign", ["admin"]); // PATCH /users/:id/ues (adminOnly interne)
addRoles("user:roleUpgrade", ["admin", "developer"]); // BDE upgrade

// ---------------------------------------------------------------------------
// Ressources administratives / pédagogiques
// ---------------------------------------------------------------------------

// supports (liens pédagogiques)
addRoles("support:create", ["teacher", "admin"]);
addRoles("support:delete", ["teacher", "admin"]);
addMinRole("support:read", "student");

// custom UEs (création / suppression)
addRoles("customUe:create", ["admin", "developer"]);
addRoles("customUe:delete", ["admin", "developer"]);
addMinRole("customUe:read", "student");

// système (purge globale des messages) — réservé dev+admin
addRoles("system:purgeGlobalMessages", ["admin", "developer"]);

// ---------------------------------------------------------------------------
// Moderation spécifique : l'auteur d'un post peut modérer les commentaires de
// son propre post (même si le comment a un autre auteur).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Détermine si `user` peut effectuer `action` sur `resource` dans le contexte
 * optionnel `context`.
 *
 * Retourne toujours un booléen. Deny by default.
 *
 * @param {object|null} user      Entiité utilisateur issue du token.
 *                                 Doit au minimum posséder `.role` (string).
 *                                 Peut être null/undefined => false.
 * @param {string}      action    Verbe + ressource, ex. "post:edit",
 *                                 "user:delete", "system:purgeGlobalMessages".
 * @param {string}      resource  Ressource ciblée, pour les vérifications
 *                                 d'ownership/moderation. Ex. "post",
 *                                 "comment", "message".
 * @param {object}      [context] Contexte supplémentaire. Attendu par les
 *                                 règles d'ownership / moderation :
 *                                 - { ownerId: number, userId: number }
 *                                   pour les actions "modifies mon propre contenu"
 *                                 - { postAuthorId, userId } pour la modération
 *                                   de comment (auteur du post modère ses comments)
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
  if (!rule) return false; // action inconnue => deny

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
 * Variante ownership : retourne true si le rôle a le droit générique sur
 * la ressource ET que l'action porte sur un contenu appartenant à l'utilisateur.
 *
 * Utilisée pour `post:edit`, `post:delete`, `comment:edit`, `comment:delete`,
 * `message:delete`.
 *
 * @param {object} user
 * @param {string} action  ex. "post:edit"
 * @param {string} resource ex. "post"
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
 * Règle de moderation : l'auteur d'un post peut supprimer/masquer les
 * commentaires attachés à son propre post, même si le comment a un autre auteur.
 *
 * Action concernée : `comment:delete` (et éventuellement `comment:hide` si on
 * l'ajoute plus tard).
 *
 * @param {object} user
 * @param {string} action   "comment:delete" (ou "comment:hide")
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

  // Seul l'auteur du post (ou un rôle supérieur) peut modérer ses comments.
  if (!isPostAuthor) {
    // Un admin/dev peut aussi modérer, même sur un post qui n'est pas le sien.
    const role = user.role;
    if (role === "admin" || role === "developer") {
      return can(user, action, resource, context);
    }
    return false;
  }

  // Actions acceptées en mode "modération auteur de post" :
  // suppression et masquage de comment.
  if (action === "comment:delete" || action === "comment:hide") {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

function roleRank(roleName) {
  const rank = ROLE_RANK[roleName];
  // rank == undefined signifie role inconnu ; on retourne -1 pour que
  // n'importe quel minRole valide (>= 0) le rejette.
  return rank == null ? -1 : rank;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = { can, canOwn, canModerateCommentOnOwnPost, ROLE_RANK };
