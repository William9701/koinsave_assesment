const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { transactionLimiter } = require('../middleware/rateLimiter');
const idempotencyMiddleware = require('../middleware/idempotency');

/**
 * @route   POST /api/transactions/transfer
 * @desc    Transfer money to another user
 * @access  Private
 * @idempotency Supported via Idempotency-Key header
 */
router.post('/transfer', authenticate, idempotencyMiddleware, transactionLimiter, validate(schemas.transfer), transactionController.transfer);

/**
 * @route   GET /api/transactions/history
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/history', authenticate, transactionController.getHistory);

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get single transaction details
 * @access  Private
 */
router.get('/:transactionId', authenticate, transactionController.getTransaction);

/**
 * @route   GET /api/transactions/balance
 * @desc    Get user balance
 * @access  Private
 */
router.get('/balance/current', authenticate, transactionController.getBalance);

/**
 * @route   GET /api/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get('/stats/summary', authenticate, transactionController.getStats);

module.exports = router;
