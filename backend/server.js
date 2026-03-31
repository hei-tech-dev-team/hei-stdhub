const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", loginLimiter);
const app = express();
const server = http.createServer(app);

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

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "https://hei-stdhub.vercel.app",
    ],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/suggestions", require("./routes/suggestions"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));

// ── Socket.io ──
const onlineUsers = new Map(); // userId → socketId

io.on("connection", (socket) => {
  console.log("🔌 Socket connecté:", socket.id);

  // L'utilisateur s'identifie
  socket.on("user:join", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    // Rejoindre une room personnelle
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} connecté`);
  });

  // Message global
  socket.on("message:global", (msg) => {
    io.emit("message:global", msg);
  });

  // Message privé
  socket.on("message:private", ({ receiverId, msg }) => {
    // Envoyer au destinataire
    io.to(`user:${receiverId}`).emit("message:private", msg);
    // Renvoyer à l'expéditeur aussi
    io.to(`user:${socket.userId}`).emit("message:private", msg);
  });

  // Message vu
  socket.on("message:seen", ({ messageId, senderId }) => {
    io.to(`user:${senderId}`).emit("message:seen", { messageId });
  });

  socket.on("disconnect", () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
    console.log("🔌 Socket déconnecté:", socket.id);
  });
});

// Exporter io pour l'utiliser dans les routes
app.set("io", io);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`🚀 HEI STDhub API → http://localhost:${PORT}`),
  );
}

module.exports = app;
