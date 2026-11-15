const bcrypt = require("bcryptjs");
const db = require("../db");

// Hash shipped in backend/db/seed.dev.sql (password "password"). It is public:
// any account still using it can be taken over by anyone who has read the repo.
const SEED_PASSWORD_HASH =
  "$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji";
const SEED_PASSWORD = "password";

/**
 * Returns the accounts that can be logged into with the dev seed password:
 * every account carrying the seed hash, plus any admin/developer whose own
 * hash still matches the seed password.
 */
async function findSeedPasswordAccounts() {
  const { rows } = await db.query(
    `SELECT id, ref, role, password FROM users
     WHERE password = $1 OR role IN ('admin', 'developer')`,
    [SEED_PASSWORD_HASH],
  );
  const exposed = [];
  for (const u of rows) {
    if (u.password === SEED_PASSWORD_HASH || (await bcrypt.compare(SEED_PASSWORD, u.password))) {
      exposed.push({ id: u.id, ref: u.ref, role: u.role });
    }
  }
  return exposed;
}

/** Production-only startup check; logs loudly, never throws. */
async function warnIfSeedAccountsPresent() {
  if (process.env.NODE_ENV !== "production") return;
  try {
    const exposed = await findSeedPasswordAccounts();
    if (exposed.length) {
      console.error(
        `[security] CRITICAL: ${exposed.length} account(s) use the public dev seed password — ` +
          `reset or delete them now: ${exposed.map((u) => `${u.ref} (${u.role})`).join(", ")}`,
      );
    }
  } catch (err) {
    console.error("[security] seed account check failed:", err.message);
  }
}

module.exports = { findSeedPasswordAccounts, warnIfSeedAccountsPresent, SEED_PASSWORD_HASH };
