# 🎯 Glamex Booking System API Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Testing Guide](#testing-guide)
- [Error Handling](#error-handling)
- [Development Setup](#development-setup)

---

## 🚀 Overview

The Glamex Booking System is a comprehensive booking management solution that allows customers to book services from service providers. The system includes:

- **Customer Booking Management**: Create, view, and cancel bookings
- **Provider Booking Management**: Accept, reject, and manage bookings
- **Real-time Location Tracking**: Provider location updates
- **Payment Integration**: Stripe payment processing
- **Statistics & Analytics**: Provider performance metrics

---

## 🗄️ Database Schema

### Core Tables

#### `bookings`
```sql
- id (Primary Key)
- booking_number (Unique: GLX000001)
- customer_id (FK to users)
- provider_id (FK to service_providers)
- service_location_id (FK to service_locations)
- customer_address_id (FK to user_addresses)
- scheduled_date
- scheduled_time
- status (pending, accepted, in_progress, completed, cancelled)
- total_amount
- payment_status
- notes
- created_at, updated_at, deleted_at
```

#### `booking_services`
```sql
- id (Primary Key)
- booking_id (FK to bookings)
- service_id (FK to services)
- quantity
- unit_price
- total_price
- created_at, updated_at
```

#### `service_locations`
```sql
- id (Primary Key)
- title
- description
- created_at, updated_at
```

#### `user_addresses`
```sql
- id (Primary Key)
- user_id (FK to users)
- address
- latitude
- longitude
- country_id (FK to countries)
- city_id (FK to cities)
- created_at, updated_at
```

---

## 🔐 Authentication

### Token Structure
```json
{
  "user_id": 123,
  "userType": "user|provider",
  "email": "user@example.com",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Headers Required
```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📡 API Endpoints

### 👤 Customer Routes

#### 1. Create Booking
```http
POST /api/v1/api/customers/bookings
```

**Request Body:**
```json
{
  "provider_id": 1,
  "service_location_id": 1,
  "customer_address_id": 1,
  "scheduled_date": "2025-01-25",
  "scheduled_time": "14:30:00",
  "services": [1, 2, 3],
  "payment_method_id": "pm_123456789",
  "notes": "Please arrive 10 minutes early"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Booking created successfully",
  "data": {
    "id": 1,
    "booking_number": "GLX000001",
    "customer_id": 2,
    "provider_id": 1,
    "scheduled_date": "2025-01-25",
    "scheduled_time": "14:30:00",
    "status": "pending",
    "total_amount": 150.00,
    "payment_status": "pending",
    "created_at": "2025-01-18T10:30:00.000Z"
  }
}
```

#### 2. Get Customer Bookings
```http
GET /api/v1/api/customers/bookings?status=pending&filter=upcoming&page=1&limit=20
```

**Query Parameters:**
- `status`: `pending`, `accepted`, `in_progress`, `completed`, `cancelled`
- `filter`: `upcoming`, `past`, `all`
- `page`: `1`, `2`, `3`...
- `limit`: `10`, `20`, `50`...

**Response:**
```json
{
  "statusCode": 200,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": 1,
        "booking_number": "GLX000001",
        "scheduled_date": "2025-01-25",
        "scheduled_time": "14:30:00",
        "status": "pending",
        "total_amount": 150.00,
        "provider": {
          "id": 1,
          "salon_name": "Beauty Salon",
          "provider_type": "salon",
          "banner_image": "banner.jpg"
        },
        "serviceLocation": {
          "id": 1,
          "title": "At Salon",
          "description": "Service at salon location"
        },
        "customerAddress": {
          "id": 1,
          "address": "123 Main St",
          "latitude": 25.2048,
          "longitude": 55.2708
        },
        "bookingServices": [
          {
            "id": 1,
            "quantity": 1,
            "unit_price": 50.00,
            "total_price": 50.00,
            "service": {
              "id": 1,
              "title": "Haircut"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

#### 3. Get Booking Details
```http
GET /api/v1/api/customers/bookings/{booking_id}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Booking details retrieved successfully",
  "data": {
    "id": 1,
    "booking_number": "GLX000001",
    "customer": {
      "id": 2,
      "first_name": "John",
      "last_name": "Doe",
      "phone_code": "971",
      "phone_number": "501234560"
    },
    "provider": {
      "id": 1,
      "salon_name": "Beauty Salon",
      "provider_type": "salon",
      "banner_image": "banner.jpg"
    },
    "serviceLocation": {
      "id": 1,
      "title": "At Salon",
      "description": "Service at salon location"
    },
    "customerAddress": {
      "id": 1,
      "address": "123 Main St",
      "latitude": 25.2048,
      "longitude": 55.2708,
      "country": {
        "id": 1,
        "name": "UAE"
      },
      "city": {
        "id": 1,
        "name": "Dubai"
      }
    },
    "bookingServices": [
      {
        "id": 1,
        "quantity": 1,
        "unit_price": 50.00,
        "total_price": 50.00,
        "service": {
          "id": 1,
          "title": "Haircut"
        }
      }
    ]
  }
}
```

#### 4. Cancel Booking
```http
POST /api/v1/api/customers/bookings/{booking_id}/cancel
```

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Booking cancelled successfully",
  "data": {
    "id": 1,
    "status": "cancelled",
    "cancelled_by": "customer",
    "cancellation_reason": "Changed my mind"
  }
}
```

---

### 🏢 Provider Routes

#### 1. Get Provider Bookings
```http
GET /api/v1/api/providers/bookings?status=pending&filter=upcoming&page=1&limit=20
```

**Query Parameters:**
- `status`: `pending`, `accepted`, `in_progress`, `completed`, `cancelled`
- `filter`: `upcoming`, `past`, `all`
- `date`: `2025-01-25` (specific date)
- `page`: `1`, `2`, `3`...
- `limit`: `10`, `20`, `50`...

**Response:**
```json
{
  "statusCode": 200,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": 1,
        "booking_number": "GLX000001",
        "scheduled_date": "2025-01-25",
        "scheduled_time": "14:30:00",
        "status": "pending",
        "total_amount": 150.00,
        "customer": {
          "id": 2,
          "first_name": "John",
          "last_name": "Doe",
          "phone_code": "971",
          "phone_number": "501234560"
        },
        "bookingServices": [
          {
            "id": 1,
            "quantity": 1,
            "unit_price": 50.00,
            "total_price": 50.00,
            "service": {
              "id": 1,
              "title": "Haircut"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

#### 2. Get Booking Details (Provider View)
```http
GET /api/v1/api/providers/bookings/{booking_id}
```

#### 3. Update Booking Status
```http
PUT /api/v1/api/providers/bookings/{booking_id}/status
```

**Request Body:**
```json
{
  "status": "accepted",
  "notes": "Confirmed booking"
}
```

**Status Options:**
- `accepted` - Provider accepts the booking
- `rejected` - Provider rejects the booking
- `in_progress` - Provider starts the service
- `completed` - Service completed
- `cancelled` - Booking cancelled

**Response:**
```json
{
  "statusCode": 200,
  "message": "Booking status updated successfully",
  "data": {
    "id": 1,
    "status": "accepted",
    "notes": "Confirmed booking"
  }
}
```

#### 4. Update Provider Location
```http
PUT /api/v1/api/providers/bookings/{booking_id}/location
```

**Request Body:**
```json
{
  "latitude": 25.2048,
  "longitude": 55.2708,
  "estimated_arrival": "2025-01-25T15:00:00Z"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Location updated successfully",
  "data": {
    "id": 1,
    "provider_current_lat": 25.2048,
    "provider_current_lng": 55.2708,
    "estimated_arrival": "2025-01-25T15:00:00Z"
  }
}
```

#### 5. Get Booking Statistics
```http
GET /api/v1/api/providers/bookings/stats?period=month
```

**Query Parameters:**
- `period`: `today`, `week`, `month`, `year`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Statistics retrieved successfully",
  "data": {
    "total_bookings": 25,
    "pending_bookings": 5,
    "accepted_bookings": 8,
    "completed_bookings": 10,
    "cancelled_bookings": 2,
    "total_earnings": 1500.00,
    "average_booking_value": 60.00,
    "completion_rate": 40.0
  }
}
```

#### 6. Get Booking Map View
```http
GET /api/v1/api/providers/bookings/map?date=2025-01-25
```

**Query Parameters:**
- `date`: `2025-01-25` (required)

**Response:**
```json
{
  "statusCode": 200,
  "message": "Map data retrieved successfully",
  "data": {
    "date": "2025-01-25",
    "bookings": [
      {
        "id": 1,
        "booking_number": "GLX000001",
        "customer": {
          "first_name": "John",
          "last_name": "Doe"
        },
        "customerAddress": {
          "address": "123 Main St",
          "latitude": 25.2048,
          "longitude": 55.2708
        },
        "scheduled_time": "14:30:00",
        "status": "pending"
      }
    ]
  }
}
```

---

## 🧪 Testing Guide

### Prerequisites
1. **Database Setup**: Ensure all migrations and seeders are run
2. **Server Running**: Start the server with `npm start`
3. **Test Data**: Create test users and providers

### Test Data Setup

#### 1. Create Test User
```bash
curl -X POST http://localhost:8080/api/v1/api/user/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone_code": "971",
    "phone_number": "501234560",
    "password": "Test@123",
    "gender": 1,
    "terms_and_condition": 1,
    "country_id": 1,
    "city_id": 1
  }'
```

#### 2. Create Test Provider
```bash
curl -X POST http://localhost:8080/api/v1/api/provider/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone_code": "971",
    "phone_number": "501234561",
    "password": "Test@123",
    "gender": 2,
    "terms_and_condition": 1,
    "country_id": 1,
    "city_id": 1
  }'
```

#### 3. Login to Get Tokens
```bash
# User Login
curl -X POST http://localhost:8080/api/v1/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Test@123"
  }'

# Provider Login
curl -X POST http://localhost:8080/api/v1/api/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@example.com",
    "password": "Test@123"
  }'
```

### Complete Test Flow

#### 1. Create Booking (Customer)
```bash
curl -X POST http://localhost:8080/api/v1/api/customers/bookings \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 1,
    "service_location_id": 1,
    "customer_address_id": 1,
    "scheduled_date": "2025-01-25",
    "scheduled_time": "14:30:00",
    "services": [1, 2, 3],
    "payment_method_id": "pm_123456789",
    "notes": "Please arrive 10 minutes early"
  }'
```

#### 2. List Customer Bookings
```bash
curl -X GET "http://localhost:8080/api/v1/api/customers/bookings?status=pending&filter=upcoming&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

#### 3. List Provider Bookings
```bash
curl -X GET "http://localhost:8080/api/v1/api/providers/bookings?status=pending&filter=upcoming&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN"
```

#### 4. Update Booking Status (Provider)
```bash
curl -X PUT http://localhost:8080/api/v1/api/providers/bookings/1/status \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "notes": "Confirmed booking"
  }'
