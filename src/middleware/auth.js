const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    // Attach user to request (without sensitive data)
    req.user = User.sanitize(user);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid token'
    });
  }
};

module.exports = authenticate;
