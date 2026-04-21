const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");

// POST /api/suggestions — étudiant ou prof soumet une suggestion
router.post("/", auth, async (req, res) => {
  if (!["student", "teacher"].includes(req.user.role))
    return res
      .status(403)
      .json({ error: "Réservé aux étudiants et professeurs." });

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

// GET /api/suggestions — BDE voit toutes les suggestions
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    const { rows } = await db.query(
      `SELECT s.*,
        CASE WHEN s.anonyme = true THEN 'Anonyme' ELSE u.nom END AS nom,
        CASE WHEN s.anonyme = true THEN '' ELSE u.prenom END AS prenom,
        CASE WHEN s.anonyme = true THEN '' ELSE u.email END AS email,
        CASE WHEN s.anonyme = true THEN '' ELSE u.ref END AS ref,
        u.role AS auteur_role
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       ORDER BY s.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PATCH /api/suggestions/:id — BDE change le statut
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

// POST /api/suggestions/confirm — BDE confirme
// Retourne les données pour générer le PDF côté frontend
// puis envoie un message dans le chat global et supprime les suggestions
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

    // Envoyer un message dans le chat global
    const date = new Date().toLocaleDateString("fr-FR");
    const acceptes = suggestions.filter((s) => s.statut === "accepte");
    const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
    const refuses = suggestions.filter((s) => s.statut === "refuse");

    let chatMsg = `📋 *Retour du BDE — ${date}*\n\n`;
    if (acceptes.length > 0) {
      chatMsg += `✅ Suggestions acceptées (${acceptes.length}) :\n`;
      acceptes.forEach((s) => {
        chatMsg += `• ${s.titre}\n`;
      });
      chatMsg += "\n";
    }
    if (aDiscuter.length > 0) {
      chatMsg += `💬 À approfondir (${aDiscuter.length}) :\n`;
      aDiscuter.forEach((s) => {
        chatMsg += `• ${s.titre}\n`;
      });
      chatMsg += "\n";
    }
    if (refuses.length > 0) {
      chatMsg += `❌ Refusées (${refuses.length}) :\n`;
      refuses.forEach((s) => {
        chatMsg += `• ${s.titre}`;
        if (s.justification) chatMsg += ` — ${s.justification}`;
        chatMsg += "\n";
      });
    }
    chatMsg += "\n📄 Le rapport complet a été téléchargé.";

    // Poster dans le chat global
    await db.query(
      `INSERT INTO messages (sender_id, content, is_global)
       VALUES ($1, $2, true)`,
      [req.user.id, chatMsg],
    );

    // Supprimer toutes les suggestions
    await db.query("DELETE FROM suggestions");

    // Retourner les données pour le PDF frontend
    res.json({
      suggestions,
      message: "Confirmé, message posté dans le chat global.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
