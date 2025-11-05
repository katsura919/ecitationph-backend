# Citation API Documentation

## Overview

The Citation API provides endpoints for managing traffic citations in the eCitation system. This includes creating, retrieving, updating, and voiding citations with comprehensive filtering and pagination capabilities.

## Base URL

```
/api/v1/citations
```

## Authentication

Most endpoints require authentication. For testing purposes, you can use the `x-enforcer-id` header when authentication is disabled.

---

## Endpoints

### 1. Create Citation

Creates a new traffic citation.

**Endpoint:** `POST /citations`

**Authentication:** Required (Enforcer role)

**Request Body:**

```json
{
  "driverId": "string (ObjectId, required)",
  "vehicleInfo": {
    "plateNo": "string (required, uppercase)",
    "vehicleType": "PRIVATE | FOR_HIRE (required)",
    "make": "string (optional)",
    "model": "string (optional)",
    "color": "string (optional)",
    "vehicleOwnerId": "string (ObjectId, optional)"
  },
  "violationIds": ["string (ObjectId array, required, min 1)"],
  "location": {
    "street": "string (optional)",
    "barangay": "string (required)",
    "city": "string (required)",
    "province": "string (required)",
    "coordinates": {
      "latitude": "number (optional)",
      "longitude": "number (optional)"
    }
  },
  "violationDateTime": "string (ISO8601, optional, defaults to now)",
  "images": ["string array (optional)"],
  "notes": "string (optional)",
  "dueDate": "string (ISO8601, optional, defaults to +15 days)"
}
```

**Headers (for testing):**

```
x-enforcer-id: string (ObjectId)
```

**Response:**

```json
{
  "success": true,
  "message": "Citation created successfully",
  "data": {
    "citationNo": "TCT-2025-000001",
    "driverId": {...},
    "vehicleInfo": {...},
    "violations": [...],
    "totalAmount": 1500,
    "amountPaid": 0,
    "amountDue": 1500,
    "status": "PENDING",
    "issuedAt": "2025-11-05T10:30:00Z",
    "dueDate": "2025-11-20T23:59:59Z",
    // ... other fields
  }
}
```

---

### 2. Get All Citations (with Filtering)

Retrieves citations with optional filtering, pagination, and sorting.

**Endpoint:** `GET /citations`

**Authentication:** Required (Admin/Enforcer role)

**Query Parameters:**

- `status` (string, optional): Filter by citation status
  - Values: `PENDING`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `CONTESTED`, `DISMISSED`, `VOID`, `all`
  - Default: Returns all statuses (except voided)
- `enforcerId` (string, optional): Filter by enforcer who issued the citation
- `driverId` (string, optional): Filter by driver
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Field to sort by (default: "createdAt")
- `sortOrder` (string, optional): Sort order "asc" or "desc" (default: "desc")

**Examples:**

```bash
# Get all citations
GET /citations

# Get overdue citations
GET /citations?status=OVERDUE

# Get citations by driver with pagination
GET /citations?driverId=67123abc456def789&page=1&limit=10

# Get citations by enforcer, sorted by violation date
GET /citations?enforcerId=67123abc456def789&sortBy=violationDateTime&sortOrder=asc

# Get pending citations for specific enforcer
GET /citations?status=PENDING&enforcerId=67123abc456def789
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "citationNo": "TCT-2025-000001",
      "driverId": {
        "firstName": "Juan",
        "lastName": "Cruz",
        "licenseNo": "N01-12-123456"
      },
      "issuedBy": {
        "badgeNo": "ENF-001",
        "name": "Officer Smith"
      },
      "vehicleInfo": {
        "plateNo": "ABC1234",
        "vehicleType": "PRIVATE"
      },
      "status": "PENDING",
      "totalAmount": 1500,
      "amountDue": 1500,
      "violationDateTime": "2025-11-05T08:30:00Z",
      "dueDate": "2025-11-20T23:59:59Z"
      // ... other fields
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

### 3. Get Citation by ID

Retrieves a specific citation by its MongoDB ObjectId.

**Endpoint:** `GET /citations/:id`

**Authentication:** Required

**Parameters:**

- `id` (string, required): Citation ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "citationNo": "TCT-2025-000001",
    "driverId": {
      "firstName": "Juan",
      "lastName": "Cruz",
      "licenseNo": "N01-12-123456",
      "contactNo": "+639123456789"
    },
    "issuedBy": {
      "badgeNo": "ENF-001",
      "name": "Officer Smith",
      "email": "officer.smith@example.com",
      "contactNo": "+639876543210"
    },
    "violations": [
      {
        "violationId": "...",
        "code": "1i",
        "title": "Reckless Driving",
        "description": "Driving without due regard for safety",
        "fineAmount": 1500,
        "offenseCount": 1
      }
    ],
    "vehicleInfo": {
      "plateNo": "ABC1234",
      "vehicleType": "PRIVATE",
      "make": "Toyota",
      "model": "Vios",
      "color": "White"
    },
    "location": {
      "street": "EDSA",
      "barangay": "Guadalupe",
      "city": "Makati City",
      "province": "Metro Manila"
    },
    "totalAmount": 1500,
    "amountPaid": 0,
    "amountDue": 1500,
    "status": "PENDING",
    "violationDateTime": "2025-11-05T08:30:00Z",
    "issuedAt": "2025-11-05T09:00:00Z",
    "dueDate": "2025-11-20T23:59:59Z",
    "images": ["url1.jpg", "url2.jpg"],
    "notes": "Driver was speeding in heavy traffic",
    "isVoid": false,
    "createdAt": "2025-11-05T09:00:00Z",
    "updatedAt": "2025-11-05T09:00:00Z"
  }
}
```

