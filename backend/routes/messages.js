const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const CloudinaryStorage = require("multer-storage-cloudinary");
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "hei-stdhub/chat",
    resource_type: "auto",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "pdf",
      "docx",
      "xlsx",
    ],
  }),
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

// Search users by ref or pseudo
router.get("/search", auth, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json([]);
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level, avatar
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

// List all users except the caller, for contact selection
router.get("/contacts", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level, avatar
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

// Get global chat messages (last 200)
router.get("/global", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
              u.role AS sender_role, u.avatar AS sender_avatar
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

// Get private messages between the caller and another user
router.get("/private/:userId", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo, u.avatar AS sender_avatar
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

// Send a message (global or private)
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

    const msg = rows[0];

    const { rows: userRows } = await db.query(
      "SELECT pseudo, avatar FROM users WHERE id=$1",
      [req.user.id],
    );

    const fullMsg = {
      ...msg,
      sender_pseudo: userRows[0]?.pseudo || "Inconnu",
      sender_avatar: userRows[0]?.avatar || null,
    };

    const io = req.app.get("io");
    if (is_global) {
      io.emit("message:global", fullMsg);
    } else {
      io.to(`user:${receiver_id}`).emit("message:private", fullMsg);
      io.to(`user:${req.user.id}`).emit("message:private", fullMsg);
    }

    res.status(201).json(fullMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Mark a message as seen
router.patch("/:id/seen", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE messages SET seen=TRUE, seen_at=NOW()
       WHERE id=$1 AND receiver_id=$2
       RETURNING *`,
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Message introuvable." });

    const io = req.app.get("io");
    io.to(`user:${rows[0].sender_id}`).emit("message:seen", {
      messageId: rows[0].id,
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Upload a file to Cloudinary for chat sharing
router.post("/upload", auth, (req, res) => {
  chatUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Fichier requis." });
    const isImage = req.file.mimetype?.startsWith("image/");
    res.json({
      filename: req.file.originalname,
      url: req.file.secure_url || req.file.path,
      isImage,
    });
  });
});

module.exports = router;
