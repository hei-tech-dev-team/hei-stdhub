const cron = require("node-cron");
const { cleanupSessions } = require("./sessionService");

async function purgeExpiredSessions() {
  try {
    const deleted = await cleanupSessions();
    if (deleted > 0) {
      console.log(`Purged ${deleted} expired or revoked sessions.`);
    }
    return deleted;
  } catch (err) {
    console.error("[sessions] purge failed:", err.message);
    return 0;
  }
}

function startSessionCleanupJob() {
  cron.schedule("30 3 * * *", () => purgeExpiredSessions());
  console.log("Session cleanup job scheduled to run daily at 3:30 AM.");
}

module.exports = { startSessionCleanupJob, purgeExpiredSessions };
