const crypto = require("crypto");

/**
 * SHA-256 fingerprints of every secret value that was committed in
 * `backend/.env` / `frontend/.env` before those files were untracked
 * (security audit C-02, issue #127). Only hashes are stored here: they
 * cannot be used to authenticate and the plaintext is already in git
 * history for anyone who has a clone.
 *
 * Production refuses to start while one of these values is still configured.
 * Rotate the matching variable (see `docs/SECRET_ROTATION.md`) before deploying.
 */
const LEAKED_VALUE_FINGERPRINTS = Object.fromEntries([
  ["JWT_SECRET", ["ee5bc19b6b3fb1a650585035735887bc630c094a10835e7f1218fc07d6f318da"]],
  ["VAPID_PRIVATE_KEY", ["f268205d7817e5869b6b4b74b09d810b8bd15b2cdf756665895a80e6f8142c51"]],
  ["CLOUDINARY_API_SECRET", ["b555765baf2381bdecdb3addeda1bcdccd469a1ea4a746eb8241e6f667279712"]],
  [
    "SMTP_PASS",
    [
      "85e1ce0a91d7d6a2b4e7f54a8e0c48ae5cb32f0bc30f6b040171054a4a8c322b",
      "2b1fa1cae6e31565b36f7be1af9e85f9836c88ed51b2e1ebf723853a493edd73",
    ],
  ],
  [
    "EMAIL_PASS",
    [
      "85e1ce0a91d7d6a2b4e7f54a8e0c48ae5cb32f0bc30f6b040171054a4a8c322b",
      "2b1fa1cae6e31565b36f7be1af9e85f9836c88ed51b2e1ebf723853a493edd73",
    ],
  ],
  [
    "RESEND_API_KEY",
    ["d497f5240f948ae3099f498a1c4d6380632f7dee73bed4e10132d0e41f289bc2"],
  ],
  // Passwords extracted from the committed DATABASE_URL values.
  [
    "DATABASE_PASSWORD",
    [
      "5c102cebcf3b9a4a5a60d53e77dceb9a236a78906209303c8ccaa5886e537691",
      "1c529c318d059fff362ba5e8236f6064e920874df0b5fb89d6734ff5dbdcb972",
      "95e495d9c57d1e80d024e06eeef86b5a108f45454b19ee25110a4710d6f21389",
      "967520ae23e8ee14888bae72809031b98398ae4a636773e18fff917d77679334",
      "3b1e272f31ec5a1424f9b5ba7ab1a25c424dd994a31eac05f23d6379fd4508d6",
    ],
  ],
  // Some deployments use the split PG* variables instead of DATABASE_URL.
  [
    "PGPASSWORD",
    [
      "5c102cebcf3b9a4a5a60d53e77dceb9a236a78906209303c8ccaa5886e537691",
      "1c529c318d059fff362ba5e8236f6064e920874df0b5fb89d6734ff5dbdcb972",
      "95e495d9c57d1e80d024e06eeef86b5a108f45454b19ee25110a4710d6f21389",
      "967520ae23e8ee14888bae72809031b98398ae4a636773e18fff917d77679334",
      "3b1e272f31ec5a1424f9b5ba7ab1a25c424dd994a31eac05f23d6379fd4508d6",
    ],
  ],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

/** Extracts the password from a PostgreSQL URL; empty string when absent/invalid. */
function extractDatabasePassword(databaseUrl) {
  if (!databaseUrl) return "";
  try {
    const parsed = new URL(databaseUrl);
    return parsed.password ? decodeURIComponent(parsed.password) : "";
  } catch {
    return "";
  }
}

/**
 * Returns the names of variables that still use a value leaked in git history.
 * `DATABASE_PASSWORD` is special-cased: its value is read from `DATABASE_URL`.
 */
function findLeakedSecrets(env = process.env, fingerprints = LEAKED_VALUE_FINGERPRINTS) {
  const found = [];
  for (const [name, hashes] of Object.entries(fingerprints)) {
    const value =
      name === "DATABASE_PASSWORD" ? extractDatabasePassword(env.DATABASE_URL) : env[name];
    if (!value || !hashes.includes(sha256(value))) continue;
    found.push(name);
  }
  return found;
}

/** Fails the boot in production, warns in development. Never logs a secret value. */
function warnOrExitOnLeakedSecrets(env = process.env) {
  const found = findLeakedSecrets(env);
  if (found.length === 0) return found;

  const names = found.join(", ");
  const message =
    `Secret(s) leaked in git history are still configured: ${names}. ` +
    "Rotate them before deploying (docs/SECRET_ROTATION.md).";

  if (env.NODE_ENV === "production") {
    console.error(`Refusing to start. ${message}`);
    process.exit(1);
  }

  console.warn(`WARNING: ${message}`);
  return found;
}

module.exports = {
  LEAKED_VALUE_FINGERPRINTS,
  extractDatabasePassword,
  findLeakedSecrets,
  sha256,
  warnOrExitOnLeakedSecrets,
};
