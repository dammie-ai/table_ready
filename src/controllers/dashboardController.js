const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const ROLE_DASHBOARD_CONFIG = {
  manager: {
    label: 'Manager Dashboard',
    description: 'Full system access with master control',
    hasMasterControl: true,
    widgets: [
      'order_overview', 'kitchen_orders', 'delivery_queue', 'pickup_queue',
      'floor_layout', 'active_sessions', 'inventory_alerts', 'low_stock',
      'sales_today', 'staff_on_shift', 'waitlist', 'service_requests',
      'promotions', 'analytics', 'audit_logs', 'customizer'
    ],
    orderTypes: ['IN_HOUSE', 'DRIVE_THRU', 'DELIVERY', 'ORDER_FROM_HOME', 'PICKUP'],
    permissions: ['manage_staff', 'manage_menu', 'manage_inventory', 'manage_promotions', 'view_analytics', 'manage_settings', 'process_refunds', 'assign_drivers', 'customize_system']
  },
  admin: {
    label: 'Admin Dashboard',
    description: 'Full operational access',
    hasMasterControl: false,
    widgets: [
      'order_overview', 'kitchen_orders', 'delivery_queue', 'pickup_queue',
      'floor_layout', 'active_sessions', 'inventory_alerts', 'low_stock',
      'sales_today', 'staff_on_shift', 'waitlist', 'service_requests',
      'promotions', 'analytics', 'audit_logs'
    ],
    orderTypes: ['IN_HOUSE', 'DRIVE_THRU', 'DELIVERY', 'ORDER_FROM_HOME', 'PICKUP'],
    permissions: ['manage_staff', 'manage_menu', 'manage_inventory', 'manage_promotions', 'view_analytics', 'manage_settings', 'process_refunds', 'assign_drivers']
  },
  assistant_manager: {
    label: 'Assistant Manager Dashboard',
    description: 'Operational oversight without customizer access',
    hasMasterControl: false,
    widgets: [
      'order_overview', 'kitchen_orders', 'delivery_queue', 'pickup_queue',
      'floor_layout', 'active_sessions', 'inventory_alerts', 'low_stock',
      'sales_today', 'staff_on_shift', 'waitlist', 'service_requests',
      'promotions', 'analytics'
    ],
    orderTypes: ['IN_HOUSE', 'DRIVE_THRU', 'DELIVERY', 'ORDER_FROM_HOME', 'PICKUP'],
    permissions: ['manage_staff', 'manage_menu', 'manage_inventory', 'manage_promotions', 'view_analytics', 'process_refunds', 'assign_drivers']
  },
  kitchen: {
    label: 'Kitchen Dashboard',
    description: 'Order preparation and kitchen management',
    hasMasterControl: false,
    widgets: [
      'kitchen_orders', 'order_tracking', 'inventory_alerts', 'low_stock',
      'menu_view'
    ],
    orderTypes: ['IN_HOUSE', 'DRIVE_THRU', 'DELIVERY', 'ORDER_FROM_HOME', 'PICKUP'],
    permissions: ['view_orders', 'update_order_status', 'view_inventory', 'start_cooking', 'mark_items_ready']
  },
  delivery: {
    label: 'Delivery Dashboard',
    description: 'Delivery order management and driver tools',
    hasMasterControl: false,
    widgets: [
      'delivery_queue', 'delivery_history', 'earnings'
    ],
    orderTypes: ['DELIVERY'],
    permissions: ['view_delivery_orders', 'update_delivery_status', 'view_own_earnings']
  },
  waiter: {
    label: 'Waiter Dashboard',
    description: 'Floor service and table management',
    hasMasterControl: false,
    widgets: [
      'my_tables', 'my_orders', 'service_requests', 'floor_layout',
      'cart_tools'
    ],
    orderTypes: ['IN_HOUSE', 'ORDER_FROM_HOME', 'PICKUP'],
    permissions: ['create_orders', 'manage_own_tables', 'handle_service_requests', 'process_cash_payments']
  },
  other: {
    label: 'Support Staff Dashboard',
    description: 'Limited access for support roles',
    hasMasterControl: false,
    widgets: [
      'service_requests', 'floor_layout'
    ],
    orderTypes: [],
    permissions: ['view_service_requests', 'view_floor']
  }
};

