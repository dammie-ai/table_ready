const crypto = require('crypto');
const logger = require('../utils/logger');

// Every request gets a correlation id, attached to req so any handler can
// include it in its own log lines, and logged once on completion with
// method/path/status/duration — the minimum needed to trace one request's
// full path through the logs during an incident.
function requestLogger(req, res, next) {
  req.id = crypto.randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request completed', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

module.exports = requestLogger;
