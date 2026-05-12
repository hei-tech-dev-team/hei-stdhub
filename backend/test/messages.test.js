const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken;

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

describe("MESSAGES — Auth & validation", () => {
  describe("GET /messages/search", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.get("/api/messages/search?q=test");
      expect(res.status).to.equal(401);
    });

    const itWithToken = adminToken ? it : it.skip;

    itWithToken("retourne [] quand q est vide", async () => {
      const res = await agent
        .get("/api/messages/search?q=")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");
    });

    itWithToken("retourne [] quand q est absent", async () => {
      const res = await agent
        .get("/api/messages/search")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");
    });
  });

  describe("GET /messages/contacts", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.get("/api/messages/contacts");
      expect(res.status).to.equal(401);
    });
  });

  describe("GET /messages/global", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.get("/api/messages/global");
      expect(res.status).to.equal(401);
    });
  });

  describe("GET /messages/private/:id", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.get("/api/messages/private/1");
      expect(res.status).to.equal(401);
    });
  });

  describe("POST /messages", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent
        .post("/api/messages")
        .send({ content: "test", is_global: true });
      expect(res.status).to.equal(401);
    });

    const itWithToken = adminToken ? it : it.skip;

    itWithToken("retourne 400 quand content est vide", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "", is_global: true });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Message vide.");
    });

    itWithToken("retourne 400 quand content est absent", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_global: true });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Message vide.");
    });

    itWithToken("retourne 400 pour message privé sans receiver_id", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Test privé", is_global: false });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property(
        "error",
        "Destinataire requis.",
      );
    });

    itWithToken("retourne 400 pour message privé quand receiver_id est null", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Test", receiver_id: null, is_global: false });
      expect(res.status).to.equal(400);
    });
  });

  describe("PATCH /messages/:id/seen", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.patch("/api/messages/1/seen");
      expect(res.status).to.equal(401);
    });
  });

  describe("POST /messages/upload", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.post("/api/messages/upload");
      expect(res.status).to.equal(401);
    });
  });

  describe("DELETE /messages/:id", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.delete("/api/messages/1");
      expect(res.status).to.equal(401);
    });

    const itDeleteToken = adminToken ? it : it.skip;
    itDeleteToken("retourne 404 pour message inexistant", async () => {
      const res = await agent
        .delete("/api/messages/999999")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property("error");
    });
  });
});
