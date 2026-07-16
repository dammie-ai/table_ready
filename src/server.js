require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 8000;

// Test DB Connection on startup, then boot server
pool.query('SELECT NOW()')
  .then(() => {
    console.log('[Database] Connection verified.');
    app.listen(PORT, () => {
      console.log(`[Server] TableReady backend running on port ${PORT}`);
      console.log(`[Server] Test the API health at: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('[Server] Database connection failed! Starting server aborted.', err);
    process.exit(1);
  });// This will capture and print any silent crashes so we can see them!
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});