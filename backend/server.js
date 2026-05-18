const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const rateLimit = require("express-rate-limit");
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
  console.info("VAPID keys generated — set these in production env:");
  console.info(`  VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.info(`  VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
}

webpush.setVapidDetails(
  "mailto:hei@stdhub.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const app = express();
const server = http.createServer(app);

// Rate limiting — disabled during tests
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 0 : 10,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "https://hei-stdhub.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
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
if (process.env.NODE_ENV === "production") {
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
app.use("/api/auth/reset-password", loginLimiter);
app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/favorites", require("./routes/favorites"));
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
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "JSON malformé." });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur." });
});

// Socket.io event handlers
const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("user:join", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.join(`user:${userId}`);
    io.emit("user:online", userId);
  });

  socket.on("message:global", (msg) => {
    io.emit("message:global", msg);
  });

  socket.on("message:private", ({ receiverId, msg }) => {
    io.to(`user:${receiverId}`).emit("message:private", msg);
    io.to(`user:${socket.userId}`).emit("message:private", msg);
  });

  socket.on("message:seen", ({ messageId, senderId }) => {
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
      io.emit("user:offline", socket.userId);
    }
  });
});

app.set("io", io);

// Ensure push_subscriptions table exists
const { pool } = require("./db");
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

// Ensure favorites table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS favorites (
    id          SERIAL    PRIMARY KEY,
    user_id     INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contact_id)
  )
`).catch((err) => console.error("Failed to create favorites table:", err));

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`HEI STDhub API → http://localhost:${PORT}`),
  );
}

module.exports = app;
