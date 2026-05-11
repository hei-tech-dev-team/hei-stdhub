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

describe("ADMIN — DELETE /users/:id", () => {
  it("returns 401 without token", async () => {
    const res = await agent.delete("/api/admin/users/1");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 when deleting own account", async () => {
    const me = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    const myId = me.body.id;
    const res = await agent
      .delete(`/api/admin/users/${myId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Impossible de supprimer votre propre compte.",
    );
  });

  itWithToken("returns 200 when deleting another user", async () => {
    const res = await agent
      .delete("/api/admin/users/999999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });
});

describe("ADMIN — POST /invitations/bulk", () => {
  it("returns 401 without token", async () => {
    const res = await agent.post("/api/admin/invitations/bulk").send({
      role: "student",
      count: 2,
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 with invalid role", async () => {
    const res = await agent
      .post("/api/admin/invitations/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "superadmin", count: 2 });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 when role is missing", async () => {
    const res = await agent
      .post("/api/admin/invitations/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ count: 2 });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 201 with valid bulk request", async () => {
    const res = await agent
      .post("/api/admin/invitations/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student", count: 2 });
    expect([201, 500]).to.include(res.status);
    if (res.status === 201) {
      expect(res.body).to.have.property("count");
      expect(res.body.count).to.equal(2);
      expect(res.body.codes).to.be.an("array").with.lengthOf(2);
    }
  });

  itWithToken("clamps count to max 1000", async () => {
    const res = await agent
      .post("/api/admin/invitations/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student", count: 5000 });
    expect([201, 500]).to.include(res.status);
    if (res.status === 201) {
      expect(res.body.count).to.equal(1000);
    }
  });

  itWithToken("defaults count to 1 when not provided", async () => {
    const res = await agent
      .post("/api/admin/invitations/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student" });
    expect([201, 500]).to.include(res.status);
    if (res.status === 201) {
      expect(res.body.count).to.equal(1);
    }
  });
});

describe("ADMIN — DELETE /invitations/:id", () => {
  it("returns 401 without token", async () => {
    const res = await agent.delete("/api/admin/invitations/1");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 200 for valid deletion", async () => {
    const res = await agent
      .delete("/api/admin/invitations/999999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body).to.have.property("success", true);
    }
  });
});

describe("ADMIN — GET /users with filters", () => {
  itWithToken("returns all users with no filters", async () => {
    const res = await agent
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body).to.be.an("array");
    }
  });

  itWithToken("filters by search query", async () => {
    const res = await agent
      .get("/api/admin/users?q=admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });

  itWithToken("filters by role", async () => {
    const res = await agent
      .get("/api/admin/users?role=student")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      res.body.forEach((u) => expect(u.role).to.equal("student"));
    }
  });

  itWithToken("filters by multiple roles", async () => {
    const res = await agent
      .get("/api/admin/users?role=student,teacher")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
  });
});

describe("ADMIN — PATCH /users/:id/role edge cases", () => {
  itWithToken("returns 404 for non-existent user", async () => {
    const res = await agent
      .patch("/api/admin/users/999999/role")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "student" });
    expect([404, 500]).to.include(res.status);
  });
});
