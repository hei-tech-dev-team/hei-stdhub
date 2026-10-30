const chai = require("chai");
const jwt = require("jsonwebtoken");
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

        sender.emit("message:private", {
          receiverId: 2,
          msg: { text: "confidentiel" },
        });

        setTimeout(() => {
          expect(victimReceived, "the authenticated user must receive").to.be.true;
          expect(attackerReceived, "a spoofed user id must not receive").to.be.false;
          done();
        }, 300);
      }, 200);
    };

    [victim, attacker, sender].forEach((s) => {
      s.on("connect", onConnect);
      s.on("connect_error", done);
    });
  });
});
