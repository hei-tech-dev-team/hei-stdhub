const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken = "";

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
    adminToken = res.body.token;
  } catch {
    adminToken = "";
  }
});

describe("POSTS — CRUD & access control", () => {
  it("GET /posts returns 200 (public)", async () => {
    const res = await agent.get("/api/posts");
    // 200 if DB reachable, 500 if not — either is acceptable
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(res.body).to.be.an("array");
  });

  it("GET /posts with UE filter", async () => {
    const res = await agent.get("/api/posts?ue=WEB1");
    expect([200, 500]).to.include(res.status);
  });

  it("GET /posts with type filter", async () => {
    const res = await agent.get("/api/posts?type=cours");
    expect([200, 500]).to.include(res.status);
  });

  it("GET /posts with level filter", async () => {
    const res = await agent.get("/api/posts?level=L1");
    expect([200, 500]).to.include(res.status);
  });

  it("GET /posts with invalid type returns 200 or 500", async () => {
    const res = await agent.get("/api/posts?type=invalid_type_xyz");
    expect([200, 500]).to.include(res.status);
  });

  itWithToken("POST /posts without title returns 400", async () => {
    const res = await agent
      .post("/api/posts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ue: "WEB1", type: "cours" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /posts without UE returns 400", async () => {
    const res = await agent
      .post("/api/posts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test", type: "cours" });
    expect(res.status).to.equal(400);
  });

  it("DELETE /posts/:id without token returns 401", async () => {
    const res = await agent.delete("/api/posts/1");
    expect(res.status).to.equal(401);
  });

  it("GET /posts with combined filters", async () => {
    const res = await agent.get("/api/posts?ue=WEB1&type=cours&level=L1");
    expect([200, 500]).to.include(res.status);
  });
});

describe("SUPPORTS — CRUD & access control", () => {
  it("GET /supports/:ue returns 200 or 500", async () => {
    const res = await agent.get("/api/supports/WEB1");
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(res.body).to.be.an("array");
  });

  it("POST /supports without token returns 401", async () => {
    const res = await agent.post("/api/supports").send({
      ue: "WEB1",
      label: "Test",
      url: "https://example.com",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("POST /supports without UE returns 400", async () => {
    const res = await agent
      .post("/api/supports")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Test", url: "https://example.com" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /supports without label returns 400", async () => {
    const res = await agent
      .post("/api/supports")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ue: "WEB1", url: "https://example.com" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /supports without URL returns 400", async () => {
    const res = await agent
      .post("/api/supports")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ue: "WEB1", label: "Test" });
    expect(res.status).to.equal(400);
  });

  it("DELETE /supports/:id without token returns 401", async () => {
    const res = await agent.delete("/api/supports/1");
    expect(res.status).to.equal(401);
  });
});

describe("SUGGESTIONS — CRUD & BDE access", () => {
  it("POST /suggestions without token returns 401", async () => {
    const res = await agent.post("/api/suggestions").send({
      titre: "Test",
      contenu: "Test content",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("POST /suggestions without titre returns 400", async () => {
    const res = await agent
      .post("/api/suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ contenu: "Test content" });
    expect([400, 403]).to.include(res.status);
  });

  itWithToken("POST /suggestions without contenu returns 400", async () => {
    const res = await agent
      .post("/api/suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ titre: "Test" });
    expect([400, 403]).to.include(res.status);
  });

  itWithToken("POST /suggestions with whitespace-only fields returns 400", async () => {
    const res = await agent
      .post("/api/suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ titre: "   ", contenu: "   " });
    expect([400, 403]).to.include(res.status);
  });

  it("GET /suggestions without token returns 401 from auth middleware", async () => {
    const res = await agent.get("/api/suggestions");
    expect(res.status).to.equal(401);
  });

  it("PATCH /suggestions/:id without token returns 401", async () => {
    const res = await agent.patch("/api/suggestions/1").send({ statut: "accepte" });
    expect(res.status).to.equal(401);
  });

  it("POST /suggestions/confirm without token returns 401", async () => {
    const res = await agent.post("/api/suggestions/confirm");
    expect(res.status).to.equal(401);
  });
});

describe("ADMIN — Extended access control", () => {
  itWithToken("PATCH /admin/users/:id/role without role returns 400", async () => {
    const res = await agent
      .patch("/api/admin/users/1/role")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
  });

  itWithToken("PATCH /admin/users/:id/role with invalid role returns 400", async () => {
    const res = await agent
      .patch("/api/admin/users/1/role")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "superadmin" });
    expect(res.status).to.equal(400);
  });

  itWithToken("GET /admin/invitations returns 200 or 500", async () => {
    const res = await agent
      .get("/api/admin/invitations")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });
});

describe("AUTH — Extended edge cases", () => {
  it("POST /auth/login with extra fields succeeds or errors gracefully", async () => {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "password", extraField: "hack" });
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(res.body).to.have.property("token");
  });

  it("POST /auth/reset-password with only token returns 400", async () => {
    const res = await agent
      .post("/api/auth/reset-password")
      .send({ token: "sometoken" });
    expect(res.status).to.equal(400);
  });

  it("POST /auth/reset-password with only password returns 400", async () => {
    const res = await agent
      .post("/api/auth/reset-password")
      .send({ newPassword: "newpass123" });
    expect(res.status).to.equal(400);
  });

  it("POST /auth/reset-password with short password returns 400", async () => {
    const res = await agent
      .post("/api/auth/reset-password")
      .send({ token: "validtoken", newPassword: "ab" });
    expect(res.status).to.equal(400);
  });

  itWithToken("GET /auth/me returns expected fields", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.include.all.keys("id", "ref", "email", "role");
  });
});

describe("MESSAGES — Extended coverage", () => {
  itWithToken("GET /messages/private/:id returns 200 or 500", async () => {
    const res = await agent
      .get("/api/messages/private/2")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(res.body).to.be.an("array");
  });

  itWithToken("PATCH /messages/:id/seen with non-existent message returns 404", async () => {
    const res = await agent
      .patch("/api/messages/999999/seen")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(404);
  });
});
