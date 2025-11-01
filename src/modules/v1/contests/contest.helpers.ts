import mongoose from "mongoose";
import {
  IContest,
  IContestModel,
  ContestStatus,
} from "../../../models/contest.model";
import Citation, { CitationStatus } from "../../../models/citation.model";

/**
 * STATIC METHODS
 * Methods that operate on the Contest model/collection level
 */

/**
 * Generate unique contest number
 * Format: CON-YYYY-NNNNNN (e.g., CON-2025-000001)
 */
export async function generateContestNo(
  ContestModel: IContestModel
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CON-${year}-`;

  // Find the latest contest number for this year
  const lastContest = await ContestModel.findOne({
    contestNo: new RegExp(`^${prefix}`),
  }).sort({ contestNo: -1 });

  let nextNumber = 1;
  if (lastContest) {
    const lastNumber = parseInt(lastContest.contestNo.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  // Format: CON-2025-000001
  return `${prefix}${nextNumber.toString().padStart(6, "0")}`;
}

/**
 * Get contest by citation ID
 */
export async function getByCitation(
  ContestModel: IContestModel,
  citationId: mongoose.Types.ObjectId
): Promise<IContest | null> {
  return ContestModel.findOne({ citationId, isActive: true })
    .populate("contestedBy", "firstName lastName email phone")
    .populate("reviewedBy", "name email");
}

/**
 * Get all contests by a specific driver
 */
export async function getByDriver(
  ContestModel: IContestModel,
  driverId: mongoose.Types.ObjectId
): Promise<IContest[]> {
  return ContestModel.find({ contestedBy: driverId, isActive: true })
    .populate("citationId", "citationNo totalAmount status")
    .sort({ createdAt: -1 });
}

/**
 * Get all pending contests (submitted or under review)
 */
export async function getPendingContests(
  ContestModel: IContestModel
): Promise<IContest[]> {
  return ContestModel.find({
    status: { $in: [ContestStatus.SUBMITTED, ContestStatus.UNDER_REVIEW] },
    isActive: true,
  })
    .populate("citationId", "citationNo totalAmount")
    .populate("contestedBy", "firstName lastName email")
    .sort({ submittedAt: 1 }); // Oldest first for fairness
}

/**
 * Get contest statistics
 */
export async function getStatistics(
  ContestModel: IContestModel,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const matchStage: any = { isActive: true };

  if (startDate || endDate) {
    matchStage.submittedAt = {};
    if (startDate) matchStage.submittedAt.$gte = startDate;
    if (endDate) matchStage.submittedAt.$lte = endDate;
  }

  const result = await ContestModel.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        submitted: {
          $sum: {
            $cond: [{ $eq: ["$status", ContestStatus.SUBMITTED] }, 1, 0],
          },
        },
        underReview: {
          $sum: {
            $cond: [{ $eq: ["$status", ContestStatus.UNDER_REVIEW] }, 1, 0],
          },
        },
        approved: {
          $sum: { $cond: [{ $eq: ["$status", ContestStatus.APPROVED] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", ContestStatus.REJECTED] }, 1, 0] },
        },
        withdrawn: {
          $sum: {
            $cond: [{ $eq: ["$status", ContestStatus.WITHDRAWN] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    result[0] || {
      total: 0,
      submitted: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    }
  );
}

/**
 * INSTANCE METHODS
 * Methods that operate on individual contest documents
 */

/**
 * Submit a new contest for a citation
 */
export async function submitContest(
  citationId: mongoose.Types.ObjectId,
  contestData: {
    reason: string;
    description?: string;
    contestedBy: mongoose.Types.ObjectId;
    supportingDocuments?: string[];
    witnessInfo?: {
      name: string;
      contactNo?: string;
      statement?: string;
    }[];
  }
): Promise<IContest> {
  // Check if citation exists and is contestable
  const citation = await Citation.findById(citationId);
  if (!citation) {
    throw new Error("Citation not found");
  }

  if (citation.status === CitationStatus.PAID) {
    throw new Error("Cannot contest a paid citation");
  }

  if (citation.status === CitationStatus.VOID) {
    throw new Error("Cannot contest a voided citation");
  }

  if (citation.status === CitationStatus.DISMISSED) {
    throw new Error("Cannot contest a dismissed citation");
  }

  // Check if there's already an active contest for this citation
  const Contest = require("../../../models/contest.model").default;
  const existingContest = await Contest.findOne({
    citationId,
    isActive: true,
  });

  if (existingContest) {
    throw new Error("An active contest already exists for this citation");
  }

  // Generate contest number
  const contestNo = await generateContestNo(Contest);

  // Create new contest
  const contest = new Contest({
    citationId,
    contestNo,
    reason: contestData.reason,
    description: contestData.description,
    contestedBy: contestData.contestedBy,
    supportingDocuments: contestData.supportingDocuments || [],
    witnessInfo: contestData.witnessInfo || [],
    status: ContestStatus.SUBMITTED,
  });

  await contest.save();

  // Update citation status to CONTESTED
  citation.status = CitationStatus.CONTESTED;
  await citation.save();

  return contest;
}

/**
 * Approve a contest
 */
export async function approveContest(
  contest: IContest,
  resolvedBy: mongoose.Types.ObjectId,
  resolution: string
): Promise<IContest> {
  contest.status = ContestStatus.APPROVED;
  contest.reviewedBy = resolvedBy;
  contest.reviewedAt = new Date();
  contest.resolution = resolution;

  contest.addStatusHistory(ContestStatus.APPROVED, resolvedBy, resolution);

  await contest.save();

  // Update citation status to DISMISSED
  const citation = await Citation.findById(contest.citationId);
  if (citation) {
    citation.status = CitationStatus.DISMISSED;
    await citation.save();
  }

  return contest;
}

/**
 * Reject a contest
 */
export async function rejectContest(
  contest: IContest,
  resolvedBy: mongoose.Types.ObjectId,
  resolution: string
): Promise<IContest> {
  contest.status = ContestStatus.REJECTED;
  contest.reviewedBy = resolvedBy;
  contest.reviewedAt = new Date();
  contest.resolution = resolution;

  contest.addStatusHistory(ContestStatus.REJECTED, resolvedBy, resolution);

  await contest.save();

  // Update citation status back to original state
  const citation = await Citation.findById(contest.citationId);
  if (citation) {
    // Revert to previous status or set to pending
    citation.status =
      citation.amountPaid > 0
        ? CitationStatus.PARTIALLY_PAID
        : CitationStatus.PENDING;
    await citation.save();
  }

  return contest;
}

/**
 * Withdraw a contest
 */
export async function withdrawContest(contest: IContest): Promise<IContest> {
  contest.status = ContestStatus.WITHDRAWN;
  contest.addStatusHistory(
    ContestStatus.WITHDRAWN,
    contest.contestedBy,
    "Withdrawn by driver"
  );

  await contest.save();

  // Update citation status back to original state
  const citation = await Citation.findById(contest.citationId);
  if (citation) {
    // Revert to previous status or set to pending
    citation.status =
      citation.amountPaid > 0
        ? CitationStatus.PARTIALLY_PAID
        : CitationStatus.PENDING;
    await citation.save();
  }

  return contest;
}

/**
 * Move contest to under review
 */
export async function moveToReview(
  contest: IContest,
  reviewedBy: mongoose.Types.ObjectId
): Promise<IContest> {
  contest.status = ContestStatus.UNDER_REVIEW;
  contest.reviewedBy = reviewedBy;

  contest.addStatusHistory(
    ContestStatus.UNDER_REVIEW,
    reviewedBy,
    "Moved to review"
  );

  await contest.save();
  return contest;
}

/**
 * Add status history entry
 */
export function addStatusHistory(
  contest: IContest,
  status: ContestStatus,
  changedBy: mongoose.Types.ObjectId,
  notes?: string
): void {
  contest.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy,
    changedByModel: status === ContestStatus.WITHDRAWN ? "Driver" : "User",
    notes,
  });
}
