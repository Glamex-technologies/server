# Provider Profile Management API Documentation

## Overview
This document describes the updated provider profile management endpoints that support comprehensive profile updates and secure account deletion.

## Base URL
```
PUT /api/provider/profile
DELETE /api/provider/delete-my-account
```

## Authentication
All endpoints require provider authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 1. Update Provider Profile

### Endpoint
```
PUT /api/provider/profile
```

### Description
Updates provider profile information with support for partial updates across multiple models (User, ServiceProvider, Address, BankDetails).

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body
The request body supports partial updates. You can send only the fields you want to update:

#### User Fields
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "gender": 1,
  "profile_image": "https://example.com/profile.jpg",
  "notification": 1,
  "fcm_token": "fcm_token_here"
}
```

#### Provider Fields
```json
{
  "provider_type": "individual",
  "salon_name": "Beauty Salon",
  "banner_image": "https://example.com/banner.jpg",
  "description": "Professional beauty services",
  "national_id_image_url": "https://example.com/national_id.jpg",
  "freelance_certificate_image_url": "https://example.com/certificate.jpg",
  "commercial_registration_image_url": "https://example.com/registration.jpg",
  "is_available": 1,
  "subscription_id": 1,
  "subscription_expiry": "2024-12-31T23:59:59.000Z"
}
```

#### Address Fields
```json
{
  "address": "123 Main Street, City",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "country_id": 1,
  "city_id": 1
}
```

#### Bank Fields
```json
{
  "account_holder_name": "John Doe",
  "bank_name": "Example Bank",
  "iban": "AE123456789012345678901"
}
```

### Field Descriptions

#### User Fields
- `first_name` (string, 2-50 chars): Provider's first name
- `last_name` (string, 2-50 chars): Provider's last name
- `email` (string, valid email): Provider's email address
- `gender` (number, 1 or 2): 1 = male, 2 = female
- `profile_image` (string, valid URL): Profile image URL
- `notification` (number, 0 or 1): Notification preferences
- `fcm_token` (string): Firebase Cloud Messaging token

#### Provider Fields
- `provider_type` (string, 'individual' or 'salon'): Type of provider
- `salon_name` (string, 2-100 chars): Name of the salon (for salon providers)
- `banner_image` (string, valid URL): Banner image URL
- `description` (string, max 1000 chars): Provider description
- `national_id_image_url` (string, valid URL): National ID document URL
- `freelance_certificate_image_url` (string, valid URL): Freelance certificate URL
- `commercial_registration_image_url` (string, valid URL): Commercial registration URL
- `is_available` (number, 0 or 1): Availability status
- `subscription_id` (number, min 0): Subscription type
- `subscription_expiry` (date): Subscription expiry date

#### Address Fields
- `address` (string, max 500 chars): Full address
- `latitude` (number, -90 to 90): Latitude coordinate
- `longitude` (number, -180 to 180): Longitude coordinate
- `country_id` (number, min 1): Country ID
- `city_id` (number, min 1): City ID

#### Bank Fields
- `account_holder_name` (string, 2-100 chars): Bank account holder name
- `bank_name` (string, 2-100 chars): Bank name
- `iban` (string, 10-50 chars): International Bank Account Number

### Example Requests

#### Update Basic Information
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

#### Update Provider Details
```json
{
  "salon_name": "Beauty & Style Salon",
  "description": "Professional beauty and styling services with 10+ years experience",
  "is_available": 1
}
```

#### Update Address
```json
{
  "address": "456 Business District, Dubai",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "country_id": 1,
  "city_id": 1
}
```

#### Update Bank Details
```json
{
  "account_holder_name": "John Doe",
  "bank_name": "Emirates NBD",
  "iban": "AE123456789012345678901"
}
```

### Response

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "Provider profile updated successfully",
  "data": {
    "user": {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone_code": "+971",
      "phone_number": "501234567",
      "gender": 1,
      "is_verified": 1,
      "verified_at": "2024-01-15T10:30:00.000Z",
      "profile_image": "https://example.com/profile.jpg",
      "status": 1,
      "notification": 1,
      "fcm_token": "fcm_token_here"
    },
    "provider": {
      "id": 456,
      "provider_type": "individual",
      "salon_name": "Beauty & Style Salon",
      "banner_image": "https://example.com/banner.jpg",
      "description": "Professional beauty and styling services",
      "national_id_image_url": "https://example.com/national_id.jpg",
      "freelance_certificate_image_url": "https://example.com/certificate.jpg",
      "commercial_registration_image_url": null,
      "overall_rating": 4.5,
      "total_reviews": 25,
      "total_bookings": 150,
      "total_customers": 120,
      "is_approved": 1,
      "rejection_reason": null,
      "is_available": 1,
      "step_completed": 6,
      "notification": 1,
      "fcm_token": "fcm_token_here",
      "subscription_id": 1,
      "subscription_expiry": "2024-12-31T23:59:59.000Z"
    },
    "address": {
      "id": 789,
      "address": "456 Business District, Dubai",
      "latitude": 25.2048,
      "longitude": 55.2708,
      "country_id": 1,
      "city_id": 1,
      "country": {
        "id": 1,
        "name": "United Arab Emirates"
      },
      "city": {
        "id": 1,
        "name": "Dubai"
      }
    },
    "bank_details": {
      "id": 101,
      "account_holder_name": "John Doe",
      "bank_name": "Emirates NBD",
      "iban": "AE123456789012345678901"
    },
    "updated_fields": {
      "user": ["first_name", "last_name", "email"],
      "provider": ["salon_name", "description", "is_available"],
      "address": ["address", "latitude", "longitude", "country_id", "city_id"],
      "bank": ["account_holder_name", "bank_name", "iban"]
    }
  }
}
```

