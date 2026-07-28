require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many order requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/orders', orderLimiter);

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessionRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const orderModificationRoutes = require('./routes/orderModificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const cartRoutes = require('./routes/cartRoutes');
const promotionsRoutes = require('./routes/promotionsRoutes');
const usualOrderRoutes = require('./routes/usualOrderRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const tableRoutes = require('./routes/tableRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const kitchenSortingRoutes = require('./routes/kitchenSortingRoutes');
const kitchenStaggerRoutes = require('./routes/kitchenStaggerRoutes');
const salesAuditRoutes = require('./routes/salesAuditRoutes');
const allergyRoutes = require('./routes/allergyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const modifierRoutes = require('./routes/modifierRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const taxRoutes = require('./routes/taxRoutes');

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
app.use('/api/orders', orderModificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', auditLogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/customer', usualOrderRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/kitchen', kitchenSortingRoutes);
app.use('/api/kitchen', kitchenStaggerRoutes);
app.use('/api/audit', salesAuditRoutes);
app.use('/api/allergy', allergyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/modifiers', modifierRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tax', taxRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;