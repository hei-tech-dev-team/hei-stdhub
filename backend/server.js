const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const rateLimit = require("express-rate-limit");

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
app.use("/api/auth/forgot-password", loginLimiter);
app.use("/api/auth/reset-password", loginLimiter);
app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

// Health check endpoint
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));

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

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`HEI STDhub API → http://localhost:${PORT}`),
  );
}

module.exports = app;