```

#### 5. Cancel Booking (Customer)
```bash
curl -X POST http://localhost:8080/api/v1/api/customers/bookings/1/cancel \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Changed my mind"
  }'
```

---

## ⚠️ Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Provider is not available",
  "data": false
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Authentication failed",
  "data": null
}
```

#### 422 Validation Error
```json
{
  "statusCode": 422,
  "message": "Invalid booking data",
  "data": "Scheduled_date must be greater than now"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "data": null
}
```

### Validation Rules

#### Booking Creation
- `provider_id`: Required, must exist
- `service_location_id`: Required, must exist
- `customer_address_id`: Optional, must exist if provided
- `scheduled_date`: Required, must be future date
- `scheduled_time`: Required, valid time format (HH:MM:SS)
- `services`: Required, array of valid service IDs
- `payment_method_id`: Required, valid payment method
- `notes`: Optional, string

#### Status Updates
- `status`: Required, must be valid status
- `notes`: Optional, string

#### Location Updates
- `latitude`: Required, number between -90 and 90
- `longitude`: Required, number between -180 and 180
- `estimated_arrival`: Optional, valid ISO date string

---

## 🛠️ Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Run seeders
npm run seed

# Start the server
npm start
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=glamex_db
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=8080
NODE_ENV=development
```

### Available Scripts
```bash
npm start          # Start the server
npm run dev        # Start in development mode with nodemon
npm run migrate    # Run database migrations
npm run seed       # Run database seeders
npm test           # Run tests
```

---

## 📊 Business Logic

### Booking Flow
1. **Customer creates booking** → Status: `pending`
2. **Provider accepts booking** → Status: `accepted`
3. **Provider starts service** → Status: `in_progress`
4. **Service completed** → Status: `completed`
5. **Booking cancelled** → Status: `cancelled` (by customer or provider)

### Pricing Calculation
- **Subtotal**: Sum of all service prices
- **Discount**: Applied promo codes or offers
- **Commission**: Platform fee (configurable)
- **Provider Earnings**: Total amount minus commission

### Availability Check
- Prevents double booking
- Checks provider availability
- Validates time slots
- Considers service duration

---

## 🔧 Configuration

### Commission Rates
```javascript
// Default commission rate (can be configured per provider)
const DEFAULT_COMMISSION_RATE = 0.10; // 10%
```

### Booking Number Format
```javascript
// Format: GLX + 6-digit number
// Example: GLX000001, GLX000002, etc.
```

### Status Transitions
```javascript
const STATUS_TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Final state
  cancelled: [], // Final state
  rejected: []   // Final state
};
```

---

## 📝 Notes

- All timestamps are in UTC
- Dates should be in YYYY-MM-DD format
- Times should be in HH:MM:SS format
- Pagination is 1-based (page 1, not 0)
- All monetary values are in the base currency
- Location coordinates use decimal degrees
- Booking numbers are auto-generated and unique

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: Glamex Development Team
