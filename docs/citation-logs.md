# Citation Logs System

## Overview

The Citation Logs system provides comprehensive audit trails for all citation-related activities, including status changes, notes, payments, and modifications.

## Schema Design

### CitationLog Model

**File**: `backend/src/models/citation.log.model.ts`

#### Fields

| Field             | Type           | Description                                        |
| ----------------- | -------------- | -------------------------------------------------- |
| `citationId`      | ObjectId       | Reference to Citation document                     |
| `citationNo`      | String         | Denormalized citation number (for faster queries)  |
| `actionType`      | Enum           | Type of action performed (see Action Types below)  |
| `description`     | String         | Human-readable description of the action           |
| `previousStatus`  | CitationStatus | Status before change (if applicable)               |
| `newStatus`       | CitationStatus | Status after change (if applicable)                |
| `performedBy`     | ObjectId       | User/Enforcer/Admin who performed the action       |
| `performedByRole` | UserRole       | Role of the user (ENFORCER, ADMIN, DRIVER, SYSTEM) |
| `performedByName` | String         | Denormalized user name (for display)               |
| `reason`          | String         | Reason for void, contest, etc.                     |
| `notes`           | String         | Additional notes                                   |
| `amount`          | Number         | Payment amount (if applicable)                     |
| `metadata`        | Object         | Flexible field for additional data                 |
| `ipAddress`       | String         | IP address of the user                             |
| `userAgent`       | String         | Browser/client information                         |
| `timestamp`       | Date           | When the action occurred                           |

### Action Types

```typescript
enum LogActionType {
  STATUS_CHANGE = "STATUS_CHANGE", // General status change
  NOTE_ADDED = "NOTE_ADDED", // Note/comment added
  PAYMENT_RECORDED = "PAYMENT_RECORDED", // Payment made
  CONTESTED = "CONTESTED", // Citation contested by driver
  CONTEST_RESOLVED = "CONTEST_RESOLVED", // Contest resolved by admin
  VOIDED = "VOIDED", // Citation voided
  CREATED = "CREATED", // Citation initially created
  UPDATED = "UPDATED", // Citation details updated
  IMAGE_ADDED = "IMAGE_ADDED", // Evidence images added
  IMAGE_REMOVED = "IMAGE_REMOVED", // Evidence images removed
}
```

### User Roles

```typescript
enum UserRole {
  ENFORCER = "ENFORCER", // Traffic enforcer
  ADMIN = "ADMIN", // System administrator
  DRIVER = "DRIVER", // Driver/violator
  SYSTEM = "SYSTEM", // Automated system actions
}
```

## API Endpoints

### 1. Get Citation Logs

**GET** `/api/citation-logs/citation/:citationId`

Get all logs for a specific citation.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "citationNo": "TCT-2025-000001",
      "actionType": "STATUS_CHANGE",
      "description": "Status changed from PENDING to PAID",
      "previousStatus": "PENDING",
      "newStatus": "PAID",
      "performedBy": { ... },
      "performedByRole": "ADMIN",
      "timestamp": "2025-12-28T10:30:00Z"
    }
  ],
  "count": 5
}
```

### 2. Get Logs by Citation Number

**GET** `/api/citation-logs/citation-no/:citationNo`

Get logs using citation number instead of ID.

### 3. Add Note to Citation

**POST** `/api/citation-logs/citation/:citationId/note`

Add a note/comment to a citation.

**Request Body:**

```json
{
  "note": "Follow-up required with driver"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Note added successfully",
  "data": { ... }
}
```

### 4. Get User Logs

**GET** `/api/citation-logs/user/:userId`

Get all logs created by a specific user.

### 5. Get Filtered Logs

**GET** `/api/citation-logs?actionType=STATUS_CHANGE&startDate=2025-01-01&page=1&limit=50`

Query Parameters:

- `citationId` - Filter by citation
- `actionType` - Filter by action type
- `performedBy` - Filter by user
- `startDate` - Start date range
- `endDate` - End date range
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response:**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

### 6. Get Activity Summary

**GET** `/api/citation-logs/activity-summary?startDate=2025-01-01&userId=...`

Get statistics about log activities.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalLogs": 1250,
    "actionSummary": [
      { "actionType": "STATUS_CHANGE", "count": 450 },
      { "actionType": "NOTE_ADDED", "count": 320 },
      { "actionType": "PAYMENT_RECORDED", "count": 280 }
    ],
    "topUsers": [{ "userId": "...", "userName": "John Doe", "count": 85 }]
  }
}
```

## Integration Examples

### Automatic Logging in Controllers

The system automatically logs actions in the citation management controller:

```typescript
// Status Change Logging
const previousStatus = citation.status;
await citation.voidCitation(reason, userId);

await CitationLog.logStatusChange(
  citation._id,
  citation.citationNo,
  previousStatus,
  CitationStatus.VOID,
  userId,
  userRole,
  reason
);
```

### Manual Note Logging

```typescript
await CitationLog.logNote(
  citationId,
  citationNo,
  "Driver requested extension",
  userId,
  UserRole.ADMIN
);
```

### Payment Logging

```typescript
await CitationLog.logPayment(
  citationId,
  citationNo,
  500.0,
  userId,
  UserRole.ADMIN,
  { paymentMethod: "GCASH", referenceNo: "GC123456" }
);
```

## Indexes

The system uses the following indexes for optimal performance:

- `citationId` + `timestamp` (compound)
- `performedBy` + `timestamp` (compound)
- `actionType` + `timestamp` (compound)
- `citationNo` + `timestamp` (compound)
- Individual indexes on: `citationId`, `citationNo`, `actionType`, `performedBy`, `timestamp`

## Use Cases

### 1. Audit Trail

Track all changes made to a citation for compliance and accountability.

### 2. Activity Monitoring

Monitor enforcer and admin activities across the system.

### 3. Dispute Resolution

Review the complete history of a citation when resolving disputes.

### 4. Performance Analytics

Analyze patterns in citation processing and payment collection.

### 5. Compliance Reporting

Generate reports showing who did what and when.

## Frontend Integration

### Display Citation History

```typescript
// Fetch citation logs
const response = await fetch(`/api/citation-logs/citation/${citationId}`);
const { data: logs } = await response.json();

// Display timeline
logs.forEach((log) => {
  console.log(
    `${log.timestamp}: ${log.description} by ${log.performedBy.name}`
  );
});
```

### Add Note with Logging

```typescript
const addNote = async (citationId: string, note: string) => {
  const response = await fetch(
    `/api/citation-logs/citation/${citationId}/note`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }
  );
  return response.json();
};
```

## Best Practices

1. **Always log status changes** - Every status update should create a log entry
2. **Include context** - Use the `metadata` field for additional context
3. **Use descriptive messages** - Make descriptions human-readable
4. **Track user actions** - Always include `performedBy` and `performedByRole`
5. **Don't delete logs** - Logs are permanent audit records
6. **Use pagination** - Always paginate log queries to avoid performance issues
7. **Filter by date** - Use date ranges for large datasets

## Database Considerations

- **Retention Policy**: Consider implementing log retention policies (e.g., archive after 2 years)
- **Partitioning**: For high-volume systems, consider time-based partitioning
- **Storage**: Logs can grow large; monitor storage usage
- **Performance**: Indexes are crucial; avoid full collection scans

## Security

- **Access Control**: Only authorized users should access logs
- **Sensitive Data**: Avoid logging sensitive information (passwords, full payment details)
- **Tampering Prevention**: Logs should be immutable once created
- **Audit the Auditors**: Consider logging access to the logs themselves
