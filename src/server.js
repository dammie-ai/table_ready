const app = require('./app');
const dbConfig = require('./config/db');

const PORT = 8001;

const startServer = async () => {
  try {
    // 1. Verify database connection
    if (dbConfig.pool) {
      console.log('[Server] Database pool found. Testing connection...');
      await dbConfig.pool.query('SELECT NOW()');
      console.log('[Server] Database connection verified successfully.');
    } else {
      console.log('[Server] No database pool detected in config/db.js');
    }

    // 2. Start listening
    app.listen(PORT, () => {
      console.log(`[Server] TableReady backend running on port ${PORT}`);
      console.log(`[Server] Test the API health at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();