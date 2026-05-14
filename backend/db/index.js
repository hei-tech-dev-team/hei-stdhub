const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => console.log("PostgreSQL connecté"));
pool.on("error", (err) => {
  console.error("PG pool error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
