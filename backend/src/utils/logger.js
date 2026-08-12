// Structured logging with request correlation — previously this app only
// ever did raw console.log/console.error with no level, no timestamp, and
// no way to trace which log lines belonged to the same request. This
// doesn't retrofit every existing console.* call site (too large a change
// to make safely right now); it gives every NEW/touched call site, and
// every request going forward via requestLogger below, a real structured
// line to log against.
const LEVELS = ['debug', 'info', 'warn', 'error'];

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = Object.fromEntries(
  LEVELS.map((level) => [level, (message, meta) => log(level, message, meta)])
);

module.exports = logger;
