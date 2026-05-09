require("dotenv").config();
const db = require("../db");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/mailer");

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function main() {
  console.log("Fetching all users...");
  const { rows: users } = await db.query(
    "SELECT id, email, prenom, pseudo FROM users ORDER BY id",
  );
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(token);

      await db.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id],
      );

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, tokenHash],
      );

      const result = await sendPasswordResetEmail({ user, token });
      console.log(`${user.email} → ${result.skipped ? "log only" : "sent"} (${result.resetUrl})`);
    } catch (err) {
      console.error(`${user.email} → ${err.message}`);
    }
  }

  console.log("Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
