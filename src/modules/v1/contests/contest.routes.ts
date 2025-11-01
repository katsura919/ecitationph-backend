import { Router } from "express";
import * as ContestController from "./contest.controller";
import { authenticate } from "../../../middleware/auth.middleware";
import { handleValidationErrors } from "../../../middleware/validator";
import { body, param, query } from "express-validator";

const router = Router();

/**
 * Validation schemas
 */
const submitContestValidation = [
  param("citationId").isMongoId().withMessage("Invalid citation ID"),
  body("reason")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Reason must be between 10 and 500 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("supportingDocuments")
    .optional()
    .isArray()
    .withMessage("Supporting documents must be an array"),
  body("supportingDocuments.*")
    .optional()
    .isURL()
    .withMessage("Each supporting document must be a valid URL"),
  body("witnessInfo")
    .optional()
    .isArray()
    .withMessage("Witness info must be an array"),
  body("witnessInfo.*.name")
    .if(body("witnessInfo").exists())
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Witness name is required and must be under 100 characters"),
];

const resolveContestValidation = [
  param("contestId").isMongoId().withMessage("Invalid contest ID"),
  body("resolution")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Resolution must be between 10 and 1000 characters"),
];

const contestIdValidation = [
  param("contestId").isMongoId().withMessage("Invalid contest ID"),
];

const driverIdValidation = [
  param("driverId").isMongoId().withMessage("Invalid driver ID"),
];

const citationIdValidation = [
  param("citationId").isMongoId().withMessage("Invalid citation ID"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const dateRangeValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

/**
 * Contest Routes
 */

// Submit a new contest for a citation
router.post(
  "/citation/:citationId/contest",
  authenticate,
  submitContestValidation,
  handleValidationErrors,
  ContestController.submitContest
);

// Get contest by citation ID
router.get(
  "/citation/:citationId/contest",
  authenticate,
  citationIdValidation,
  handleValidationErrors,
  ContestController.getContestByCitation
);

// Get all contests by driver
router.get(
  "/driver/:driverId/contests",
  authenticate,
  driverIdValidation,
  paginationValidation,
  handleValidationErrors,
  ContestController.getContestsByDriver
);

// Get pending contests (admin only)
router.get(
  "/pending",
  authenticate,
  // TODO: Add admin role validation middleware
  paginationValidation,
  handleValidationErrors,
  ContestController.getPendingContests
);

// Get contest details by ID
router.get(
  "/:contestId",
  authenticate,
  contestIdValidation,
  handleValidationErrors,
  ContestController.getContestById
);

// Move contest to under review (admin only)
router.patch(
  "/:contestId/review",
  authenticate,
  // TODO: Add admin role validation middleware
  contestIdValidation,
  handleValidationErrors,
  ContestController.moveToReview
);

// Approve a contest (admin only)
router.patch(
  "/:contestId/approve",
  authenticate,
  // TODO: Add admin role validation middleware
  resolveContestValidation,
  handleValidationErrors,
  ContestController.approveContest
);

// Reject a contest (admin only)
router.patch(
  "/:contestId/reject",
  authenticate,
  // TODO: Add admin role validation middleware
  resolveContestValidation,
  handleValidationErrors,
  ContestController.rejectContest
);

// Withdraw a contest (driver only)
router.patch(
  "/:contestId/withdraw",
  authenticate,
  contestIdValidation,
  handleValidationErrors,
  ContestController.withdrawContest
);

// Get contest statistics (admin only)
router.get(
  "/statistics",
  authenticate,
  // TODO: Add admin role validation middleware
  dateRangeValidation,
  handleValidationErrors,
  ContestController.getContestStatistics
);

export default router;
