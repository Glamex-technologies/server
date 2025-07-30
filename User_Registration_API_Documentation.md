# 📋 User Registration API Documentation

## ✅ Status: Complete & Ready for Integration

The entire user registration flow with OTP verification has been **completed and tested**. All APIs are working correctly and ready for frontend integration.

---

## 🔗 **Base URL**
```
http://localhost:8000/api/v1
```

---

## 📋 **Registration Flow APIs**

### **1. User Registration**
**Endpoint:** `POST /user/register`  
**Description:** Register a new user and generate OTP for verification

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_code": "91",
  "phone_number": "1234567890", 
  "password": "Password123!",
  "country_id": 1,
  "city_id": 1,
  "gender": 1,
  "terms_and_condition": 1
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "User registered successfully",
  "data": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_code": "91",
    "phone_number": "1234567890",
    "gender": 1
  }
}
```

**Error Response (422):**
```json
{
  "statusCode": 422,
  "message": "invalid request",
  "data": "Password is required."
}
```

**Notes:**
- User gets registered but is **not verified** yet
- OTP is automatically generated and stored (10-minute expiry)
- Save the returned `id` for OTP verification
- If phone number already exists, it updates the existing user with new OTP

---

### **2. OTP Verification**
**Endpoint:** `POST /user/verify-verification-otp`  
**Description:** Verify OTP and complete user registration

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 3,
  "otp": "1111"
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "User verified and registered successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 3,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_code": "91",
      "phone_number": "1234567890",
      "country_id": 1,
      "city_id": 1,
      "is_verified": 1
    }
  }
}
```

**Error Responses:**
```json
// Invalid OTP
{
  "statusCode": 400,
  "message": "Invalid OTP"
}

// No OTP found
{
  "statusCode": 400,
  "message": "No OTP found. Please request a new OTP."
}

// OTP Expired
{
  "statusCode": 400,
  "message": "OTP has expired (10 minutes). Please request a new OTP."
}
```

**Notes:**
- User becomes **verified** after successful OTP verification
- Returns JWT `access_token` for authenticated requests
- OTP expires after **10 minutes**
- Store the `access_token` for future API calls

---

### **3. Resend OTP** (Optional)
**Endpoint:** `PATCH /user/resend-otp`  
**Description:** Generate and send a new OTP to user

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 3
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "message": "OTP resent successfully",
  "data": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe", 
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_code": "91",
    "phone_number": "1234567890"
  }
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "User not found"
}
```

---

## 🔄 **Complete Integration Flow**

```
1. User fills registration form
   ↓
2. Call POST /user/register
   ↓
3. Store user_id from response
   ↓
4. Show OTP input screen (10-minute timer)
   ↓
5. Call POST /user/verify-verification-otp
   ↓
6. Store access_token from response
   ↓
7. Registration complete! Redirect to dashboard
```

**Optional:** If user needs new OTP, call `PATCH /user/resend-otp`

---

## 📝 **Field Validations**

### **Required Fields:**
- `first_name` - String, required
- `last_name` - String, required  
- `phone_code` - String, digits only, required
- `phone_number` - String, digits only, required
- `password` - String, required (see validation below)
- `country_id` - Number, min: 1, required
- `city_id` - Number, min: 1, required
- `gender` - Number, required (1, 2, or 3)
- `terms_and_condition` - Number, must be 1, required

### **Optional Fields:**
- `email` - String, valid email format

### **Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number  
- At least 1 special character (@$!%*?&)

**Example:** `Password123!`

### **Gender Values:**
- `1` = Male
- `2` = Female
- `3` = Other

### **OTP Format:**
- **Type:** String (not number)
- **Length:** Exactly 4 digits
- **Current Value:** `"1111"` (for testing)

---

## 🚨 **Error Handling**

### **Common Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid data)
- `422` - Validation Error
- `500` - Server Error

### **Validation Error Format:**
```json
{
  "statusCode": 422,
  "message": "invalid request",
  "data": "First name is required"
}
```

---

## 🧪 **Testing Details**

### **Current OTP Configuration:**
- **Static OTP:** `"1111"` (for development)
- **Format:** String (important!)
- **Timeout:** 10 minutes
- **Behavior:** No auto-deletion of users after timeout

### **Test Data:**
```json
{
  "first_name": "Test",
  "last_name": "User",
  "email": "test@example.com",
  "phone_code": "91",
  "phone_number": "9876543210",
  "password": "Test123!",
  "country_id": 1,
  "city_id": 1,
  "gender": 1,
  "terms_and_condition": 1
}
```

---

## 💡 **Implementation Tips**

### **Frontend Guidelines:**
1. **Form Validation:** Implement client-side validation matching server requirements
2. **Password Strength:** Show real-time password strength indicator
3. **OTP Timer:** Display 10-minute countdown timer
4. **Error Display:** Handle all error responses gracefully
5. **Token Storage:** Securely store JWT token (localStorage/sessionStorage)

### **User Experience:**
- Show loading states during API calls
- Provide clear error messages
- Auto-focus OTP input field
- Allow OTP resend after timeout
- Confirm successful registration before redirect

### **Security Notes:**
- Never log passwords in console
- Validate all inputs on both client and server
- Handle JWT token expiry
- Implement proper logout functionality

---

## ✅ **What's Fixed & Working**

- ✅ OTP data type consistency (string format)
- ✅ User creation and update logic
- ✅ Proper error handling and validation
- ✅ HTTP methods semantically correct
- ✅ Database schema updated
- ✅ Comprehensive logging for debugging
- ✅ 10-minute OTP timeout with user preservation
- ✅ Existing user re-registration handling

---

## 📞 **Support**

All APIs are **tested and working** correctly. The registration flow is ready for frontend integration.

For any issues or questions during integration, please check:
1. Request body format matches exactly
2. Data types are correct (especially OTP as string)
3. All required fields are provided
4. Server is running on correct port

**Server Status:** ✅ Running  
**Database:** ✅ Connected  
**APIs:** ✅ Tested & Working

---

*Last Updated: July 30, 2025*  
*Version: 1.0*