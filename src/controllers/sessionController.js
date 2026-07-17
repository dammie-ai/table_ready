const { pool } = require('../config/db');

// Helper function to generate a random 4-digit string code
const generateJoinCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// POST /api/session (Start / Find Table Session)
const findOrCreateSession = async (req, res) => {
  const { table_id } = req.body;

  if (!table_id) {
    return res.status(400).json({ error: 'table_id is required' });
  }

  try {
    // 1. Check if there is already an active session for this table
    const activeSessionQuery = `
      SELECT * FROM table_sessions 
      WHERE table_id = $1 AND is_active = true 
      LIMIT 1;
    `;
    const existingSession = await pool.query(activeSessionQuery, [table_id]);

    if (existingSession.rows.length > 0) {
      return res.status(200).json({
        message: 'Joined existing active session.',
        session: existingSession.rows[0]
      });
    }

    // 2. Generate a fresh, random 4-digit join code
    const joinCode = generateJoinCode();

    // 3. Create a new active session with the join code
    const createSessionQuery = `
      INSERT INTO table_sessions (table_id, is_group_setup, is_active, join_code, created_at)
      VALUES ($1, true, true, $2, NOW())
      RETURNING *;
    `;
    const newSession = await pool.query(createSessionQuery, [table_id, joinCode]);

    return res.status(201).json({
      message: 'New session created successfully.',
      session: newSession.rows[0]
    });

  } catch (err) {
    console.error('Error in findOrCreateSession:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/session/join (Join table session via 4-digit code)
const joinSessionByCode = async (req, res) => {
  const { join_code } = req.body;

  if (!join_code) {
    return res.status(400).json({ error: 'join_code is required' });
  }

  try {
    // Find the active session matching this 4-digit join code
    const findSessionQuery = `
      SELECT * FROM table_sessions 
      WHERE join_code = $1 AND is_active = true 
      LIMIT 1;
    `;
    const sessionResult = await pool.query(findSessionQuery, [join_code]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found. Please check your 4-digit code.' });
    }

    return res.status(200).json({
      message: 'Successfully joined session!',
      session: sessionResult.rows[0]
    });

  } catch (err) {
    console.error('Error in joinSessionByCode:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  findOrCreateSession,
  joinSessionByCode
};