const http = require('http');
const { Server } = require('socket.io');
const app = require('./app'); // Imports configured app instance
const jwt = require('jsonwebtoken');

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT']
  }
});

// Make io accessible across all route files via req.app.get('io')
app.set('io', io);

// WebSocket auth middleware
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    console.warn(`⚠️  Unauthenticated WebSocket connection attempt: ${socket.id}`);
    // For development: allow connection but warn
    // In production, you should return next(new Error('Authentication required'))
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tableready_secret');
    socket.user = decoded;
    console.log(`🔐 Authenticated WebSocket connection: ${socket.id} (user ${decoded.id}, role ${decoded.role})`);
    next();
  } catch (err) {
    console.warn(`⚠️  Invalid WebSocket token from ${socket.id}: ${err.message}`);
    // For development: allow connection but warn
    next();
  }
};

// Handle real-time WebSocket connections
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  const userInfo = socket.user ? `user ${socket.user.id} (${socket.user.role})` : 'anonymous';
  console.log(`⚡ WebSocket client connected: ${socket.id} [${userInfo}]`);

  // Customer joins their specific order room
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined room order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔥 WebSocket client disconnected: ${socket.id}`);
  });
});

// Start Server Listener
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});