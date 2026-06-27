const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;
const db = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
<<<<<<< HEAD
const { sendPasswordResetEmail } = require("../services/mailer");
const { sendPushToUser } = require("../services/notificationService");

const SECURITY_QUESTIONS = [
  { key: "prev_school", question: "Quel est le nom de votre établissement précédent ?" },
  { key: "school_city", question: "Dans quelle ville se trouve votre école actuelle ?" },
  { key: "fav_prof", question: "Quel est le nom de votre professeur préféré ?" },
  { key: "fav_ue", question: "Quelle est votre matière/UE préférée ?" },
  { key: "career_goal", question: "Quel est votre objectif de carrière ?" },
  { key: "intern_company", question: "Dans quelle entreprise aimeriez-vous faire un stage ?" },
  { key: "mentor_name", question: "Qui est votre modèle ou mentor professionnel ?" },
  { key: "passion_hobby", question: "Quelle est votre passion en dehors des études ?" },
];
=======
>>>>>>> origin/main

const capitalize = (str) =>
  str
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
  process.env.CLOUDINARY_API_KEY?.trim() &&
  process.env.CLOUDINARY_API_SECRET?.trim();

let avatarUpload;
if (useCloudinary) {
  const cloudinary = require("cloudinary");
  const CloudinaryStorage = require("multer-storage-cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "hei-stdhub/avatars",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    },
  });
  avatarUpload = multer({ storage: avatarStorage }).single("avatar");
} else {
  const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "avatars");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  avatarUpload = multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const name = crypto.randomBytes(16).toString("hex") + ext;
        cb(null, name);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single("avatar");
}

const router = express.Router();

