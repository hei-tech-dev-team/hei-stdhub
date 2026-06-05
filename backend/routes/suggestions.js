const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { containsProfanity } = require("../middleware/profanity");

router.post("/", auth, async (req, res) => {
  if (!["student", "teacher", "alumni", "admin"].includes(req.user.role))
    return res
      .status(403)
      .json({ error: "Réservé aux étudiants, professeurs, alumni et admin." });

  const { titre, contenu, anonyme } = req.body;
  if (!titre?.trim() || !contenu?.trim())
    return res.status(400).json({ error: "Titre et contenu requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO suggestions (student_id, titre, contenu, anonyme)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, titre.trim(), contenu.trim(), anonyme === true],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    const { limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT s.*,
          CASE WHEN s.anonyme = true THEN 'Anonyme' ELSE u.nom END AS nom,
          CASE WHEN s.anonyme = true THEN '' ELSE u.prenom END AS prenom,
          CASE WHEN s.anonyme = true THEN '' ELSE u.email END AS email,
          CASE WHEN s.anonyme = true THEN '' ELSE u.ref END AS ref,
          u.role AS auteur_role
         FROM suggestions s
         JOIN users u ON s.student_id = u.id
         ORDER BY s.created_at DESC
         LIMIT $1 OFFSET $2`,
        [pageLimit, pageOffset],
      ),
      db.query("SELECT COUNT(*) FROM suggestions"),
    ]);
    res.json({
      suggestions: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count || 0),
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.patch("/:id", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  const { statut, justification } = req.body;
  const validStatuts = ["recu", "accepte", "a_discuter", "refuse"];
  if (!validStatuts.includes(statut))
    return res.status(400).json({ error: "Statut invalide." });
  if (statut === "refuse" && !justification?.trim())
    return res
      .status(400)
      .json({ error: "Justification requise pour un refus." });

  try {
    const { rows } = await db.query(
      `UPDATE suggestions SET statut=$1, justification=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [statut, justification || null, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Suggestion introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/confirm", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    const { rows: suggestions } = await db.query(
      `SELECT s.*,
        CASE WHEN s.anonyme = true THEN 'Anonyme' ELSE u.nom END AS nom,
        CASE WHEN s.anonyme = true THEN '' ELSE u.prenom END AS prenom,
        u.role AS auteur_role
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       WHERE s.statut != 'recu'
       ORDER BY s.statut, s.created_at`,
    );

    if (suggestions.length === 0)
      return res
        .status(400)
        .json({ error: "Aucune suggestion traitée à confirmer." });

    const date = new Date().toLocaleDateString("fr-FR");
    const acceptes = suggestions.filter((s) => s.statut === "accepte");
    const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
    const refuses = suggestions.filter((s) => s.statut === "refuse");

    let chatMsg = `*Retour du BDE — ${date}*\n\n`;
    if (acceptes.length > 0) {
      chatMsg += `Suggestions acceptées (${acceptes.length}) :\n`;
      acceptes.forEach((s) => {
        chatMsg += `• ${s.titre}\n`;
      });
      chatMsg += "\n";
    }
    if (aDiscuter.length > 0) {
      chatMsg += `À approfondir (${aDiscuter.length}) :\n`;
      aDiscuter.forEach((s) => {
        chatMsg += `• ${s.titre}\n`;
      });
      chatMsg += "\n";
    }
    if (refuses.length > 0) {
      chatMsg += `Refusées (${refuses.length}) :\n`;
      refuses.forEach((s) => {
        chatMsg += `• ${s.titre}`;
        if (s.justification) chatMsg += ` — ${s.justification}`;
        chatMsg += "\n";
      });
    }
    chatMsg += "\nLe rapport complet a été téléchargé.";

    await db.query(
      `INSERT INTO messages (sender_id, content, is_global)
       VALUES ($1, $2, true)`,
      [req.user.id, chatMsg],
    );

    await db.query("DELETE FROM suggestions WHERE statut != 'recu'");

    res.json({
      suggestions,
      message: "Confirmé, message posté dans le chat global.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/report", auth, async (req, res) => {
  if (req.user.role !== "bde" && req.user.role !== "admin")
    return res.status(403).json({ error: "Acces reserve au BDE." });

  const { suggestions } = req.body;
  if (!Array.isArray(suggestions) || suggestions.length === 0)
    return res.status(400).json({ error: "Suggestions requises." });

  try {
    const { generateSuggestionReport } = require("../services/suggestionPdf");
    const doc = generateSuggestionReport(suggestions);
    const buf = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BDE_Rapport.pdf"`,
    );
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur generation PDF." });
  }
});

module.exports = router;
