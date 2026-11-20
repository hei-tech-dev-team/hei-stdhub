const chai = require("chai");
const { describe, it } = require("mocha");
const {
  can,
  canOwn,
  canModerateCommentOnOwnPost,
  ROLE_RANK,
} = require("../../shared/permissions");

const { expect } = chai;

// Every role of the shared model, from the lowest to the highest rank.
const ROLES = ["student", "teacher", "bde", "admin", "developer"];
const asUser = (role, id = 1) => ({ id, role });

// Actions declared with addMinRole(..., "student"): every known role passes.
const MIN_ROLE_ACTIONS = [
  ["message:send", "message"],
  ["message:read", "message"],
  ["message:seen", "message"],
  ["message:unread", "message"],
  ["message:react", "message"],
  ["message:delete", "message"],
  ["message:attachment", "message"],
  ["message:favorites", "message"],
  ["post:read", "post"],
  ["post:create", "post"],
  ["post:edit", "post"],
  ["post:delete", "post"],
  ["post:reaction", "post"],
  ["comment:create", "comment"],
  ["comment:read", "comment"],
  ["comment:edit", "comment"],
  ["comment:delete", "comment"],
  ["comment:moderate", "comment"],
  ["comment:hide", "comment"],
  ["supportTicket:create", "supportTicket"],
  ["bugReport:create", "bugReport"],
  ["ping:send", "ping"],
  ["ping:read", "ping"],
  ["ping:accept", "ping"],
  ["ping:refuse", "ping"],
  ["push:subscribe", "push"],
  ["push:unsubscribe", "push"],
  ["push:notifications:list", "push"],
  ["push:notifications:markRead", "push"],
  ["push:notifications:unreadCount", "push"],
  ["user:read", "user"],
  ["user:edit", "user"],
];

// Actions declared with addRoles(...): exactly the listed roles pass.
const ROLE_LIST_ACTIONS = [
  ["post:create:announcement", "post", ["admin", "bde", "teacher"]],
  ["suggestion:create", "suggestion", ["student", "teacher", "admin"]],
  ["suggestion:read", "suggestion", ["bde"]],
  ["suggestion:review", "suggestion", ["bde"]],
  ["suggestion:confirm", "suggestion", ["bde"]],
  ["suggestion:report", "suggestion", ["bde", "admin"]],
  ["supportTicket:read", "supportTicket", ["admin", "developer"]],
  ["supportTicket:update", "supportTicket", ["admin", "developer"]],
  ["supportTicket:respond", "supportTicket", ["admin", "developer"]],
  ["supportTicket:delete", "supportTicket", ["admin", "developer"]],
  ["bugReport:read", "bugReport", ["admin", "developer"]],
  ["bugReport:update", "bugReport", ["admin", "developer"]],
  ["bugReport:delete", "bugReport", ["admin", "developer"]],
  ["support:read", "support", ROLES],
  ["support:create", "support", ["teacher", "admin"]],
  ["support:delete", "support", ["teacher", "admin"]],
  ["customUe:read", "customUe", ROLES],
  ["customUe:create", "customUe", ["admin", "developer"]],
  ["customUe:delete", "customUe", ["admin", "developer"]],
  ["user:list", "user", ["admin", "developer"]],
  ["user:manage", "user", ["admin", "developer"]],
  ["user:delete", "user", ["admin", "developer"]],
  ["user:inviteCreate", "user", ["admin", "developer"]],
  ["user:inviteBulkCreate", "user", ["admin", "developer"]],
  ["user:roleUpgrade", "user", ["admin", "developer"]],
  ["user:ueAssign", "user", ["admin"]],
  ["system:purgeGlobalMessages", "system", ["admin", "developer"]],
  ["bde:kanban:join", "bde", ["bde"]],
  ["bde:kanban:update", "bde", ["bde"]],
];

// Actions gated by ownership as soon as a context is supplied.
const OWNERSHIP_ACTIONS = [
  ["post:edit", "post"],
  ["post:delete", "post"],
  ["comment:edit", "comment"],
  ["comment:delete", "comment"],
  ["message:delete", "message"],
];

