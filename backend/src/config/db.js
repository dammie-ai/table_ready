const { Pool, types } = require('pg');
require('dotenv').config();

// pg returns NUMERIC/DECIMAL (OID 1700) and BIGINT/COUNT() (OID 20) columns as
// strings by default to avoid precision loss beyond Number.MAX_SAFE_INTEGER.
// Every count/sum in this app is well within safe integer range and the
// frontend treats these as numbers (.toFixed(), arithmetic, reduce sums), so
// parse both as numbers at the driver level rather than patching every caller.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('[Database] PostgreSQL Client Connected successfully.');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err);
 // process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};