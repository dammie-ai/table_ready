const db = require('../config/db');
const pool = db.pool || db;
const { autoSeatAllAvailableTables } = require('./autoSeatWaitlist');

const ABANDONED_TIMEOUT_MS = 60 * 60 * 1000;
const RESERVATION_GRACE_PERIOD_MS = 15 * 60 * 1000;

async function cleanupAbandonedTables(io = null) {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const abandonedReservations = await client.query(
        `SELECT table_id, table_number, reservation_time
         FROM restaurant_tables
         WHERE status_state = 'Reserved'
           AND reservation_time IS NOT NULL
           AND reservation_time <= NOW() - INTERVAL '1 minute'
           AND NOT EXISTS (
             SELECT 1 FROM sessions s
             WHERE s.table_number = restaurant_tables.table_number
               AND s.status = 'active'
           )`
      );

      for (const table of abandonedReservations.rows) {
        await client.query(
          `UPDATE restaurant_tables
           SET status_state = 'Available', active_pin = NULL, pin_expires_at = NULL, waitlist_queue_array = '{}', reservation_time = NULL, updated_at = NOW()
           WHERE table_id = $1`,
          [table.table_id]
        );

        console.log(`[AbandonedTableCleaner] Freed reservation for table ${table.table_number} (reservation_time: ${table.reservation_time})`);

        if (io) {
          io.emit('table_released', {
            table_id: table.table_id,
            table_number: table.table_number,
            reason: 'abandoned_reservation',
            cleaned_at: new Date().toISOString(),
          });
        }
      }

      const abandonedSessions = await client.query(
        `SELECT s.id, s.table_number, s.created_at, s.status
         FROM sessions s
         WHERE s.status = 'active'
           AND s.created_at < NOW() - INTERVAL '3 hours'`
      );

      for (const session of abandonedSessions.rows) {
        const hasRecentOrders = await client.query(
          `SELECT 1 FROM orders o
           WHERE o.table_number = $1
             AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'SERVED', 'CANCELLED_AND_REFUNDED')
             AND o.created_at > NOW() - INTERVAL '3 hours'
           LIMIT 1`,
          [session.table_number]
        );

        if (hasRecentOrders.rows.length > 0) {
          continue;
        }

        await client.query(
          `UPDATE sessions
           SET status = 'closed', ended_at = NOW()
           WHERE id = $1`,
          [session.id]
        );

        await client.query(
          `UPDATE restaurant_tables
           SET status_state = 'Available', active_pin = NULL, pin_expires_at = NULL, updated_at = NOW()
           WHERE table_number = $1`,
          [session.table_number]
        );

        console.log(`[AbandonedTableCleaner] Cleaned up session ${session.id} for table ${session.table_number}`);

        if (io) {
          io.emit('table_released', {
            table_number: session.table_number,
            reason: 'abandoned_session',
            cleaned_at: new Date().toISOString(),
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[AbandonedTableCleaner] Error:', err.message);
    } finally {
      client.release();
    }

    await autoSeatAllAvailableTables(io);
  } catch (err) {
    console.error('[AbandonedTableCleaner] Connection error:', err.message);
  }
}

function startAbandonedTableCleaner(io, intervalMs = 5 * 60 * 1000) {
  console.log(`[AbandonedTableCleaner] Starting background cleaner (interval: ${intervalMs}ms)`);
  cleanupAbandonedTables(io);
  setInterval(() => cleanupAbandonedTables(io), intervalMs);
}

module.exports = {
  cleanupAbandonedTables,
  startAbandonedTableCleaner,
  ABANDONED_TIMEOUT_MS,
  RESERVATION_GRACE_PERIOD_MS,
};