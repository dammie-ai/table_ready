const http = require('http');
const { Server } = require('socket.io');
const app = require('./app'); // Imports configured app instance

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

// Handle real-time WebSocket connections
io.on('connection', (socket) => {
  console.log(`⚡ WebSocket client connected: ${socket.id}`);

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