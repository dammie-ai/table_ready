const { pool } = require('../config/db');

// Helper function to generate a random 4-digit join code
const generateJoinCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// POST /api/session (Start / Find Table Session)
const findOrCreateSession = async (req, res) => {
  const { table_id, order_mode } = req.body;
  const waiterId = req.user?.id; // Injected from authGuard middleware if logged in

  // 1. HANDWRITTEN NOTES RULE: Delivery & Drive-Thru do NOT require table sessions/codes
  if (order_mode === 'delivery' || order_mode === 'drive_thru') {
    return res.status(200).json({
      message: `Session not required for ${order_mode} orders. Proceed directly to checkout.`,
      requires_table_code: false,
    });
  }

  // Dine-in requires a table_id
  if (!table_id) {
    return res.status(400).json({ error: 'table_id is required for Dine In sessions.' });
  }

  try {
    // 2. HANDWRITTEN NOTES RULE: Waiter Workload Cap (Max 3 assigned tables)
    if (waiterId) {
      const activeWaiterTablesQuery = `
        SELECT COUNT(DISTINCT table_id) as active_count
        FROM table_sessions
        WHERE assigned_waiter_id = $1 AND is_active = true
      `;
      const waiterCheck = await pool.query(activeWaiterTablesQuery, [waiterId]);
      const activeCount = parseInt(waiterCheck.rows[0].active_count, 10);

      if (activeCount >= 3) {
        return res.status(400).json({
          error: 'Workload limit reached: Waiters can only be responsible for a maximum of 3 tables at a time.'
        });
      }
    }

    // 3. Check if there is already an active session for this table
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

    // 4. Generate a fresh 4-digit join code and create session
    const joinCode = generateJoinCode();
    const createSessionQuery = `
      INSERT INTO table_sessions (table_id, assigned_waiter_id, is_group_setup, is_active, join_code, created_at)
      VALUES ($1, $2, true, true, $3, NOW())
      RETURNING *;
    `;
    const newSession = await pool.query(createSessionQuery, [table_id, waiterId || null, joinCode]);

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