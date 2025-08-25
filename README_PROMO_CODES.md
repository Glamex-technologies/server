# Promo Codes Module - Complete API Documentation

## Overview

The Promo Codes module provides comprehensive functionality for service providers to create, manage, and track promotional codes, and for customers to apply them during booking. This implementation follows industry standards with proper validation, tracking, and analytics.

## Authentication Strategy

### Industry Standard Approach

The module uses a **hybrid authentication strategy** to handle both user and provider apps:

1. **Provider-Only Endpoints**: Require provider authentication (create, update, delete, analytics)
2. **Public Endpoints**: No authentication required (validate, get available codes)
3. **Hybrid Endpoints**: Support both user and provider tokens (get provider promo codes)

### Authentication Types

- **Provider Auth**: `providerAuth` - Only for provider dashboard operations
- **User Auth**: `userAuth` - For customer operations
- **Hybrid Auth**: `hybridAuth` - Supports both user and provider tokens
- **Public**: No authentication required

## Features

### For Service Providers
- ✅ Create promo codes with custom names and codes
- ✅ Set discount types (percentage or fixed amount)
- ✅ Configure minimum bill amounts
- ✅ Set usage limits and validity periods
- ✅ Upload template images for promo codes
- ✅ View promo code analytics and usage statistics
- ✅ Manage active/inactive status
- ✅ Track usage and automatically deactivate when limits are reached

### For Customers
- ✅ Validate promo codes before booking
- ✅ Apply promo codes during booking process
- ✅ View available promo codes for providers
- ✅ See discount calculations in real-time
- ✅ Get detailed booking confirmation with promo code details

## Complete API Endpoints Reference

### 1. Provider-Only Endpoints (Require Provider Authentication)

#### 1.1 Create Promo Code
```http
POST /promo-codes/provider
Authorization: Bearer <provider_token>
Content-Type: multipart/form-data
```

**Request Body:**
```json
{
  "name": "Summer Beauty Discount",
  "code": "SUMMER25", // Optional - will auto-generate if not provided
  "discount_type": "percentage", // "percentage" or "fixed"
  "discount_value": 25, // 25% or $25 depending on type
  "minimum_bill_amount": 50,
  "max_usage_count": 100, // Optional - null for unlimited
  "valid_from": "2025-01-27T00:00:00.000Z",
  "valid_until": "2025-02-27T23:59:59.000Z",
  "template_image": <file> // Optional
}
```

**Success Response (201):**
```json
{
  "statusCode": 201,
  "message": "Promo code created successfully",
  "success": true,
  "data": {
    "id": 1,
    "provider_id": 1,
    "code": "SUMMER25",
    "name": "Summer Beauty Discount",
    "template_image_url": "https://s3.amazonaws.com/bucket/promo-codes/templates/template_1234567890.jpg",
    "discount_type": "percentage",
    "discount_value": 25,
    "minimum_bill_amount": 50,
    "max_usage_count": 100,
    "current_usage_count": 0,
    "valid_from": "2025-01-27T00:00:00.000Z",
    "valid_until": "2025-02-27T23:59:59.000Z",
    "is_active": true,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T10:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - Validation Error
{
  "statusCode": 400,
  "message": "Invalid promo code data",
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "data": {
    "field": "code",
    "message": "Code must contain only alphanumeric characters",
    "type": "string.pattern.base"
  }
}

// 400 - Duplicate Code
{
  "statusCode": 400,
  "message": "Promo code already exists",
  "success": false,
  "error_code": "DUPLICATE_CODE"
}

// 401 - Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized",
  "success": false,
  "error_code": "UNAUTHORIZED"
}
```

