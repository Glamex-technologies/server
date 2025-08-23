# Error Handling Improvements

## Overview

This document outlines the comprehensive error handling improvements implemented to prevent server crashes and provide proper error responses to clients.

## Problem Identified

The server was crashing with a 500 Internal Server Error when receiving malformed JSON data in requests, specifically in the provider profile update endpoint. This was happening because:

1. **JSON Parsing Errors**: Malformed JSON was causing the Express body-parser to throw unhandled exceptions
2. **No Error Middleware**: The application lacked proper error handling middleware for various error types
3. **Unhandled Promise Rejections**: Some async operations could potentially cause unhandled promise rejections

## Additional Issue Fixed

### Authentication Response Logic

**Problem**: When users tried to login with unverified accounts, the API was returning a success response (`success: true`) with status code 200, which was logically incorrect.

**Example of incorrect response**:
```json
{
    "statusCode": 200,
    "message": "Your account needs to be verified before you can login. OTP has been sent to your registered mobile number for verification.",
    "success": true,  // ❌ This should be false
    "data": {
        "verification_required": true,
        "otp_type": "login"
    }
}
```

**Solution**: Changed the response to use status code 403 (Forbidden) with proper error handling:

```json
{
    "statusCode": 403,
    "message": "Your account needs to be verified before you can login. OTP has been sent to your registered mobile number for verification.",
    "success": false,  // ✅ Now correctly false
    "error_code": "VERIFICATION_REQUIRED",  // ✅ Added specific error code
    "data": {
        "verification_required": true,
        "otp_type": "login"
    }
}
```

## Solution Implemented

### 1. Comprehensive Error Handling Middleware

Created a new middleware file: `src/application/middlewares/errorHandler.middleware.js`

This middleware handles various types of errors:

- **JSON Parsing Errors**: Invalid JSON format in request body
- **Multer File Upload Errors**: File size limits, file type validation, etc.
- **Validation Errors**: Joi validation, Sequelize validation errors
- **Database Errors**: Unique constraints, foreign key violations, connection issues
- **JWT Token Errors**: Invalid tokens, expired tokens
- **Rate Limiting Errors**: Too many requests
- **Generic Errors**: All other unexpected errors

### 2. Enhanced Express Configuration

Updated `src/app.js` to include:

- **JSON Body Parser with Error Handling**: Added verification function to catch JSON parsing errors early
- **Comprehensive Error Middleware Stack**: Multiple error handlers in order of specificity
- **404 Handler**: Proper handling of undefined routes
- **Development vs Production**: Different error detail levels based on environment

### 3. Error Response Format

All error responses now follow a consistent format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "error_code": "MACHINE_READABLE_ERROR_CODE",
  "details": "Additional error details (development only)"
}
```

### 4. Authentication Response Logic Fix

- **User Authentication**: Fixed unverified user login to return 403 status with `VERIFICATION_REQUIRED` error code
- **Provider Authentication**: Already correctly using 422 status for unverified users
- **Response Helper Enhancement**: Added support for custom error codes in response data

## Error Types Handled

### 1. JSON Parsing Errors
- **Error Code**: `INVALID_JSON_FORMAT`
- **Status Code**: 400
- **Trigger**: Malformed JSON in request body
- **Example**: `{"name": "test", "email": "test@example.com",}` (trailing comma)

### 2. File Upload Errors
- **Error Code**: `FILE_UPLOAD_ERROR`
- **Status Code**: 400/500
- **Triggers**: File too large, wrong file type, too many files, etc.

### 3. Validation Errors
- **Error Code**: `VALIDATION_ERROR`
- **Status Code**: 400
- **Triggers**: Joi validation failures, Sequelize validation errors

### 4. Database Errors
- **Error Code**: `DUPLICATE_ENTRY`, `INVALID_REFERENCE`, `DATABASE_ERROR`
- **Status Code**: 409, 400, 503
- **Triggers**: Unique constraint violations, foreign key violations, connection issues

### 5. Authentication Errors
- **Error Code**: `INVALID_TOKEN`, `TOKEN_EXPIRED`, `VERIFICATION_REQUIRED`
- **Status Code**: 401, 403
- **Triggers**: Invalid JWT tokens, expired tokens, unverified accounts

### 6. Rate Limiting
- **Error Code**: `RATE_LIMIT_EXCEEDED`
- **Status Code**: 429
- **Triggers**: Too many requests from same IP

### 7. Route Not Found
- **Error Code**: `ROUTE_NOT_FOUND`
- **Status Code**: 404
- **Triggers**: Undefined routes

### 8. Generic Errors
- **Error Code**: `INTERNAL_SERVER_ERROR`
- **Status Code**: 500
- **Triggers**: All other unexpected errors

## Implementation Details

### Error Handler Middleware Structure

```javascript
class ErrorHandlerMiddleware {
  static handleJsonParsingError(err, req, res, next)
  static handleMulterError(err, req, res, next)
  static handleValidationError(err, req, res, next)
  static handleDatabaseError(err, req, res, next)
  static handleJwtError(err, req, res, next)
  static handleRateLimitError(err, req, res, next)
  static handleGenericError(err, req, res, next)
  static handleNotFound(req, res, next)
  static asyncHandler(fn)
}
```

### Middleware Order in app.js

```javascript
// Error handlers in order of specificity
app.use(ErrorHandlerMiddleware.handleJsonParsingError);
app.use(ErrorHandlerMiddleware.handleMulterError);
app.use(ErrorHandlerMiddleware.handleValidationError);
app.use(ErrorHandlerMiddleware.handleDatabaseError);
app.use(ErrorHandlerMiddleware.handleJwtError);
app.use(ErrorHandlerMiddleware.handleRateLimitError);

