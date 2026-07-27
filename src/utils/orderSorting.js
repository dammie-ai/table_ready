const pool = require('../config/db');

const ORDER_TYPE_CHANNELS = {
  IN_HOUSE: 'kitchen_dine_in',
  DINE_IN: 'kitchen_dine_in',
  DRIVE_THRU: 'kitchen_drive_thru',
  DELIVERY: 'kitchen_delivery',
  ORDER_FROM_HOME: 'kitchen_order_from_home',
  PICKUP: 'kitchen_pickup',
};

function getChannelForOrderType(orderType) {
  return ORDER_TYPE_CHANNELS[orderType] || ORDER_TYPE_CHANNELS.IN_HOUSE;
}

async function getOrdersByType(orderType, filters = {}) {
  const { status, limit = 50, offset = 0 } = filters;

  let query = `
    SELECT o.*,
           json_agg(
             json_build_object(
               'order_item_id', oi.order_item_id,
               'item_id', oi.item_id,
               'quantity', oi.quantity,
               'item_status', oi.item_status,
               'custom_instructions', oi.custom_instructions
             )
           ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
    WHERE o.order_type = $1
  `;
  const params = [orderType];
  let paramCount = 1;

  if (status) {
    paramCount++;
    query += ` AND o.status = $${paramCount}`;
    params.push(status);
  }

  query += ` GROUP BY o.master_order_id ORDER BY o.created_at ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return {
    orders: result.rows.map((row) => ({
      ...row,
      items: row.items.filter((item) => item.order_item_id !== null),
    })),
    count: result.rows.length,
  };
}

async function getAllOrderTypesSummary() {
  const result = await pool.query(
    `SELECT order_type,
            COUNT(*) AS total_orders,
            SUM(CASE WHEN status NOT IN ('COMPLETED', 'CANCELLED', 'SERVED', 'CANCELLED_AND_REFUNDED') THEN 1 ELSE 0 END) AS active_orders,
            SUM(total_amount) AS total_revenue
     FROM orders
     GROUP BY order_type
     ORDER BY total_orders DESC`
  );

  return result.rows;
}

function getOrderTypeLabel(orderType) {
  const labels = {
    IN_HOUSE: 'Dine-In',
    DINE_IN: 'Dine-In',
    DRIVE_THRU: 'Drive-Thru',
    DELIVERY: 'Delivery',
    ORDER_FROM_HOME: 'Order from Home',
    PICKUP: 'Pickup',
  };
  return labels[orderType] || orderType;
}

function getOrderTypeColor(orderType) {
  const colors = {
    IN_HOUSE: '#34a853',
    DINE_IN: '#34a853',
    DRIVE_THRU: '#ea4335',
    DELIVERY: '#fbbc04',
    ORDER_FROM_HOME: '#4285f4',
    PICKUP: '#ff6d01',
  };
  return colors[orderType] || '#9e9e9e';
}

module.exports = {
  ORDER_TYPE_CHANNELS,
  getChannelForOrderType,
  getOrdersByType,
  getAllOrderTypesSummary,
  getOrderTypeLabel,
  getOrderTypeColor,
};