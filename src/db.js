require('dotenv').config();
const { Pool } = require('pg');

const dbPassword = String(process.env.DB_PASSWORD || '');

const pool = new Pool({
  user: process.env.DB_USER || 'tableready_admin',
  password: dbPassword,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tableready_db',
});

module.exports = pool;