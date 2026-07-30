const bcrypt = require('bcrypt');
const db = require('../config/db');
const pool = db.pool || db;

async function seed() {
  const users = [
    { username: 'manager_test', password: 'password123', role: 'manager' },
    { username: 'waiter_test', password: 'password123', role: 'waiter' },
    { username: 'kitchen_test', password: 'password123', role: 'kitchen' },
    { username: 'delivery_test', password: 'password123', role: 'delivery' },
    { username: 'assistant_manager_test', password: 'password123', role: 'assistant_manager' },
    { username: 'other_test', password: 'password123', role: 'other' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [u.username, hash, u.role]
    );
    console.log(`Seeded: ${u.username} / ${u.password} (${u.role})`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
