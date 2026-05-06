const { Pool } = require("pg");

function buildPool() {
  const host = process.env.PGHOST || "db-library";
  const port = process.env.PGPORT ? Number(process.env.PGPORT) : 5432;
  const database = process.env.PGDATABASE || "ducky_library_db";
  const user = process.env.PGUSER || "postgres";
  const password = process.env.PGPASSWORD || "postgres";

  return new Pool({ host, port, database, user, password });
}

const pool = buildPool();

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

module.exports = { pool, query };

