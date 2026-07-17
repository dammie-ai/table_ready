const express = require('express');
const cors = require('cors');

// Import existing routes
const authRoutes = require('./routes/auth'); // Points to auth.js successfully

// Import your brand-new session routes for TAB-28
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Base Health Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'TableReady API is up and running!',
    timestamp: new Date().toISOString()
  });
});

// Register Feature Routes
app.use('/api', authRoutes);
app.use('/api', sessionRoutes); // Registers POST /api/session

// 404 Handler for unregistered routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;