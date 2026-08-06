const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const runMigration = async () => {
  try {
    const coreSchemaApplied = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'menu_items')`
    );

    if (coreSchemaApplied.rows[0].exists) {
      console.log('[Migration] Core schema already present, skipping init.sql.');
    } else {
      console.log('[Migration] Reading SQL schema...');
      const sqlPath = path.join(__dirname, 'init.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      console.log('[Migration] Executing core schema...');
      await pool.query(sql);
      console.log('[Migration] Core schema initialized.');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const applied = await pool.query('SELECT filename FROM schema_migrations');
      const appliedSet = new Set(applied.rows.map(r => r.filename));

      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));

      for (const file of files) {
        if (appliedSet.has(file)) {
          console.log(`[Migration] ${file} already applied, skipping.`);
          continue;
        }
        console.log(`[Migration] Running ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        await pool.query(migrationSql);
        await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
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
