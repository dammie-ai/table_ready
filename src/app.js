const express = require('express');
const app = express();

// 1. Body Parser Middleware (MUST come before route declarations)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Import Route Handlers
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'TableReady backend is healthy.' });
});

// 4. Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;