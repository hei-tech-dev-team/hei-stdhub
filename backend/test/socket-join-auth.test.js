const chai = require("chai");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { io: ioc } = require("socket.io-client");

const app = require("../server");
const db = require("../db");
const { createSession } = require("../services/sessionService");
const { signAccessToken } = require("../services/tokenAuth");

const { expect } = chai;

const users = {};
const tokens = {};
const sessionIds = {};
const fakeReq = { get: () => "socket-test", clientIp: "127.0.0.1", ip: "127.0.0.1" };

describe("SOCKET.IO — user:join binds to the authenticated identity", () => {
  let io;
  let port;
  const clients = [];

  const connect = (role) => {
    const socket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      auth: { token: tokens[role] },
      reconnection: false,
    });
    clients.push(socket);
    return socket;
  };

  before(async () => {
    io = app.get("io");
    await new Promise((resolve) => io.httpServer.listen(0, resolve));
    port = io.httpServer.address().port;

    const refs = ["STD97801", "STD97802", "STD97803"];
    const { rows: stale } = await db.query(
      "SELECT id FROM users WHERE ref = ANY($1::text[])",
      [refs],
    );
    const staleIds = stale.map((row) => row.id);
    if (staleIds.length) {
      await db.query(
        "DELETE FROM messages WHERE sender_id = ANY($1::int[]) OR receiver_id = ANY($1::int[])",
        [staleIds],
      );
      await db.query("DELETE FROM users WHERE id = ANY($1::int[])", [staleIds]);
    }
    const hash = await bcrypt.hash("password", 4);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, first_login)
       VALUES
         ('STD97801', 'Socket', 'Victim', 'hei.socket.97801@gmail.com', 'sock_victim', $1, 'student', FALSE),
         ('STD97802', 'Socket', 'Attacker', 'hei.socket.97802@gmail.com', 'sock_attacker', $1, 'student', FALSE),
         ('STD97803', 'Socket', 'Sender', 'hei.socket.97803@gmail.com', 'sock_sender', $1, 'student', FALSE)
       RETURNING id, ref, token_version`,
      [hash],
    );
    users.victim = rows[0];
    users.attacker = rows[1];
    users.sender = rows[2];

    for (const role of Object.keys(users)) {
      const session = await createSession({ user: users[role], req: fakeReq });
      sessionIds[role] = session.id;
      tokens[role] = signAccessToken({
        id: users[role].id,
        session_id: session.id,
        token_version: users[role].token_version,
      });
    }
  });

  after(async () => {
    clients.forEach((s) => s.close());
    await new Promise((resolve) => io.httpServer.close(resolve));
    const ids = Object.values(users).map((user) => user.id);
    await db.query("DELETE FROM messages WHERE sender_id = ANY($1::int[]) OR receiver_id = ANY($1::int[])", [ids]);
    await db.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
  });

  it("ignores a spoofed user id and never leaks private messages to the attacker", function (done) {
    this.timeout(8000);

    const victim = connect("victim");
    const attacker = connect("attacker");
    const sender = connect("sender");

    let connected = 0;
    const onConnect = () => {
      if (++connected < 3) return;

      victim.emit("user:join", users.victim.id);
      attacker.emit("user:join", users.victim.id);

      setTimeout(() => {
        let victimReceived = false;
        let attackerReceived = false;

        victim.on("message:private", () => {
          victimReceived = true;
        });
        attacker.on("message:private", () => {
          attackerReceived = true;
        });

        request(app)
          .post("/api/messages")
          .set("Authorization", `Bearer ${tokens.sender}`)
          .send({
            content: "confidentiel",
            receiver_id: users.victim.id,
            is_global: false,
          })
          .then((res) => expect(res.status).to.equal(201))
          .catch(done);

        setTimeout(() => {
          expect(victimReceived, "the authenticated user must receive").to.be.true;
          expect(attackerReceived, "a spoofed user id must not receive").to.be.false;
          done();
        }, 600);
      }, 200);
    };

    [victim, attacker, sender].forEach((s) => {
      s.on("connect", onConnect);
      s.on("connect_error", done);
    });
  });
  const onceConnected = (sockets) =>
    Promise.all(
      sockets.map(
        (s) =>
          new Promise((resolve, reject) => {
            s.on("connect", resolve);
            s.on("connect_error", reject);
          }),
      ),
    );

  it("no longer relays client-forged message:global events", async function () {
    this.timeout(5000);
    const forger = connect("attacker");
    const listener = connect("sender");
    await onceConnected([forger, listener]);

    let received = false;
    listener.on("message:global", () => {
      received = true;
    });
    forger.emit("message:global", { content: "fake", sender_pseudo: "ADMIN", sender_id: users.victim.id });
    await new Promise((r) => setTimeout(r, 300));
    expect(received).to.be.false;
  });

  it("refuses bde:* events from non-BDE users", async function () {
    this.timeout(5000);
    const student = connect("attacker");
    await onceConnected([student]);

    const error = new Promise((resolve) => student.on("error", resolve));
    student.emit("bde:join");
    const err = await error;
    expect(err.message).to.match(/BDE/);
    expect(io.sockets.adapter.rooms.get("bde")?.has(student.id) ?? false).to.be.false;
  });

  it("disconnects the socket when its session is revoked", async function () {
    this.timeout(8000);
    const socket = connect("attacker");
    await onceConnected([socket]);

    const revoked = new Promise((resolve) =>
      socket.on("session:revoked", resolve),
    );
    const disconnected = new Promise((resolve) =>
      socket.on("disconnect", resolve),
    );

    const res = await request(app)
      .delete(`/api/auth/sessions/${sessionIds.attacker}`)
      .set("Authorization", `Bearer ${tokens.attacker}`);
    expect(res.status).to.equal(204);

    const payload = await revoked;
    expect(payload.reason).to.equal("manual");
    await disconnected;
  });
});