#### 1.2 Get Provider's Own Promo Codes (Provider Dashboard)
```http
GET /promo-codes/provider?page=1&limit=20&is_active=true
Authorization: Bearer <provider_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `is_active` (optional): Filter by active status (true/false)

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo codes retrieved successfully",
  "success": true,
  "data": {
    "promo_codes": [
      {
        "id": 1,
        "provider_id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "template_image_url": "https://s3.amazonaws.com/bucket/promo-codes/templates/template_1234567890.jpg",
        "discount_type": "percentage",
        "discount_value": 25,
        "minimum_bill_amount": 50,
        "max_usage_count": 100,
        "current_usage_count": 5,
        "valid_from": "2025-01-27T00:00:00.000Z",
        "valid_until": "2025-02-27T23:59:59.000Z",
        "is_active": true,
        "usage_percentage": 5,
        "created_at": "2025-01-27T10:00:00.000Z",
        "updated_at": "2025-01-27T10:00:00.000Z",
        "provider": {
          "id": 1,
          "salon_name": "Beauty Haven Salon",
          "provider_type": "salon"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

#### 1.3 Update Promo Code
```http
PUT /promo-codes/provider/:id
Authorization: Bearer <provider_token>
Content-Type: multipart/form-data
```

**Path Parameters:**
- `id`: Promo code ID

**Request Body (all fields optional):**
```json
{
  "name": "Updated Summer Discount",
  "discount_value": 30,
  "minimum_bill_amount": 75,
  "max_usage_count": 150,
  "valid_until": "2025-03-27T23:59:59.000Z",
  "is_active": false,
  "template_image": <file> // Optional
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo code updated successfully",
  "success": true,
  "data": {
    "id": 1,
    "provider_id": 1,
    "code": "SUMMER25",
    "name": "Updated Summer Discount",
    "template_image_url": "https://s3.amazonaws.com/bucket/promo-codes/templates/template_1234567890.jpg",
    "discount_type": "percentage",
    "discount_value": 30,
    "minimum_bill_amount": 75,
    "max_usage_count": 150,
    "current_usage_count": 5,
    "valid_from": "2025-01-27T00:00:00.000Z",
    "valid_until": "2025-03-27T23:59:59.000Z",
    "is_active": false,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T11:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 404 - Not Found
{
  "statusCode": 404,
  "message": "Promo code not found",
  "success": false,
  "error_code": "NOT_FOUND"
}

// 403 - Forbidden (not owner)
{
  "statusCode": 403,
  "message": "Access denied",
  "success": false,
  "error_code": "FORBIDDEN"
}
```

#### 1.4 Delete Promo Code
```http
DELETE /promo-codes/provider/:id
Authorization: Bearer <provider_token>
```

**Path Parameters:**
- `id`: Promo code ID

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo code deleted successfully",
  "success": true,
  "data": null
}
```

#### 1.5 Get Specific Promo Code Details (Provider Dashboard)
```http
GET /promo-codes/provider/:id
Authorization: Bearer <provider_token>
```

**Path Parameters:**
- `id`: Promo code ID

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo code details retrieved successfully",
  "success": true,
  "data": {
    "id": 1,
    "provider_id": 1,
    "code": "SUMMER25",
    "name": "Summer Beauty Discount",
    "template_image_url": "https://s3.amazonaws.com/bucket/promo-codes/templates/template_1234567890.jpg",
    "discount_type": "percentage",
    "discount_value": 25,
    "minimum_bill_amount": 50,
    "max_usage_count": 100,
    "current_usage_count": 5,
    "valid_from": "2025-01-27T00:00:00.000Z",
    "valid_until": "2025-02-27T23:59:59.000Z",
    "is_active": true,
    "total_usage": 5,
    "total_discount_given": 112.5,
    "usage_percentage": 5,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T10:00:00.000Z",
    "provider": {
      "id": 1,
      "salon_name": "Beauty Haven Salon",
      "provider_type": "salon"
    },
    "usageRecords": [
      {
        "id": 1,
        "promo_code_id": 1,
        "customer_id": 2,
        "booking_id": 1,
        "discount_amount": 22.5,
        "used_at": "2025-01-27T12:00:00.000Z",
        "customer": {
          "id": 2,
          "first_name": "John",
          "last_name": "Doe",
          "full_name": "John Doe"
        },
        "booking": {
          "id": 1,
          "booking_number": "BK20250127001",
          "status": "completed",
          "total_amount": 67.5,
          "created_at": "2025-01-27T12:00:00.000Z"
        }
      }
    ]
  }
}
```

#### 1.6 Get Promo Code Analytics (Provider Dashboard)

**Case 1: Overall Analytics (All Promo Codes)**
```http
GET /promo-codes/provider/analytics?period=month
Authorization: Bearer <provider_token>
```

**Case 2: Specific Promo Code Analytics**
```http
GET /promo-codes/provider/analytics?period=month&promo_code_id=1
Authorization: Bearer <provider_token>
```

**Query Parameters:**
- `period` (optional): "week", "month", "year" (default: "month")
- `promo_code_id` (optional): Specific promo code ID for detailed analytics

**Success Response (200) - Overall Analytics:**
```json
{
  "statusCode": 200,
  "message": "Analytics retrieved successfully",
  "success": true,
  "data": {
    "total_promo_codes": 3,
    "active_promo_codes": 2,
    "total_usage": 15,
    "total_discount_given": 337.5,
    "promo_codes": [
      {
        "id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "discount_type": "percentage",
        "discount_value": 25,
        "minimum_bill_amount": 50,
        "valid_from": "2025-01-01T00:00:00.000Z",
        "valid_until": "2025-12-31T23:59:59.000Z",
        "is_active": true,
        "current_usage_count": 8,
        "max_usage_count": 100,
        "usage_count": 8,
        "total_discount": 180.0,
        "usage_percentage": 8,
        "recent_usage": [
          {
            "used_at": "2025-01-15T10:30:00.000Z",
            "discount_amount": 25.00,
            "customer_name": "John Doe"
          }
        ]
      },
      {
        "id": 2,
        "code": "SAVE20",
        "name": "Fixed Discount",
        "discount_type": "fixed",
        "discount_value": 20,
        "minimum_bill_amount": 30,
        "valid_from": "2025-01-01T00:00:00.000Z",
        "valid_until": "2025-12-31T23:59:59.000Z",
        "is_active": true,
        "current_usage_count": 7,
        "max_usage_count": 50,
        "usage_count": 7,
        "total_discount": 140.0,
        "usage_percentage": 14,
        "recent_usage": [
          {
            "used_at": "2025-01-14T15:20:00.000Z",
            "discount_amount": 20.00,
            "customer_name": "Jane Smith"
          }
        ]
      }
    ],
    "top_performing_promo_codes": [
      {
        "id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "discount_type": "percentage",
        "discount_value": 25,
        "usage_count": 8,
        "total_discount": 180.0
      },
      {
        "id": 2,
        "code": "SAVE20",
        "name": "Fixed Discount",
        "discount_type": "fixed",
        "discount_value": 20,
        "usage_count": 7,
        "total_discount": 140.0
      }
    ],
    "monthly_stats": [
      {
        "month": "2025-01",
        "new_promo_codes": 2
      },
      {
        "month": "2025-02",
        "new_promo_codes": 1
      }
    ]
  }
}
```

**Success Response (200) - Specific Promo Code Analytics:**
```json
{
  "statusCode": 200,
  "message": "Analytics retrieved successfully",
  "success": true,
  "data": {
    "total_promo_codes": 3,
    "active_promo_codes": 2,
    "total_usage": 8,
    "total_discount_given": 180.0,
    "promo_codes": [
      {
        "id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "discount_type": "percentage",
        "discount_value": 25,
        "minimum_bill_amount": 50,
        "valid_from": "2025-01-01T00:00:00.000Z",
        "valid_until": "2025-12-31T23:59:59.000Z",
        "is_active": true,
        "current_usage_count": 8,
        "max_usage_count": 100,
        "usage_count": 8,
        "total_discount": 180.0,
        "usage_percentage": 8,
        "recent_usage_records": [
          {
            "id": 1,
            "used_at": "2025-01-15T10:30:00.000Z",
            "discount_amount": 25.00,
            "customer": {
              "id": 1,
              "name": "John Doe"
            },
            "booking": {
              "id": 1,
              "booking_number": "BK001",
              "total_amount": 100.00,
              "status": "completed"
            }
          }
        ],
        "usage_by_date": [
          {
            "date": "2025-01-15",
            "usage_count": 3,
            "total_discount": 75.00
          },
          {
            "date": "2025-01-14",
            "usage_count": 2,
            "total_discount": 50.00
          }
        ]
      }
    ],
    "top_performing_promo_codes": [
      {
        "id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "discount_type": "percentage",
        "discount_value": 25,
        "usage_count": 8,
        "total_discount": 180.0
      }
    ],
    "monthly_stats": [
      {
        "month": "2025-01",
        "new_promo_codes": 2
      },
      {
        "month": "2025-02",
        "new_promo_codes": 1
      }
    ]
  }
}
```

### 2. Public Endpoints (No Authentication Required)

#### 2.1 Validate Promo Code
```http
POST /promo-codes/validate
Content-Type: application/json
```

**Request Body:**
```json
{
  "promo_code": "SUMMER25",
  "provider_id": 1,
  "service_ids": [1, 2, 3],
  "subtotal": 90.00
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo code validated successfully",
  "success": true,
  "data": {
    "valid": true,
    "discount_amount": 22.5,
    "final_amount": 67.5,
    "promo_code_id": 1,
    "promo_code": {
      "code": "SUMMER25",
      "name": "Summer Beauty Discount",
      "discount_type": "percentage",
      "discount_value": 25,
      "minimum_bill_amount": 50
    }
  }
}
```

**Error Responses:**
```json
// 400 - Invalid Promo Code
{
  "statusCode": 400,
  "message": "Invalid promo code",
  "success": false,
  "error_code": "INVALID_PROMO_CODE"
}

// 400 - Promo Code Expired
{
  "statusCode": 400,
  "message": "Promo code expired or not yet valid",
  "success": false,
  "error_code": "PROMO_CODE_EXPIRED"
}

// 400 - Minimum Bill Amount Not Met
{
  "statusCode": 400,
  "message": "Minimum bill amount of $50.00 required",
  "success": false,
  "error_code": "MINIMUM_BILL_NOT_MET"
}

// 400 - Usage Limit Reached
{
  "statusCode": 400,
  "message": "Promo code usage limit reached",
  "success": false,
  "error_code": "USAGE_LIMIT_REACHED"
}

// 400 - Inactive Promo Code
{
  "statusCode": 400,
  "message": "Promo code is inactive",
  "success": false,
  "error_code": "INACTIVE_PROMO_CODE"
}
```

#### 2.2 Get Available Promo Codes for Provider (Customer App)
```http
GET /promo-codes/provider/:provider_id/available?subtotal=90.00
```

**Path Parameters:**
- `provider_id`: Provider ID

**Query Parameters:**
- `subtotal` (optional): Current subtotal for discount calculation (default: 0)

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Available promo codes retrieved successfully",
  "success": true,
  "data": {
    "available_promo_codes": [
      {
        "id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "discount_type": "percentage",
        "discount_value": 25,
        "minimum_bill_amount": 50,
        "valid_until": "2025-02-27T23:59:59.000Z",
        "current_usage_count": 5,
        "max_usage_count": 100,
        "estimated_discount": 22.5,
        "estimated_final_amount": 67.5
      },
      {
        "id": 2,
        "code": "SAVE20",
        "name": "Fixed Discount",
        "discount_type": "fixed",
        "discount_value": 20,
        "minimum_bill_amount": 100,
        "valid_until": "2025-03-27T23:59:59.000Z",
        "current_usage_count": 3,
        "max_usage_count": 50,
        "estimated_discount": 20.0,
        "estimated_final_amount": 70.0
      }
    ],
    "count": 2,
    "subtotal": 90
  }
}
```

### 3. Hybrid Endpoints (Support Both User and Provider Tokens)

#### 3.1 Get Promo Codes for Provider (Hybrid)
```http
GET /promo-codes/provider/:provider_id/promo-codes?page=1&limit=20&is_active=true
Authorization: Bearer <user_token> OR Bearer <provider_token> OR No token
```

**Path Parameters:**
- `provider_id`: Provider ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `is_active` (optional): Filter by active status (true/false)

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Promo codes retrieved successfully",
  "success": true,
  "data": {
    "promo_codes": [
      {
        "id": 1,
        "provider_id": 1,
        "code": "SUMMER25",
        "name": "Summer Beauty Discount",
        "template_image_url": "https://s3.amazonaws.com/bucket/promo-codes/templates/template_1234567890.jpg",
        "discount_type": "percentage",
        "discount_value": 25,
        "minimum_bill_amount": 50,
        "max_usage_count": 100,
        "current_usage_count": 5,
        "valid_from": "2025-01-27T00:00:00.000Z",
        "valid_until": "2025-02-27T23:59:59.000Z",
        "is_active": true,
        "usage_percentage": 5,
        "created_at": "2025-01-27T10:00:00.000Z",
        "updated_at": "2025-01-27T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    },
    "is_owner": false,
    "is_authenticated": true
  }
}
```

**Response Flags:**
- `is_owner`: Boolean indicating if the authenticated user owns these promo codes
- `is_authenticated`: Boolean indicating if user is authenticated
- Different data visibility based on authentication status

### 4. Booking Integration

#### 4.1 Create Booking with Promo Code
```http
POST /api/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider_id": 1,
  "service_ids": [1, 2],
  "scheduled_date": "2025-01-27",
  "scheduled_time": "10:00:00",
  "service_location_id": 1,
  "customer_address_id": 1,
  "promo_code": "SUMMER25",
  "notes": "Please arrive on time"
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "Booking created successfully",
  "success": true,
  "data": {
    "booking_id": 1,
    "booking_number": "BK20250127001",
    "total_duration_minutes": 120,
    "subtotal": 90.00,
    "discount_amount": 22.5,
    "total_amount": 67.5,
    "promo_code": {
      "id": 1,
      "code": "SUMMER25",
      "name": "Summer Beauty Discount",
      "discount_type": "percentage",
      "discount_value": 25,
      "minimum_bill_amount": 50
    },
    "payment_intent": {
      "client_secret": "pi_1_secret_1234567890",
      "amount": 6750,
      "currency": "usd"
    }
  }
}
```

## Database Schema

### promo_codes Table
```sql
CREATE TABLE promo_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  template_image_url VARCHAR(500),
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_bill_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_usage_count INT,
  current_usage_count INT NOT NULL DEFAULT 0,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE
);
```

### promo_code_usage Table
```sql
CREATE TABLE promo_code_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  promo_code_id INT NOT NULL,
  customer_id INT NOT NULL,
  booking_id INT NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
