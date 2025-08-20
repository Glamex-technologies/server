/**
 * Rate Limiting Middleware for Enhanced Security
 * Provides protection against abuse and brute force attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter for logout endpoints
 * Limits requests per IP address to prevent abuse
 */
const createLogoutRateLimiter = (windowMs = 15 * 60 * 1000, max = 5) => {
  return rateLimit({
    windowMs: windowMs, // 15 minutes by default
    max: max, // limit each IP to 5 logout requests per windowMs
    message: {
      statusCode: 429,
      api_ver: process.env.API_VER,
      success: false,
      error: {
        error_code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many logout attempts. Please try again later.',
        timestamp: new Date().toISOString(),
        retry_after: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        statusCode: 429,
        api_ver: process.env.API_VER,
        success: false,
        error: {
          error_code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many logout attempts. Please try again later.',
          timestamp: new Date().toISOString(),
          retry_after: Math.ceil(windowMs / 1000),
          security_info: {
            token_invalidated: false,
            cache_cleared: false,
            session_terminated: false
          }
        }
      });
    },
    keyGenerator: (req) => {
      // Use IP address as key, but consider X-Forwarded-For for proxy scenarios
      return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    },
    skip: (req) => {
      // Skip rate limiting for certain conditions (e.g., whitelisted IPs)
      const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
      const clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
      return whitelistedIPs.includes(clientIP);
    }
  });
};

/**
 * Create a rate limiter for authentication endpoints
 * More restrictive for login/authentication attempts
 */
const createAuthRateLimiter = (windowMs = 15 * 60 * 1000, max = 3) => {
  return rateLimit({
    windowMs: windowMs, // 15 minutes by default
    max: max, // limit each IP to 3 auth attempts per windowMs
    message: {
      statusCode: 429,
      api_ver: process.env.API_VER,
      success: false,
      error: {
        error_code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
        timestamp: new Date().toISOString(),
        retry_after: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        statusCode: 429,
        api_ver: process.env.API_VER,
        success: false,
        error: {
          error_code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again later.',
          timestamp: new Date().toISOString(),
          retry_after: Math.ceil(windowMs / 1000)
        }
      });
    },
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    }
  });
};

/**
 * Create a general API rate limiter
 * For general API protection
 */
const createGeneralRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs: windowMs, // 15 minutes by default
    max: max, // limit each IP to 100 requests per windowMs
    message: {
      statusCode: 429,
      api_ver: process.env.API_VER,
      success: false,
      error: {
        error_code: 'GENERAL_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString(),
        retry_after: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        statusCode: 429,
        api_ver: process.env.API_VER,
        success: false,
        error: {
          error_code: 'GENERAL_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          timestamp: new Date().toISOString(),
          retry_after: Math.ceil(windowMs / 1000)
        }
      });
    },
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    }
  });
};

/**
 * Create a burst rate limiter for short-term protection
 * For protecting against sudden spikes in traffic
 */
const createBurstRateLimiter = (windowMs = 60 * 1000, max = 10) => {
  return rateLimit({
    windowMs: windowMs, // 1 minute
    max: max, // limit each IP to 10 requests per minute
    message: {
      statusCode: 429,
      api_ver: process.env.API_VER,
      success: false,
      error: {
        error_code: 'BURST_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests in a short time. Please slow down.',
        timestamp: new Date().toISOString(),
        retry_after: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        statusCode: 429,
        api_ver: process.env.API_VER,
        success: false,
        error: {
          error_code: 'BURST_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests in a short time. Please slow down.',
          timestamp: new Date().toISOString(),
          retry_after: Math.ceil(windowMs / 1000)
        }
      });
    },
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    }
  });
};

module.exports = {
  createLogoutRateLimiter,
  createAuthRateLimiter,
  createGeneralRateLimiter,
  createBurstRateLimiter
};
