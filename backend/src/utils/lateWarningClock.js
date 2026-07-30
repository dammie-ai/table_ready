const db = require('../config/db');
const pool = db.pool || db;

const LATE_WARNING_THRESHOLD_MINUTES = 10;
const CHECK_INTERVAL_MS = 30 * 1000;

async function checkOverdueOrders(io = null) {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const activeOrders = await client.query(
        `SELECT o.master_order_id, o.status, o.progress_percentage, o.total_amount, o.created_at,
                json_agg(
                  json_build_object(
                    'tracking_id', ct.tracking_id,
                    'order_item_id', ct.order_item_id,
                    'estimated_cook_minutes', ct.estimated_cook_minutes,
                    'status', ct.status,
                    'held_until', ct.held_until
                  )
                ) AS cook_tracking
         FROM orders o
         LEFT JOIN order_cook_tracking ct ON o.master_order_id = ct.master_order_id
         WHERE o.status IN ('RECEIVED', 'IN_PREPARATION', 'COOKING')
           AND o.is_held = false
         GROUP BY o.master_order_id, o.status, o.progress_percentage, o.total_amount, o.created_at`
      );

      for (const order of activeOrders.rows) {
        const trackingItems = order.cook_tracking.filter((t) => t.tracking_id !== null);

        for (const tracking of trackingItems) {
          if (tracking.status === 'overdue') continue;
          if (tracking.status === 'ready') continue;

          let elapsedMinutes;
          if (tracking.cooking_started_at) {
            elapsedMinutes = Math.floor(
              (Date.now() - new Date(tracking.cooking_started_at).getTime()) / 60000
            );
          } else {
            elapsedMinutes = Math.floor(
              (Date.now() - new Date(order.created_at).getTime()) / 60000
            );
          }

          const thresholdMinutes = (tracking.estimated_cook_minutes || 10) + LATE_WARNING_THRESHOLD_MINUTES;

          if (elapsedMinutes >= thresholdMinutes && tracking.status !== 'ready') {
            await client.query(
              `UPDATE order_cook_tracking
               SET status = 'overdue', overdue_notified = true, overdue_notified_at = NOW()
               WHERE tracking_id = $1`,
              [tracking.tracking_id]
            );

            console.log(`[LateWarningClock] Order #${order.master_order_id} item ${tracking.order_item_id} is OVERDUE (${elapsedMinutes}min vs ${thresholdMinutes}min threshold)`);
          }
        }

        const hasOverdue = trackingItems.some((t) => t.status === 'overdue');

        if (hasOverdue && order.status !== 'COOKING') {
          await client.query(
            `UPDATE orders
             SET progress_percentage = GREATEST(progress_percentage, 50)
             WHERE master_order_id = $1`,
            [order.master_order_id]
          );

          if (io) {
            io.emit('order_overdue', {
              orderId: order.master_order_id,
              status: order.status,
              message: `Order #${order.master_order_id} has overdue items requiring manager review.`,
            });
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[LateWarningClock] Error:', err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[LateWarningClock] Connection error:', err.message);
  }
}

function startLateWarningClock(io, intervalMs = CHECK_INTERVAL_MS) {
  console.log(`[LateWarningClock] Starting background clock (check interval: ${intervalMs}ms, threshold: +${LATE_WARNING_THRESHOLD_MINUTES}min above estimated)`);
  checkOverdueOrders(io);
  setInterval(() => checkOverdueOrders(io), intervalMs);
}

module.exports = {
  checkOverdueOrders,
  startLateWarningClock,
  LATE_WARNING_THRESHOLD_MINUTES,
  CHECK_INTERVAL_MS,
};