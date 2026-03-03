const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/messages/search?q=...
router.get("/search", auth, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json([]);
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level
       FROM users
       WHERE id != $1
         AND (pseudo ILIKE $2 OR ref ILIKE $2)
       ORDER BY pseudo
       LIMIT 10`,
      [req.user.id, `%${q}%`],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/messages/contacts
router.get("/contacts", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level
       FROM users
       WHERE id != $1
       ORDER BY
         CASE role WHEN 'teacher' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         pseudo`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/messages/global
router.get("/global", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref, u.role AS sender_role
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.is_global = TRUE
       ORDER BY m.created_at ASC
       LIMIT 200`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/messages/private/:userId
router.get("/private/:userId", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.is_global = FALSE
         AND (
           (m.sender_id = $1 AND m.receiver_id = $2)
           OR
           (m.sender_id = $2 AND m.receiver_id = $1)
         )
       ORDER BY m.created_at ASC`,
      [req.user.id, req.params.userId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/messages
router.post("/", auth, async (req, res) => {
  const { content, receiver_id, is_global } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Message vide." });
  if (!is_global && !receiver_id)
    return res.status(400).json({ error: "Destinataire requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_global)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, is_global ? null : receiver_id, content, !!is_global],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});
const multer = require("multer");
const path = require("path");

const chatStorage = multer.diskStorage({
  destination: "uploads/chat/",
  filename: (_, file, cb) =>
    cb(null, `chat_${Date.now()}${path.extname(file.originalname)}`),
});
const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

router.post("/upload", auth, (req, res) => {
  chatUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Fichier requis." });
    const url = `${process.env.CLIENT_URL?.replace("netlify.app", "onrender.com") || "http://localhost:3001"}/uploads/chat/${req.file.filename}`;
    res.json({
      filename: req.file.filename,
      url: `${process.env.BACKEND_URL || "http://localhost:3001"}/uploads/chat/${req.file.filename}`,
    });
  });
});
module.exports = router;
