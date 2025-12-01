# Vehicle API Documentation

## Base URL

```
http://localhost:5000/api/v1/vehicles
```

## Endpoints

### 1. Create Vehicle with Owner

**POST** `/api/v1/vehicles`

Creates a new vehicle and its owner (if owner doesn't exist).

**Request Body:**

```json
{
  "plateNo": "ABC1234",
  "vehicleType": "PRIVATE",
  "classification": "Sedan",
  "make": "Toyota",
  "vehicleModel": "Vios",
  "year": 2023,
  "color": "White",
  "engineNo": "ENG123456",
  "chassisNo": "CHS789012",
  "registrationDate": "2023-01-15",
  "expirationDate": "2026-01-15",
  "notes": "Optional notes",
  "owner": {
    "vehicleOwnerID": "VO-20251201-1234",
    "firstName": "Juan",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "contactNo": "09171234567"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "_id": "674c7e8f9a1b2c3d4e5f6a7b",
    "vehicleID": "VH-20251201-1234",
    "plateNo": "ABC1234",
    "vehicleType": "PRIVATE",
    "classification": "Sedan",
    "make": "Toyota",
    "vehicleModel": "Vios",
    "year": 2023,
    "color": "White",
    "engineNo": "ENG123456",
    "chassisNo": "CHS789012",
    "ownerId": {
      "_id": "674c7e8f9a1b2c3d4e5f6a7c",
      "firstName": "Juan",
      "middleName": "Santos",
      "lastName": "Dela Cruz"
    },
    "ownerInfo": {
      "name": "Juan Santos Dela Cruz",
      "contactNo": "09171234567"
    },
    "registrationDate": "2023-01-15T00:00:00.000Z",
    "expirationDate": "2026-01-15T00:00:00.000Z",
    "status": "ACTIVE",
    "notes": "Optional notes",
    "createdAt": "2025-12-01T10:30:00.000Z",
    "updatedAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "error": "Vehicle with this plate number already exists",
  "data": {
    // existing vehicle data
  }
}
```

---

### 2. Search Vehicles

**GET** `/api/v1/vehicles/search`

Search for vehicles by various criteria.

**Query Parameters:**

- `plateNo` (string, optional) - Exact plate number match
- `search` (string, optional) - General search (plate, make, model, owner name)
- `vehicleType` (string, optional) - Filter by type: PRIVATE, FOR_HIRE, GOVERNMENT, DIPLOMATIC
- `status` (string, optional) - Filter by status: ACTIVE, INACTIVE, IMPOUNDED, SUSPENDED (default: ACTIVE)
- `ownerId` (string, optional) - Filter by owner ID
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20)

**Examples:**

Search by plate number:

```
GET /api/v1/vehicles/search?plateNo=ABC1234
```

General search:

```
GET /api/v1/vehicles/search?search=Toyota
```

Filter by vehicle type:

