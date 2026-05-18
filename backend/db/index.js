const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => { /* suppress noisy logs */ });
pool.on("error", (err) => {
  console.error("PG pool error:", err);
});

const ensureIndexes = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_global_chat_read_user ON global_chat_read(user_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
      CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at) WHERE use_count < max_uses;
      CREATE INDEX IF NOT EXISTS idx_suggestions_statut ON suggestions(statut);
      CREATE INDEX IF NOT EXISTS idx_suggestions_student ON suggestions(student_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver_seen ON messages(receiver_id, seen) WHERE is_global = FALSE;
      CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id) WHERE is_global = FALSE;
      CREATE INDEX IF NOT EXISTS idx_messages_global_created ON messages(created_at DESC) WHERE is_global = TRUE;
      CREATE INDEX IF NOT EXISTS idx_messages_is_global ON messages(is_global);
      CREATE INDEX IF NOT EXISTS idx_users_pseudo ON users USING gin(pseudo gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_users_ref ON users(ref);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_announcement_reactions_ann ON announcement_reactions(announcement_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_level ON posts(level);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id) WHERE used_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_security_questions_user ON user_security_questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_pings_status ON pings(status);
      CREATE INDEX IF NOT EXISTS idx_pings_receiver ON pings(receiver_id) WHERE status = 'pending';
    `);
  } catch (err) {
    console.error("Failed to ensure indexes:", err.message);
  }
};
ensureIndexes();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