```

## Validation Rules

### Promo Code Creation
- **code**: 3-50 characters, alphanumeric only, unique
- **name**: 3-100 characters, required
- **discount_type**: Must be 'percentage' or 'fixed'
- **discount_value**: Positive number, required
- **minimum_bill_amount**: Non-negative number, defaults to 0
- **max_usage_count**: Positive integer, optional
- **valid_from**: Future date, required
- **valid_until**: After valid_from, required

### Promo Code Validation
- **promo_code**: 3-50 characters, required
- **provider_id**: Positive integer, required
- **service_ids**: Array of positive integers, at least one required
- **subtotal**: Positive number, required

## Error Handling

### Common Error Responses

#### Invalid Promo Code
```json
{
  "statusCode": 400,
  "message": "Invalid promo code",
  "success": false,
  "error_code": "INVALID_PROMO_CODE"
}
```

#### Promo Code Expired
```json
{
  "statusCode": 400,
  "message": "Promo code expired or not yet valid",
  "success": false,
  "error_code": "PROMO_CODE_EXPIRED"
}
```

#### Minimum Bill Amount Not Met
```json
{
  "statusCode": 400,
  "message": "Minimum bill amount of $50.00 required",
  "success": false,
  "error_code": "MINIMUM_BILL_NOT_MET"
}
```

#### Usage Limit Reached
```json
{
  "statusCode": 400,
  "message": "Promo code usage limit reached",
  "success": false,
  "error_code": "USAGE_LIMIT_REACHED"
}
```

#### Inactive Promo Code
```json
{
  "statusCode": 400,
  "message": "Promo code is inactive",
  "success": false,
  "error_code": "INACTIVE_PROMO_CODE"
}
```

#### Validation Error
```json
{
  "statusCode": 400,
  "message": "Invalid promo code data",
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "data": {
    "field": "code",
    "message": "Code must contain only alphanumeric characters",
    "type": "string.pattern.base"
  }
}
```

#### Not Found
```json
{
  "statusCode": 404,
  "message": "Promo code not found",
  "success": false,
  "error_code": "NOT_FOUND"
}
```

#### Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "success": false,
  "error_code": "UNAUTHORIZED"
}
```

#### Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "success": false,
  "error_code": "FORBIDDEN"
}
```

#### Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "success": false,
  "error_code": "INTERNAL_SERVER_ERROR"
}
```

## Testing

### Test Data Sets

#### 1. Create Service Provider (First, needed for promo codes)
```json
{
  "user_id": 1,
  "provider_type": "salon",
  "salon_name": "Beauty Haven Salon",
  "description": "Premium beauty and wellness services",
  "banner_image": "https://example.com/banner.jpg",
  "national_id_image_url": "https://example.com/national-id.jpg",
  "commercial_registration_image_url": "https://example.com/commercial-reg.jpg",
  "is_approved": 1,
  "is_available": 1,
  "step_completed": 6
}
```

#### 2. Create Percentage Promo Code (Provider)
```json
{
  "name": "Summer Beauty Discount",
  "code": "SUMMER25",
  "discount_type": "percentage",
  "discount_value": 25,
  "minimum_bill_amount": 50,
  "max_usage_count": 100,
  "valid_from": "2025-01-27T00:00:00.000Z",
  "valid_until": "2025-02-27T23:59:59.000Z"
}
```

#### 3. Create Fixed Amount Promo Code
```json
{
  "name": "Fixed Discount",
  "code": "SAVE20",
  "discount_type": "fixed",
  "discount_value": 20,
  "minimum_bill_amount": 100,
  "max_usage_count": 50,
  "valid_from": "2025-01-27T00:00:00.000Z",
  "valid_until": "2025-02-27T23:59:59.000Z"
}
```

