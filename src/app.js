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
    res.json({
      message: 'Welcome to the Waiter Dashboard!',
      user: req.user // Contains the verified user ID and role
    });
  }
);

// Kitchen Queue (Accessible ONLY by kitchen staff and admins)
app.get(
  '/api/kitchen/queue',
  authenticateToken,
  authorizeRoles('kitchen'),
  (req, res) => {
    res.json({
      message: 'Welcome to the Kitchen Queue!',
      user: req.user
    });
  }
);

// Manager Panel (Accessible ONLY by managers and admins)
app.get(
  '/api/manager/panel',
  authenticateToken,
  authorizeRoles('manager'),
  (req, res) => {
    res.json({
      message: 'Welcome to the Manager Panel!',
      user: req.user
    });
  }
);

module.exports = app;