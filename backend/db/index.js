const { Pool } = require("pg");

const url = require("url");

const POOL_MAX = parseInt(process.env.POOL_MAX || "10", 10);

const makePool = () => {
  const envHost = process.env.PGHOST || process.env.DB_HOST;
  if (envHost) {
    return new Pool({
      host: envHost,
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      user: process.env.PGUSER || process.env.DB_USER || "n8mare",
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || "",
      database: process.env.PGDATABASE || process.env.DB_NAME || "hei_stdhub",
      max: POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  const conn = process.env.DATABASE_URL || "";
  if (conn.startsWith("postgresql://") || conn.startsWith("postgres://")) {
    try {
      const parsed = new url.URL(conn);
      const params = {
        host: parsed.hostname ? decodeURIComponent(parsed.hostname) : "/var/run/postgresql",
        port: Number(parsed.port || 5432),
        user: decodeURIComponent(parsed.username || "n8mare"),
        password: decodeURIComponent(parsed.password || ""),
        database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "hei_stdhub",
        max: POOL_MAX,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
      const hostParam = parsed.searchParams.get("host");
      if (hostParam) params.host = hostParam;
      const sslmode = parsed.searchParams.get("sslmode");
      if (sslmode || params.host.includes("supabase") || params.host.includes("pooler")) {
        params.ssl = { rejectUnauthorized: false };
      }
      return new Pool(params);
    } catch {
      return new Pool({
        connectionString: conn,
        ssl: conn.includes("supabase") || conn.includes("pooler") ? { rejectUnauthorized: false } : false,
        max: POOL_MAX,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
  }

  return new Pool({
    host: "/var/run/postgresql",
    user: "n8mare",
    database: "hei_stdhub",
    max: POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
};

const pool = makePool();

pool.on("connect", () => {});
pool.on("error", (err) => {
  console.error("PG pool error:", err);
});

const ensureIndexes = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS groupe VARCHAR(10) NULL`);
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
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id) WHERE used_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_security_questions_user ON user_security_questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_pings_status ON pings(status);
      CREATE INDEX IF NOT EXISTS idx_pings_receiver ON pings(receiver_id) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_messages_global_id ON messages(id DESC) WHERE is_global = TRUE;
      CREATE INDEX IF NOT EXISTS idx_messages_private_pair ON messages(sender_id, receiver_id, id DESC) WHERE is_global = FALSE;
      CREATE INDEX IF NOT EXISTS idx_push_notifications_user_unread ON push_notifications(user_id, is_read) WHERE is_read = FALSE;
      ALTER TABLE supports DROP CONSTRAINT IF EXISTS chk_support_ue;
      CREATE TABLE IF NOT EXISTS custom_ues (
        id         SERIAL       PRIMARY KEY,
        ue         VARCHAR(30)  NOT NULL UNIQUE,
        level      VARCHAR(2)   NOT NULL DEFAULT 'L1',
        created_by INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
      );
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
