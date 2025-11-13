const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Check if user already exists
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user with initial balance of 1000
    const user = User.create({
      email,
      password,
      full_name,
      initial_balance: 1000.0
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: User.sanitize(user),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: User.sanitize(user),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    // User is already attached to request by auth middleware
    const user = User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: User.sanitize(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile
};
