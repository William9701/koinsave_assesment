const Idempotency = require('../models/Idempotency');

/**
 * Idempotency middleware for financial transactions
 *
 * Prevents duplicate transactions by using idempotency keys.
 * Clients should generate a unique UUID for each transaction and send it
 * in the Idempotency-Key header.
 *
 * If a request with the same key is received within 24 hours:
 * - If the previous request is still processing: return 409 Conflict
 * - If the previous request completed: return the cached response
 * - If the request body differs: return 422 Unprocessable Entity
 */
const idempotencyMiddleware = (req, res, next) => {
  // Only apply to mutation operations (POST, PUT, PATCH, DELETE)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Get idempotency key from header
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // Idempotency key is optional for backward compatibility
  // But highly recommended for all financial transactions
  if (!idempotencyKey) {
    // Store original send function
    const originalSend = res.send;

    // Override send to log warning for transactions without idempotency key
    res.send = function(data) {
      if (req.path.includes('/transfer')) {
        console.warn(`⚠️  Transaction without idempotency key from user: ${req.user?.id}`);
      }
      return originalSend.call(this, data);
    };

    return next();
  }

  // Validate idempotency key format (should be a UUID or similar unique string)
  if (idempotencyKey.length < 10 || idempotencyKey.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'Invalid idempotency key format. Must be between 10 and 255 characters.'
    });
  }

  try {
    // Check if we've seen this idempotency key before
    const existingRequest = Idempotency.find(idempotencyKey);

    if (existingRequest) {
      // Verify the request matches the original request
      const requestMatches = Idempotency.verifyMatch(existingRequest, {
        path: req.path,
        body: req.body
      });

      if (!requestMatches) {
        // Same idempotency key but different request - this is an error
        return res.status(422).json({
          success: false,
          error: 'Idempotency key reused with different request parameters',
          details: 'The idempotency key has been used with a different request. Please use a new key or ensure request parameters match.'
        });
      }

      // If response exists, return the cached response
      if (existingRequest.response_code && existingRequest.response_body) {
        const cachedResponse = JSON.parse(existingRequest.response_body);
        return res.status(existingRequest.response_code).json(cachedResponse);
      }

      // Request is still processing or failed before completion
      return res.status(409).json({
        success: false,
        error: 'Request with this idempotency key is already being processed',
        details: 'Please wait for the original request to complete or use a different idempotency key.'
      });
    }

    // Store new idempotency key
    Idempotency.store({
      idempotencyKey,
      userId: req.user.id,
      requestPath: req.path,
      requestBody: req.body,
      expiresInHours: 24
    });

    // Store idempotency key in request for controller use
    req.idempotencyKey = idempotencyKey;

    // Intercept response to store it
    const originalJson = res.json;
    res.json = function(body) {
      // Store response in idempotency table
      try {
        Idempotency.update({
          idempotencyKey,
          responseCode: res.statusCode,
          responseBody: body,
          transactionId: body.data?.transaction?.id || null
        });
      } catch (error) {
        console.error('Error storing idempotent response:', error);
      }

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Don't fail the request if idempotency check fails
    // Log error and continue
    next();
  }
};

module.exports = idempotencyMiddleware;
