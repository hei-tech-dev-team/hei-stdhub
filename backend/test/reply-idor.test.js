const chai = require("chai");
const request = require("supertest");
const app = require("../server");
const db = require("../db");

const { expect } = chai;

const login = async (ref) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ ref, password: "password" });
  return res.body.token || "";
};

describe("MESSAGES — reply_to_id must not leak foreign private messages", () => {
  let adminToken;
  let studentToken;
  let teacherToken;
  let studentId;
  let teacherId;
  let devId;
  let secretId;
  const secret = "SECRET interdit aux autres utilisateurs";

  before(async () => {
    [adminToken, studentToken, teacherToken] = await Promise.all([
      login("ADMIN001"),
      login("STD25001"),
      login("PROF001"),
    ]);

    const { rows: users } = await db.query(
      "SELECT ref, id FROM users WHERE ref = ANY($1::text[])",
      [["ADMIN001", "STD25001", "PROF001", "DEV001"]],
    );
    const ids = Object.fromEntries(users.map((user) => [user.ref, user.id]));
    studentId = ids.STD25001;
    teacherId = ids.PROF001;
    devId = ids.DEV001;

    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: secret, receiver_id: devId, is_global: false });
    secretId = res.body.id;
  });

  it("does not expose the quoted content on send", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        content: "tentative de fuite",
        receiver_id: teacherId,
        is_global: false,
        reply_to_id: secretId,
      });

    expect(res.status).to.equal(201);
    expect(res.body.reply_to_content).to.equal(null);
    expect(res.body.reply_to_sender).to.equal(null);
  });

  it("does not expose the quoted content when reading the conversation", async () => {
    const res = await request(app)
      .get(`/api/messages/private/${teacherId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).to.equal(200);
    const leaked = res.body.find((m) => m.content === "tentative de fuite");
    expect(leaked, "the message should exist").to.not.equal(undefined);
    expect(leaked.reply_to_content).to.equal(null);
  });

  it("does not expose the quoted content in the global chat", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ content: "fuite globale", is_global: true, reply_to_id: secretId });

    expect(res.status).to.equal(201);
    expect(res.body.reply_to_content).to.equal(null);

    const list = await request(app)
      .get("/api/messages/global")
      .set("Authorization", `Bearer ${studentToken}`);
    const leaked = list.body.find((m) => m.content === "fuite globale");
    expect(leaked, "the global message should exist").to.not.equal(undefined);
    expect(leaked.reply_to_content).to.equal(null);
  });

  it("does not resolve a pre-existing malicious reply on read", async () => {
    // Simulates a row created before the write-side fix.
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_global, reply_to_id)
       VALUES ($1, $2, $3, FALSE, $4) RETURNING id`,
      [studentId, teacherId, "ligne historique malveillante", secretId],
    );
    const malformedId = rows[0].id;

    const res = await request(app)
      .get(`/api/messages/private/${teacherId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    const row = res.body.find((m) => m.id === malformedId);
    expect(row, "the historical message should exist").to.not.equal(undefined);
    expect(row.reply_to_content).to.equal(null);
    expect(row.reply_to_sender).to.equal(null);
  });

  it("still resolves a reply to a message from the same conversation", async () => {
    const original = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ content: "question légitime", receiver_id: teacherId, is_global: false });

    const reply = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        content: "réponse légitime",
        receiver_id: studentId,
        is_global: false,
        reply_to_id: original.body.id,
      });

    expect(reply.status).to.equal(201);
    expect(reply.body.reply_to_content).to.equal("question légitime");
  });
});