---

### 4. Get Citation by Citation Number

Retrieves a citation by its citation number (public endpoint for drivers).

**Endpoint:** `GET /citations/number/:citationNo`

**Authentication:** Not required (Public)

**Parameters:**

- `citationNo` (string, required): Citation number (e.g., "TCT-2025-000001")

**Response:**

```json
{
  "success": true,
  "data": {
    "citationNo": "TCT-2025-000001",
    "driverId": {
      "firstName": "Juan",
      "lastName": "Cruz",
      "licenseNo": "N01-12-123456"
    },
    "issuedBy": {
      "badgeNo": "ENF-001",
      "name": "Officer Smith"
    },
    "violations": [...],
    "vehicleInfo": {...},
    "totalAmount": 1500,
    "amountDue": 1500,
    "status": "PENDING",
    "violationDateTime": "2025-11-05T08:30:00Z",
    "dueDate": "2025-11-20T23:59:59Z"
    // ... other relevant fields
  }
}
```

---

### 5. Update Citation

Updates specific fields of a citation.

**Endpoint:** `PUT /citations/:id`

**Authentication:** Required (Admin role)

**Parameters:**

- `id` (string, required): Citation ObjectId

**Request Body:**

```json
{
  "notes": "string (optional)",
  "images": ["string array (optional)"],
  "dueDate": "string (ISO8601, optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Citation updated successfully",
  "data": {
    // Updated citation object
  }
}
```

---

### 6. Void Citation

Voids/cancels a citation (soft delete).

**Endpoint:** `DELETE /citations/:id`

**Authentication:** Required (Admin role)

**Parameters:**

- `id` (string, required): Citation ObjectId

**Request Body:**

```json
{
  "reason": "string (required, min 10 characters)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Citation voided successfully",
  "data": {
    // Voided citation object with isVoid: true
  }
}
```

---

### 7. Get Citation Statistics

Retrieves citation statistics and reports.

**Endpoint:** `GET /citations/reports/statistics`

**Authentication:** Required (Admin role)

**Query Parameters:**

- `startDate` (string, optional): Start date for statistics (ISO8601)
- `endDate` (string, optional): End date for statistics (ISO8601)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalCitations": 250,
    "totalAmount": 375000,
    "totalCollected": 125000,
    "pending": 100,
    "paid": 50,
    "overdue": 75,
    "contested": 25
  }
}
```

---

## Citation Status Values

| Status           | Description                       |
| ---------------- | --------------------------------- |
| `PENDING`        | Citation issued, awaiting payment |
| `PAID`           | Fine paid in full                 |
| `PARTIALLY_PAID` | Partial payment made              |
| `OVERDUE`        | Past due date                     |
| `CONTESTED`      | Driver is contesting the citation |
| `DISMISSED`      | Citation dismissed/cancelled      |
| `VOID`           | Citation voided by admin          |

## Vehicle Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `PRIVATE`  | Private vehicle             |
| `FOR_HIRE` | Commercial/for-hire vehicle |

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (optional)"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

## Usage Examples

### Creating a Citation (cURL)

```bash
curl -X POST /api/v1/citations \
  -H "Content-Type: application/json" \
  -H "x-enforcer-id: 67123abc456def789" \
  -d '{
    "driverId": "67123abc456def789",
    "vehicleInfo": {
      "plateNo": "ABC1234",
      "vehicleType": "PRIVATE",
      "make": "Toyota",
      "model": "Vios",
      "color": "White"
    },
    "violationIds": ["67123abc456def789"],
    "location": {
      "barangay": "Guadalupe",
      "city": "Makati City",
      "province": "Metro Manila"
    },
    "notes": "Caught speeding on EDSA"
  }'
```

### Getting Citations with Filters

```bash
# Get overdue citations
curl "/api/v1/citations?status=OVERDUE&page=1&limit=10"

# Get citations by driver
curl "/api/v1/citations?driverId=67123abc456def789"

# Get citations by enforcer with sorting
curl "/api/v1/citations?enforcerId=67123abc456def789&sortBy=violationDateTime&sortOrder=desc"
```

## Notes

1. **Date Formats**: All dates should be in ISO8601 format (e.g., "2025-11-05T10:30:00Z")
2. **ObjectIds**: All MongoDB ObjectIds should be valid 24-character hexadecimal strings
3. **Pagination**: Default page size is 20, maximum recommended is 100
4. **Filtering**: Multiple filters can be combined in a single request
5. **Authentication**: Currently commented out in routes for testing purposes
6. **Contest Functionality**: Moved to separate contest controller/endpoints
