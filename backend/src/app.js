require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const requestLogger = require('./middleware/requestLogger');
const app = express();

app.use(requestLogger);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8001'];

app.use(helmet({
  // This is mostly a JSON API, but it does serve a couple of real HTML
  // pages (api-tester.html below, error pages) that had zero CSP
  // protection. 'unsafe-inline' stays on script/style since api-tester.html
  // uses an inline <script> — tightening that further means externalizing
  // it first, not blocking it silently.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
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
  // 1000/15min (~66/min) was no real brake on credential stuffing.
  // 20/15min still comfortably covers a real user mistyping a password.
  max: 20,
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
app.use('/api/customer/login', authLimiter);
app.use('/api/customer/register', authLimiter);
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
const cartRoutes = require('./routes/cartRoutes');
const promotionsRoutes = require('./routes/promotionsRoutes');
const usualOrderRoutes = require('./routes/usualOrderRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');
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
const comboMealRoutes = require('./routes/comboMealRoutes');
const configRoutes = require('./routes/configRoutes');

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TableReady backend is operational' });
});

// Maps the entire API surface for free to anyone who finds it — dev/staging
// convenience only, never served in production.
if (process.env.NODE_ENV !== 'production') {
  app.get('/api-tester', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'api-tester.html'));
  });
}

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes); // Mounts /api/menu/:id/ingredients
app.use('/api/orders', orderRoutes);
app.use('/api/orders', orderModificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/customer', usualOrderRoutes);
app.use('/api/customer', customerAuthRoutes);
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

// Time entries aliases matching Postman collection paths
const scheduleCtrl = require('./controllers/scheduleController');
const { authenticateToken, authorizeRoles } = require('./middleware/authGuard');
const { validate, schemas } = require('./middleware/validation');

app.post('/api/time-entries/clock-in', authenticateToken, validate(schemas.clockInOut), scheduleCtrl.clockIn);
app.post('/api/time-entries/clock-out', authenticateToken, validate(schemas.clockInOut), scheduleCtrl.clockOut);
app.get('/api/time-entries', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), scheduleCtrl.getTimeEntries);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/combo-meals', comboMealRoutes);
app.use('/api/config', configRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;