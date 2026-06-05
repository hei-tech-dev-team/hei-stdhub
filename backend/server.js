const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const webpush = require("web-push");

// Validate critical env vars at startup
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "CLIENT_URL"];
const missingEnv = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

// VAPID keys — auto-generated if missing, persisted to disk across restarts
const VAPID_KEYS_FILE = process.env.VAPID_KEYS_FILE || path.join(__dirname, ".vapid-keys.json");

function loadOrGenerateVapidKeys() {
  // 1. Environment variables (production best practice)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.info("VAPID keys loaded from environment variables.");
    return;
  }
  // 2. Persistent file from a previous run
  try {
    const saved = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, "utf8"));
    if (saved.publicKey && saved.privateKey) {
      process.env.VAPID_PUBLIC_KEY = saved.publicKey;
      process.env.VAPID_PRIVATE_KEY = saved.privateKey;
      console.info("VAPID keys loaded from persistent file.");
      return;
    }
  } catch {}
  // 3. Generate and persist so they survive restarts
  const vapidKeys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  try {
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2));
    console.info(`VAPID keys generated and persisted to ${VAPID_KEYS_FILE}.`);
  } catch (err) {
    console.warn("VAPID keys generated for this runtime but could not persist:", err.message);
  }
}

loadOrGenerateVapidKeys();

webpush.setVapidDetails(
  "mailto:hei@stdhub.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "30000", 10);
server.timeout = REQUEST_TIMEOUT;
app.use((req, res, next) => {
  req.socket.setTimeout(REQUEST_TIMEOUT);
  if (req.socket.listenerCount("timeout") === 0) {
    req.socket.on("timeout", () => {
      if (!res.headersSent) res.status(503).json({ error: "Requête expirée." });
    });
  }
  next();
});

// Rate limiting — disabled during tests
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 3,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 50,
  message: { error: "Trop de requêtes. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 15,
  message: { error: "Trop de requêtes d'écriture. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.io setup — optimized for 1000+ concurrent connections
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "https://hei-stdhub.vercel.app",
    ].filter(Boolean),
    methods: ["GET", "POST"],
  },
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || "20000", 10),
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || "25000", 10),
  maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER || "1048576", 10), // 1MB
  perMessageDeflate: {
    threshold: parseInt(process.env.SOCKET_DEFLATE_THRESHOLD || "1024", 10), // only compress > 1KB
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // recover sessions up to 2 minutes
  },
});

// Socket auth middleware — verify JWT on connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error("Token manquant."));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Token invalide."));
  }
});

// Middleware stack
app.use(compression());

const corsOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hei-stdhub.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
  }),
);

// Route registration
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", loginLimiter);
app.use("/api/auth/reset-password", loginLimiter);

// Global API rate limiters — aggressive to protect the DB
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});
app.use("/api", generalLimiter);

app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/push", require("./routes/push"));
app.use("/api/pings", require("./routes/pings"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/alumni-spotlight", require("./routes/alumniSpotlight"));

// Health check endpoint
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

// Expose VAPID public key for push subscriptions
app.get("/api/push/vapid-key", (req, res) =>
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY }),
);

app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400 && "body" in err)) {
    return res.status(400).json({ error: "JSON malformé." });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Fichier trop volumineux." });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur." });
});

const { containsProfanity } = require("./middleware/profanity");

// Socket.io event handlers — optimized for scale
const onlineUsers = new Map();
const MAX_ONLINE_USERS = parseInt(process.env.MAX_ONLINE_USERS || "5000", 10);

