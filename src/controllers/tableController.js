const pool = require('../config/db');

/**
 * POST /api/tables/verify
 * Verify a table access code (for reserved tables / customer verification)
 */
exports.verifyTableCode = async (req, res) => {
  const { table_number, code } = req.body;

  if (!table_number || !code) {
    return res.status(400).json({ success: false, error: 'table_number and code are required.' });
  }

  try {
    const tableRes = await pool.query(
      `SELECT table_id, status_state, active_pin, pin_expires_at
       FROM restaurant_tables
       WHERE table_number = $1`,
      [table_number]
    );

    if (tableRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const table = tableRes.rows[0];

    if (table.status_state !== 'Reserved') {
      return res.status(400).json({ success: false, error: 'Table is not reserved.' });
    }

    if (table.active_pin !== code) {
      return res.status(401).json({ success: false, error: 'Invalid verification code.' });
    }

    if (table.pin_expires_at && new Date() > new Date(table.pin_expires_at)) {
      return res.status(401).json({ success: false, error: 'Verification code expired.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Table verified successfully.',
      table_id: table.table_id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/tables/floor-layout
 * Get floor layout with table statuses
 */
exports.getFloorLayout = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT table_id, table_number, status_state, updated_at
       FROM restaurant_tables
       ORDER BY table_number ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tables: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/tables/:id/status
 * Update table status (staff only)
 */
exports.updateTableStatus = async (req, res) => {
  const { id } = req.params;
  const { status_state } = req.body;

  if (!status_state) {
    return res.status(400).json({ success: false, error: 'status_state is required.' });
  }

  const validStates = ['Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty'];
  if (!validStates.includes(status_state)) {
    return res.status(400).json({ success: false, error: `Invalid status_state. Must be one of: ${validStates.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE restaurant_tables
       SET status_state = $1, updated_at = NOW()
       WHERE table_id = $2
       RETURNING *`,
      [status_state, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_updated', result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: `Table status updated to ${status_state}.`,
      table: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tables
 * Create a new table (admin only)
 */
exports.createTable = async (req, res) => {
  const { table_number } = req.body;

  if (!table_number) {
    return res.status(400).json({ success: false, error: 'table_number is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurant_tables (table_number, status_state)
       VALUES ($1, 'Available')
       RETURNING *`,
      [table_number]
    );

    return res.status(201).json({
      success: true,
      message: 'Table created.',
      table: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Table number already exists.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};