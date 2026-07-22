const pool = require('../config/db');

// POST /api/sessions/check-shift
// Verifies whether a given user exists and holds the waiter role
const checkEmployeeShift = async (req, res) => {
  const { waiter_id } = req.body;

  // Validate the presence of the waiter_id parameter in the request payload
  if (!waiter_id) {
    return res.status(400).json({ error: 'waiter_id is required to check shift status.' });
  }

  try {
    // Fetch user details from PostgreSQL database matching the provided ID
    const shiftQuery = `
      SELECT id, username, role
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(shiftQuery, [waiter_id]);

    // Handle non-existent user records
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waiter not found.' });
    }

    const waiter = result.rows[0];

    // Verify the record holds the waiter role prior to assignment
    if (waiter.role !== 'waiter') {
      return res.status(400).json({
        error: `User ${waiter.username} is not registered as a waiter.`
      });
    }

    // Return successful verification response
    return res.status(200).json({
      on_shift: true,
      message: `Waiter ${waiter.username} is valid and ready for assignment.`,
      waiter: waiter
    });
  } catch (err) {
    // Log internal server/database execution errors
    console.error('Error checking employee shift:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/sessions
// Creates a new dining session assigned to a waiter and table
const createSession = async (req, res) => {
  const { table_number, waiter_id, party_size } = req.body;

  if (!table_number || !waiter_id) {
    return res.status(400).json({ error: 'table_number and waiter_id are required.' });
  }

  // Generate a random 4-digit access code
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    const query = `
      INSERT INTO sessions (table_number, waiter_id, code, party_size, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;
    const result = await pool.query(query, [
      table_number,
      waiter_id,
      code,
      party_size || 1
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating session:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/sessions
// Retrieves active dining sessions
const getActiveSessions = async (req, res) => {
  try {
    const query = `
      SELECT * FROM sessions
      WHERE status = 'active'
    `;
    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/sessions/:id/close
// Closes an active session
const closeSession = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE sessions
      SET status = 'closed', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error closing session:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  checkEmployeeShift,
  createSession,
  getActiveSessions,
  closeSession
};