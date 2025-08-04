# Provider Authentication Flow

## Updated Flow (Corrected)

### 1. **Registration Flow**
```
User registers → OTP sent → User verifies OTP → Profile setup begins
```

### 2. **Authentication Flow (Login)**
```
User tries to login → Check if verified → If not verified: OTP verification required
                    → If verified: Check profile completion → If incomplete: Setup required
                    → If complete: Check admin approval → If approved: Login successful
```

## Detailed Authentication Steps

### Step 1: OTP Verification Check
- **Check**: Is the user verified? (`user.verified_at` and `user.is_verified === 1`)
- **If NOT verified**: 
  - Generate a new OTP automatically
  - Return `otp_verification_required: true`
  - **Message**: "A new OTP has been sent to your phone number. Please verify your account."

### Step 2: Profile Completion Check (Only if verified)
- **Check**: Is profile setup complete? (`provider.step_completed === 6`)
- **If incomplete**: Return `setup_required: true`
- **Message**: "Please complete your profile setup first"

### Step 3: Admin Approval Check (Only if profile complete)
- **Check**: Is profile approved by admin? (`provider.is_approved === 1`)
- **If not approved**: Return `approval_required: true`
- **Message**: "Wait for the admin to verify your profile"

### Step 4: Successful Login (All checks passed)
- **Generate JWT token**
- **Return access token and provider data**

## API Response Examples

### 1. Unverified User (After Registration)
```json
POST /api/provider/authenticate
{
  "phone_code": "971",
  "phone_number": "501234567",
  "password": "Test@123"
}

Response:
{
  "statusCode": 422,
  "message": "Please verify your account with OTP first",
  "data": {
    "otp_verification_required": true,
    "message": "A new OTP has been sent to your phone number. Please verify your account.",
    "provider_id": 1
  }
}
```

### 2. Verified User with Incomplete Profile
```json
Response:
{
  "statusCode": 422,
  "message": "Please complete your profile setup first",
  "data": {
    "setup_required": true,
    "current_step": 0,
    "total_steps": 6,
    "message": "Complete all 6 remaining steps to access the app"
  }
}
```

### 3. Complete Profile Pending Admin Approval
```json
Response:
{
  "statusCode": 422,
  "message": "Wait for the admin to verify your profile",
  "data": {
    "approval_required": true,
    "message": "Your profile is complete and under review by admin. You will be notified once approved."
  }
}
```

### 4. Fully Approved Provider
```json
Response:
{
  "status": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "service_provider": {
      "id": 1,
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "step_completed": 6,
      "is_approved": 1,
      "status": 1
    }
  }
}
```

## Key Changes Made

1. **Validator Logic**: Added OTP verification check as the FIRST priority
2. **Automatic OTP Generation**: When unverified user tries to login, a new OTP is automatically generated
3. **Controller Logic**: Removed duplicate authentication logic and simplified flow
4. **Response Structure**: Clear distinction between different verification states
5. **Error Messages**: More descriptive messages for each state

## Testing Scenarios

### Scenario 1: Fresh Registration
1. Register new provider
2. Try to login immediately
3. **Expected**: New OTP automatically generated and sent, OTP verification required

### Scenario 2: After OTP Verification
1. Verify OTP after registration
2. Try to login again
3. **Expected**: Profile setup required

### Scenario 3: After Profile Setup
1. Complete all 6 profile steps
2. Try to login
3. **Expected**: Admin approval required

### Scenario 4: After Admin Approval
1. Admin approves profile
2. Try to login
3. **Expected**: Login successful with token 