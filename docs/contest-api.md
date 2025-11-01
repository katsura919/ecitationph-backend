# Contest API Documentation

## Overview

The Contest API manages citation appeals/contests in the eCitation system. Each citation can have **exactly one contest**, enforced by database constraints.

**Key Features:**

- One contest per citation (enforced by unique constraint)
- Efficient driver queries (driverId field for indexing)
- Complete audit trail with status history
- File upload support for evidence

## Base URL

```
/api/v1/contests
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header.

## Endpoints

### 1. Submit Contest

Submit a new contest for a citation.

**Endpoint:** `POST /citation/:citationId/contest`

**Request Body:**

```json
{
  "reason": "string (10-500 chars, required)",
  "description": "string (optional, max 1000 chars)",
  "supportingDocuments": ["string (URLs, optional)"],
  "witnessInfo": [
    {
      "name": "string (required, max 100 chars)",
      "contactNo": "string (optional, max 20 chars)",
      "statement": "string (optional, max 500 chars)"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contest submitted successfully",
  "data": {
    "_id": "contest_id",
    "contestNo": "CON-2025-000001",
    "citationId": "citation_object",
    "reason": "Contest reason",
    "status": "SUBMITTED",
    "submittedAt": "2025-11-01T10:00:00Z"
  }
}
```

### 2. Get Contest by Citation

Retrieve the contest for a specific citation.

**Endpoint:** `GET /citation/:citationId/contest`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "contest_id",
    "contestNo": "CON-2025-000001",
    "citationId": "citation_object",
    "driverId": "driver_id",
    "contestedBy": "driver_object",
    "reason": "Contest reason",
    "status": "SUBMITTED",
    "statusHistory": []
  }
}
```

### 3. Get Driver's Contests

Get all contests submitted by a specific driver.

**Endpoint:** `GET /driver/:driverId/contests`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by contest status

**Response:**

```json
{
  "success": true,
  "data": {
    "contests": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 4. Get Pending Contests (Admin)

Get all contests awaiting admin review.

**Endpoint:** `GET /pending`

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "data": {
    "contests": [],
    "pagination": {}
  }
}
```

### 5. Get Contest Details

Get detailed information about a specific contest.

**Endpoint:** `GET /:contestId`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "contest_id",
    "contestNo": "CON-2025-000001",
    "citationId": "citation_object",
    "driverId": "driver_id",
    "contestedBy": "driver_object",
    "reviewedBy": "admin_object",
    "reason": "Contest reason",
    "description": "Detailed description",
    "supportingDocuments": [],
    "witnessInfo": [],
    "status": "UNDER_REVIEW",
    "statusHistory": [],
    "submittedAt": "2025-11-01T10:00:00Z",
    "reviewedAt": "2025-11-01T14:00:00Z",
    "reviewNotes": "Admin review notes"
  }
}
```

### 6. Move to Review (Admin)

Move a submitted contest to under review status.

**Endpoint:** `PATCH /:contestId/review`

**Response:**

```json
{
  "success": true,
  "message": "Contest moved to review",
  "data": "contest_object"
}
```

### 7. Approve Contest (Admin)

Approve a contest and dismiss the citation.

**Endpoint:** `PATCH /:contestId/approve`

**Request Body:**

```json
{
  "resolution": "string (10-1000 chars, required)",
  "reviewNotes": "string (optional, max 1000 chars)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contest approved successfully",
  "data": "contest_object"
}
```

### 8. Reject Contest (Admin)

Reject a contest and restore citation to original status.

**Endpoint:** `PATCH /:contestId/reject`

**Request Body:**

```json
{
  "resolution": "string (10-1000 chars, required)",
  "reviewNotes": "string (optional, max 1000 chars)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contest rejected successfully",
  "data": "contest_object"
}
```

### 9. Withdraw Contest (Driver)

Allow driver to withdraw their own contest.

**Endpoint:** `PATCH /:contestId/withdraw`

**Response:**

```json
{
  "success": true,
  "message": "Contest withdrawn successfully",
  "data": "contest_object"
}
```

### 10. Get Contest Statistics (Admin)

Get statistical data about contests.

**Endpoint:** `GET /statistics`

**Query Parameters:**

- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "submitted": 25,
    "underReview": 10,
    "approved": 45,
    "rejected": 60,
    "withdrawn": 10
  }
}
```

## Contest Status Flow

```
SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
    ↓
WITHDRAWN (driver can withdraw anytime before resolution)
```

## Business Rules

1. **One Contest per Citation**: Enforced by unique constraint on `citationId`
2. **Contest Eligibility**: Cannot contest PAID, VOID, or DISMISSED citations
3. **Status Updates**: Contest approval/rejection automatically updates citation status
4. **Withdrawal Rights**: Only the driver who submitted can withdraw their contest
5. **Admin Actions**: Only admins can approve, reject, or move contests to review

## Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Validation error or business rule violation"
}
```

**401 Unauthorized:**

```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden:**

```json
{
  "success": false,
  "message": "You can only withdraw your own contests"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Contest not found"
}
```

## Example Usage

### Driver Submitting a Contest

```javascript
// Submit contest
const response = await fetch("/api/v1/contests/citation/citation_id/contest", {
  method: "POST",
  headers: {
    Authorization: "Bearer token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reason: "I was not driving the vehicle at the time of violation",
    description: "I was at work and can provide evidence",
    supportingDocuments: ["https://storage.example.com/work-schedule.pdf"],
    witnessInfo: [
      {
        name: "Manager Name",
        contactNo: "+639123456789",
        statement: "Employee was at work during violation time",
      },
    ],
  }),
});
```

### Admin Reviewing Contest

```javascript
// Move to review
await fetch("/api/v1/contests/contest_id/review", {
  method: "PATCH",
  headers: { Authorization: "Bearer admin_token" },
});

// Approve contest
await fetch("/api/v1/contests/contest_id/approve", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer admin_token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    resolution:
      "Evidence provided clearly shows driver was not present at violation location",
    reviewNotes: "Reviewed all submitted documents and witness statements",
  }),
});
```
