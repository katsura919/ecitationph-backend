import { Request, Response } from "express";
import Contest, { ContestStatus } from "../../../models/contest.model";
import Citation from "../../../models/citation.model";
import * as ContestHelpers from "./contest.helpers";
import mongoose from "mongoose";

/**
 * Submit a new contest for a citation
 */
export const submitContest = async (req: Request, res: Response) => {
  try {
    const { citationId } = req.params;
    const { reason, description, supportingDocuments, witnessInfo } = req.body;

    // Get the driver ID from the authenticated user
    const contestedBy = req.user?.id; // Assuming you have user info in req.user

    if (!contestedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate citation ID
    if (!mongoose.Types.ObjectId.isValid(citationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid citation ID",
      });
    }

    // Validate required fields
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Contest reason is required",
      });
    }

    // Submit the contest
    const contest = await ContestHelpers.submitContest(
      new mongoose.Types.ObjectId(citationId),
      {
        reason: reason.trim(),
        description: description?.trim(),
        contestedBy: new mongoose.Types.ObjectId(contestedBy),
        supportingDocuments: supportingDocuments || [],
        witnessInfo: witnessInfo || [],
      }
    );

    await contest.populate([
      { path: "citationId", select: "citationNo totalAmount status" },
      { path: "contestedBy", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Contest submitted successfully",
      data: contest,
    });
  } catch (error: any) {
    console.error("Error submitting contest:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to submit contest",
    });
  }
};

/**
 * Get contest by citation ID
 */
export const getContestByCitation = async (req: Request, res: Response) => {
  try {
    const { citationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(citationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid citation ID",
      });
    }

    const contest = await Contest.getByCitation(
      new mongoose.Types.ObjectId(citationId)
    );

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "No active contest found for this citation",
      });
    }

    res.json({
      success: true,
      data: contest,
    });
  } catch (error: any) {
    console.error("Error getting contest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contest",
    });
  }
};

/**
 * Get all contests by driver
 */
export const getContestsByDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ContestStatus;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID",
      });
    }

    let contests = await Contest.getByDriver(
      new mongoose.Types.ObjectId(driverId)
    );

    // Filter by status if provided
    if (status && Object.values(ContestStatus).includes(status)) {
      contests = contests.filter((contest) => contest.status === status);
    }

    // Pagination
    const total = contests.length;
    const skip = (page - 1) * limit;
    const paginatedContests = contests.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        contests: paginatedContests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting driver contests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contests",
    });
  }
};

/**
 * Get pending contests (for admin review)
 */
export const getPendingContests = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const allPendingContests = await Contest.getPendingContests();

    // Pagination
    const total = allPendingContests.length;
    const skip = (page - 1) * limit;
    const contests = allPendingContests.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        contests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting pending contests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending contests",
    });
  }
};

/**
 * Move contest to under review
 */
export const moveToReview = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const reviewedBy = req.user?.id; // Admin/User ID

    if (!reviewedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    if (contest.status !== ContestStatus.SUBMITTED) {
      return res.status(400).json({
        success: false,
        message: "Contest is not in submitted status",
      });
    }

    const updatedContest = await ContestHelpers.moveToReview(
      contest,
      new mongoose.Types.ObjectId(reviewedBy)
    );

    await updatedContest.populate([
      { path: "citationId", select: "citationNo totalAmount status" },
      { path: "contestedBy", select: "firstName lastName email" },
      { path: "reviewedBy", select: "name email" },
    ]);

    res.json({
      success: true,
      message: "Contest moved to review",
      data: updatedContest,
    });
  } catch (error: any) {
    console.error("Error moving contest to review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to move contest to review",
    });
  }
};

/**
 * Approve a contest
 */
export const approveContest = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const { resolution } = req.body;
    const resolvedBy = req.user?.id; // Admin/User ID

    if (!resolvedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Resolution is required",
      });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    if (
      contest.status === ContestStatus.APPROVED ||
      contest.status === ContestStatus.REJECTED
    ) {
      return res.status(400).json({
        success: false,
        message: "Contest has already been resolved",
      });
    }

    const updatedContest = await contest.approve(
      new mongoose.Types.ObjectId(resolvedBy),
      resolution.trim()
    );

    await updatedContest.populate([
      { path: "citationId", select: "citationNo totalAmount status" },
      { path: "contestedBy", select: "firstName lastName email" },
      { path: "reviewedBy", select: "name email" },
    ]);

    res.json({
      success: true,
      message: "Contest approved successfully",
      data: updatedContest,
    });
  } catch (error: any) {
    console.error("Error approving contest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve contest",
    });
  }
};

/**
 * Reject a contest
 */
export const rejectContest = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const { resolution } = req.body;
    const resolvedBy = req.user?.id; // Admin/User ID

    if (!resolvedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Resolution is required",
      });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    if (
      contest.status === ContestStatus.APPROVED ||
      contest.status === ContestStatus.REJECTED
    ) {
      return res.status(400).json({
        success: false,
        message: "Contest has already been resolved",
      });
    }

    const updatedContest = await contest.reject(
      new mongoose.Types.ObjectId(resolvedBy),
      resolution.trim()
    );

    await updatedContest.populate([
      { path: "citationId", select: "citationNo totalAmount status" },
      { path: "contestedBy", select: "firstName lastName email" },
      { path: "reviewedBy", select: "name email" },
    ]);

    res.json({
      success: true,
      message: "Contest rejected successfully",
      data: updatedContest,
    });
  } catch (error: any) {
    console.error("Error rejecting contest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject contest",
    });
  }
};

/**
 * Withdraw a contest (driver can withdraw their own contest)
 */
export const withdrawContest = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const userId = req.user?.id; // Driver ID

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    // Check if the user owns this contest
    if (contest.contestedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only withdraw your own contests",
      });
    }

    if (
      contest.status === ContestStatus.APPROVED ||
      contest.status === ContestStatus.REJECTED
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw a resolved contest",
      });
    }

    if (contest.status === ContestStatus.WITHDRAWN) {
      return res.status(400).json({
        success: false,
        message: "Contest is already withdrawn",
      });
    }

    const updatedContest = await contest.withdraw();

    await updatedContest.populate([
      { path: "citationId", select: "citationNo totalAmount status" },
      { path: "contestedBy", select: "firstName lastName email" },
    ]);

    res.json({
      success: true,
      message: "Contest withdrawn successfully",
      data: updatedContest,
    });
  } catch (error: any) {
    console.error("Error withdrawing contest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to withdraw contest",
    });
  }
};

/**
 * Get contest statistics
 */
export const getContestStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    const statistics = await Contest.getStatistics(start, end);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    console.error("Error getting contest statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contest statistics",
    });
  }
};

/**
 * Get contest details by ID
 */
export const getContestById = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await Contest.findById(contestId)
      .populate(
        "citationId",
        "citationNo totalAmount status violationDateTime location"
      )
      .populate("contestedBy", "firstName lastName email phone")
      .populate("reviewedBy", "name email");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    res.json({
      success: true,
      data: contest,
    });
  } catch (error: any) {
    console.error("Error getting contest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contest",
    });
  }
};
