# Contest Model Migration Guide

This guide will help you migrate from the embedded contest fields in the Citation model to the new separate Contest model.

## Overview

We've created a separate `Contest` model to better manage citation appeals with the following benefits:

- **Better data organization** - Separates concerns between citation and contest
- **One citation = One contest** - Enforced via unique constraint on `citationId`
- **Extensible workflow** - Supports complex contest states and processes
- **Audit trail** - Complete status history tracking
- **Supporting documents** - Attach evidence files for contests

## Migration Steps

### 1. Data Migration (Optional)

If you have existing citations with contest data, you can migrate them to the new Contest model:

```typescript
// migration/migrate-contests.ts
import mongoose from "mongoose";
import Citation from "../src/models/citation.model";
import Contest, { ContestStatus } from "../src/models/contest.model";

async function migrateContests() {
  try {
    // Find all citations with contest data
    const citationsWithContests = await Citation.find({
      contestedAt: { $exists: true },
      contestReason: { $exists: true },
    });

    console.log(
      `Found ${citationsWithContests.length} citations with contest data`
    );

    for (const citation of citationsWithContests) {
      // Check if contest already exists for this citation
      const existingContest = await Contest.findOne({
        citationId: citation._id,
      });
      if (existingContest) {
        console.log(
          `Contest already exists for citation ${citation.citationNo}`
        );
        continue;
      }

      // Generate contest number
      const contestNo = await Contest.generateContestNo();

      // Determine contest status
      let status = ContestStatus.SUBMITTED;
      if (citation.contestResolvedAt) {
        status =
          citation.status === "DISMISSED"
            ? ContestStatus.APPROVED
            : ContestStatus.REJECTED;
      }

      // Create new contest
      const contest = new Contest({
        citationId: citation._id,
        contestNo,
        reason: citation.contestReason,
        contestedBy: citation.contestedBy,
        submittedAt: citation.contestedAt,
        status,
        reviewedBy: citation.contestResolvedBy,
        reviewedAt: citation.contestResolvedAt,
        resolution: citation.contestResolution,
        isActive: true,
      });

      await contest.save();
      console.log(`Migrated contest for citation ${citation.citationNo}`);
    }

    console.log("Contest migration completed successfully");
  } catch (error) {
    console.error("Error migrating contests:", error);
  }
}

// Run migration
migrateContests();
```

### 2. Update Citation Model (Remove Contest Fields)

After migrating data, you can remove the contest fields from the Citation model:

```typescript
// Remove these fields from ICitation interface:
// contestedAt?: Date;
// contestReason?: string;
// contestedBy?: mongoose.Types.ObjectId;
// contestResolution?: string;
// contestResolvedAt?: Date;
// contestResolvedBy?: mongoose.Types.ObjectId;

// Remove from Citation schema:
// contestedAt: Date,
// contestReason: String,
// contestedBy: { type: Schema.Types.ObjectId, ref: "Driver" },
// contestResolution: String,
// contestResolvedAt: Date,
// contestResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },

// Remove contest-related methods:
// contestCitation()
// resolveContest()
```

### 3. Update Citation Helpers

Update `citations.helpers.ts` to work with the new Contest model:

```typescript
// Remove or update these functions:
// - contestCitation()
// - resolveContest()

// Add this helper to check if citation can be contested:
export function canBeContested(citation: ICitation): boolean {
  return ![
    CitationStatus.PAID,
    CitationStatus.VOID,
    CitationStatus.DISMISSED,
  ].includes(citation.status);
}
```

### 4. Update Frontend/API Calls

Update your frontend code to use the new contest endpoints:

**Old API calls:**

```typescript
// OLD - Contest embedded in citation
PATCH /api/v1/citations/:id/contest
GET /api/v1/citations/:id (includes contest data)
```

**New API calls:**

```typescript
// NEW - Separate contest endpoints
POST /api/v1/contests/citation/:citationId/contest    // Submit contest
GET /api/v1/contests/citation/:citationId/contest     // Get contest by citation
GET /api/v1/contests/:contestId                       // Get contest details
PATCH /api/v1/contests/:contestId/approve             // Approve contest (admin)
PATCH /api/v1/contests/:contestId/reject              // Reject contest (admin)
PATCH /api/v1/contests/:contestId/withdraw            // Withdraw contest (driver)
GET /api/v1/contests/driver/:driverId/contests        // Get driver's contests
GET /api/v1/contests/pending                          // Get pending contests (admin)
GET /api/v1/contests/statistics                       // Get contest statistics (admin)
```

## New Features Available

### 1. Contest Status Workflow

```typescript
enum ContestStatus {
  SUBMITTED = "SUBMITTED", // Contest submitted, awaiting review
  UNDER_REVIEW = "UNDER_REVIEW", // Being reviewed by admin
  APPROVED = "APPROVED", // Contest approved - citation dismissed
  REJECTED = "REJECTED", // Contest rejected - citation stands
  WITHDRAWN = "WITHDRAWN", // Driver withdrew the contest
}
```

### 2. Supporting Documents

```typescript
// Submit contest with evidence
POST /api/v1/contests/citation/:citationId/contest
{
  "reason": "I was not driving at the time",
  "description": "I was at work during the violation time",
  "supportingDocuments": [
    "https://storage.example.com/evidence1.jpg",
    "https://storage.example.com/work-schedule.pdf"
  ],
  "witnessInfo": [
    {
      "name": "John Doe",
      "contactNo": "+639123456789",
      "statement": "I can confirm the driver was at work"
    }
  ]
}
```

### 3. Status History Tracking

```typescript
// Each contest maintains a complete audit trail
{
  "statusHistory": [
    {
      "status": "SUBMITTED",
      "changedAt": "2025-11-01T10:00:00Z",
      "changedBy": "driver_id",
      "changedByModel": "Driver",
      "notes": "Contest submitted"
    },
    {
      "status": "UNDER_REVIEW",
      "changedAt": "2025-11-01T14:00:00Z",
      "changedBy": "admin_id",
      "changedByModel": "User",
      "notes": "Moved to review"
    }
  ]
}
```

### 4. Advanced Querying

```typescript
// Get contests with pagination and filtering
GET /api/v1/contests/driver/:driverId/contests?status=SUBMITTED&page=1&limit=10

// Get contest statistics
GET /api/v1/contests/statistics?startDate=2025-01-01&endDate=2025-12-31
```

## Database Constraints

The new Contest model enforces important business rules:

1. **One Contest per Citation**: `citationId` has a unique constraint
2. **Citation Status Updates**: Contest approval/rejection automatically updates citation status
3. **Data Integrity**: Foreign key relationships ensure data consistency

## Testing

Test the new contest functionality:

1. **Submit Contest**: Create a contest for a citation
2. **Admin Review**: Move contest to under review
3. **Approve Contest**: Verify citation status changes to DISMISSED
4. **Reject Contest**: Verify citation status reverts to original
5. **Withdraw Contest**: Verify driver can withdraw their own contest
6. **Duplicate Prevention**: Verify you can't create multiple contests for same citation

## API Response Examples

**Contest Submission Response:**

```json
{
  "success": true,
  "message": "Contest submitted successfully",
  "data": {
    "_id": "contest_id",
    "contestNo": "CON-2025-000001",
    "citationId": {
      "citationNo": "TCT-2025-000123",
      "totalAmount": 1500,
      "status": "CONTESTED"
    },
    "reason": "I was not driving at the time",
    "status": "SUBMITTED",
    "submittedAt": "2025-11-01T10:00:00Z"
  }
}
```

This migration provides a more robust and scalable contest system while maintaining the core requirement that one citation can only have one contest.
