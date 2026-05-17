const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
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

// VAPID keys — auto-generated if missing
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  const vapidKeys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY ||= vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY ||= vapidKeys.privateKey;
  console.info("VAPID keys generated for this runtime. Configure persistent keys in production env.");
}

webpush.setVapidDetails(
  "mailto:hei@stdhub.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Email provider diagnostics
console.info("--- EMAIL CONFIGURATION ---");
if (process.env.RESEND_API_KEY) {
  const keyPreview = process.env.RESEND_API_KEY.substring(0, 8) + "...";
  console.info(`Resend: CONFIGURED (key: ${keyPreview})`);
} else {
  console.info("Resend: NOT CONFIGURED — set RESEND_API_KEY for cloud email delivery");
}
if (process.env.SMTP_HOST) {
  console.info(`SMTP: CONFIGURED (host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT || 465})`);
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP: WARNING — SMTP_USER or SMTP_PASS missing");
  }
} else {
  console.info("SMTP: NOT CONFIGURED — set SMTP_HOST for local email delivery");
}
console.info("----------------------------");

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "30000", 10);
server.timeout = REQUEST_TIMEOUT;
app.use((req, res, next) => {
  req.socket.setTimeout(REQUEST_TIMEOUT);
  req.socket.on("timeout", () => {
    if (!res.headersSent) res.status(503).json({ error: "Requête expirée." });
  });
  next();
});

// Rate limiting — disabled during tests
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 0 : 10,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
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
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

// Keep the Render instance awake — ping health endpoint every 14 minutes
if (process.env.NODE_ENV === "production" && process.env.BACKEND_URL) {
  const https = require("https");
  setInterval(
    () => {
      https
        .get(process.env.BACKEND_URL + "/api/health", (res) => {
          console.log("Keep-alive ping:", res.statusCode);
        })
        .on("error", (e) => console.error("Keep-alive error:", e.message));
    },
    14 * 60 * 1000,
  );
}

// Route registration
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", loginLimiter);
app.use("/api/auth/forgot-password", loginLimiter);
app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/push", require("./routes/push"));
app.use("/api/admin", require("./routes/admin"));

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

    // Broadcast to others only (not to self)
    socket.broadcast.emit("user:online", userId);
  });

  socket.on("message:global", (msg) => {
    io.emit("message:global", msg);
  });

  socket.on("message:private", ({ receiverId, msg }) => {
    if (!receiverId || !msg) return;
    io.to(`user:${receiverId}`).emit("message:private", msg);
    io.to(`user:${socket.userId}`).emit("message:private", msg);
  });

  socket.on("message:seen", ({ messageId, senderId }) => {
    if (!messageId || !senderId) return;
    io.to(`user:${senderId}`).emit("message:seen", { messageId });
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

// Ensure password_reset_tokens table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64)  NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used_at    TIMESTAMP    NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
  )
`).catch((err) => console.error("Failed to create password_reset_tokens table:", err));

// Ensure user_security_questions table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS user_security_questions (
    id           SERIAL       PRIMARY KEY,
    user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_key VARCHAR(50)  NOT NULL,
    answer_hash  VARCHAR(60)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, question_key)
  )
`).catch((err) => console.error("Failed to create user_security_questions table:", err));

// Update existing invitations constraint to allow alumni
pool.query(`
  ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
  ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('student', 'teacher', 'alumni'));
`).catch(() => {});

// Ensure push_subscriptions table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT         NOT NULL,
    auth_key   TEXT         NOT NULL,
    p256dh_key TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
  )
`).catch((err) => console.error("Failed to create push_subscriptions table:", err));

// Ensure global_chat_read table exists (for unread message tracking)
pool.query(`
  CREATE TABLE IF NOT EXISTS global_chat_read (
    user_id            INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_msg_id   INTEGER   NOT NULL DEFAULT 0,
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id)
  )
`).catch((err) => console.error("Failed to create global_chat_read table:", err));

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`HEI STDhub API → http://localhost:${PORT}`),
  );
}

module.exports = app;
