const pool = require('../config/db');
const { getOrdersByType, getAllOrderTypesSummary, getOrderTypeLabel, getOrderTypeColor } = require('../utils/orderSorting');

exports.getOrdersByType = async (req, res) => {
  const { order_type } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    const result = await getOrdersByType(order_type, { status, limit, offset });

    return res.status(200).json({
      success: true,
      order_type: order_type,
      label: getOrderTypeLabel(order_type),
      color: getOrderTypeColor(order_type),
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllOrderTypesSummary = async (req, res) => {
  try {
    const result = await getAllOrderTypesSummary();

    const summary = result.map((row) => ({
      order_type: row.order_type,
      label: getOrderTypeLabel(row.order_type),
      color: getOrderTypeColor(row.order_type),
      total_orders: parseInt(row.total_orders),
      active_orders: parseInt(row.active_orders),
      total_revenue: parseFloat(row.total_revenue),
    }));

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrderTypes = async (req, res) => {
  const orderTypes = [
    { type: 'IN_HOUSE', label: 'Dine-In', color: '#34a853' },
    { type: 'DRIVE_THRU', label: 'Drive-Thru', color: '#ea4335' },
    { type: 'DELIVERY', label: 'Delivery', color: '#fbbc04' },
    { type: 'ORDER_FROM_HOME', label: 'Order from Home', color: '#4285f4' },
    { type: 'PICKUP', label: 'Pickup', color: '#ff6d01' },
  ];

  return res.status(200).json({
    success: true,
    order_types: orderTypes,
  });
};

exports.getKitchenChannel = async (req, res) => {
  const { order_type } = req.params;
  const channel = require('../utils/orderSorting').getChannelForOrderType(order_type);

  return res.status(200).json({
    success: true,
    order_type,
    channel,
  });
};