const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

// ── Tokens de test ──
let adminToken = "";
let studentToken = "";
let teacherToken = "";

// ══════════════════════════════════════════
// AUTH TESTS
// ══════════════════════════════════════════
describe("🔐 AUTH", () => {

  it("LOGIN réussi admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "password" });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("token");
    adminToken = res.body.token;
  });

  it("LOGIN mauvais mot de passe → 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "mauvaismdp" });
    expect(res.status).to.equal(401);
  });

  it("LOGIN référence inexistante → 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "INCONNU999", password: "test" });
    expect(res.status).to.equal(401);
  });

  it("LOGIN champs manquants → 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "ADMIN001" });
    expect(res.status).to.equal(400);
  });

  it("GET /auth/me sans token → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).to.equal(401);
  });

  it("GET /auth/me avec token valide → 200", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("id");
    expect(res.body).to.have.property("avatar");
  });

  it("GET /auth/me avec token invalide → 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer tokenbidon123");
    expect(res.status).to.equal(401);
  });

});

// ══════════════════════════════════════════
// SÉCURITÉ — INJECTION SQL
// ══════════════════════════════════════════
describe("🛡️ SÉCURITÉ — Injection SQL", () => {

  it("Injection SQL dans login ref → pas de bypass", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "' OR 1=1--", password: "test" });
    expect(res.status).to.equal(401);
  });

  it("Injection SQL dans password → pas de bypass", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "' OR '1'='1" });
    expect(res.status).to.equal(401);
  });

  it("XSS dans message → stocké mais pas exécuté", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "<script>alert('xss')</script>", is_global: true });
    expect(res.status).to.equal(201);
    // Le contenu est stocké tel quel — le frontend est responsable du sanitize
    expect(res.body.content).to.include("<script>");
  });

});

// ══════════════════════════════════════════
// ADMIN — PRIVILEGE ESCALATION
// ══════════════════════════════════════════
describe("👑 ADMIN — Accès et privilege escalation", () => {

  it("GET /admin/stats sans token → 401", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).to.equal(401);
  });

  it("GET /admin/stats avec token admin → 200", async () => {
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("total_users");
    expect(res.body).to.have.property("total_messages");
  });

  it("GET /admin/users sans token → 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).to.equal(401);
  });

  it("POST /admin/invitations avec token admin → 201", async () => {
    const res = await request(app)
      .post("/api/admin/invitations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student" });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("code");
  });

});

// ══════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════
describe("💬 MESSAGES", () => {

  it("GET /messages/global sans token → 401", async () => {
    const res = await request(app).get("/api/messages/global");
    expect(res.status).to.equal(401);
  });

  it("GET /messages/global avec token → 200", async () => {
    const res = await request(app)
      .get("/api/messages/global")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("POST /messages sans contenu → 400", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "", is_global: true });
    expect(res.status).to.equal(400);
  });

  it("POST /messages global → 201", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Test message Mocha", is_global: true });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("id");
  });

  it("POST /messages privé sans receiver_id → 400", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Test privé", is_global: false });
    expect(res.status).to.equal(400);
  });

  it("GET /messages/search sans token → 401", async () => {
    const res = await request(app)
      .get("/api/messages/search?q=test");
    expect(res.status).to.equal(401);
  });

});

// ══════════════════════════════════════════
// SUBMISSIONS
// ══════════════════════════════════════════
describe("📁 SUBMISSIONS", () => {

  it("GET /submissions sans token → 401", async () => {
    const res = await request(app).get("/api/submissions");
    expect(res.status).to.equal(401);
  });

  it("GET /submissions avec token admin → 200", async () => {
    const res = await request(app)
      .get("/api/submissions")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("POST /submissions champs manquants → 400", async () => {
    const res = await request(app)
      .post("/api/submissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nom: "Test" });
    expect(res.status).to.equal(400);
  });

});

// ══════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════
describe("❤️ HEALTH", () => {

  it("GET /api/health → 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("status", "ok");
  });

});
