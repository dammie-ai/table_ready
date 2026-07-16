const express = require('express');
const cors = require('cors');

// Import your auth controller and security guards
const { login } = require('./controllers/authController');
const { authenticateToken, authorizeRoles } = require('./middleware/authGuard');

const app = express();

// Middleware
app.use(cors()); // Allows both your customer app and staff portal to talk to this API
app.use(express.json()); // Allows the API to read JSON data sent in request bodies

// Baseline Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'TableReady API is up and running!',
    timestamp: new Date()
  });
});

// --- AUTHENTICATION ROUTES ---
// This is your login route (Implicitly determines role from username & password)
app.post('/api/login', login);

// --- SECURED DEPARTMENTAL ROUTES ---

// Waiter Dashboard (Accessible ONLY by waiters and admins)
app.get(
  '/api/waiter/dashboard', 
  authenticateToken, 
  authorizeRoles('waiter'), 
  (req, res) => {
    res.json({ message: `Welcome ${req.user.username}! Here is your Waiter Terminal.` });
  }
);

// Kitchen Display System (Accessible ONLY by kitchen staff and admins)
app.get(
  '/api/kitchen/orders', 
  authenticateToken, 
  authorizeRoles('kitchen'), 
  (req, res) => {
    res.json({ message: 'Kitchen connection verified. Here are the active orders.' });
  }
);

// Admin Analytics & Controls (Accessible ONLY by admins)
app.get(
  '/api/admin/analytics', 
  authenticateToken, 
  authorizeRoles('admin'), 
  (req, res) => {
    res.json({ message: 'Welcome Master Admin. Load comprehensive analytics.' });
  }
);

module.exports = app;