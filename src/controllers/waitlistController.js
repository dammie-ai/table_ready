const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

exports.joinWaitlist = async (req, res) => {
  const { table_id, customer_name, phone, party_size } = req.body;

  if (!table_id || !customer_name || !party_size) {
    return res.status(400).json({
      success: false,
      error: 'table_id, customer_name, and party_size are required.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tableRes = await client.query(
      `SELECT table_id, status_state, capacity FROM restaurant_tables WHERE table_id = $1 FOR UPDATE`,
      [table_id]
    );

    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const table = tableRes.rows[0];

    if (party_size > table.capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Party size (${party_size}) exceeds table capacity (${table.capacity}).`,
      });
    }

    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    const pinExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const result = await client.query(
      `INSERT INTO waitlist_entries (table_id, customer_name, phone, party_size, status, pin_code, pin_expires_at)
       VALUES ($1, $2, $3, $4, 'waiting', $5, $6)
       RETURNING *`,
      [table_id, customer_name, phone || null, party_size, pinCode, pinExpiresAt]
    );

    const entry = result.rows[0];

    await client.query(
      `UPDATE restaurant_tables
       SET status_state = 'Reserved', waitlist_queue_array = array_append(waitlist_queue_array, $1), updated_at = NOW()
       WHERE table_id = $2`,
      [entry.entry_id, table_id]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'WAITLIST_JOIN',
      entity_type: 'waitlist_entry',
      entity_id: entry.entry_id,
      new_value: JSON.stringify({ customer_name, party_size, table_id, pin_code: pinCode }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Added to waitlist.',
      entry: {
        entry_id: entry.entry_id,
        table_id: entry.table_id,
        customer_name: entry.customer_name,
        party_size: entry.party_size,
        pin_code: entry.pin_code,
        pin_expires_at: entry.pin_expires_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.getWaitlist = async (req, res) => {
  const { status, table_id } = req.query;

  try {
    let query = `SELECT * FROM waitlist_entries WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (table_id) {
      paramCount++;
      query += ` AND table_id = $${paramCount}`;
      params.push(table_id);
    }

    query += ` ORDER BY created_at ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      entries: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.seatNextInLine = async (req, res) => {
  const { table_id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tableRes = await client.query(
      `SELECT * FROM restaurant_tables WHERE table_id = $1 FOR UPDATE`,
      [table_id]
    );

    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const nextEntry = await client.query(
      `SELECT * FROM waitlist_entries
       WHERE table_id = $1 AND status = 'waiting'
       ORDER BY created_at ASC
       LIMIT 1`,
      [table_id]
    );

    if (nextEntry.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'No waiting customers for this table.',
      });
    }

    const entry = nextEntry.rows[0];
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await client.query(
      `UPDATE waitlist_entries
       SET status = 'seated', pin_code = $1, pin_expires_at = $2, seated_at = NOW(), updated_at = NOW()
       WHERE entry_id = $3`,
      [newPin, pinExpiresAt, entry.entry_id]
    );

    await client.query(
      `UPDATE restaurant_tables
       SET status_state = 'Occupied', active_pin = $1, pin_expires_at = $2, waitlist_queue_array = array_remove(waitlist_queue_array, $3), updated_at = NOW()
       WHERE table_id = $4`,
      [newPin, pinExpiresAt, entry.entry_id, table_id]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'WAITLIST_SEATED',
      entity_type: 'waitlist_entry',
      entity_id: entry.entry_id,
      new_value: JSON.stringify({ seated: true, pin_code: newPin }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`table_${table_id}`).emit('table_seated', {
        entry_id: entry.entry_id,
        customer_name: entry.customer_name,
        pin_code: newPin,
        pin_expires_at: pinExpiresAt,
      });
      io.emit('waitlist_updated', {
        action: 'seated',
        entry_id: entry.entry_id,
        table_id: table_id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Next customer seated.',
      entry: {
        entry_id: entry.entry_id,
        customer_name: entry.customer_name,
        pin_code: newPin,
        pin_expires_at: pinExpiresAt,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.cancelWaitlistEntry = async (req, res) => {
  const { entry_id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE waitlist_entries
       SET status = 'cancelled', updated_at = NOW()
       WHERE entry_id = $1 AND status = 'waiting'
       RETURNING *`,
      [entry_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Waitlist entry not found or already processed.',
      });
    }

    const entry = result.rows[0];

    await pool.query(
      `UPDATE restaurant_tables
       SET waitlist_queue_array = array_remove(waitlist_queue_array, $1), updated_at = NOW()
       WHERE table_id = $2`,
      [entry_id, entry.table_id]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'WAITLIST_CANCELLED',
      entity_type: 'waitlist_entry',
      entity_id: entry_id,
      old_value: JSON.stringify({ status: 'waiting' }),
      new_value: JSON.stringify({ status: 'cancelled' }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: 'Waitlist entry cancelled.',
      entry: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.markNoShow = async (req, res) => {
  const { entry_id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE waitlist_entries
       SET status = 'no_show', updated_at = NOW()
       WHERE entry_id = $1 AND status = 'waiting'
       RETURNING *`,
      [entry_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Waitlist entry not found or already processed.',
      });
    }

    const entry = result.rows[0];

    await pool.query(
      `UPDATE restaurant_tables
       SET waitlist_queue_array = array_remove(waitlist_queue_array, $1), updated_at = NOW()
       WHERE table_id = $2`,
      [entry_id, entry.table_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Customer marked as no-show.',
      entry: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWaitlistQueue = async (req, res) => {
  const { table_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM waitlist_entries
       WHERE table_id = $1 AND status = 'waiting'
       ORDER BY created_at ASC`,
      [table_id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      queue: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};