#### 4. Create Unlimited Usage Promo Code
```json
{
  "name": "Unlimited Discount",
  "code": "UNLIMITED10",
  "discount_type": "percentage",
  "discount_value": 10,
  "minimum_bill_amount": 25,
  "max_usage_count": null,
  "valid_from": "2025-01-27T00:00:00.000Z",
  "valid_until": "2025-12-31T23:59:59.000Z"
}
```

#### 5. Validate Promo Code (Customer)
```json
{
  "promo_code": "SUMMER25",
  "provider_id": 1,
  "service_ids": [1, 2],
  "subtotal": 90.00
}
```

#### 6. Create Booking with Promo Code
```json
{
  "provider_id": 1,
  "service_ids": [1, 2],
  "scheduled_date": "2025-01-27",
  "scheduled_time": "10:00:00",
  "service_location_id": 1,
  "customer_address_id": 1,
  "promo_code": "SUMMER25",
  "notes": "Please arrive on time"
}
```

## Security Considerations

1. **Provider Authentication**: All provider endpoints require valid provider authentication
2. **Ownership Validation**: Providers can only manage their own promo codes
3. **Input Validation**: All inputs are validated using Joi schemas
4. **SQL Injection Protection**: Using Sequelize ORM with parameterized queries
5. **Rate Limiting**: Consider implementing rate limiting for promo code validation
6. **Audit Trail**: All promo code usage is tracked for analytics and security
7. **Hybrid Authentication**: Flexible authentication for cross-app functionality

## Performance Considerations

1. **Database Indexes**: Proper indexes on frequently queried fields
2. **Caching**: Consider caching active promo codes for faster validation
3. **Pagination**: Large result sets are paginated
4. **Efficient Queries**: Optimized queries with proper joins and includes

## Future Enhancements

1. **Bulk Promo Code Generation**: Generate multiple promo codes at once
2. **Promo Code Categories**: Categorize promo codes (seasonal, loyalty, etc.)
3. **Advanced Analytics**: More detailed analytics and reporting
4. **Email Notifications**: Notify customers about available promo codes
5. **Promo Code Sharing**: Allow customers to share promo codes
6. **A/B Testing**: Test different promo code strategies
7. **Integration with Marketing Tools**: Connect with email marketing platforms
