const chai = require("chai");
const request = require("supertest");
const app = require("../server");
const db = require("../db");
// Hash of the dev seed password "password" (backend/db/schema.sql seed).
const SEED_PASSWORD_HASH =
  "$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji";

const { expect } = chai;

const login = async (ref) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ ref, password: "password" });
  return res.body.token || "";
};

const as = (token) => ({
  patch: (url) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
  del: (url) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

const DEV_ID = 4; // DEV001 in seed.dev.sql

const lastAudit = async (action, targetId) => {
  const { rows } = await db.query(
    `SELECT * FROM admin_audit_log WHERE action=$1 AND target_id=$2
     ORDER BY id DESC LIMIT 1`,
    [action, targetId],
  );
  return rows[0];
};

describe("ADMIN — privileged accounts can only be managed by a developer", () => {
  let adminToken;
  let devToken;
  let otherAdminId;
  let victimId;

  before(async () => {
    [adminToken, devToken] = await Promise.all([login("ADMIN001"), login("DEV001")]);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role)
       VALUES ('ADMIN987', 'Other', 'Admin', 'other.admin.987@example.com',
               'other_admin_987', $1, 'admin')
       RETURNING id`,
      [SEED_PASSWORD_HASH],
    );
    otherAdminId = rows[0].id;
  });

  beforeEach(async () => {
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role)
       VALUES ('STD98765', 'Victim', 'Test', 'hei.victim.98765@gmail.com',
               'victim_98765', 'x', 'student')
       ON CONFLICT (ref) DO UPDATE SET role='student'
       RETURNING id`,
    );
    victimId = rows[0].id;
  });

  after(async () => {
    await db.query("DELETE FROM users WHERE ref IN ('ADMIN987', 'STD98765')");
  });

  describe("PATCH /users/:id/email", () => {
    it("forbids an admin from changing a developer's email (account takeover)", async () => {
      const res = await as(adminToken)
        .patch(`/api/admin/users/${DEV_ID}/email`)
        .send({ email: "attacker@example.com" });
      expect(res.status).to.equal(403);
      const { rows } = await db.query("SELECT email FROM users WHERE id=$1", [DEV_ID]);
      expect(rows[0].email).to.not.equal("attacker@example.com");
    });

    it("forbids an admin from changing another admin's email", async () => {
      const res = await as(adminToken)
        .patch(`/api/admin/users/${otherAdminId}/email`)
        .send({ email: "attacker@example.com" });
      expect(res.status).to.equal(403);
    });

    it("lets an admin change a student's email and records it", async () => {
      const res = await as(adminToken)
        .patch(`/api/admin/users/${victimId}/email`)
        .send({ email: "hei.victim.new@gmail.com" });
      expect(res.status).to.equal(200);
      const entry = await lastAudit("user.email.update", victimId);
      expect(entry).to.exist;
      expect(entry.actor_role).to.equal("admin");
      expect(entry.details.to).to.equal("hei.victim.new@gmail.com");
    });

    it("lets a developer change an admin's email", async () => {
      const res = await as(devToken)
        .patch(`/api/admin/users/${otherAdminId}/email`)
        .send({ email: "other.admin.renamed@example.com" });
      expect(res.status).to.equal(200);
    });

    it("returns 404 for an unknown user", async () => {
      const res = await as(adminToken)
        .patch("/api/admin/users/999999/email")
        .send({ email: "x@example.com" });
      expect(res.status).to.equal(404);
    });
  });

  describe("DELETE /users/:id", () => {
    it("forbids an admin from deleting a developer", async () => {
      const res = await as(adminToken).del(`/api/admin/users/${DEV_ID}`);
      expect(res.status).to.equal(403);
      const { rows } = await db.query("SELECT id FROM users WHERE id=$1", [DEV_ID]);
      expect(rows).to.have.length(1);
    });

    it("forbids an admin from deleting another admin", async () => {
      const res = await as(adminToken).del(`/api/admin/users/${otherAdminId}`);
      expect(res.status).to.equal(403);
    });

    it("lets an admin delete a student and records it", async () => {
      const res = await as(adminToken).del(`/api/admin/users/${victimId}`);
      expect(res.status).to.equal(200);
      const entry = await lastAudit("user.delete", victimId);
      expect(entry).to.exist;
      expect(entry.details.ref).to.equal("STD98765");
    });

    it("returns 400 for a non-numeric id", async () => {
      const res = await as(adminToken).del("/api/admin/users/abc");
      expect(res.status).to.equal(400);
    });
  });

  describe("PATCH /users/:id/role", () => {
    it("forbids an admin from demoting another admin", async () => {
      const res = await as(adminToken)
        .patch(`/api/admin/users/${otherAdminId}/role`)
        .send({ role: "student" });
      expect(res.status).to.equal(403);
    });

    it("records role changes in the audit log", async () => {
      const res = await as(adminToken)
        .patch(`/api/admin/users/${victimId}/role`)
        .send({ role: "bde" });
      expect(res.status).to.equal(200);
      const entry = await lastAudit("user.role.update", victimId);
      expect(entry.details).to.deep.equal({ from: "student", to: "bde" });
    });
  });
});
