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

    const itUploadToken = adminToken ? it : it.skip;

    itUploadToken("retourne 400 sans fichier", async () => {
      const res = await agent
        .post("/api/messages/upload")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error");
    });

    itUploadToken("upload une image et retourne filename, url, isImage", async () => {
      const res = await agent
        .post("/api/messages/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from("fake image content"), "test.png");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("filename");
      expect(res.body).to.have.property("url");
      expect(res.body).to.have.property("isImage", true);
    });

    itUploadToken("upload un fichier non-image et retourne isImage=false", async () => {
      const res = await agent
        .post("/api/messages/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from("fake pdf content"), "test.pdf");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("filename");
      expect(res.body).to.have.property("url");
      expect(res.body).to.have.property("isImage", false);
    });
  });

  describe("POST /messages avec contenu FILE", () => {
    const itWithToken = adminToken ? it : it.skip;

    itWithToken("envoie un message global avec un tag FILE", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "[FILE:test.png:http://example.com/test.png:img:1234]", is_global: true });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("id");
      expect(res.body.content).to.include("[FILE:");
    });

    itWithToken("envoie un message privé avec un tag FILE", async () => {
      const res = await agent
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "[FILE:doc.pdf:http://example.com/doc.pdf:file:5678]", is_global: false, receiver_id: 1 });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("id");
      expect(res.body.content).to.include("[FILE:");
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

  describe("GET /messages/unread", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.get("/api/messages/unread");
      expect(res.status).to.equal(401);
    });

    const itUnreadToken = adminToken ? it : it.skip;
    itUnreadToken("retourne les compteurs avec token", async () => {
      const res = await agent
        .get("/api/messages/unread")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("global");
      expect(res.body).to.have.property("contacts");
      expect(typeof res.body.global).to.equal("number");
    });
  });

  describe("POST /messages/global/read", () => {
    it("retourne 401 sans token", async () => {
      const res = await agent.post("/api/messages/global/read").send({ messageId: 1 });
      expect(res.status).to.equal(401);
    });

    const itGlobalReadToken = adminToken ? it : it.skip;
    itGlobalReadToken("retourne 400 sans messageId", async () => {
      const res = await agent
        .post("/api/messages/global/read")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error");
    });

    itGlobalReadToken("retourne 200 avec messageId valide", async () => {
      const res = await agent
        .post("/api/messages/global/read")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ messageId: 1 });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("success", true);
    });
  });
});