exports.getDashboardConfig = async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : (req.user.role ? [req.user.role] : []);

    const primaryRole = userRoles.includes('manager') ? 'manager'
      : userRoles.includes('admin') ? 'admin'
      : userRoles.includes('assistant_manager') ? 'assistant_manager'
      : userRoles.includes('kitchen') ? 'kitchen'
      : userRoles.includes('delivery') ? 'delivery'
      : userRoles.includes('waiter') ? 'waiter'
      : 'other';

    const config = ROLE_DASHBOARD_CONFIG[primaryRole] || ROLE_DASHBOARD_CONFIG['other'];

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'DASHBOARD_VIEWED',
      entity_type: 'dashboard',
      entity_id: null,
      new_value: JSON.stringify({ role: primaryRole, widgets: config.widgets }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      role: primaryRole,
      username: req.user.username,
      dashboard: config
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWaiterDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mySessions = await pool.query(
      `SELECT s.*, t.table_number, t.capacity
       FROM sessions s
       JOIN restaurant_tables t ON s.table_number = t.table_number
       WHERE s.waiter_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC`,
      [userId]
    );

    const myOrdersToday = await pool.query(
      `SELECT o.master_order_id, o.status, o.order_type, o.table_number,
              o.total_amount, o.created_at,
              json_agg(json_build_object('item_id', oi.item_id, 'quantity', oi.quantity)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE oi.ordered_by_user_id = $1 AND o.created_at >= $2
       GROUP BY o.master_order_id
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [userId, today]
    );

    const myServiceRequests = await pool.query(
      `SELECT sr.*, t.table_number
       FROM service_requests sr
       JOIN restaurant_tables t ON sr.table_number = t.table_number
       WHERE sr.status IN ('pending', 'acknowledged')
       ORDER BY sr.created_at ASC`,
      []
    );

    return res.status(200).json({
      success: true,
      role: 'waiter',
      my_sessions: mySessions.rows,
      my_orders_today: myOrdersToday.rows,
      service_requests: myServiceRequests.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getKitchenDashboard = async (req, res) => {
  try {
    const kitchenOrders = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object('order_item_id', oi.order_item_id, 'item_id', oi.item_id, 'quantity', oi.quantity, 'item_status', oi.item_status)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE o.status NOT IN ('ON_HOLD', 'CANCELLED', 'CANCELLED_AND_REFUNDED', 'COMPLETED', 'SERVED', 'PICKED_UP')
       GROUP BY o.master_order_id
       ORDER BY o.created_at ASC`
    );

    const heldOrders = await pool.query(
      `SELECT o.master_order_id, o.order_type, o.table_number, o.created_at, o.notes
       FROM orders o
       WHERE o.status = 'ON_HOLD'
       ORDER BY o.created_at ASC`
    );

    const readyOrders = await pool.query(
      `SELECT o.master_order_id, o.order_type, o.table_number, o.pickup_code, o.created_at
       FROM orders o
       WHERE o.status IN ('READY', 'READY_FOR_PICKUP')
       ORDER BY o.created_at ASC`
    );

    const lowStock = await pool.query(
      `SELECT i.id, i.item_name, i.stock_quantity, i.reorder_threshold, i.unit
       FROM inventory i
       WHERE i.is_active = true AND i.stock_quantity <= i.reorder_threshold
       ORDER BY i.stock_quantity ASC
       LIMIT 20`
    );

    return res.status(200).json({
      success: true,
      role: 'kitchen',
      active_orders: kitchenOrders.rows,
      held_orders: heldOrders.rows,
      ready_orders: readyOrders.rows,
      low_stock_alerts: lowStock.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDeliveryDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const availableDeliveries = await pool.query(
      `SELECT o.master_order_id, o.order_type, o.table_number, o.total_amount, o.created_at,
              o.customer_id, cp.first_name, cp.last_name, cp.phone,
              json_agg(json_build_object('item_id', oi.item_id, 'quantity', oi.quantity)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       LEFT JOIN customer_profiles cp ON o.customer_id = cp.customer_id
       WHERE o.order_type = 'DELIVERY' AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_AND_REFUNDED')
       GROUP BY o.master_order_id, cp.first_name, cp.last_name, cp.phone
       ORDER BY o.created_at ASC`
    );

    const myDeliveries = await pool.query(
      `SELECT o.master_order_id, o.status, o.total_amount, o.created_at,
              cp.first_name, cp.last_name, cp.phone,
              json_agg(json_build_object('item_id', oi.item_id, 'quantity', oi.quantity)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       LEFT JOIN customer_profiles cp ON o.customer_id = cp.customer_id
       LEFT JOIN order_assignments oa ON o.master_order_id = oa.order_id
       WHERE o.order_type = 'DELIVERY' AND oa.assigned_to = $1 AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_AND_REFUNDED')
       GROUP BY o.master_order_id, cp.first_name, cp.last_name, cp.phone
       ORDER BY o.created_at ASC`,
      [userId]
    );

    const deliveryStats = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE o.status = 'OUT_FOR_DELIVERY') AS active_deliveries,
         COUNT(*) FILTER (WHERE o.status = 'DELIVERED') AS completed_today,
         COALESCE(SUM(o.total_amount), 0) AS total_earnings
       FROM orders o
       LEFT JOIN order_assignments oa ON o.master_order_id = oa.order_id AND oa.assigned_to = $1
       WHERE o.order_type = 'DELIVERY' AND o.created_at >= $2`,
      [userId, new Date(new Date().setHours(0, 0, 0, 0))]
    );

    return res.status(200).json({
      success: true,
      role: 'delivery',
      available_deliveries: availableDeliveries.rows,
      my_deliveries: myDeliveries.rows,
      stats: deliveryStats.rows[0] || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesToday = await pool.query(
      `SELECT 
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue,
        COUNT(DISTINCT customer_id) AS unique_customers
       FROM orders
       WHERE created_at >= $1 AND status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')`,
      [today]
    );

    const orderBreakdown = await pool.query(
      `SELECT order_type, COUNT(*) AS count, SUM(total_amount) AS revenue
       FROM orders
       WHERE created_at >= $1 AND status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')
       GROUP BY order_type
       ORDER BY count DESC`,
      [today]
    );

    const activeAlerts = await pool.query(
      `SELECT a.*, i.item_name, i.sku
       FROM low_stock_alerts a
       JOIN inventory i ON a.inventory_id = i.id
       WHERE a.status IN ('active', 'acknowledged')
       ORDER BY a.created_at DESC
       LIMIT 20`
    );

    const staffOnShift = await pool.query(
      `SELECT u.id, u.username, u.role, e.name, e.account_lock_status
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.employee_id
       WHERE u.role IN ('waiter', 'kitchen', 'delivery', 'assistant_manager')
       ORDER BY u.role ASC, u.username ASC`
    );

    const recentAuditLogs = await pool.query(
      `SELECT * FROM audit_logs
       WHERE created_at >= $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [today]
    );

    const waitlistCount = await pool.query(
      `SELECT COUNT(*) AS waiting FROM waitlist_entries WHERE status = 'waiting'`
    );

    return res.status(200).json({
      success: true,
      role: 'admin',
      sales_today: salesToday.rows[0] || {},
      order_breakdown: orderBreakdown.rows,
      active_alerts: activeAlerts.rows,
      staff_on_shift: staffOnShift.rows,
      recent_audit_logs: recentAuditLogs.rows,
      waitlist_count: waitlistCount.rows[0] || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getManagerDashboard = async (req, res) => {
  try {
    const customizerAccess = await pool.query(
      `SELECT * FROM restaurant_config
       WHERE config_key IN ('branding', 'business_hours', 'delivery_radius', 'tax_rate', 'order_statuses')`
    );

    return res.status(200).json({
      success: true,
      role: 'manager',
      has_master_control: true,
      customizer_config: customizerAccess.rows.reduce((acc, row) => {
        acc[row.config_key] = row.config_value;
        return acc;
      }, {})
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAssistantManagerDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesToday = await pool.query(
      `SELECT 
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue,
        COUNT(DISTINCT customer_id) AS unique_customers
       FROM orders
       WHERE created_at >= $1 AND status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')`,
      [today]
    );

    const orderBreakdown = await pool.query(
      `SELECT order_type, COUNT(*) AS count, SUM(total_amount) AS revenue
       FROM orders
       WHERE created_at >= $1 AND status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')
       GROUP BY order_type
       ORDER BY count DESC`,
      [today]
    );

    const activeAlerts = await pool.query(
      `SELECT a.*, i.item_name, i.sku
       FROM low_stock_alerts a
       JOIN inventory i ON a.inventory_id = i.id
       WHERE a.status IN ('active', 'acknowledged')
       ORDER BY a.created_at DESC
       LIMIT 20`
    );

    const staffOnShift = await pool.query(
      `SELECT u.id, u.username, u.role, e.name, e.account_lock_status
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.employee_id
       WHERE u.role IN ('waiter', 'kitchen', 'delivery', 'assistant_manager')
       ORDER BY u.role ASC, u.username ASC`
    );

    const waitlistCount = await pool.query(
      `SELECT COUNT(*) AS waiting FROM waitlist_entries WHERE status = 'waiting'`
    );

    return res.status(200).json({
      success: true,
      role: 'assistant_manager',
      sales_today: salesToday.rows[0] || {},
      order_breakdown: orderBreakdown.rows,
      active_alerts: activeAlerts.rows,
      staff_on_shift: staffOnShift.rows,
      waitlist_count: waitlistCount.rows[0] || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOtherDashboard = async (req, res) => {
  try {
    const serviceRequests = await pool.query(
      `SELECT sr.*, t.table_number
       FROM service_requests sr
       JOIN restaurant_tables t ON sr.table_number = t.table_number
       WHERE sr.status IN ('pending', 'acknowledged')
       ORDER BY sr.created_at ASC`
    );

    const floorLayout = await pool.query(
      `SELECT table_id, table_number, status_state, updated_at
       FROM restaurant_tables
       ORDER BY table_number ASC`
    );

    return res.status(200).json({
      success: true,
      role: 'other',
      service_requests: serviceRequests.rows,
      floor_layout: floorLayout.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
