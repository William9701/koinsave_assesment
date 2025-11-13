const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom format for detailed logging
const detailedFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Morgan middleware configurations
const developmentLogger = morgan('dev'); // Colorful console output for development
const productionLogger = morgan(detailedFormat, { stream: accessLogStream }); // File logging for production

// Combined logger that logs to both console and file in production
const logger = process.env.NODE_ENV === 'production'
  ? [productionLogger, morgan('combined')]
  : developmentLogger;

/**
 * Custom request logger middleware for transaction tracking
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  };

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logData.statusCode = res.statusCode;
    logData.duration = `${duration}ms`;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} (${logData.duration})`);
    }

    // Log sensitive operations
    if (req.url.includes('/transaction') || req.url.includes('/transfer')) {
      const sensitiveLogPath = path.join(logsDir, 'transactions.log');
      fs.appendFileSync(sensitiveLogPath, JSON.stringify(logData) + '\n');
    }
  });

  next();
};

module.exports = {
  logger,
  requestLogger
};
