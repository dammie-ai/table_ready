const { pool } = require('../config/db');

/**
 * Finds or creates an active table session for a physical table.
 * This ensures multiple phones scanning the same table QR get connected to the same session!
 */
const findOrCreateSession = async (req, res) => {
  const { table_id } = req.body;

  if (!table_id) {
    return res.status(400).json({ error: 'table_id is required.' });
  }

  try {
    // 1. Check if there is already an active session for this physical table
    const existingSession = await pool.query(
      `SELECT session_id, table_id, is_group_setup, is_active 
       FROM table_sessions 
       WHERE table_id = $1 AND is_active = TRUE 
       LIMIT 1`,
      [table_id]
    );

    if (existingSession.rows.length > 0) {
      // Multiple devices connecting to the exact same table session!
      return res.status(200).json({
        message: 'Joined existing active session.',
        session: existingSession.rows[0]
      });
    }

    // 2. No active session exists, so let's spin up a brand-new one
    const newSession = await pool.query(
      `INSERT INTO table_sessions (table_id) 
       VALUES ($1) 
       RETURNING session_id, table_id, is_group_setup, is_active, created_at`,
      [table_id]
    );

    return res.status(201).json({
      message: 'Created a brand-new table session.',
      session: newSession.rows[0]
    });

  } catch (error) {
    console.error('Error in findOrCreateSession:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  findOrCreateSession
};