const pool = require('./src/db');

const addColumnQuery = `
  ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS party_size INT DEFAULT 1;
`;

async function updateTable() {
  try {
    await pool.query(addColumnQuery);
    console.log('✅ Added "party_size" column to "sessions" table!');
  } catch (err) {
    console.error('❌ Failed to update table:', err);
  } finally {
    process.exit();
  }
}

updateTable();