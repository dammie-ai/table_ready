const db = require('../config/db');
const pool = db.pool || db;

function calculateNextRun(scheduleType, intervalValue, dayOfWeek, hour, minute) {
  const now = new Date();
  const next = new Date(now);

  switch (scheduleType) {
    case 'once':
      next.setHours(hour || 0, minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case 'daily':
      next.setHours(hour || 0, minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case 'every_x_days':
      next.setHours(hour || 0, minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + (intervalValue || 1));
      break;
    case 'weekly':
      next.setHours(hour || 0, minute || 0, 0, 0);
      const targetDay = dayOfWeek !== null && dayOfWeek !== undefined ? dayOfWeek : 6;
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      next.setDate(next.getDate() + (daysUntilTarget === 0 && next <= now ? 7 : daysUntilTarget));
      break;
    case 'every_x_weeks':
      next.setHours(hour || 0, minute || 0, 0, 0);
      const targetDayW = dayOfWeek !== null && dayOfWeek !== undefined ? dayOfWeek : 6;
      const currentDayW = now.getDay();
      const daysUntilTargetW = (targetDayW - currentDayW + 7) % 7;
      const weeks = intervalValue || 1;
      next.setDate(next.getDate() + (daysUntilTargetW === 0 && next <= now ? weeks * 7 : daysUntilTargetW));
      break;
    case 'monthly':
      next.setHours(hour || 0, minute || 0, 0, 0);
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      break;
    case 'every_x_months':
      next.setHours(hour || 0, minute || 0, 0, 0);
      next.setDate(1);
      next.setMonth(next.getMonth() + (intervalValue || 1));
      break;
    default:
      next.setHours(hour || 0, minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
  }

  return next;
}

async function runSalesAudit(config = null, io = null) {
  let auditConfig;

  if (config) {
    auditConfig = config;
  } else {
    const configRes = await pool.query(
      `SELECT * FROM sales_audit_config WHERE is_active = true ORDER BY config_id ASC`
    );

    if (configRes.rows.length === 0) {
      console.log('[SalesAudit] No active audit configs found. Skipping.');
      return;
    }

    auditConfig = configRes.rows[0];
  }

  const { config_id, schedule_type, interval_value = 1, day_of_week, hour = 0, minute = 0 } = auditConfig;

  let periodStart;
  let periodEnd;

  const now = new Date();

  switch (schedule_type) {
    case 'once':
      periodEnd = now;
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'daily':
      periodEnd = now;
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'every_x_days':
      periodEnd = now;
      periodStart = new Date(now.getTime() - (interval_value || 1) * 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      periodEnd = now;
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'every_x_weeks':
      periodEnd = now;
      periodStart = new Date(now.getTime() - (interval_value || 1) * 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      periodEnd = now;
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'every_x_months':
      periodEnd = now;
      const startMonth = now.getMonth() - (interval_value || 1);
      periodStart = new Date(now.getFullYear(), startMonth, 1);
      break;
    default:
      periodEnd = now;
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const topItemRes = await client.query(
        `SELECT oi.item_id, mi.name, SUM(oi.quantity) AS total_quantity,
                SUM(oi.quantity * mi.base_price) AS total_revenue
         FROM order_items oi
         JOIN orders o ON oi.master_order_id = o.master_order_id
         JOIN menu_items mi ON oi.item_id = mi.item_id
         WHERE o.created_at >= $1 AND o.created_at <= $2
           AND o.status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')
         GROUP BY oi.item_id, mi.name
         ORDER BY total_quantity DESC
         LIMIT 1`,
        [periodStart, periodEnd]
      );

      const totalRevenueRes = await client.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(DISTINCT master_order_id) AS total_orders
         FROM orders
         WHERE created_at >= $1 AND created_at <= $2
           AND status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')`,
        [periodStart, periodEnd]
      );

      const topItem = topItemRes.rows[0] || null;
      const totals = totalRevenueRes.rows[0];

      const result = await client.query(
        `INSERT INTO sales_audit_results (config_id, period_start, period_end, top_item_id, top_item_name, top_item_quantity, top_item_revenue, total_revenue, total_orders)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          config_id,
          periodStart,
          periodEnd,
          topItem ? topItem.item_id : null,
          topItem ? topItem.name : null,
          topItem ? parseInt(topItem.total_quantity) : 0,
          topItem ? parseFloat(topItem.total_revenue) : 0,
          parseFloat(totals.total_revenue),
          parseInt(totals.total_orders),
        ]
      );

      const nextRun = calculateNextRun(schedule_type, interval_value, day_of_week, hour, minute);

      await client.query(
        `UPDATE sales_audit_config SET last_run = NOW(), next_run = $1 WHERE config_id = $2`,
        [nextRun, config_id]
      );

      await client.query('COMMIT');

      console.log(`[SalesAudit] Audit completed for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}. Top item: ${topItem ? topItem.name : 'None'}`);

      if (io) {
        io.emit('sales_audit_completed', {
          config_id,
          period_start: periodStart,
          period_end: periodEnd,
          top_item: topItem,
          total_revenue: totals.total_revenue,
          total_orders: totals.total_orders,
        });
      }

      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[SalesAudit] Error:', err.message);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SalesAudit] Connection error:', err.message);
    throw err;
  }
}

async function runNow(io = null) {
  const configRes = await pool.query(
    `SELECT * FROM sales_audit_config WHERE is_active = true ORDER BY config_id ASC LIMIT 1`
  );

  if (configRes.rows.length === 0) {
    throw new Error('No active audit config found.');
  }

  return runSalesAudit(configRes.rows[0], io);
}

function scheduleSalesAudit(io) {
  pool.query(
    `SELECT * FROM sales_audit_config WHERE is_active = true AND next_run <= NOW() ORDER BY config_id ASC`
  ).then(async (res) => {
    for (const config of res.rows) {
      try {
        await runSalesAudit(config, io);
      } catch (err) {
        console.error(`[SalesAudit] Failed to run config ${config.config_id}:`, err.message);
      }
    }
  }).catch((err) => {
    console.error('[SalesAudit] Schedule check error:', err.message);
  });

  setInterval(() => scheduleSalesAudit(io), 60 * 1000);
}

function createDefaultAuditConfig() {
  pool.query(
    `INSERT INTO sales_audit_config (schedule_type, interval_value, day_of_week, hour, minute, is_active, next_run)
     VALUES ('weekly', 1, 6, 0, 0, true, $1)
     ON CONFLICT DO NOTHING`,
    [calculateNextRun('weekly', 1, 6, 0, 0)]
  ).catch((err) => {
    console.error('[SalesAudit] Failed to create default config:', err.message);
  });
}

module.exports = {
  runSalesAudit,
  runNow,
  scheduleSalesAudit,
  createDefaultAuditConfig,
  calculateNextRun,
};
