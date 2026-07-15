const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const runMigration = async () => {
  try {
    console.log('[Migration] Reading SQL schema...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[Migration] Executing queries on PostgreSQL container...');
    await pool.query(sql);

    console.log('[Migration] Success! All core tables initialized.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed to compile schema:', err);
    process.exit(1);
  }
};

runMigration();