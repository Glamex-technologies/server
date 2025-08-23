# Provider Availability Management API Documentation

## Overview
The provider availability management system follows industry standards for service provider platforms, allowing providers to control their availability status for bookings.

## Endpoints

### 1. Get Availability Status
**GET** `/provider/availability-status`

**Authentication:** Provider token required

**Description:** Retrieves the current availability status and schedule of the authenticated provider.

**Response:**
```json
{
  "status": "success",
  "message": "Availability status retrieved successfully",
  "data": {
    "provider_id": 123,
    "is_available": true,
    "availability_status": "available",
    "is_approved": true,
    "step_completed": 6,
    "has_availability_schedule": true,
    "availability_schedule": [
      {
        "day": "Monday",
        "from_time": "09:00:00",
        "to_time": "17:00:00",
        "available": 1
      }
    ],
    "last_updated": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Toggle Availability Status
**POST** `/provider/toggle-availability`

**Authentication:** Provider token required

**Description:** Toggles the provider's availability status between available and unavailable.

**Request Body:** No body required (simple toggle operation)

**Response:**
```json
{
  "status": "success",
  "message": "Provider is now available for bookings",
  "data": {
    "provider_id": 123,
    "is_available": true,
    "availability_status": "available",
    "last_updated": "2024-01-15T10:30:00.000Z",
    "has_availability_schedule": true,
    "availability_schedule": [...],
    "message": "Provider is now available for bookings"
  }
}
```

## Business Rules

### Availability Toggle Restrictions
1. **Provider Approval Required:** Only approved providers can toggle their availability
2. **Onboarding Completion:** Providers must complete all 6 onboarding steps before toggling availability
3. **Automatic Toggle:** The system automatically flips the current status (no manual input required)

### Availability Status Values
- `is_available: 1` = Available for bookings
- `is_available: 0` = Unavailable for bookings

### Error Responses

#### Provider Not Approved
```json
{
  "status": "error",
  "message": "Cannot toggle availability. Provider account is not approved yet.",
  "data": false
}
```

#### Incomplete Onboarding
```json
{
  "status": "error",
  "message": "Cannot toggle availability. Please complete your profile setup first.",
  "data": false
}
```

#### Authentication Error
```json
{
  "status": "error",
  "message": "Provider not found or not authenticated",
  "data": false
}
```

## Industry Standards Implemented

1. **Simple Toggle Operation:** No complex request body required - just hit the endpoint to toggle
2. **Status Validation:** Ensures provider meets all requirements before allowing availability changes
3. **Audit Logging:** All availability changes are logged for tracking purposes
4. **Comprehensive Response:** Returns detailed information including availability schedule
5. **Error Handling:** Clear error messages for different failure scenarios
6. **Availability Schedule Integration:** Shows provider's working hours alongside availability status

## Usage Examples

### Frontend Integration
```javascript
// Toggle availability
const toggleAvailability = async () => {
  try {
    const response = await fetch('/provider/toggle-availability', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    console.log('Availability toggled:', result.data);
  } catch (error) {
    console.error('Error toggling availability:', error);
  }
};

// Get current status
const getAvailabilityStatus = async () => {
  try {
    const response = await fetch('/provider/availability-status', {
      headers: {
        'Authorization': `Bearer ${providerToken}`
      }
    });
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting availability status:', error);
  }
};
```

## Security Considerations

1. **Authentication Required:** All endpoints require valid provider authentication
2. **Authorization:** Only the provider can toggle their own availability
3. **Input Validation:** No external input required for toggle operation
4. **Status Validation:** Business rules prevent unauthorized availability changes
