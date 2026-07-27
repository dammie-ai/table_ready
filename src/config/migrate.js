const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const runMigration = async () => {
  try {
    console.log('[Migration] Reading SQL schema...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[Migration] Executing core schema...');
    await pool.query(sql);
    console.log('[Migration] Core schema initialized.');

    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));

      for (const file of files) {
        console.log(`[Migration] Running ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        await pool.query(migrationSql);
        console.log(`[Migration] ${file} completed.`);
      }
    }

    console.log('[Migration] All migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
    process.exit(1);
  }
};

runMigration();
