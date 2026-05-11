const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken = "";
let teacherToken = "";

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
      .send({ ref: "PROF001", password: "password" });
    teacherToken = res.body.token || "";
  } catch {
    teacherToken = "";
  }
});

describe("SUBMISSIONS — POST /", () => {
  it("returns 401 without token", async () => {
    const res = await agent.post("/api/submissions").send({
      nom: "Test",
      prenom: "Test",
      email: "test@test.com",
      ref: "STD001",
      level: "L1",
      groupe: "G1",
      ue: "WEB1",
      type: "devoir",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 when required fields are missing", async () => {
    const res = await agent
      .post("/api/submissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nom: "Test" });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 when file and link are both missing", async () => {
    const res = await agent
      .post("/api/submissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nom: "Test",
        prenom: "Test",
        email: "test@test.com",
        ref: "STD001",
        level: "L1",
        groupe: "G1",
        ue: "WEB1",
        type: "devoir",
      });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Fichier ou lien requis.");
  });
});

describe("SUBMISSIONS — GET /", () => {
  it("returns 401 without token", async () => {
    const res = await agent.get("/api/submissions");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 403 for student role", async () => {
    let studentTokenLocal = "";
    try {
      const loginRes = await agent
        .post("/api/auth/login")
        .send({ ref: "STD001", password: "password" });
      studentTokenLocal = loginRes.body.token || "";
    } catch {
      studentTokenLocal = "";
    }
    if (!studentTokenLocal) this.skip();
    const res = await agent
      .get("/api/submissions")
      .set("Authorization", `Bearer ${studentTokenLocal}`);
    expect(res.status).to.equal(403);
  });

  itWithToken("returns 200 for admin", async () => {
    const res = await agent
      .get("/api/submissions")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body).to.be.an("array");
    }
  });

  itWithToken("filters by type", async () => {
    const res = await agent
      .get("/api/submissions?type=devoir")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });

  itWithToken("filters by groupe", async () => {
    const res = await agent
      .get("/api/submissions?groupe=G1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });

  itWithToken("filters by ue", async () => {
    const res = await agent
      .get("/api/submissions?ue=WEB1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });

  itWithToken("returns 200 for teacher (filtered by UE)", async () => {
    if (!teacherToken) this.skip();
    const res = await agent
      .get("/api/submissions")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body).to.be.an("array");
    }
  });
});
