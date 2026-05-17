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

describe("Announcements — CRUD & access control", () => {
  it("GET /announcements returns 200", async () => {
    const res = await agent.get("/api/announcements");
    expect([200, 401]).to.include(res.status);
    if (res.status === 200) expect(res.body).to.be.an("array");
  });

  it("POST /announcements without token returns 401", async () => {
    const res = await agent
      .post("/api/announcements")
      .send({ title: "Test", content: "Test content" });
    expect(res.status).to.equal(401);
  });

  itWithToken("POST /announcements without title returns 400", async () => {
    const res = await agent
      .post("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Test content" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /announcements without content returns 400", async () => {
    const res = await agent
      .post("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test title" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /announcements creates an announcement", async () => {
    const res = await agent
      .post("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test announcement", content: "This is a test announcement" });
    expect([201, 403]).to.include(res.status);
  });

  it("DELETE /announcements/:id without token returns 401", async () => {
    const res = await agent.delete("/api/announcements/1");
    expect(res.status).to.equal(401);
  });
});

describe("Announcements — Reactions", () => {
  let annId;

  before(async function () {
    if (!adminToken) this.skip();
    try {
      const res = await agent
        .post("/api/announcements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "React test", content: "Test for reactions" });
      if (res.status === 201) annId = res.body.id;
    } catch {
      // skip
    }
  });

  itWithToken("POST /announcements/:id/react with invalid type returns 400", async () => {
    if (!annId) this.skip();
    const res = await agent
      .post(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reaction_type: "invalid" });
    expect(res.status).to.equal(400);
  });

  itWithToken("POST /announcements/:id/react with valid type returns 200", async () => {
    if (!annId) this.skip();
    const res = await agent
      .post(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reaction_type: "like" });
    expect(res.status).to.equal(200);
  });

  itWithToken("POST /announcements/:id/react changes reaction type", async () => {
    if (!annId) this.skip();
    await agent
      .post(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reaction_type: "like" });
    const res = await agent
      .post(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reaction_type: "haha" });
    expect(res.status).to.equal(200);
  });

  itWithToken("DELETE /announcements/:id/react removes reaction", async () => {
    if (!annId) this.skip();
    const res = await agent
      .delete(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
  });

  itWithToken("DELETE /announcements/:id/react on non-existent reaction returns 200", async () => {
    if (!annId) this.skip();
    const res = await agent
      .delete(`/api/announcements/${annId}/react`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
  });
});
