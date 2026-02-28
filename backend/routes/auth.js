const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const makeToken = (user) =>
  jwt.sign(
    { id: user.id, ref: user.ref, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { ref, nom, prenom, email, pseudo, password, role, level, inviteCode } =
    req.body;

  if (!ref || !nom || !prenom || !email || !pseudo || !password || !role)
    return res.status(400).json({ error: "Tous les champs sont requis." });

  if (!inviteCode)
    return res.status(400).json({ error: "Code d'invitation requis." });

  try {
    // Vérifier le code d'invitation
    const invite = await db.query(
      `SELECT * FROM invitations
       WHERE code=$1 AND used=FALSE AND expires_at > NOW()`,
      [inviteCode.toUpperCase()],
    );
    if (!invite.rows.length)
      return res
        .status(400)
        .json({ error: "Code d'invitation invalide ou expiré." });

    // Vérifier si ref ou email déjà utilisé
    const exists = await db.query(
      "SELECT id FROM users WHERE ref=$1 OR email=$2",
      [ref.toUpperCase(), email],
    );
    if (exists.rows.length)
      return res
        .status(409)
        .json({ error: "Référence ou email déjà utilisé." });

    // Créer le user
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, ref, nom, prenom, email, pseudo, role, level`,
      [
        ref.toUpperCase(),
        nom,
        prenom,
        email,
        pseudo,
        hash,
        role,
        level || null,
      ],
    );

    const newUser = rows[0];

    // Marquer le code comme utilisé
    await db.query(
      `UPDATE invitations SET used=TRUE, used_by=$1 WHERE code=$2`,
      [newUser.id, inviteCode.toUpperCase()],
    );

    res.status(201).json({ token: makeToken(newUser), user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { ref, password } = req.body;
  if (!ref || !password)
    return res.status(400).json({ error: "Référence et mot de passe requis." });

  try {
    const { rows } = await db.query(
      `SELECT id, ref, nom, prenom, email, pseudo, password, role, level
       FROM users WHERE ref=$1`,
      [ref.toUpperCase()],
    );
    if (!rows.length)
      return res.status(401).json({ error: "Référence introuvable." });

    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Mot de passe incorrect." });

    const { password: _, ...safeUser } = user;
    res.json({ token: makeToken(safeUser), user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, ref, nom, prenom, email, pseudo, role, level FROM users WHERE id=$1",
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Introuvable." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/auth/verify-invite
router.post("/verify-invite", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code requis." });
  try {
    const { rows } = await db.query(
      `SELECT * FROM invitations
       WHERE code=$1 AND used=FALSE AND expires_at > NOW()`,
      [code.toUpperCase()],
    );
    if (!rows.length)
      return res.status(400).json({ error: "Code invalide ou expiré." });
    res.json({ role: rows[0].role });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
