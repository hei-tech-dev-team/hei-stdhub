const chai = require("chai");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { io: ioc } = require("socket.io-client");

const app = require("../server");

const { expect } = chai;

const JWT_SECRET = process.env.JWT_SECRET;

const makeToken = (id) =>
  jwt.sign(
    { id, ref: `STD0000${id}`, role: "student", pseudo: `user${id}`, ues: [] },
    JWT_SECRET,
    { expiresIn: "1h" },
  );

describe("SOCKET.IO — user:join binds to the authenticated identity", () => {
  let io;
  let port;
  const clients = [];

  const connect = (id) => {
    const socket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      auth: { token: makeToken(id) },
      reconnection: false,
    });
    clients.push(socket);
    return socket;
  };

  before((done) => {
    io = app.get("io");
    io.httpServer.listen(0, () => {
      port = io.httpServer.address().port;
      done();
    });
  });

  after((done) => {
    clients.forEach((s) => s.close());
    io.httpServer.close(done);
  });

  it("ignores a spoofed user id and never leaks private messages to the attacker", function (done) {
    this.timeout(8000);

    const victim = connect(2);
    const attacker = connect(1);
    const sender = connect(3);

    let connected = 0;
    const onConnect = () => {
      if (++connected < 3) return;

      victim.emit("user:join", 2);
      // Attacker is authenticated as user 1 but claims user 2's room.
      attacker.emit("user:join", 2);

      setTimeout(() => {
        let victimReceived = false;
        let attackerReceived = false;

        victim.on("message:private", () => {
          victimReceived = true;
        });
        attacker.on("message:private", () => {
          attackerReceived = true;
        });

        // Messages are sent through the REST API, which broadcasts to the
        // receiver's room on the socket server.
        request(app)
          .post("/api/messages")
          .set("Authorization", `Bearer ${makeToken(3)}`)
          .send({ content: "confidentiel", receiver_id: 2, is_global: false })
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
    const forger = connect(2);
    const listener = connect(3);
    await onceConnected([forger, listener]);

    let received = false;
    listener.on("message:global", () => {
      received = true;
    });
    forger.emit("message:global", { content: "fake", sender_pseudo: "ADMIN", sender_id: 1 });
    await new Promise((r) => setTimeout(r, 300));
    expect(received).to.be.false;
  });

  it("refuses bde:* events from non-BDE users", async function () {
    this.timeout(5000);
    const student = connect(2);
    await onceConnected([student]);

    const error = new Promise((resolve) => student.on("error", resolve));
    student.emit("bde:join");
    const err = await error;
    expect(err.message).to.match(/BDE/);
    expect(io.sockets.adapter.rooms.get("bde")?.has(student.id) ?? false).to.be.false;
  });
});