#### Error Responses

##### 400 Bad Request - Missing Update Data
```json
{
  "status": false,
  "message": "Update data is required",
  "error_code": "MISSING_UPDATE_DATA",
  "data": "Please provide the fields you want to update"
}
```

##### 400 Bad Request - Invalid Fields
```json
{
  "status": false,
  "message": "No valid fields provided for update",
  "error_code": "INVALID_FIELDS",
  "data": {
    "message": "Please provide valid fields to update",
    "allowed_fields": {
      "user": ["first_name", "last_name", "full_name", "email", "gender", "profile_image", "notification", "fcm_token"],
      "provider": ["provider_type", "salon_name", "banner_image", "description", "national_id_image_url", "freelance_certificate_image_url", "commercial_registration_image_url", "is_available", "notification", "fcm_token", "subscription_id", "subscription_expiry"],
      "address": ["address", "latitude", "longitude", "country_id", "city_id"],
      "bank": ["account_holder_name", "bank_name", "iban"]
    }
  }
}
```

##### 400 Bad Request - Validation Error
```json
{
  "status": false,
  "message": "Invalid update data",
  "error_code": "VALIDATION_ERROR",
  "data": {
    "message": "Invalid email format",
    "field": "email"
  }
}
```

---

## 2. Delete Provider Account

### Endpoint
```
DELETE /api/provider/delete-my-account
```

### Description
Securely deletes the provider account with comprehensive soft deletion across all related data.

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "password": "your_current_password",
  "reason_id": 1
}
```

### Field Descriptions
- `password` (string, required): Current account password for verification
- `reason_id` (number, optional): Reason for account deletion

### Example Request
```json
{
  "password": "MySecurePassword123!",
  "reason_id": 1
}
```

### Response

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "Your account has been deleted successfully",
  "data": {
    "message": "Account deletion completed",
    "user_id": 123,
    "provider_id": 456,
    "deletion_timestamp": "2024-01-15T14:30:00.000Z",
    "note": "Your account has been soft deleted successfully."
  }
}
```

#### Error Responses

##### 400 Bad Request - Missing Password
```json
{
  "status": false,
  "message": "Password is required for account deletion",
  "error_code": "PASSWORD_REQUIRED",
  "data": "Please provide your password to confirm account deletion"
}
```

##### 401 Unauthorized - Invalid Password
```json
{
  "status": false,
  "message": "Incorrect password",
  "error_code": "INVALID_PASSWORD",
  "data": "The password you entered is incorrect"
}
```

---

## Implementation Notes

### Features
1. **Partial Updates**: Only send the fields you want to update
2. **Multi-Model Support**: Updates User, ServiceProvider, Address, and BankDetails models
3. **Automatic full_name**: Updates full_name automatically when first_name or last_name changes
4. **Comprehensive Validation**: Validates all fields with proper constraints
5. **Soft Deletion**: Account deletion preserves data integrity
6. **Transaction Safety**: All operations use database transactions for data integrity
7. **Audit Logging**: Comprehensive logging for security and debugging

### Security Features
- Password verification for account deletion
- Token invalidation on account deletion
- Soft deletion preserves data integrity
- Comprehensive error handling and validation
- Audit logging for all operations

### Best Practices
1. Always validate input data before sending
2. Use HTTPS for all API calls
3. Store access tokens securely
4. Implement proper error handling in client applications
5. Log all operations for audit purposes
6. Use transactions for multi-table operations

### Rate Limiting
Consider implementing rate limiting for these endpoints to prevent abuse:
- Update profile: 10 requests per minute
- Delete account: 3 requests per hour

### Error Handling
All endpoints return consistent error responses with:
- HTTP status codes
- Error codes for programmatic handling
- Descriptive error messages
- Field-specific validation errors
