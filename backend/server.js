const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { warnOrExitOnLeakedSecrets } = require("./services/leakedSecrets");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("./services/tokenAuth");
const webpush = require("web-push");

const { startMessagePurgeJob } = require("./services/messagePurgeJob");
const { warnIfSeedAccountsPresent } = require("./services/securityChecks");

// Refuse to boot in production while a credential exposed in git history is
// still configured. Development only warns: local `.env` files are expected,
// but they must be rotated too before they can be used to deploy (#127).
warnOrExitOnLeakedSecrets();

// Validate critical env vars at startup. In production the VAPID keys must
// come from the environment: Render's disk is ephemeral, so keys generated at
// runtime rotate on every redeploy, invalidate all push subscriptions and
// break the push-based password reset (audit I1).
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "CLIENT_URL"];
if (process.env.NODE_ENV === "production") {
  REQUIRED_ENV.push("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY");
}
const missingEnv = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

// VAPID keys — development only: auto-generated if missing, persisted to disk
const VAPID_KEYS_FILE = process.env.VAPID_KEYS_FILE || path.join(__dirname, ".vapid-keys.json");
const VAPID_KEYS_FILE_FALLBACK = path.join(__dirname, "..", ".vapid-keys.json");

function loadOrGenerateVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.info("VAPID keys loaded from environment variables.");
    return;
  }
  const candidates = [VAPID_KEYS_FILE, VAPID_KEYS_FILE_FALLBACK];
  for (const file of candidates) {
    try {
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      if (saved.publicKey && saved.privateKey) {
        process.env.VAPID_PUBLIC_KEY = saved.publicKey;
        process.env.VAPID_PRIVATE_KEY = saved.privateKey;
        console.info("VAPID keys loaded from", file);
        return;
      }
    } catch {}
  }
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
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 20,
  message: { error: "Trop de tentatives, Merci de reessayer dans 5 minutes." },
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
io.use(async (socket, next) => {
  // Token only via handshake auth: query strings end up in proxy/access logs (L3).
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Token manquant."));
  try {
    const user = await verifyAccessToken(token);
    if (!user) return next(new Error("Token invalide."));
    socket.user = user;
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
    setHeaders: (res, filePath) => {
      // Never let the browser sniff or render user uploads as active content.
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      if (!/\.(jpe?g|png|gif|webp)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  }),
);

// Route registration
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", loginLimiter);
app.use("/api/auth/reset-password", loginLimiter);
app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/push", require("./routes/push"));
app.use("/api/pings", require("./routes/pings"));
app.use("/api/custom-ues", require("./routes/custom-ues"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/bug-reports", require("./routes/bugReports"));
app.use("/api/support-tickets", require("./routes/supportTickets"));
app.use("/api/posts", require("./routes/post"));

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

// Socket.io event handlers — optimized for scale
const onlineUsers = new Map();
const MAX_ONLINE_USERS = parseInt(process.env.MAX_ONLINE_USERS || "5000", 10);

const BDE_STATUSES = new Set(["recu", "accepte", "a_discuter", "refuse"]);
const MAX_JUSTIFICATION_LENGTH = 1000;
const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Per-socket flood protection: at most SOCKET_RATE_MAX events per window.
const SOCKET_RATE_WINDOW_MS = 10 * 1000;
const SOCKET_RATE_MAX = parseInt(process.env.SOCKET_RATE_MAX || "60", 10);

io.on("connection", (socket) => {
  let windowStart = Date.now();
  let eventCount = 0;
  socket.use((packet, next) => {
    const now = Date.now();
    if (now - windowStart > SOCKET_RATE_WINDOW_MS) {
      windowStart = now;
      eventCount = 0;
    }
    eventCount += 1;
    if (eventCount > SOCKET_RATE_MAX) {
      if (eventCount === SOCKET_RATE_MAX + 1) {
        console.warn(`[socket ${socket.id}] rate limit exceeded (user ${socket.user?.id})`);
        socket.emit("error", { message: "Trop d'evenements, ralentissez." });
      }
      return; // drop the event
    }
    next();
  });

  socket.on("user:join", (clientUserId) => {
    if (onlineUsers.size >= MAX_ONLINE_USERS) {
      socket.emit("error", { message: "Serveur saturé." });
      return;
    }

    // Bind the room to the authenticated identity, never to client input.
    const userId = socket.user?.id;
    if (!userId) {
      console.warn(`[socket ${socket.id}] user:join ignored: unauthenticated socket`);
      return;
    }
    if (clientUserId != null && String(clientUserId) !== String(userId)) {
      console.warn(
        `[socket ${socket.id}] user:join id mismatch (client=${clientUserId}, auth=${userId}), using authenticated id`,
      );
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

    // Broadcast to others only (not to self), hide developer
    if (socket.user?.role !== "developer") {
      socket.broadcast.emit("user:online", userId);
    }
  });

  socket.on("dev:join", () => {
    if (socket.user?.role === "developer") {
      socket.join("developers");
    }
  });

  // Chat messages are only sent through the REST API (POST /api/messages),
  // which validates, filters, persists and then broadcasts them. The former
  // "message:global" / "message:private" socket handlers relayed arbitrary
  // client objects (forged sender_pseudo/sender_id, unbounded size) and have
  // been removed on purpose (audit H5).

  socket.on("message:seen", (payload) => {
    const messageId = toPositiveInt(payload?.messageId);
    const senderId = toPositiveInt(payload?.senderId);
    if (!socket.userId || !messageId || !senderId) return;
    io.to(`user:${senderId}`).emit("message:seen", { messageId, readerId: socket.userId });
  });

  socket.on("typing:started", (payload) => {
    if (!socket.userId) return;
    if (payload?.isGlobal) {
      socket.to("global-chat").emit("typing:started", { userId: socket.userId, pseudo: socket.user.pseudo });
      return;
    }
    const contactId = toPositiveInt(payload?.contactId);
    if (!contactId) return;
    io.to(`user:${contactId}`).emit("typing:started", { userId: socket.userId, pseudo: socket.user.pseudo });
  });

  socket.on("typing:stopped", (payload) => {
    if (!socket.userId) return;
    if (payload?.isGlobal) {
      socket.to("global-chat").emit("typing:stopped", { userId: socket.userId });
      return;
    }
    const contactId = toPositiveInt(payload?.contactId);
    if (!contactId) return;
    io.to(`user:${contactId}`).emit("typing:stopped", { userId: socket.userId });
  });

  // BDE Kanban: only BDE members may join the room or broadcast to it.
  const isBde = () => socket.user?.role === "bde";

  socket.on("bde:join", () => {
    if (!isBde()) {
      socket.emit("error", { message: "Acces reserve au BDE." });
      return;
    }
    socket.join("bde");
  });

  socket.on("bde:drag-start", (payload) => {
    const suggestionId = toPositiveInt(payload?.suggestionId);
    if (!isBde() || !suggestionId) return;
    socket.to("bde").emit("bde:drag-start", { suggestionId, bySocket: socket.id });
  });

  socket.on("bde:drag-over", (payload) => {
    const columnId = payload?.columnId;
    if (!isBde() || !BDE_STATUSES.has(columnId)) return;
    socket.to("bde").emit("bde:drag-over", { columnId, bySocket: socket.id });
  });

  socket.on("bde:drag-end", () => {
    if (!isBde()) return;
    socket.to("bde").emit("bde:drag-end", { bySocket: socket.id });
  });

  socket.on("bde:update", (payload) => {
    const id = toPositiveInt(payload?.id);
    const statut = payload?.statut;
    const justification =
      typeof payload?.justification === "string"
        ? payload.justification.slice(0, MAX_JUSTIFICATION_LENGTH)
        : null;
    if (!isBde() || !id || !BDE_STATUSES.has(statut)) return;
    socket.to("bde").emit("bde:update", { id, statut, justification });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      if (socket.user?.role !== "developer") {
        socket.broadcast.emit("user:offline", socket.userId);
      }
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_security_questions (
        id            SERIAL       PRIMARY KEY,
        user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_key  VARCHAR(255) NOT NULL,
        question_text TEXT         NULL,
        answer_hash   VARCHAR(60)  NOT NULL,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, question_key)
      )
    `);
  } catch (err) { console.error("Failed to create user_security_questions table:", err); }

  try {
    await pool.query(`ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check`);
    await pool.query(`ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('student', 'teacher'))`);
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
      CREATE TABLE IF NOT EXISTS chat_favorites (
        user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id INTEGER   NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, contact_id)
      )
    `);
  } catch (err) { console.error("Failed to create chat_favorites table:", err); }
})();

startMessagePurgeJob(io);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  const httpServer = server.listen(PORT, () =>
    console.log(`HEI STDhub API → http://localhost:${PORT}`),
  );
  warnIfSeedAccountsPresent();

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    httpServer.close(() => {
      pool.end().then(() => {
        console.log("DB pool closed.");
        process.exit(0);
      }).catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10000);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
