const express = require("express");
const multer = require("multer");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/submissions
router.post("/", auth, upload.single("file"), async (req, res) => {
  const { nom, prenom, email, ref, level, groupe, ue, type, link } = req.body;

  if (!nom || !prenom || !email || !ref || !level || !groupe || !ue || !type)
    return res.status(400).json({ error: "Tous les champs sont requis." });

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.path || null;

  if (!file_path && !link)
    return res.status(400).json({ error: "Fichier ou lien requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO submissions
         (student_id, nom, prenom, email, ref, level, groupe, ue, type, file_name, file_path, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.user.id,
        nom,
        prenom,
        email,
        ref,
        level,
        groupe,
        ue,
        type,
        file_name,
        file_path,
        link || null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/submissions — prof et admin voient TOUT
router.get("/", auth, async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });

  try {
    const { type, groupe, ue } = req.query;
    let q = `
      SELECT s.*, u.pseudo AS student_pseudo
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      params.push(type);
      q += ` AND s.type=$${params.length}`;
    }
    if (groupe) {
      params.push(groupe);
      q += ` AND s.groupe=$${params.length}`;
    }
    if (ue) {
      params.push(ue);
      q += ` AND s.ue=$${params.length}`;
    }

    q += " ORDER BY s.created_at DESC";
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