const makeToken = (user) =>
  jwt.sign(
    { id: user.id, ref: user.ref, role: user.role, pseudo: user.pseudo || "", ues: user.ues || [], level: user.level || null },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const resetPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 6,
  message: { error: "Trop de tentatives, Merci de reessayer dans 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const tryGetAdminFromToken = (req) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
};

router.post("/register", async (req, res) => {
  const {
    ref,
    nom,
    prenom,
    email,
    pseudo,
    password,
    role,
    level,
    groupe,
    inviteCode,
    ues,
  } = req.body;

  if (!ref || !nom || !prenom || !email || !pseudo || !password || !role)
    return res.status(400).json({ error: "Tous les champs sont requis." });

  if (role === "teacher" && (!ues || ues.length === 0))
    return res
      .status(400)
      .json({ error: "Un professeur doit avoir au moins une UE." });

  if (role === "alumni") {
    const refUpper = ref.trim().toUpperCase();
    if (!/^STD2[12]\d{3,}$/.test(refUpper))
      return res.status(400).json({ error: "Les alumni doivent avoir une reference STD21xxx ou STD22xxx." });
  }

  const adminUser = tryGetAdminFromToken(req);
  if (!inviteCode && !adminUser)
    return res.status(400).json({ error: "Code d'invitation requis." });

  try {
    if (inviteCode) {
      const invite = await db.query(
        `SELECT * FROM invitations WHERE code=$1 AND use_count < max_uses AND expires_at > NOW()`,
        [inviteCode.toUpperCase()],
      );
      if (!invite.rows.length)
        return res
          .status(400)
          .json({ error: "Code d'invitation invalide ou expiré." });
    }

    const existingRef = await db.query(
      "SELECT id FROM users WHERE ref=$1", [ref.toUpperCase()],
    );
    if (existingRef.rows.length)
      return res.status(409).json({ error: "Référence déjà utilisée." });

    const existingEmail = await db.query(
      "SELECT id FROM users WHERE email=$1", [email.toLowerCase()],
    );
    if (existingEmail.rows.length)
      return res.status(409).json({ error: "Email déjà utilisé." });

    const existingPseudo = await db.query(
      "SELECT id FROM users WHERE pseudo=$1", [capitalize(pseudo)],
    );
    if (existingPseudo.rows.length)
      return res.status(409).json({ error: "Pseudo déjà pris." });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, level, ues, groupe)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 RETURNING id, ref, nom, prenom, email, pseudo, role, level, groupe, ues, first_login`,
      [
        ref.toUpperCase(),
        capitalize(nom),
        capitalize(prenom),
        email.toLowerCase(),
        capitalize(pseudo),
        hash,
        role,
        level || null,
        ues || [],
        groupe || null,
      ],
    );

    const newUser = rows[0];
    if (inviteCode) {
      await db.query(
        `UPDATE invitations SET use_count = use_count + 1, used_by = $1 WHERE code = $2 AND use_count < max_uses`,
        [newUser.id, inviteCode.toUpperCase()],
      );
    }

    try {
      const io = req.app.get("io");
      if (io) io.emit("user:registered", newUser);
    } catch (_) {}

    res.status(201).json({ token: makeToken(newUser), user: newUser, first_login: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/login", async (req, res) => {
  const { ref, password } = req.body;
  if (!ref || !password)
    return res.status(400).json({ error: "Référence et mot de passe requis." });
  if (ref.includes("@"))
    return res.status(400).json({ error: "Veuillez entrer votre référence, pas votre email." });

  try {
    const { rows } = await db.query(
      `SELECT id, ref, nom, prenom, email, pseudo, password, role, level, ues, avatar, first_login
       FROM users WHERE ref=$1`,
      [ref.toUpperCase()],
    );
    if (!rows.length)
      return res.status(401).json({ error: "Référence introuvable." });

    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Mot de passe incorrect." });

    const isFirstLogin = user.first_login;
    if (isFirstLogin) {
      await db.query("UPDATE users SET first_login = FALSE WHERE id = $1", [user.id]);
    }

    const { password: _, first_login: __, ...safeUser } = user;
    res.json({ token: makeToken(safeUser), user: safeUser, first_login: isFirstLogin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

<<<<<<< HEAD
router.post("/forgot-password/send-email", forgotPasswordLimiter, async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email)
    return res.status(400).json({ error: "Adresse email requise." });
  if (email.length > 254)
    return res.status(400).json({ error: "Adresse email trop longue." });

  try {
    const { rows } = await db.query(
      "SELECT id, email, prenom, pseudo FROM users WHERE email=$1",
      [email],
    );

    if (!rows.length) return res.json(genericForgotPasswordResponse);

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);

    await db.query(
      "UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",
      [user.id],
    );

    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
      [user.id, tokenHash],
    );

    await sendPasswordResetEmail({ user, token });

    res.json(genericForgotPasswordResponse);
  } catch (err) {
    console.error("ERREUR /auth/forgot-password:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

=======
>>>>>>> origin/main
// Public profile by ref
router.get("/user/:ref", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, ref, nom, prenom, pseudo, role, level, avatar FROM users WHERE ref=$1",
      [req.params.ref.toUpperCase()],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 4,
  message: { error: "Trop de tentatives, Merci de reessayer dans 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate a 6-character alphanumeric reset code
const generateResetCode = () =>
  Array.from({ length: 6 }, () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return chars[crypto.randomInt(chars.length)];
  }).join("");

// Forgot password — step 1: request a reset code (fake-eye push notification)
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email)
    return res.status(400).json({ error: "Email requis." });

  try {
    const { rows } = await db.query(
      "SELECT id, ref, prenom FROM users WHERE email=$1",
      [email],
    );

    if (!rows.length)
      return res.json({ message: "Si un compte existe, un code vous sera envoye." });

    const user = rows[0];
    const code = generateResetCode();
    const codeHash = hashResetToken(code);

    await db.query(
      "UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",
      [user.id],
    );
    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [user.id, codeHash],
    );

    try {
      const { sendPushToUser } = require("../services/notificationService");
      sendPushToUser(user.id, {
        title: "Code de reinitialisation",
        body: `Votre code: ${code}`,
        tag: `reset-${user.id}`,
        type: "reset-code",
      }).catch((err) => console.error("sendPushToUser error (auth):", err?.message));
    } catch (_) {}

    res.json({ message: "Code de verification envoye." });
  } catch (err) {
    console.error("forgot-password error:", err?.message || err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Forgot password — step 2: verify the 6-character code
const verifyCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 6,
  message: { error: "Trop de tentatives, Merci de reessayer dans 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email?.trim().toLowerCase() || ipKeyGenerator(req),
});

router.post("/forgot-password/verify-code", verifyCodeLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email et code requis." });

  const sanitizedCode = code.trim().toUpperCase();

  try {
    const { rows: users } = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email.trim().toLowerCase()],
    );
    if (!users.length)
      return res.status(404).json({ error: "Aucun compte trouve avec cet email." });

    const userId = users[0].id;
    const codeHash = hashResetToken(sanitizedCode);

    const { rows: tokens } = await db.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id=$1 AND token_hash=$2 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [userId, codeHash],
    );

    if (!tokens.length)
      return res.status(400).json({ error: "Code invalide ou expire." });

    await db.query(
      "UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1",
      [tokens[0].id],
    );

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashResetToken(resetToken);

    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [userId, resetTokenHash],
    );

    res.json({ token: resetToken, message: "Code valide. Vous pouvez reinitialiser votre mot de passe." });
  } catch (err) {
    console.error("forgot-password/verify-code error:", err?.message || err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: "Token requis." });

  try {
    const { rows } = await db.query(
      `SELECT id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hashResetToken(token)],
    );

    if (!rows.length)
      return res.status(400).json({ error: "Lien invalide ou expiré." });

    res.json({ valid: true });
  } catch (err) {
    console.error("ERREUR /auth/reset-password/:token:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    return res.status(400).json({ error: "Token et mot de passe requis." });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "Minimum 6 caractères." });

  try {
    const tokenHash = hashResetToken(token);
    const { rows } = await db.query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token_hash=$1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (!rows.length)
      return res.status(400).json({ error: "Lien invalide ou expiré." });

    const resetToken = rows[0];
    const hash = await bcrypt.hash(newPassword, 10);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET password=$1 WHERE id=$2", [
        hash,
        resetToken.user_id,
      ]);
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at=NOW()
         WHERE user_id=$1 AND used_at IS NULL`,
        [resetToken.user_id],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    sendPushToUser(resetToken.user_id, {
      title: "Mot de passe modifié",
      body: "Votre mot de passe HEI STDhub a été réinitialisé avec succès.",
      tag: "password-reset",
      url: "/login",
    }).catch(() => {});

    res.json({ message: "Mot de passe réinitialisé." });
  } catch (err) {
    console.error("ERREUR /auth/reset-password:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ref, nom, prenom, email, pseudo, role, level, avatar
       FROM users WHERE id=$1`,
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error("ERREUR /auth/me:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/verify-invite", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code requis." });
  try {
    const { rows } = await db.query(
      `SELECT * FROM invitations WHERE code=$1 AND use_count < max_uses AND expires_at > NOW()`,
      [code.toUpperCase()],
    );
    if (!rows.length)
      return res.status(400).json({ error: "Code invalide ou expiré." });
    res.json({ role: rows[0].role });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.patch("/profile", auth, async (req, res) => {
  const { pseudo } = req.body;
  if (!pseudo?.trim()) return res.status(400).json({ error: "Pseudo requis." });
  try {
    const existing = await db.query(
      "SELECT id FROM users WHERE pseudo=$1 AND id!=$2",
      [pseudo.trim(), req.user.id],
    );
    if (existing.rows.length)
      return res.status(409).json({ error: "Pseudo déjà pris." });

    const { rows } = await db.query(
      `UPDATE users SET pseudo=$1 WHERE id=$2
       RETURNING id, ref, nom, prenom, email, pseudo, role, level, avatar`,
      [pseudo.trim(), req.user.id],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.patch("/password", auth, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword)
    return res.status(400).json({ error: "Champs requis." });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "Minimum 6 caractères." });
  try {
    const { rows } = await db.query("SELECT password FROM users WHERE id=$1", [
      req.user.id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Utilisateur introuvable." });
    if (!(await bcrypt.compare(current, rows[0].password)))
      return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password=$1 WHERE id=$2", [
      hash,
      req.user.id,
    ]);
    res.json({ message: "Mot de passe mis à jour." });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Avatar upload via Cloudinary (or local disk)
router.patch("/avatar", auth, (req, res) => {
  avatarUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Fichier requis." });
    try {
      const avatarUrl = req.file.secure_url
        || (req.file.path ? `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename || req.file.originalname}` : null);
      if (!avatarUrl) return res.status(500).json({ error: "Upload échoué." });

      const { rows } = await db.query(
        `UPDATE users SET avatar=$1 WHERE id=$2
         RETURNING id, ref, nom, prenom, email, pseudo, role, level, avatar`,
        [avatarUrl, req.user.id],
      );
      res.json(rows[0]);
  } catch (err) {
    console.error("Security questions save error:", err?.message || err);
    const detail = process.env.NODE_ENV === "development" ? err.message : "Erreur serveur.";
    res.status(500).json({ error: detail });
  }
  });
});

module.exports = router;
