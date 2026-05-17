const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const db = require("../db");
const { sendEmail } = require("../services/mailer");

async function main() {
  console.log("Récupération des utilisateurs...");
  const { rows: users } = await db.query(
    "SELECT id, email, prenom, pseudo FROM users ORDER BY id",
  );
  console.log(`${users.length} utilisateur(s) trouvé(s)\n`);

  for (const user of users) {
    try {
      const displayName = user.prenom || user.pseudo || "";
      const result = await sendEmail({
        user,
        subject: "HEI STDhub — Test d'envoi d'email",
        text: [
          `Bonjour ${displayName},`,
          "",
          "Ceci est un email de test envoyé depuis HEI STDhub.",
          "Si vous recevez ce message, la configuration email fonctionne correctement.",
          "",
          "Bonne journée !",
          "— L'équipe HEI STDhub",
        ].join("\n"),
        html: `
          <p>Bonjour ${displayName},</p>
          <p>Ceci est un email de test envoyé depuis <strong>HEI STDhub</strong>.</p>
          <p>Si vous recevez ce message, la configuration email fonctionne correctement.</p>
          <br>
          <p>Bonne journée !</p>
          <p>— L'équipe HEI STDhub</p>
        `,
      });
      console.log(`${user.email} → ${result.skipped ? "NON envoyé (pas de fournisseur)" : "envoyé"}`);
    } catch (err) {
      console.error(`${user.email} → ERREUR: ${err.message}`);
    }
  }

  console.log("\nTerminé");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
