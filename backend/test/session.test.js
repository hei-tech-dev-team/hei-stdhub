const chai = require("chai");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");
const {
  createSession,
  cleanupSessions,
} = require("../services/sessionService");
const {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require("../config/auth");

const { expect } = chai;

const REF = "STD97601";
const PASSWORD = "password";

let userId;
let adminToken;
const fakeReq = {
  get: () => "session-test",
  clientIp: "127.0.0.1",
  ip: "127.0.0.1",
};

const cookieValue = (res, name) => {
  const header = (res.headers["set-cookie"] || []).find((value) =>
    value.startsWith(`${name}=`),
  );
  if (!header) return null;
  return header.split(";")[0].slice(name.length + 1);
};

const login = async () => {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/login")
    .send({ ref: REF, password: PASSWORD });
  return { agent, res };
};

const refresh = (agent, csrf) =>
  agent.post("/api/auth/refresh").set("X-CSRF-Token", csrf || "");

const rawRefresh = (cookie, csrf) => {
  const req = request(app).post("/api/auth/refresh");
  if (cookie) req.set("Cookie", `hei_refresh=${cookie}`);
  if (csrf) req.set("X-CSRF-Token", csrf);
  return req;
};

describe("SESSIONS — refresh, rotation, revocation and lifecycle", () => {
  before(async () => {
    await db.query("DELETE FROM users WHERE ref=$1", [REF]);
    const hash = await bcrypt.hash(PASSWORD, 4);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, first_login)
       VALUES ($1, 'Session', 'Test', 'hei.session.97601@gmail.com', 'session_97601', $2, 'student', FALSE)
       RETURNING id`,
      [REF, hash],
    );
    userId = rows[0].id;

    const admin = await request(app)
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "password" });
    adminToken = admin.body.token;
  });

  after(async () => {
    await db.query("DELETE FROM users WHERE ref=$1", [REF]);
  });

  it("issues a short-lived access token with no roles and a strict cookie", async () => {
    const { res } = await login();
    expect(res.status).to.equal(200);
    expect(res.body.expires_in).to.equal(ACCESS_TOKEN_TTL_SECONDS);
    expect(res.body.csrf_token).to.be.a("string");

    const decoded = jwt.decode(res.body.token);
    expect(decoded.exp - decoded.iat).to.equal(ACCESS_TOKEN_TTL_SECONDS);
    expect(decoded.iss).to.equal(JWT_ISSUER);
    expect(decoded.aud).to.equal(JWT_AUDIENCE);
    expect(decoded.sub).to.equal(String(userId));
    expect(decoded.sid).to.be.a("string");
    expect(decoded).to.not.have.property("role");
    expect(decoded).to.not.have.property("pseudo");
    expect(decoded).to.not.have.property("ues");

    const cookie = (res.headers["set-cookie"] || [])[0];
    expect(cookie).to.include("HttpOnly");
    expect(cookie).to.include("SameSite=Strict");
    expect(cookie).to.include("Path=/api/auth");
  });

  it("requires the CSRF token and rotates the refresh token", async () => {
    const { agent, res } = await login();
    const firstCookie = cookieValue(res, "hei_refresh");

    expect((await refresh(agent, "")).status).to.equal(403);
    expect((await refresh(agent, "mauvais-jeton")).status).to.equal(403);

    const rotated = await refresh(agent, res.body.csrf_token);
    expect(rotated.status).to.equal(200);
    expect(rotated.body.token).to.be.a("string");
    expect(cookieValue(rotated, "hei_refresh")).to.not.equal(firstCookie);
  });

  it("allow reuse within the grace window without rotation", async () => {
    const { agent, res } = await login();
    const oldCookie = cookieValue(res, "hei_refresh");
    const rotated = await refresh(agent, res.body.csrf_token);
    expect(rotated.status).to.equal(200);

    const grace = await rawRefresh(oldCookie, res.body.csrf_token);
    expect(grace.status).to.equal(200);
    expect(grace.headers["set-cookie"]).to.be.undefined;
  });

  it("revoke the session if an old token is used", async () => {
    const { agent, res } = await login();
    const oldCookie = cookieValue(res, "hei_refresh");
    const rotated = await refresh(agent, res.body.csrf_token);
    expect(rotated.status).to.equal(200);

    await db.query(
      `UPDATE sessions SET previous_valid_until = NOW() - INTERVAL '1 second'
       WHERE user_id=$1 AND revoked_at IS NULL`,
      [userId],
    );

    const reuse = await rawRefresh(oldCookie, res.body.csrf_token);
    expect(reuse.status).to.equal(401);

    const { rows } = await db.query(
      `SELECT revoked_reason FROM sessions
       WHERE user_id=$1 AND revoked_reason='reuse'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    expect(rows.length).to.equal(1);

    const blocked = await refresh(agent, res.body.csrf_token);
    expect(blocked.status).to.equal(401);
  });

  it("logout revokes only recent session", async () => {
    const first = await login();
    const second = await login();

    const res = await first.agent
      .post("/api/auth/logout")
      .set("X-CSRF-Token", first.res.body.csrf_token);
    expect(res.status).to.equal(204);

    expect((await refresh(first.agent, first.res.body.csrf_token)).status).to.equal(401);
    expect((await refresh(second.agent, second.res.body.csrf_token)).status).to.equal(200);
  });

  it("logout-all revokes all sessions", async () => {
    const first = await login();
    const second = await login();

    const res = await first.agent
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${first.res.body.token}`);
    expect(res.status).to.equal(204);

    expect((await refresh(first.agent, first.res.body.csrf_token)).status).to.equal(401);
    expect((await refresh(second.agent, second.res.body.csrf_token)).status).to.equal(401);
  });

  it("get and revoke only own sessions", async () => {
    const first = await login();
    const second = await login();

    const list = await first.agent
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${first.res.body.token}`);
    expect(list.status).to.equal(200);
    expect(list.body.length).to.be.greaterThan(1);
    expect(list.body.filter((s) => s.current)).to.have.length(1);

    const other = list.body.find((s) => !s.current);
    const foreign = await request(app)
      .delete(`/api/auth/sessions/${other.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(foreign.status).to.equal(404);

    const revoked = await first.agent
      .delete(`/api/auth/sessions/${other.id}`)
      .set("Authorization", `Bearer ${first.res.body.token}`);
    expect(revoked.status).to.equal(204);
    expect((await refresh(second.agent, second.res.body.csrf_token)).status).to.equal(401);
  });

  it("change password, revoke other sessions and keep current device", async () => {
    const first = await login();
    const second = await login();

    const res = await first.agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${first.res.body.token}`)
      .send({ current: PASSWORD, newPassword: "new-password-97601" });
    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a("string");
    expect(res.body.csrf_token).to.be.a("string");

    const meOld = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${first.res.body.token}`);
    expect(meOld.status).to.equal(401);

    const meNew = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.token}`);
    expect(meNew.status).to.equal(200);

    expect((await refresh(second.agent, second.res.body.csrf_token)).status).to.equal(401);

    const restore = await request(app)
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({ current: "new-password-97601", newPassword: PASSWORD });
    expect(restore.status).to.equal(200);
  });

  it("revoke session of target user while role updating", async () => {
    const target = await login();

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "bde" });
    expect(res.status).to.equal(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${target.res.body.token}`);
    expect(me.status).to.equal(401);
    expect((await refresh(target.agent, target.res.body.csrf_token)).status).to.equal(401);

    await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student" });
  });

  it("purge old or revoked sessions", async () => {
    const user = { id: userId, token_version: 0 };
    const expired = await createSession({ user, req: fakeReq });
    const revoked = await createSession({ user, req: fakeReq });
    const active = await createSession({ user, req: fakeReq });

    await db.query(
      `UPDATE sessions SET expires_at = NOW() - INTERVAL '40 days' WHERE id=$1`,
      [expired.id],
    );
    await db.query(
      `UPDATE sessions SET revoked_at = NOW() - INTERVAL '40 days', revoked_reason='test' WHERE id=$1`,
      [revoked.id],
    );

    await cleanupSessions();

    const { rows } = await db.query(
      "SELECT id FROM sessions WHERE id = ANY($1::uuid[])",
      [[expired.id, revoked.id, active.id]],
    );
    expect(rows.map((row) => row.id)).to.deep.equal([active.id]);
  });
});
