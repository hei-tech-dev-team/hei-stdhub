const cron = require("node-cron");
const db = require("../db");

const MAX_GLOBAL_MESSAGE = 1000;
const MAX_AGE_DAYS = 30;

async function purgeGlobalMessages(io = null) {
    try {
        const { rows } = await db.query(
            `DELETE FROM messages
            WHERE is_global = TRUE
            AND (
                created_at < NOW() - INTERVAL '${MAX_AGE_DAYS} days'
                OR id NOT IN (
                    SELECT id FROM messages
                    WHERE is_global = TRUE
                    ORDER BY created_at DESC
                    LIMIT $1
                )
            )
            RETURNING id`,
            [MAX_GLOBAL_MESSAGE],
        );

        if (rows.length > 0) {
            console.log(`Purged ${rows.length} global messages.`);
            if (io) {
                io.emit("messages:purged", { ids: rows.map((r) => r.id) });
            }
        }
    } catch (err) {
        console.error("[purge] Error purging global messages:", err.message);
    }
}

function startMessagePurgeJob(io) {
    cron.schedule("0 3 * * *", () => purgeGlobalMessages(io));
    console.log("Message purge job scheduled to run daily at 3:00 AM.");
}

module.exports = {
    startMessagePurgeJob,
    purgeGlobalMessages,
};