const db = require('../config/db');
const pool = db.pool || db;
const { emitToTable } = require('./websocketHub');

async function autoSeatWaitlistForTable(io, tableId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tableRes = await client.query(
      `SELECT table_id, table_number, status_state, capacity FROM restaurant_tables WHERE table_id = $1 FOR UPDATE`,
      [tableId]
    );

    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Table not found.' };
    }

    const table = tableRes.rows[0]; 

    if (table.status_state !== 'Available') {
      await client.query('ROLLBACK');
      return { success: false, message: 'Table is not available.' };
    }

    const nextEntry = await client.query(
      `SELECT * FROM waitlist_entries
       WHERE table_id = $1 AND status = 'waiting'
       ORDER BY created_at ASC
       LIMIT 1`,
      [tableId]
    );

    if (nextEntry.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'No waiting customers for this table.' };
    }

    const entry = nextEntry.rows[0];

    if (entry.party_size > table.capacity) {
      await client.query('ROLLBACK');
      return { success: false, message: `Party size (${entry.party_size}) exceeds table capacity (${table.capacity}).` };
    }

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
      [newPin, pinExpiresAt, entry.entry_id, tableId]
    );

    await client.query('COMMIT');

    if (io) {
      emitToTable(io, tableId, 'table_seated', {
        entry_id: entry.entry_id,
        customer_name: entry.customer_name,
        pin_code: newPin,
        pin_expires_at: pinExpiresAt,
      });
      io.emit('waitlist_updated', {
        action: 'seated',
        entry_id: entry.entry_id,
        table_id: tableId,
      });
    }

    return {
      success: true,
      message: 'Next customer seated automatically.',
      entry: {
        entry_id: entry.entry_id,
        customer_name: entry.customer_name,
        pin_code: newPin,
        pin_expires_at: pinExpiresAt,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[AutoSeatWaitlist] Error:', err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

async function autoSeatAllAvailableTables(io) {
  try {
    const tablesRes = await pool.query(
      `SELECT table_id FROM restaurant_tables WHERE status_state = 'Available'`
    );

    const results = [];
    for (const table of tablesRes.rows) {
      const result = await autoSeatWaitlistForTable(io, table.table_id);
      results.push({ table_id: table.table_id, ...result });
    }

    return results;
  } catch (err) {
    console.error('[AutoSeatWaitlist] Batch error:', err.message);
    return [];
  }
}

module.exports = {
  autoSeatWaitlistForTable,
  autoSeatAllAvailableTables,
};
