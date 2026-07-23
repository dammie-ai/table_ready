const express = require('express');
const http = require('http'); // 1. Added http module
const { Server } = require('socket.io'); // 2. Added socket.io

const app = express();
const server = http.createServer(app); // 3. Wrap Express with http server

// 4. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allows connections from your future frontend
    methods: ['GET', 'POST', 'PATCH', 'PUT']
  }
});

// 5. Make io accessible across all route files via req.app.get('io')
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

// Middleware
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessionRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Admin route for dynamic pricing settings

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TableReady backend is operational' });
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes); // Mount admin routes

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server Listener (Note: server.listen instead of app.listen)
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});