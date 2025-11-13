const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { logger, requestLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet()); // Set security headers
app.use(cors()); // Enable CORS

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (Array.isArray(logger)) {
  logger.forEach(l => app.use(l));
} else {
  app.use(logger);
}
app.use(requestLogger);

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Koinsave Fintech API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      transactions: '/api/transactions'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
