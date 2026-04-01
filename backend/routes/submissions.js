const express = require("express");
const multer = require("multer");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const cloudinary = require("cloudinary").v2;
const CloudinaryStorage = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "hei-stdhub/submissions",
    resource_type: "auto",
    allowed_formats: ["pdf", "doc", "docx", "zip", "jpg", "jpeg", "png"],
    public_id: `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`,
  }),
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/submissions
router.post("/", auth, upload.single("file"), async (req, res) => {
  const { nom, prenom, email, ref, level, groupe, ue, type, link } = req.body;

  if (!nom || !prenom || !email || !ref || !level || !groupe || !ue || !type)
    return res.status(400).json({ error: "Tous les champs sont requis." });

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.secure_url || req.file?.path || null;

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

// GET /api/submissions — prof voit seulement ses UEs, admin voit tout
router.get("/", auth, async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });

  try {
    const { type, groupe, ue } = req.query;
    const params = [];

    let q = `
      SELECT s.*, u.pseudo AS student_pseudo
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE 1=1
    `;

    // Profs voient seulement leurs UEs
    if (req.user.role === "teacher") {
      const { rows: teacherRows } = await db.query(
        "SELECT ues FROM users WHERE id=$1",
        [req.user.id],
      );
      const teacherUes = teacherRows[0]?.ues || [];
      if (teacherUes.length === 0) {
        return res.json([]);
      }
      params.push(teacherUes);
      q += ` AND s.ue = ANY($${params.length})`;
    }

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