```
GET /api/v1/vehicles/search?vehicleType=PRIVATE&page=1&limit=10
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "674c7e8f9a1b2c3d4e5f6a7b",
      "vehicleID": "VH-20251201-1234",
      "plateNo": "ABC1234",
      "vehicleType": "PRIVATE",
      "make": "Toyota",
      "model": "Vios",
      "year": 2023,
      "color": "White",
      "ownerId": {
        "_id": "674c7e8f9a1b2c3d4e5f6a7c",
        "firstName": "Juan",
        "lastName": "Dela Cruz"
      },
      "ownerInfo": {
        "name": "Juan Santos Dela Cruz",
        "contactNo": "09171234567"
      },
      "status": "ACTIVE",
      "createdAt": "2025-12-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

### 3. Get Vehicle by Plate Number

**GET** `/api/v1/vehicles/plate/:plateNo`

Get vehicle details by plate number.

**Example:**

```
GET /api/v1/vehicles/plate/ABC1234
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "674c7e8f9a1b2c3d4e5f6a7b",
    "vehicleID": "VH-20251201-1234",
    "plateNo": "ABC1234",
    "vehicleType": "PRIVATE",
    "make": "Toyota",
    "model": "Vios",
    "year": 2023,
    "color": "White",
    "ownerId": {
      "_id": "674c7e8f9a1b2c3d4e5f6a7c",
      "firstName": "Juan",
      "middleName": "Santos",
      "lastName": "Dela Cruz",
      "email": "juan.delacruz@email.com",
      "contactNo": "09171234567",
      "licenseNo": "N01-12-345678",
      "address": {
        "street": "123 Rizal Street",
        "barangay": "Barangay San Jose",
        "city": "Manila",
        "province": "Metro Manila",
        "postalCode": "1000"
      }
    },
    "ownerInfo": {
      "name": "Juan Santos Dela Cruz",
      "contactNo": "09171234567"
    },
    "status": "ACTIVE",
    "createdAt": "2025-12-01T10:30:00.000Z",
    "updatedAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Vehicle not found",
  "plateNo": "ABC1234"
}
```

---

### 4. Get Vehicle by ID

**GET** `/api/v1/vehicles/:id`

Get vehicle details by vehicle ID.

**Example:**

```
GET /api/v1/vehicles/674c7e8f9a1b2c3d4e5f6a7b
```

**Response:** Same as Get Vehicle by Plate Number

---

### 5. Update Vehicle

**PUT** `/api/v1/vehicles/:id`

Update vehicle information.

**Request Body:**

```json
{
  "vehicleType": "FOR_HIRE",
  "classification": "Taxi",
  "make": "Toyota",
  "vehicleModel": "Vios",
  "year": 2023,
  "color": "Yellow",
  "engineNo": "ENG123456",
  "chassisNo": "CHS789012",
  "registrationDate": "2023-01-15",
  "expirationDate": "2026-01-15",
  "status": "ACTIVE",
  "notes": "Updated notes"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    // updated vehicle data
  }
}
```

---

### 6. Delete Vehicle (Soft Delete)

**DELETE** `/api/v1/vehicles/:id`

Soft delete a vehicle by setting its status to INACTIVE.

**Example:**

```
DELETE /api/v1/vehicles/674c7e8f9a1b2c3d4e5f6a7b
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

## Data Models

### Vehicle Type Enum

- `PRIVATE` - Private vehicle
- `FOR_HIRE` - For hire vehicle (taxi, jeepney, etc.)
- `GOVERNMENT` - Government vehicle
- `DIPLOMATIC` - Diplomatic vehicle

### Vehicle Status Enum

- `ACTIVE` - Active vehicle
- `INACTIVE` - Inactive vehicle
- `IMPOUNDED` - Impounded vehicle
- `SUSPENDED` - Suspended vehicle

---

## Integration with Citation Test Page

### Step 2: Vehicle Search Implementation

For the citation test page, use the following flow:

1. **Search by Plate Number:**

```javascript
const searchVehicle = async (plateNo) => {
  const response = await fetch(`${API_BASE_URL}/vehicles/plate/${plateNo}`);
  const data = await response.json();

  if (data.success) {
    // Vehicle found - use the vehicle data
    return data.data;
  } else {
    // Vehicle not found - show registration form
    return null;
  }
};
```

2. **Create New Vehicle with Owner:**

```javascript
const createVehicle = async (vehicleData, ownerData) => {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plateNo: vehicleData.plateNo,
      vehicleType: vehicleData.vehicleType,
      make: vehicleData.make,
      model: vehicleData.model,
      color: vehicleData.color,
      owner: {
        vehicleOwnerID: ownerData.vehicleOwnerID,
        firstName: ownerData.firstName,
        middleName: ownerData.middleName,
        lastName: ownerData.lastName,
        contactNo: ownerData.contactNo,
      },
    }),
  });

  return await response.json();
};
```

3. **Update Citation Data with Vehicle Owner ID:**

```javascript
if (vehicleData) {
  setCitationData((prev) => ({
    ...prev,
    vehicleInfo: {
      ...prev.vehicleInfo,
      plateNo: vehicleData.plateNo,
      vehicleType: vehicleData.vehicleType,
      make: vehicleData.make,
      vehicleModel: vehicleData.vehicleModel,
      color: vehicleData.color,
      vehicleOwnerId: vehicleData.ownerId._id, // Important for citation
    },
  }));
}
```

---

## Error Codes

- `400` - Bad Request (missing required fields)
- `404` - Not Found (vehicle not found)
- `409` - Conflict (duplicate plate number)
- `500` - Internal Server Error

---

## Notes

- All plate numbers are automatically converted to uppercase
- Vehicle owner will be created if they don't exist (based on email)
- If owner exists, the existing owner will be linked to the new vehicle
- The `ownerInfo` field stores a snapshot of owner data for quick access
- Default status is `ACTIVE` for new vehicles
- Search defaults to `ACTIVE` vehicles only unless specified otherwise
