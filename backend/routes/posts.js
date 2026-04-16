const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../db");
const auth = require("../middleware/auth");
const { log, timeLog } = require("console");

const router = express.Router();

// Upload fichier dans /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
});

// GET /api/posts  (filtres : ?ue=WEB1&type=td)
const UES_BY_LEVEL = {
  L1: [
    "WEB1",
    "PROG1",
    "SYS1",
    "DONNEES1",
    "THEORIE1-P1",
    "THEORIE1-P2",
    "WEB2",
    "PROG2-POO",
    "PROG2-API",
    "SYS2",
    "DONNEES2",
    "IA1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

router.get("/", async (req, res) => {
  try {
    const { ue, type, level } = req.query;
    let q = `
      SELECT p.*, u.pseudo AS author_pseudo, u.ref AS author_ref
      FROM posts p LEFT JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (level && UES_BY_LEVEL[level]) {
      const placeholders = UES_BY_LEVEL[level]
        .map((_, i) => `$${params.length + i + 1}`)
        .join(",");
      params.push(...UES_BY_LEVEL[level]);
      q += ` AND p.ue IN (${placeholders})`;
    }
    if (ue) {
      params.push(ue);
      q += ` AND p.ue=$${params.length}`;
    }
    if (type) {
      params.push(type);
      q += ` AND p.type=$${params.length}`;
    }

    q += " ORDER BY p.created_at DESC";
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/posts  (prof/admin uniquement)
router.post("/", auth, upload.single("file"), async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });

  const { title, description, ue, type, link } = req.body;
  if (!title || !ue || !type)
    return res.status(400).json({ error: "Titre, UE et type requis." });

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.path || null;

  if (!file_path && !link)
    return res.status(400).json({ error: "Fichier ou lien requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO posts (title,description,ue,type,file_name,file_path,link,author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        title,
        description || null,
        ue,
        type,
        file_name,
        file_path,
        link || null,
        req.user.id,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/posts/:id
router.delete("/:id", auth, async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });
  try {
    await db.query("DELETE FROM posts WHERE id=$1", [req.params.id]);
    res.json({ message: "Post supprimé." });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
