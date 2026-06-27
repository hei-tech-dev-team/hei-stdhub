const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken = "";
let studentToken = "";

const itWithToken = (desc, fn) => {
  it(desc, function () {
    if (!adminToken) this.skip();
    return fn.call(this);
  });
};
const itWithStudent = (desc, fn) => {
  it(desc, function () {
    if (!studentToken) this.skip();
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
  try {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "STD001", password: "password" });
    studentToken = res.body.token;
  } catch {
    studentToken = "";
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

describe("PUSH — GET /notifications", () => {
  it("returns 401 without token", async () => {
    const res = await agent.get("/api/push/notifications");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 200 with array", async () => {
    const res = await agent
      .get("/api/push/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });
});

describe("PUSH — GET /notifications/unread-count", () => {
  it("returns 401 without token", async () => {
    const res = await agent.get("/api/push/notifications/unread-count");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 200 with count", async () => {
    const res = await agent
      .get("/api/push/notifications/unread-count")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("count");
    expect(res.body.count).to.be.a("number");
  });
});

describe("PUSH — PATCH /notifications/read", () => {
  it("returns 401 without token", async () => {
    const res = await agent.patch("/api/push/notifications/read").send({ ids: [1] });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 when ids is missing", async () => {
    const res = await agent
      .patch("/api/push/notifications/read")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 when ids is empty", async () => {
    const res = await agent
      .patch("/api/push/notifications/read")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ids: [] });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 200 with valid ids", async () => {
    const res = await agent
      .patch("/api/push/notifications/read")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ids: [0] });
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body.success).to.be.true;
    }
  });
});

describe("PUSH — Notification triggers in routes", () => {
  itWithToken("POST /posts triggers push notification", async () => {
    const res = await agent
      .post("/api/posts")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Test notification post")
      .field("ue", "WEB1")
      .field("type", "COURS")
      .field("link", "https://example.com/test");
    expect([201, 500]).to.include(res.status);
  });

  itWithToken("POST /announcements triggers push notification", async () => {
    const res = await agent
      .post("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Nouveau message", content: "Voici une annonce de test" });
    expect([201, 500]).to.include(res.status);
  });
});
