const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

/**
 * Validation schemas
 */
const schemas = {
  // User registration validation
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      }),
    full_name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters long',
        'string.max': 'Full name must not exceed 100 characters',
        'any.required': 'Full name is required'
      })
  }),

  // User login validation
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  // Transaction validation
  transfer: Joi.object({
    recipient_email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid recipient email address',
        'any.required': 'Recipient email is required'
      }),
    amount: Joi.number()
      .positive()
      .precision(2)
      .max(1000000)
      .required()
      .messages({
        'number.positive': 'Amount must be greater than zero',
        'number.max': 'Amount cannot exceed 1,000,000',
        'any.required': 'Amount is required'
      }),
    description: Joi.string()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must not exceed 500 characters'
      })
  })
};

module.exports = {
  validate,
  schemas
};
