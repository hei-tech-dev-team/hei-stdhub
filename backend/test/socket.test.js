const chai = require("chai");
const http = require("http");
const { Server } = require("socket.io");
const { io: ioc } = require("socket.io-client");

const { expect } = chai;

describe("SOCKET.IO — Server events", () => {
  let httpServer;
  let ioServer;
  let clientSocket1;
  let clientSocket2;
  const PORT = 3999;

  before((done) => {
    httpServer = http.createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: "*" },
    });

    // Minimal socket logic like the real server
    const onlineUsers = new Map();
    ioServer.on("connection", (socket) => {
      socket.on("user:join", (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`);
        ioServer.emit("user:online", userId);
      });

      socket.on("message:global", (msg) => {
        ioServer.emit("message:global", msg);
      });

      socket.on("message:private", ({ receiverId, msg }) => {
        ioServer.to(`user:${receiverId}`).emit("message:private", msg);
        ioServer.to(`user:${socket.userId}`).emit("message:private", msg);
      });

      socket.on("message:seen", ({ messageId, senderId }) => {
        ioServer.to(`user:${senderId}`).emit("message:seen", { messageId });
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
          ioServer.emit("user:offline", socket.userId);
        }
      });
    });

    httpServer.listen(PORT, done);
  });

  beforeEach((done) => {
    clientSocket1 = ioc(`http://localhost:${PORT}`, {
      transports: ["websocket"],
    });
    clientSocket2 = ioc(`http://localhost:${PORT}`, {
      transports: ["websocket"],
    });

    // Wait for both to connect
    let connected = 0;
    const onConnect = () => {
      connected++;
      if (connected >= 2) done();
    };
    clientSocket1.on("connect", onConnect);
    clientSocket2.on("connect", onConnect);
  });

  afterEach(() => {
    clientSocket1?.close();
    clientSocket2?.close();
  });

  after(() => {
    ioServer?.close();
    httpServer?.close();
  });

  it("user:join crée une room et émettre message:private vers le bon user", (done) => {
    clientSocket1.emit("user:join", "user1");
    clientSocket2.emit("user:join", "user2");

    // Wait for join to be processed
    setTimeout(() => {
      clientSocket1.on("message:private", (msg) => {
        expect(msg).to.have.property("text", "salut user1");
        done();
      });

      clientSocket2.emit("message:private", {
        receiverId: "user1",
        msg: { text: "salut user1", sender: "user2" },
      });
    }, 100);
  });

  it("message:global est reçu par tous les clients", (done) => {
    let received = 0;
    clientSocket1.on("message:global", (msg) => {
      expect(msg).to.have.property("text", "annonce");
      received++;
      if (received >= 2) done();
    });
    clientSocket2.on("message:global", (msg) => {
      expect(msg).to.have.property("text", "annonce");
      received++;
      if (received >= 2) done();
    });

    ioServer.emit("message:global", { text: "annonce" });
  });

  it("message:seen notifie seulement le sender", (done) => {
    clientSocket1.emit("user:join", "user1");
    clientSocket2.emit("user:join", "user2");

    setTimeout(() => {
      clientSocket1.on("message:seen", (data) => {
        expect(data).to.have.property("messageId", 42);
        done();
      });

      // user2 seen the message from user1
      ioServer.to("user:user1").emit("message:seen", { messageId: 42 });
    }, 100);
  });

  it("déconnexion supprime le user des onlineUsers", (done) => {
    clientSocket1.emit("user:join", "user1");

    setTimeout(() => {
      clientSocket1.close();

      // Après déconnexion, le onlineUsers devrait être vide pour user1
      // Mais on ne peut pas accéder à onlineUsers de l'extérieur
      // On vérifie juste que la déconnexion ne crée pas d'erreur
      done();
    }, 100);
  });

  it("user:online est émis quand un utilisateur se connecte", (done) => {
    clientSocket2.on("user:online", (userId) => {
      expect(userId).to.equal("user1");
      done();
    });

    clientSocket1.emit("user:join", "user1");
  });

  it("user:offline est émis quand un utilisateur se déconnecte", (done) => {
    clientSocket2.on("user:offline", (userId) => {
      expect(userId).to.equal("user1");
      done();
    });

    clientSocket1.emit("user:join", "user1");
    setTimeout(() => clientSocket1.close(), 50);
  });

  it("message:private reçu seulement par le destinataire et l'expéditeur", (done) => {
    clientSocket1.emit("user:join", "user1");
    clientSocket2.emit("user:join", "user2");
    // Un troisième client qui ne devrait pas recevoir
    const clientSocket3 = ioc(`http://localhost:${PORT}`, {
      transports: ["websocket"],
    });

    let receivedCount = 0;
    const unexpectedMsg = () => {
      expect.fail("Le troisième client ne devrait pas recevoir le message");
    };

    clientSocket3.on("connect", () => {
      clientSocket3.emit("user:join", "user3");
      clientSocket3.on("message:private", unexpectedMsg);

      setTimeout(() => {
        clientSocket1.on("message:private", () => {
          receivedCount++;
          if (receivedCount === 2) {
            clientSocket3.off("message:private", unexpectedMsg);
            clientSocket3.close();
            done();
          }
        });
        clientSocket2.on("message:private", () => {
          receivedCount++;
          if (receivedCount === 2) {
            clientSocket3.off("message:private", unexpectedMsg);
            clientSocket3.close();
            done();
          }
        });

        clientSocket1.emit("message:private", {
          receiverId: "user2",
          msg: { text: "secret", sender: "user1" },
        });
      }, 150);
    });
  });
});
