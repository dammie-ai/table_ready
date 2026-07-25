require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessionRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const menuRoutes = require('./routes/menuRoutes'); // Recipe/menu mappings
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const cartRoutes = require('./routes/cartRoutes');
const promotionsRoutes = require('./routes/promotionsRoutes');
const usualOrderRoutes = require('./routes/usualOrderRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const tableRoutes = require('./routes/tableRoutes');

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TableReady backend is operational' });
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes); // Mounts /api/menu/:id/ingredients
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', auditLogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/customer', usualOrderRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/tables', tableRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;