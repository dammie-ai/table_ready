const { logAudit } = require('./auditLogger');

const ROOMS = {
  KITCHEN: 'kitchen',
  WAITER: 'waiter',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

function getRoomForOrderType(orderType) {
  const map = {
    IN_HOUSE: ROOMS.KITCHEN,
    DINE_IN: ROOMS.KITCHEN,
    DRIVE_THRU: ROOMS.KITCHEN,
    DELIVERY: ROOMS.KITCHEN,
    ORDER_FROM_HOME: ROOMS.KITCHEN,
    PICKUP: ROOMS.KITCHEN,
  };
  return map[orderType] || ROOMS.KITCHEN;
}

function setupWebSocketHub(io) {
  io.on('connection', (socket) => {
    const userInfo = socket.user
      ? `user ${socket.user.id} (${socket.user.role})`
      : 'anonymous (guest)';
    console.log(`⚡ WebSocket client connected: ${socket.id} [${userInfo}]`);

    socket.on('join_room', (room) => {
      const validRooms = Object.values(ROOMS);
      if (!validRooms.includes(room)) {
        socket.emit('error', { message: `Invalid room: ${room}` });
        return;
      }
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} joined room order_${orderId}`);
    });

    socket.on('join_table', (tableId) => {
      socket.join(`table_${tableId}`);
      console.log(`Socket ${socket.id} joined room table_${tableId}`);
    });

    socket.on('join_waitlist', () => {
      socket.join(ROOMS.WAITER);
      console.log(`Socket ${socket.id} joined waitlist room`);
    });

    socket.on('join_kitchen', () => {
      socket.join(ROOMS.KITCHEN);
      console.log(`Socket ${socket.id} joined kitchen room`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('join_cart_room', (room) => {
      socket.join(`cart_${room}`);
      console.log(`Socket ${socket.id} joined cart room cart_${room}`);
    });

    socket.on('leave_cart_room', (room) => {
      socket.leave(`cart_${room}`);
      console.log(`Socket ${socket.id} left cart room cart_${room}`);
    });

    socket.on('cart_update', (data) => {
      const { room, ...payload } = data
      socket.to(`cart_${room}`).emit(`cart_update:${room}`, payload)
      console.log(`Cart update broadcast to cart_${room}`)
    });

    socket.on('disconnect', () => {
      console.log(`🔥 WebSocket client disconnected: ${socket.id}`);
    });
  });

  setInterval(() => {
    io.emit('server_heartbeat', { timestamp: Date.now(), uptime: process.uptime() });
  }, 30000);

  return io;
}

function emitToRoom(io, room, event, data) {
  io.to(room).emit(event, data);
}

function emitToOrder(io, orderId, event, data) {
  io.to(`order_${orderId}`).emit(event, data);
}

function emitToTable(io, tableId, event, data) {
  io.to(`table_${tableId}`).emit(event, data);
}

function emitToAll(io, event, data) {
  io.emit(event, data);
}

function emitToKitchen(io, event, data) {
  io.to(ROOMS.KITCHEN).emit(event, data);
}

function emitToWaiter(io, event, data) {
  io.to(ROOMS.WAITER).emit(event, data);
}

function emitToAdmin(io, event, data) {
  io.to(ROOMS.ADMIN).emit(event, data);
}

function emitOrderStatusUpdate(io, orderId, order) {
  io.to(`order_${orderId}`).emit('order_status_updated', {
    orderId: order.master_order_id,
    status: order.status,
    progressPercentage: order.progress_percentage,
    updatedAt: order.updated_at,
  });
  io.to(ROOMS.KITCHEN).emit('kitchen_order_updated', {
    orderId: order.master_order_id,
    status: order.status,
    progressPercentage: order.progress_percentage,
  });
}

function emitNewOrder(io, order) {
  const room = getRoomForOrderType(order.order_type);
  io.to(room).emit('new_kitchen_order', order);
  io.to(ROOMS.CUSTOMER).emit('order_placed', order);
}

module.exports = {
  setupWebSocketHub,
  ROOMS,
  getRoomForOrderType,
  emitToRoom,
  emitToOrder,
  emitToTable,
  emitToAll,
  emitToKitchen,
  emitToWaiter,
  emitToAdmin,
  emitOrderStatusUpdate,
  emitNewOrder,
};