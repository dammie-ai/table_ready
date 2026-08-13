// Must run before the JWT_SECRET check below — app.js also calls this,
// but only as a side effect of being required, which happens after the
// check otherwise (a no-op in production, where Render sets real env vars
// directly rather than through a .env file).
require('dotenv').config();

// Every token in this app is signed/verified with this secret. Previously
// every call site fell back to a hardcoded, publicly-visible value
// ('tableready_secret') if this env var was ever missing — silently
// letting anyone forge a manager-role token instead of the server simply
// refusing to start. Failing loudly here is the actual fix.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — refusing to start. Set it in the environment before running the server.');
}

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const jwt = require('jsonwebtoken');
const { setupWebSocketHub, ROOMS } = require('./utils/websocketHub');
const { startAbandonedTableCleaner } = require('./utils/abandonedTableCleaner');
const { startLateWarningClock } = require('./utils/lateWarningClock');
const { scheduleSalesAudit, createDefaultAuditConfig } = require('./utils/salesAudit');

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new Server(server, {
  cors: {
    // Matches app.js's Express CORS: allow no-Origin requests (native
    // mobile clients don't send a browser-style Origin header at all)
    // rather than exact-matching an allowlisted IP that changes every
    // time the dev machine joins a different network.
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT'],
    credentials: true,
  },
});

app.set('io', io);

const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    socket.user = null;
    console.log(`⚡ Guest WebSocket connection allowed: ${socket.id}`);
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    console.log(`⚡ Authenticated WebSocket connection: ${socket.id} (user ${decoded.id}, role ${decoded.role})`);
    next();
  } catch (err) {
    console.warn(`Invalid WebSocket token from ${socket.id}: ${err.message}`);
    socket.user = null;
    return next();
  }
};

io.use(socketAuthMiddleware);

setupWebSocketHub(io);

app.set('io', io);

const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket rooms available: ${Object.values(ROOMS).join(', ')}`);

  startAbandonedTableCleaner(io, 5 * 60 * 1000);
  console.log('[Server] Abandoned table cleaner started (5-min interval)');

  startLateWarningClock(io, 30 * 1000);
  console.log('[Server] Late warning clock started (30-sec interval)');

  createDefaultAuditConfig();
  scheduleSalesAudit(io);
  console.log('[Server] Sales audit scheduler started');
});

module.exports = { server, io };