const db = require('../config/db');
const pool = db.pool || db;

async function seed() {
  const tables = [
    { table_number: 1, active_pin: '1234', pin_expires_at: '2026-12-31T23:59:59Z' },
    { table_number: 2, active_pin: '5678', pin_expires_at: '2026-12-31T23:59:59Z' },
    { table_number: 3, active_pin: '9999', pin_expires_at: '2026-12-31T23:59:59Z' },
  ];

  for (const t of tables) {
    await pool.query(
      `UPDATE restaurant_tables
        SET active_pin = $1, pin_expires_at = $2
        WHERE table_number = $3`,
      [t.active_pin, t.pin_expires_at, t.table_number]
    );
    console.log(`Seeded PIN for table ${t.table_number}: ${t.active_pin}`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
