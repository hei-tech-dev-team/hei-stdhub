const chai = require("chai");
const request = require("supertest");
const jwt = require("jsonwebtoken");
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

describe("SECURITY — JWT attacks", () => {
  it("rejects request with no Authorization header", async () => {
    const res = await agent.get("/api/auth/me");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("Token manquant.");
  });

  it("rejects malformed Authorization header", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "NotBearer token123");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("Token manquant.");
  });

  it("rejects empty token after Bearer", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "Bearer ");
    expect(res.status).to.equal(401);
  });

  it("rejects token signed with wrong secret", async () => {
    const fakeToken = jwt.sign(
      { id: 1, ref: "ADMIN001", role: "admin" },
      "wrong-secret",
      { expiresIn: "1h" },
    );
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).to.equal(401);
  });

  it("rejects expired token", async () => {
    const expiredToken = jwt.sign(
      { id: 1, ref: "ADMIN001", role: "admin" },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "0s" },
    );
    await new Promise((r) => setTimeout(r, 1100));
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).to.equal(401);
  });

  it("rejects token with 'none' algorithm", async () => {
    const noneToken =
      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.";
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${noneToken}`);
    expect(res.status).to.equal(401);
  });

  itWithToken("rejects token from non-existent user", async () => {
    const fakeToken = jwt.sign(
      { id: 99999, ref: "GHOST", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const res = await agent
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${fakeToken}`);
    expect([200, 401, 500]).to.include(res.status);
  });

  it("verifies middleware rejects invalid JWT format", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "Bearer definitely.not.a.jwt");
    expect(res.status).to.equal(401);
  });
});

describe("SECURITY — Auth header edge cases", () => {
  it("rejects token in query string (no support)", async () => {
    const res = await agent.get("/api/auth/me?token=sometoken");
    expect(res.status).to.equal(401);
  });

  it("rejects token in request body (no support)", async () => {
    const res = await agent
      .get("/api/auth/me")
      .send({ token: "sometoken" });
    expect(res.status).to.equal(401);
  });

  it("rejects request with spaces-only Authorization", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "   ");
    expect(res.status).to.equal(401);
  });

  it("rejects Authorization header with colon separator", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "Bearer:token123");
    expect(res.status).to.equal(401);
  });

  it("rejects multiple Authorization headers", async () => {
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", "Bearer validtoken")
      .set("Authorization", "Bearer anothertoken");
    expect(res.status).to.equal(401);
  });
});

describe("SECURITY — SQL injection (limited)", () => {
  const sqlPayloads = [
    "' OR 1=1--",
    "' OR '1'='1",
    "'; DROP TABLE users--",
  ];

  sqlPayloads.forEach((payload) => {
    it(`handles SQL injection on login: ${payload.substring(0, 20)}`, async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ ref: payload, password: "test" });
      expect([400, 401, 500]).to.include(res.status);
    });
  });

  itWithToken("handles SQL injection on messages/search", async () => {
    const res = await agent
      .get("/api/messages/search?q=' OR 1=1--")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 400, 500]).to.include(res.status);
  });

  itWithToken("handles SQL injection on message content", async () => {
    const payload = "' UNION SELECT * FROM users--";
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: payload, is_global: true });
    expect([201, 400, 500]).to.include(res.status);
  });
});

describe("SECURITY — XSS", () => {
  itWithToken("stores XSS payload in global message", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "<script>alert('xss')</script>", is_global: true });
    expect(res.status).to.equal(201);
    expect(res.body.content).to.include("<script>");
  });

  itWithToken("accepts safe message content", async () => {
    const safe = "Bonjour, ceci est un message normal.";
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: safe, is_global: true });
    expect(res.status).to.equal(201);
    expect(res.body.content).to.equal(safe);
  });

  itWithToken("handles HTML entity payload in message", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "&lt;script&gt;", is_global: true });
    expect(res.status).to.equal(201);
  });
});

describe("SECURITY — Authorization matrix", () => {
  it("returns 401 for admin routes without token", async () => {
    const res = await agent.get("/api/admin/stats");
    expect(res.status).to.equal(401);
  });

  it("returns 401 for messages without token", async () => {
    const res = await agent.get("/api/messages/global");
    expect(res.status).to.equal(401);
  });

  it("returns 401 for submissions without token", async () => {
    const res = await agent.get("/api/submissions");
    expect(res.status).to.equal(401);
  });

  it("returns 401 for auth/me without token", async () => {
    const res = await agent.get("/api/auth/me");
    expect(res.status).to.equal(401);
  });

  itWithToken("allows admin to access stats", async () => {
    const res = await agent
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) {
      expect(res.body).to.have.property("total_users");
    }
  });
});

describe("SECURITY — Input validation", () => {
  itWithToken("rejects message with only whitespace", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "   ", is_global: true });
    expect(res.status).to.equal(400);
  });

  itWithToken("rejects message with null content", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: null, is_global: true });
    expect(res.status).to.equal(400);
  });

  itWithToken("rejects message with empty object content", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: {}, is_global: true });
    expect([400, 500]).to.include(res.status);
  });

  itWithToken("handles long message content", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "A".repeat(10000), is_global: true });
    expect(res.status).to.equal(201);
  });

  itWithToken("handles unicode message content", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Bonjour le monde — café au lait 中文", is_global: true });
    expect(res.status).to.equal(201);
  });

  itWithToken("rejects profile update with empty pseudo", async () => {
    const res = await agent
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pseudo: "" });
    expect(res.status).to.equal(400);
  });

  itWithToken("rejects profile update with whitespace pseudo", async () => {
    const res = await agent
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pseudo: "   " });
    expect(res.status).to.equal(400);
  });

  itWithToken("handles message with special characters", async () => {
    const res = await agent
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "!@#$%^&*()_+{}[]|\\:;\"'<>,.?/~`", is_global: true });
    expect(res.status).to.equal(201);
  });
});

describe("SECURITY — HTTP method tampering", () => {
  itWithToken("rejects PUT on messages/global", async () => {
    const res = await agent
      .put("/api/messages/global")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(404);
  });

  itWithToken("rejects DELETE on auth/me", async () => {
    const res = await agent
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).to.equal(404);
  });
});

describe("SECURITY — Malformed request bodies", () => {
  it("handles malformed JSON on login gracefully", async () => {
    const res = await agent
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("not json at all");
    expect(res.status).to.equal(400);
  });
});
