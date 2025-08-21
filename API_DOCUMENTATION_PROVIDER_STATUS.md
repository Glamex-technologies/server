# Admin API: Change Provider Status

## Overview
This API allows administrators to change the status of service providers between active (1) and inactive (0). When a provider is set to inactive, they cannot authenticate and will receive a "Your account is not active" message.

## Endpoint
```
POST /api/provider/change-status
```

## Authentication
- **Required**: Admin authentication token
- **Header**: `Authorization: Bearer <admin_token>`

## Request Body
```json
{
  "provider_id": 123,
  "status": 1
}
```

### Parameters
- `provider_id` (number, required): The ID of the service provider
- `status` (number, required): 
  - `1` = Active
  - `0` = Inactive

## Response Examples

### Success Response (Status Changed to Active)
```json
{
  "status": true,
  "message": "Provider status has been changed to active successfully",
  "data": {
    "id": 123,
    "user_id": 456,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone_code": "+1",
    "phone_number": "1234567890",
    "provider_type": "individual",
    "salon_name": null,
    "status": 1,
    "status_text": "active",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Success Response (Status Changed to Inactive)
```json
{
  "status": true,
  "message": "Provider status has been changed to inactive successfully",
  "data": {
    "id": 123,
    "user_id": 456,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone_code": "+1",
    "phone_number": "1234567890",
    "provider_type": "individual",
    "salon_name": null,
    "status": 0,
    "status_text": "inactive",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

#### Missing Provider ID
```json
{
  "status": false,
  "message": "Provider ID is required",
  "data": {
    "error_code": "MISSING_PROVIDER_ID",
    "message": "Provider ID must be provided"
  }
}
```

#### Missing Status
```json
{
  "status": false,
  "message": "Status is required",
  "data": {
    "error_code": "MISSING_STATUS",
    "message": "Status must be provided (1 for active, 0 for inactive)"
  }
}
```

#### Invalid Status Value
```json
{
  "status": false,
  "message": "Invalid status value. Use 1 for active or 0 for inactive",
  "data": {
    "error_code": "INVALID_STATUS_VALUE",
    "message": "Status must be 1 (active) or 0 (inactive)"
  }
}
```

#### Provider Not Found
```json
{
  "status": false,
  "message": "Provider account not found",
  "data": {
    "error_code": "PROVIDER_NOT_FOUND",
    "message": "No provider found with the specified ID"
  }
}
```

#### User Not Found
```json
{
  "status": false,
  "message": "User account not found",
  "data": {
    "error_code": "USER_NOT_FOUND",
    "message": "User account associated with this provider not found"
  }
}
```

## Behavior When Provider is Inactive

When a provider's status is set to 0 (inactive):

1. **Authentication Blocked**: The provider cannot authenticate through the login endpoint
2. **Middleware Protection**: The provider authentication middleware will block all requests
3. **Error Message**: Providers receive "Your account is not active" message
4. **Token Invalidation**: Existing tokens become invalid (handled by middleware)

## Testing the API

### cURL Example
```bash
curl -X POST http://localhost:3000/api/provider/change-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "provider_id": 123,
    "status": 0
  }'
```

### JavaScript Example
```javascript
const response = await fetch('/api/provider/change-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    provider_id: 123,
    status: 0
  })
});

const result = await response.json();
console.log(result);
```

## Security Considerations

1. **Admin Authentication Required**: Only authenticated admins can access this endpoint
2. **Input Validation**: All inputs are validated using Joi schema
3. **Database Validation**: Provider existence is verified before status change
4. **Audit Trail**: Status changes are logged with timestamps
5. **Immediate Effect**: Status changes take effect immediately

## Database Impact

- Updates the `status` field in the `users` table for the specified provider
- The `status` field controls authentication access (1 = active, 0 = inactive)
- No changes to the `service_providers` table are made
- The change affects the user account that the provider is linked to
