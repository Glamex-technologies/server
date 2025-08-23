const ResponseHelper = require('../helpers/response.helpers');
const multer = require('multer');

const response = new ResponseHelper();

/**
 * Comprehensive error handling middleware for the application
 * Handles various types of errors and returns appropriate responses
 */
class ErrorHandlerMiddleware {
  /**
   * Handle JSON parsing errors
   */
  static handleJsonParsingError(err, req, res, next) {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      console.error('JSON Parsing Error:', err.message);
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON format in request body",
        error_code: "INVALID_JSON_FORMAT"
      });
    }
    next(err);
  }

  /**
   * Handle multer file upload errors
   */
  static handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err.message);
      
      let message = "File upload error";
      let statusCode = 400;
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = "File size too large";
          break;
        case 'LIMIT_FILE_COUNT':
          message = "Too many files uploaded";
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = "Unexpected file field";
          break;
        case 'LIMIT_FIELD_COUNT':
          message = "Too many fields in form";
          break;
        case 'LIMIT_FIELD_KEY':
          message = "Field name too long";
          break;
        case 'LIMIT_FIELD_VALUE':
          message = "Field value too long";
          break;
        case 'LIMIT_PART_COUNT':
          message = "Too many parts in form";
          break;
        default:
          message = "File upload failed";
          statusCode = 500;
      }
      
      return res.status(statusCode).json({
        status: "error",
        message: message,
        error_code: "FILE_UPLOAD_ERROR"
      });
    }
    next(err);
  }

  /**
   * Handle validation errors (Joi, Sequelize, etc.)
   */
  static handleValidationError(err, req, res, next) {
    if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
      console.error('Validation Error:', err.message);
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        error_code: "VALIDATION_ERROR",
        details: err.message
      });
    }
    next(err);
  }

  /**
   * Handle database constraint errors
   */
  static handleDatabaseError(err, req, res, next) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      console.error('Database Unique Constraint Error:', err.message);
      return res.status(409).json({
        status: "error",
        message: "Duplicate entry found",
        error_code: "DUPLICATE_ENTRY",
        details: err.message
      });
    }
    
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      console.error('Database Foreign Key Error:', err.message);
      return res.status(400).json({
        status: "error",
        message: "Invalid reference data",
        error_code: "INVALID_REFERENCE",
        details: err.message
      });
    }
    
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeDatabaseError') {
      console.error('Database Connection Error:', err.message);
      return res.status(503).json({
        status: "error",
        message: "Database service temporarily unavailable",
        error_code: "DATABASE_ERROR"
      });
    }
    
    next(err);
  }

  /**
   * Handle JWT token errors
   */
  static handleJwtError(err, req, res, next) {
    if (err.name === 'JsonWebTokenError') {
      console.error('JWT Error:', err.message);
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
        error_code: "INVALID_TOKEN"
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      console.error('JWT Token Expired:', err.message);
      return res.status(401).json({
        status: "error",
        message: "Token has expired",
        error_code: "TOKEN_EXPIRED"
      });
    }
    
    next(err);
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(err, req, res, next) {
    if (err.status === 429) {
      console.error('Rate Limit Error:', err.message);
      return res.status(429).json({
        status: "error",
        message: "Too many requests. Please try again later.",
        error_code: "RATE_LIMIT_EXCEEDED"
      });
    }
    next(err);
  }

  /**
   * Generic error handler for all other errors
   */
  static handleGenericError(err, req, res, next) {
    console.error('Generic Error occurred:', err.message);
    console.error('Error stack:', err.stack);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({ 
      status: "error", 
      message: "Something went wrong!",
      error_code: "INTERNAL_SERVER_ERROR",
      error: isDevelopment ? err.message : {}
    });
  }

  /**
   * Handle 404 errors for undefined routes
   */
  static handleNotFound(req, res, next) {
    res.status(404).json({
      status: "error",
      message: "Route not found",
      error_code: "ROUTE_NOT_FOUND",
      path: req.originalUrl
    });
  }

  /**
   * Async error wrapper for route handlers
   * Wraps async route handlers to catch unhandled promise rejections
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandlerMiddleware;