describe("RBAC — shared permission model (unit)", () => {
  describe("role hierarchy (dev > admin > bde/teacher > student)", () => {
    it("ranks the roles strictly: developer > admin > bde = teacher > student", () => {
      expect(ROLE_RANK.developer).to.be.greaterThan(ROLE_RANK.admin);
      expect(ROLE_RANK.admin).to.be.greaterThan(ROLE_RANK.bde);
      expect(ROLE_RANK.bde).to.equal(ROLE_RANK.teacher);
      expect(ROLE_RANK.teacher).to.be.greaterThan(ROLE_RANK.student);
    });

    it("grants every minRole(student) action to every known role", () => {
      for (const [action, resource] of MIN_ROLE_ACTIONS) {
        for (const role of ROLES) {
          expect(
            can(asUser(role), action, resource),
            `${role} should be allowed ${action}:${resource}`,
          ).to.equal(true);
        }
      }
    });

    it("grants role-list actions to exactly the declared roles", () => {
      for (const [action, resource, allowed] of ROLE_LIST_ACTIONS) {
        for (const role of ROLES) {
          expect(
            can(asUser(role), action, resource),
            `${role} → ${action}:${resource} (expected ${allowed.join("|")})`,
          ).to.equal(allowed.includes(role));
        }
      }
    });

    it("keeps admin-only rules closed to bde, teacher and student", () => {
      const adminOnly = ["user:ueAssign"];
      for (const action of adminOnly) {
        expect(can(asUser("admin"), action, "user")).to.equal(true);
        expect(can(asUser("developer"), action, "user")).to.equal(false);
        for (const role of ["bde", "teacher", "student"]) {
          expect(can(asUser(role), action, "user"), `${role} → ${action}`).to.equal(false);
        }
      }
    });

    it("keeps bde-only rules closed to every other role", () => {
      for (const action of ["suggestion:read", "suggestion:review", "suggestion:confirm"]) {
        expect(can(asUser("bde"), action, "suggestion")).to.equal(true);
        for (const role of ["student", "teacher", "admin", "developer"]) {
          expect(can(asUser(role), action, "suggestion"), `${role} → ${action}`).to.equal(false);
        }
      }
    });

    it("keeps admin + developer rules closed to bde, teacher and student", () => {
      const adminAndDev = [
        "user:list",
        "user:manage",
        "user:delete",
        "user:inviteCreate",
        "user:inviteBulkCreate",
        "user:roleUpgrade",
        "system:purgeGlobalMessages",
        "supportTicket:read",
        "bugReport:read",
        "customUe:create",
      ];
      for (const action of adminAndDev) {
        const resource = action.startsWith("supportTicket")
          ? "supportTicket"
          : action.startsWith("bugReport")
            ? "bugReport"
            : action.startsWith("customUe")
              ? "customUe"
              : action.startsWith("system")
                ? "system"
                : "user";
        expect(can(asUser("admin"), action, resource), `admin → ${action}`).to.equal(true);
        expect(can(asUser("developer"), action, resource), `developer → ${action}`).to.equal(true);
        for (const role of ["bde", "teacher", "student"]) {
          expect(can(asUser(role), action, resource), `${role} → ${action}`).to.equal(false);
        }
      }
    });
  });

  describe("deny by default", () => {
    it("denies missing or non-object users", () => {
      expect(can(null, "post:read", "post")).to.equal(false);
      expect(can(undefined, "post:read", "post")).to.equal(false);
      expect(can("student", "post:read", "post")).to.equal(false);
      expect(can(42, "post:read", "post")).to.equal(false);
      expect(can({}, "post:read", "post")).to.equal(false);
      expect(can({ id: 1 }, "post:read", "post")).to.equal(false);
    });

    it("denies unknown roles", () => {
      expect(can({ id: 1, role: "ghost" }, "post:read", "post")).to.equal(false);
      expect(can({ id: 1, role: "" }, "post:read", "post")).to.equal(false);
      expect(can({ id: 1, role: 7 }, "post:read", "post")).to.equal(false);
      expect(can({ id: 1, role: "superadmin" }, "system:purgeGlobalMessages", "system")).to.equal(false);
    });

    it("denies unknown actions", () => {
      expect(can(asUser("developer"), "nonexistent:action", "thing")).to.equal(false);
      expect(can(asUser("developer"), "user:destroy", "user")).to.equal(false);
      expect(can(asUser("admin"), "ticket:read", "ticket")).to.equal(false);
      expect(can(asUser("admin"), "bug:close", "bug")).to.equal(false);
      expect(can(asUser("bde"), "suggestion:vote", "suggestion")).to.equal(false);
    });

    it("denies malformed action or resource arguments", () => {
      expect(can(asUser("developer"), undefined, "user")).to.equal(false);
      expect(can(asUser("developer"), 42, "user")).to.equal(false);
      expect(can(asUser("developer"), "user:read")).to.equal(false);
      expect(can(asUser("developer"), "user:read", null)).to.equal(false);
      expect(can(asUser("developer"), "user:read", {})).to.equal(false);
    });

    it("always answers with a boolean", () => {
      const decisions = [
        can(null, "post:read", "post"),
        can(asUser("student"), "post:read", "post"),
        can(asUser("student"), "nope", "post"),
        can(asUser("student"), "post:edit", "post", { ownerId: 2, userId: 1 }),
      ];
      for (const decision of decisions) expect(decision).to.be.a("boolean");
    });
  });

  describe("ownership rules (post, comment, message)", () => {
    it("canOwn allows the owner to act on their own content", () => {
      const owner = asUser("student", 7);
      for (const [action, resource] of OWNERSHIP_ACTIONS) {
        expect(
          canOwn(owner, action, resource, { ownerId: 7, userId: 7 }),
          `owner → ${action}:${resource}`,
        ).to.equal(true);
      }
    });

    it("canOwn denies acting on somebody else's content, whatever the role", () => {
      const stranger = asUser("student", 7);
      for (const role of ROLES) {
        const user = asUser(role, 7);
        for (const [action, resource] of OWNERSHIP_ACTIONS) {
          expect(
            canOwn(user, action, resource, { ownerId: 9, userId: 7 }),
            `${role} → ${action}:${resource} on user 9's content`,
          ).to.equal(false);
        }
      }
      expect(canOwn(stranger, "post:edit", "post", { ownerId: 9, userId: 7 })).to.equal(false);
    });

    it("canOwn rejects missing or malformed ownership contexts", () => {
      const user = asUser("student", 7);
      expect(canOwn(user, "post:edit", "post", null)).to.equal(false);
      expect(canOwn(user, "post:edit", "post", undefined)).to.equal(false);
      expect(canOwn(user, "post:edit", "post", {})).to.equal(false);
      expect(canOwn(user, "post:edit", "post", { ownerId: 7 })).to.equal(false);
      expect(canOwn(user, "post:edit", "post", { userId: 7 })).to.equal(false);
      expect(canOwn(user, "post:edit", "post", { ownerId: "7", userId: "7" })).to.equal(false);
    });

    it("can() gates ownership actions as soon as a context is supplied", () => {
      const student = asUser("student", 7);
      const teacher = asUser("teacher", 7);
      const admin = asUser("admin", 7);
      const developer = asUser("developer", 7);

      // Owner: allowed for every role.
      for (const role of ROLES) {
        expect(
          can(asUser(role, 7), "post:edit", "post", { ownerId: 7, userId: 7 }),
          `${role} editing their own post`,
        ).to.equal(true);
      }

      // Not the owner: only admin / developer pass the ownership gate.
      for (const [action, resource] of OWNERSHIP_ACTIONS) {
        const context = { ownerId: 9, userId: 7 };
        expect(can(student, action, resource, context), `student → ${action}`).to.equal(false);
        expect(can(teacher, action, resource, context), `teacher → ${action}`).to.equal(false);
        expect(can(asUser("bde", 7), action, resource, context), `bde → ${action}`).to.equal(false);
        expect(can(admin, action, resource, context), `admin → ${action}`).to.equal(true);
        expect(can(developer, action, resource, context), `developer → ${action}`).to.equal(true);
      }
    });

    it("treats a context without userId as a foreign ownership context", () => {
      const student = asUser("student", 7);
      const context = { ownerId: 7 };
      expect(can(student, "post:delete", "post", context)).to.equal(false);
      expect(can(asUser("admin", 7), "post:delete", "post", context)).to.equal(true);
    });

    it("falls back to the plain role rule when no context is supplied", () => {
      const student = asUser("student", 7);
      // No context: the route enforces ownership itself (e.g. SQL WHERE ...).
      expect(can(student, "post:edit", "post", {})).to.equal(true);
      expect(can(student, "post:edit", "post")).to.equal(true);
      expect(can(student, "user:list", "user", {})).to.equal(false);
    });

    it("still denies unknown roles and unknown actions with a context", () => {
      const context = { ownerId: 7, userId: 7 };
      expect(can({ id: 7, role: "ghost" }, "post:edit", "post", context)).to.equal(false);
      expect(can(asUser("developer", 7), "post:rewrite", "post", context)).to.equal(false);
    });
  });

  describe("post-author comment moderation", () => {
    const ownPost = { postAuthorId: 3, userId: 3 };
    const foreignPost = { postAuthorId: 9, userId: 3 };

    it("lets the author delete and hide comments on their own post", () => {
      const author = asUser("student", 3);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", ownPost)).to.equal(true);
      expect(canModerateCommentOnOwnPost(author, "comment:hide", "comment", ownPost)).to.equal(true);
    });

    it("only accepts comment:delete and comment:hide in moderation mode", () => {
      const author = asUser("student", 3);
      expect(canModerateCommentOnOwnPost(author, "comment:create", "comment", ownPost)).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "comment:edit", "comment", ownPost)).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "post:edit", "post", ownPost)).to.equal(false);
    });

    it("denies moderation of comments on somebody else's post to regular roles", () => {
      for (const role of ["student", "teacher", "bde"]) {
        expect(
          canModerateCommentOnOwnPost(asUser(role, 3), "comment:delete", "comment", foreignPost),
          `${role} moderating a foreign post`,
        ).to.equal(false);
      }
    });

    it("lets admin and developer moderate comments on any post", () => {
      for (const role of ["admin", "developer"]) {
        expect(
          canModerateCommentOnOwnPost(asUser(role, 3), "comment:delete", "comment", foreignPost),
          `${role} moderating a foreign post`,
        ).to.equal(true);
        expect(
          canModerateCommentOnOwnPost(asUser(role, 3), "comment:hide", "comment", foreignPost),
          `${role} hiding a comment on a foreign post`,
        ).to.equal(true);
      }
    });

    it("rejects missing or malformed moderation contexts", () => {
      const author = asUser("student", 3);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", null)).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", undefined)).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", {})).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", { postAuthorId: 3 })).to.equal(false);
      expect(canModerateCommentOnOwnPost(author, "comment:delete", "comment", { userId: 3 })).to.equal(false);
      expect(
        canModerateCommentOnOwnPost(author, "comment:delete", "comment", {
          postAuthorId: "3",
          userId: 3,
        }),
      ).to.equal(false);
    });

    it("denies moderation for unknown roles or a missing context", () => {
      const ghost = { id: 1, role: "ghost" };
      expect(canModerateCommentOnOwnPost(ghost, "comment:delete", "comment", foreignPost)).to.equal(false);
      expect(canModerateCommentOnOwnPost(ghost, "comment:delete", "comment", null)).to.equal(false);
      expect(canModerateCommentOnOwnPost(null, "comment:delete", "comment", null)).to.equal(false);
      expect(canModerateCommentOnOwnPost(undefined, "comment:hide", "comment")).to.equal(false);
    });
  });
});