// 404 handler
app.use(ErrorHandlerMiddleware.handleNotFound);

// Generic error handler (must be last)
app.use(ErrorHandlerMiddleware.handleGenericError);
```

### Async Error Wrapper

The `asyncHandler` function wraps async route handlers to catch unhandled promise rejections:

```javascript
static asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### Authentication Response Logic

**Before (Incorrect)**:
```javascript
return response.success(
  "Your account needs to be verified before you can login...",
  res,
  { verification_required: true, otp_type: 'login' }
);
```

**After (Correct)**:
```javascript
return response.custom(403, 
  "Your account needs to be verified before you can login...",
  res,
  {
    verification_required: true,
    otp_type: 'login',
    error_code: "VERIFICATION_REQUIRED"
  }
);
```

## Testing

### Test Scripts
Created multiple test scripts to verify error handling:

1. **`test-error-handling.js`**: Tests JSON parsing error handling
2. **`test-verification-response.js`**: Tests authentication response logic

### Manual Testing
Test the following scenarios:

1. **Provider Profile Update with Malformed JSON**:
   ```bash
   curl -X PUT http://localhost:8080/api/v1/provider/profile \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{"first_name": "Test", "last_name": "User",}'
   ```
   Expected: 400 status with `INVALID_JSON_FORMAT` error

2. **Unverified User Login**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/user/login \
     -H "Content-Type: application/json" \
     -d '{"phone_code": "971", "phone_number": "501234565", "password": "password123"}'
   ```
   Expected: 403 status with `VERIFICATION_REQUIRED` error

3. **Valid Request**:
   ```bash
   curl -X PUT http://localhost:8080/api/v1/provider/profile \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{"first_name": "Test", "last_name": "User"}'
   ```
   Expected: Normal processing (may fail on validation but not crash)

## Benefits

1. **No More Server Crashes**: All errors are now properly caught and handled
2. **Consistent Error Responses**: Standardized error format across all endpoints
3. **Better Client Experience**: Clear error messages and codes for debugging
4. **Security**: No error details leaked in production
5. **Maintainability**: Centralized error handling logic
6. **Debugging**: Better error logging and categorization
7. **Logical Consistency**: Authentication responses now correctly reflect success/failure states

## Future Improvements

1. **Error Logging**: Implement structured logging for errors
2. **Error Monitoring**: Integrate with error monitoring services
3. **Custom Error Classes**: Create specific error classes for different error types
4. **Error Recovery**: Implement automatic retry mechanisms for transient errors
5. **Client Error Handling**: Provide client-side error handling guidance

## Files Modified

1. `src/app.js` - Enhanced with comprehensive error handling
2. `src/application/middlewares/errorHandler.middleware.js` - New error handling middleware
3. `src/application/resources/users/user.controller.js` - Fixed authentication response logic
4. `src/application/helpers/response.helpers.js` - Enhanced to support custom error codes
5. `test-error-handling.js` - Test script for JSON parsing errors
6. `test-verification-response.js` - Test script for authentication responses

## Conclusion

The server now gracefully handles all types of errors without crashing, providing proper error responses to clients while maintaining security and debugging capabilities. The authentication response logic has been fixed to correctly reflect the success/failure states of login attempts.
