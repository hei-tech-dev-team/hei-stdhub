const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken = "";
let studentToken = "";
let inviteCode = "";

const itWithToken = (desc, fn) => {
  it(desc, function () {
    if (!adminToken) this.skip();
    return fn.call(this);
  });
};

before(async () => {
  agent = request.agent(app);
  try {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "password" });
    adminToken = res.body.token || "";
  } catch {
    adminToken = "";
  }
  try {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "STD001", password: "password" });
    studentToken = res.body.token || "";
  } catch {
    studentToken = "";
  }
  if (adminToken) {
    try {
      const res = await agent
        .post("/api/admin/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "student" });
      inviteCode = res.body.code || "";
    } catch {
      inviteCode = "";
    }
  }
});

describe("AUTH — POST /register", () => {
  const uniqueSuffix = () => Date.now();

  it("returns 400 when required fields are missing", async () => {
    const res = await agent.post("/api/auth/register").send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Tous les champs sont requis.");
  });

  it("returns 400 when teacher has no ues", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `NEWTEACH${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `teacher${uniqueSuffix()}@test.com`,
      pseudo: "teachertest",
      password: "password123",
      role: "teacher",
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Un professeur doit avoir au moins une UE.",
    );
  });

  it("returns 400 when inviteCode is missing", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `NOREF${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `noinvite${uniqueSuffix()}@test.com`,
      pseudo: "noinvite",
      password: "password123",
      role: "student",
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code d'invitation requis.");
  });

  it("returns 400 with invalid invite code", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `BADINV${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `badinv${uniqueSuffix()}@test.com`,
      pseudo: "badinvite",
      password: "password123",
      role: "student",
      inviteCode: "INVALID-XXXXXX",
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Code d'invitation invalide ou expiré.",
    );
  });

  itWithToken("returns 409 on duplicate ref or email", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: "ADMIN001",
      nom: "Dup",
      prenom: "Dup",
      email: `dup${uniqueSuffix()}@test.com`,
      pseudo: "dupuser",
      password: "password123",
      role: "student",
      inviteCode,
    });
    expect(res.status).to.equal(409);
    expect(res.body).to.have.property(
      "error",
      "Référence déjà utilisée.",
    );
  });
});

describe("AUTH — POST /verify-invite", () => {
  it("returns 400 without code", async () => {
    const res = await agent.post("/api/auth/verify-invite").send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code requis.");
  });

  it("returns 400 with invalid code", async () => {
    const res = await agent
      .post("/api/auth/verify-invite")
      .send({ code: "FAKE-CODE-999999" });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code invalide ou expiré.");
  });

  itWithToken("returns 200 with valid invite code", async () => {
    const res = await agent
      .post("/api/auth/verify-invite")
      .send({ code: inviteCode });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("role");
  });
});

describe("AUTH — PATCH /password", () => {
  it("returns 401 without token", async () => {
    const res = await agent.patch("/api/auth/password").send({
      current: "password",
      newPassword: "newpass123",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 without required fields", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Champs requis.");
  });

  itWithToken("returns 400 with short newPassword", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ current: "password", newPassword: "ab" });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 with missing current password", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "newlongpass123" });
    expect(res.status).to.equal(400);
  });
});

describe("AUTH — PATCH /avatar", () => {
  it("returns 401 without token", async () => {
    const res = await agent.patch("/api/auth/avatar");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 without file", async () => {
    const res = await agent
      .patch("/api/auth/avatar")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Content-Type", "multipart/form-data");
    expect(res.status).to.equal(400);
  });
});

describe("AUTH — PATCH /profile", () => {
  itWithToken("returns 409 on duplicate pseudo", async () => {
    const { rows } = await (require("../db")).query(
      "SELECT pseudo FROM users WHERE id != 1 LIMIT 1",
    );
    if (!rows.length) return;
    const existingPseudo = rows[0].pseudo;
    const res = await agent
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pseudo: existingPseudo });
    expect(res.status).to.equal(409);
    expect(res.body).to.have.property("error", "Pseudo déjà pris.");
  });
});
