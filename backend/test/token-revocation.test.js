const chai = require("chai");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");

const { expect } = chai;

const REF = "STD97531";
const PASSWORD = "initial-password-1";

const me = (token) =>
  request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

const login = async (password = PASSWORD) => {
  const res = await request(app).post("/api/auth/login").send({ ref: REF, password });
  return res.body.token;
};

describe("AUTH — server-side token validation and revocation (H4)", () => {
  let userId;

  beforeEach(async () => {
    await db.query("DELETE FROM users WHERE ref=$1", [REF]);
    const hash = await bcrypt.hash(PASSWORD, 4);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, first_login)
       VALUES ($1, 'Revoke', 'Test', 'hei.revoke.97531@gmail.com', 'revoke_97531', $2, 'student', FALSE)
       RETURNING id`,
      [REF, hash],
    );
    userId = rows[0].id;
  });

  after(async () => {
    await db.query("DELETE FROM users WHERE ref=$1", [REF]);
  });

  it("rejects the token of a deleted account", async () => {
    const token = await login();
    expect((await me(token)).status).to.equal(200);
    await db.query("DELETE FROM users WHERE id=$1", [userId]);
    expect((await me(token)).status).to.equal(401);
  });

  it("uses the current role from the database, not the one in the token", async () => {
    const token = await login();
    await db.query("UPDATE users SET role='bde' WHERE id=$1", [userId]);
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(403);

    // A token forged with an elevated role but a valid signature is still capped
    // to the account's real role.
    const forged = jwt.sign({ id: userId, role: "developer", tv: 0 }, process.env.JWT_SECRET);
    const forgedRes = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${forged}`);
    expect(forgedRes.status).to.equal(403);
  });

  it("revokes other sessions on password change and returns a fresh token", async () => {
    const oldToken = await login();
    const res = await request(app)
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${oldToken}`)
      .send({ current: PASSWORD, newPassword: "new-password-2" });
    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a("string");

    expect((await me(oldToken)).status).to.equal(401);
    expect((await me(res.body.token)).status).to.equal(200);
  });

  it("rejects tokens signed with another algorithm", async () => {
    const none = jwt.sign({ id: userId, role: "student" }, null, { algorithm: "none" });
    expect((await me(none)).status).to.equal(401);
  });
});
