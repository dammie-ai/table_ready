const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tableready',
  password: String(process.env.PGPASSWORD || process.env.DB_PASSWORD || ''),
  port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
});

module.exports = pool;