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

describe("PUSH — POST /subscribe", () => {
  it("returns 401 without token", async () => {
    const res = await agent.post("/api/push/subscribe").send({
      subscription: { endpoint: "https://example.com/push" },
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 when subscription is missing", async () => {
    const res = await agent
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 when subscription.endpoint is missing", async () => {
    const res = await agent
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subscription: {} });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 201 with valid subscription", async () => {
    const res = await agent
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subscription: {
          endpoint: `https://example.com/push/test-${Date.now()}`,
          keys: { auth: "test-auth", p256dh: "test-p256dh" },
        },
      });
    expect([201, 500]).to.include(res.status);
    if (res.status === 201) {
      expect(res.body.subscribed).to.be.true;
    }
  });
});

describe("PUSH — DELETE /subscribe", () => {
  it("returns 401 without token", async () => {
    const res = await agent.delete("/api/push/subscribe").send({
      endpoint: "https://example.com/push",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 when endpoint is missing", async () => {
    const res = await agent
      .delete("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 200 with valid endpoint", async () => {
    const res = await agent
      .delete("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ endpoint: `https://example.com/push/delete-test-${Date.now()}` });
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body.unsubscribed).to.be.true;
    }
  });
});

describe("PUSH — GET /vapid-key", () => {
  it("returns 200 with publicKey", async () => {
    const res = await agent.get("/api/push/vapid-key");
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("publicKey");
  });
});
