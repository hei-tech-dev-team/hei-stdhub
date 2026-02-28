const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers uploadés
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/supports", require("./routes/supports"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

// Santé
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

// 404 — doit toujours être EN DERNIER
app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 HEI STDhub API → http://localhost:${PORT}`),
);
