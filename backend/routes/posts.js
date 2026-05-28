const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const auth = require("../middleware/auth");
const { sendPushToAll } = require("../services/notificationService");


const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

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
    "MGT1",
    "DONNEES2",
    "IA1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

router.get("/", async (req, res) => {
  try {
    const { ue, type, level, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    let q = `
      SELECT p.*, u.pseudo AS author_pseudo, u.ref AS author_ref
      FROM posts p LEFT JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    let countQ = "SELECT COUNT(*) FROM posts p WHERE 1=1";
    const params = [];

    if (level && UES_BY_LEVEL[level]) {
      const placeholders = UES_BY_LEVEL[level]
        .map((_, i) => `$${params.length + i + 1}`)
        .join(",");
      params.push(...UES_BY_LEVEL[level]);
      const filter = ` AND p.ue IN (${placeholders})`;
      q += filter;
      countQ += filter;
    }
    if (ue) {
      params.push(ue);
      const filter = ` AND p.ue=$${params.length}`;
      q += filter;
      countQ += filter;
    }
    if (type) {
      params.push(type);
      const filter = ` AND p.type=$${params.length}`;
      q += filter;
      countQ += filter;
    }

    q += " ORDER BY p.created_at DESC";
    params.push(pageLimit);
    q += ` LIMIT $${params.length}`;
    params.push(pageOffset);
    q += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(q, params),
      db.query(countQ, params.slice(0, params.length - 2)),
    ]);
    res.json({
      posts: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count || 0),
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

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

    sendPushToAll({
      title: `Nouveau cours – ${ue}`,
      body: `${title} (${type})`,
      tag: `post-${rows[0].id}`,
      url: "/posts",
      type: "new_post",
    }).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

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