io.on("connection", (socket) => {
  socket.on("user:join", (userId) => {
    if (onlineUsers.size >= MAX_ONLINE_USERS) {
      socket.emit("error", { message: "Serveur saturé." });
      return;
    }

    // Leave previous room for this userId (handles reconnection)
    const prevSocketId = onlineUsers.get(userId);
    if (prevSocketId) {
      const prevSocket = io.sockets.sockets.get(prevSocketId);
      if (prevSocket) {
        prevSocket.leave(`user:${userId}`);
      }
    }

    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.join(`user:${userId}`);
    socket.join("global-chat");

    // Broadcast to others only (not to self)
    socket.broadcast.emit("user:online", userId);
  });

  socket.on("message:global", (msg) => {
    if (!msg || !msg.content || containsProfanity(msg.content)) {
      socket.emit("error", { message: "Message contenant des propos inappropriés." });
      return;
    }
    io.emit("message:global", msg);
  });

  socket.on("message:private", ({ receiverId, msg }) => {
    if (!receiverId || !msg) return;
    io.to(`user:${receiverId}`).emit("message:private", msg);
    io.to(`user:${socket.userId}`).emit("message:private", msg);
  });

  socket.on("message:seen", ({ messageId, senderId }) => {
    if (!messageId || !senderId) return;
    io.to(`user:${senderId}`).emit("message:seen", { messageId, readerId: socket.userId });
  });

  socket.on("typing:started", ({ contactId, isGlobal }) => {
    if (!contactId) return;
    if (isGlobal) {
      socket.to("global-chat").emit("typing:started", { userId: socket.userId, pseudo: socket.user.pseudo });
    } else {
      io.to(`user:${contactId}`).emit("typing:started", { userId: socket.userId, pseudo: socket.user.pseudo });
    }
  });

  socket.on("typing:stopped", ({ contactId, isGlobal }) => {
    if (!contactId) return;
    if (isGlobal) {
      socket.to("global-chat").emit("typing:stopped", { userId: socket.userId });
    } else {
      io.to(`user:${contactId}`).emit("typing:stopped", { userId: socket.userId });
    }
  });

  socket.on("bde:join", () => {
    socket.join("bde");
  });

  socket.on("bde:drag-start", ({ suggestionId }) => {
    socket.to("bde").emit("bde:drag-start", { suggestionId, bySocket: socket.id });
  });

  socket.on("bde:drag-over", ({ columnId }) => {
    socket.to("bde").emit("bde:drag-over", { columnId, bySocket: socket.id });
  });

  socket.on("bde:drag-end", () => {
    socket.to("bde").emit("bde:drag-end", { bySocket: socket.id });
  });

  socket.on("bde:update", ({ id, statut, justification }) => {
    socket.to("bde").emit("bde:update", { id, statut, justification });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user:offline", socket.userId);
    }
  });
});

app.set("io", io);

const { pool } = require("./db");

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL       PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64)  NOT NULL UNIQUE,
        expires_at TIMESTAMP    NOT NULL,
        used_at    TIMESTAMP    NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) { console.error("Failed to create password_reset_tokens table:", err); }



  try {
    await pool.query(`ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check`);
    await pool.query(`ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('student', 'teacher', 'alumni'))`);
  } catch (_) {}

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         SERIAL       PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint   TEXT         NOT NULL,
        auth_key   TEXT         NOT NULL,
        p256dh_key TEXT         NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, endpoint)
      )
    `);
  } catch (err) { console.error("Failed to create push_subscriptions table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id         SERIAL       PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       VARCHAR(50)  NOT NULL,
        title      VARCHAR(255) NOT NULL,
        body       TEXT         NOT NULL DEFAULT '',
        data       JSONB        NULL,
        is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) { console.error("Failed to create push_notifications table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_chat_read (
        user_id            INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_msg_id   INTEGER   NOT NULL DEFAULT 0,
        updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id)
      )
    `);
  } catch (err) { console.error("Failed to create global_chat_read table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pings (
        id           SERIAL       PRIMARY KEY,
        sender_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMP    NULL,
        UNIQUE (sender_id, receiver_id)
      )
    `);
  } catch (err) { console.error("Failed to create pings table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id            SERIAL       PRIMARY KEY,
        title         VARCHAR(255) NOT NULL,
        content       TEXT         NOT NULL,
        image_url     TEXT         NULL,
        author_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_level  VARCHAR(5)   NULL,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) { console.error("Failed to create announcements table:", err); }

  // Migration: add target_level if missing (existing tables on Render)
  try {
    await pool.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_level VARCHAR(5) NULL`);
  } catch (_) {}

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcement_reactions (
        id               SERIAL      PRIMARY KEY,
        announcement_id  INTEGER     NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type    VARCHAR(20) NOT NULL,
        created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE (announcement_id, user_id)
      )
    `);
  } catch (err) { console.error("Failed to create announcement_reactions table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_favorites (
        user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id INTEGER   NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, contact_id)
      )
    `);
  } catch (err) { console.error("Failed to create chat_favorites table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alumni_spotlight (
        id            SERIAL       PRIMARY KEY,
        title         VARCHAR(255) NOT NULL,
        content       TEXT         NOT NULL,
        image_url     TEXT         NULL,
        author_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) { console.error("Failed to create alumni_spotlight table:", err); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alumni_tip_reactions (
        id               SERIAL      PRIMARY KEY,
        tip_id           INTEGER     NOT NULL REFERENCES alumni_spotlight(id) ON DELETE CASCADE,
        user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type    VARCHAR(20) NOT NULL,
        created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE (tip_id, user_id)
      )
    `);
  } catch (err) { console.error("Failed to create alumni_tip_reactions table:", err); }
})();

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`HEI STDhub API → http://localhost:${PORT}`),
  );
}

module.exports = app;
