import { Router } from "express";
import { body, param, query } from "express-validator";
import { validate } from "../../../middleware/validator";
import { authenticate } from "../../../middleware/auth.middleware";
import {
  getAllCitations,
  getCitationById,
  getCitationByNumber,
  voidCitation,
  getStatistics,
  updateCitation,
  updateCitationStatus,
} from "./citations.management.controller";
import { createCitation } from "./citation.create.ticket.controller";

const router = Router();

/**
 * Validation Schemas
 */

// Create citation validation
const createCitationValidation = [
  body("driverId")
    .notEmpty()
    .withMessage("Driver ID is required")
    .isMongoId()
    .withMessage("Invalid driver ID"),
  body("vehicleId")
    .notEmpty()
    .withMessage("Vehicle ID is required")
    .isMongoId()
    .withMessage("Invalid vehicle ID"),
  body("violationIds")
    .isArray({ min: 1 })
    .withMessage("At least one violation must be specified"),
  body("violationIds.*").isMongoId().withMessage("Invalid violation ID"),
  body("location.barangay")
    .trim()
    .notEmpty()
    .withMessage("Barangay is required"),
  body("location.city").trim().notEmpty().withMessage("City is required"),
  body("location.province")
    .trim()
    .notEmpty()
    .withMessage("Province is required"),
  body("location.coordinates.latitude")
    .optional()
    .isFloat()
    .withMessage("Invalid latitude"),
  body("location.coordinates.longitude")
    .optional()
    .isFloat()
    .withMessage("Invalid longitude"),
  body("violationDateTime")
    .optional()
    .isISO8601()
    .withMessage("Invalid violation date time"),
  body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
];

// Void citation validation
const voidCitationValidation = [
  param("id").isMongoId().withMessage("Invalid citation ID"),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Void reason is required")
    .isLength({ min: 10 })
    .withMessage("Void reason must be at least 10 characters"),
];

// Get by ID validation
const getByIdValidation = [
  param("id").isMongoId().withMessage("Invalid citation ID"),
];

// Update citation validation
const updateCitationValidation = [
  param("id").isMongoId().withMessage("Invalid citation ID"),
  body("notes").optional().trim(),
  body("images").optional().isArray().withMessage("Images must be an array"),
  body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
];

// Update citation status validation
const updateStatusValidation = [
  param("id").isMongoId().withMessage("Invalid citation ID"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "PENDING",
      "PAID",
      "PARTIALLY_PAID",
      "OVERDUE",
      "CONTESTED",
      "DISMISSED",
      "VOID",
    ])
    .withMessage("Invalid status value"),
  body("reason")
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage("Reason must be at least 10 characters when provided"),
];

// Update ownership validation
const updateOwnershipValidation = [
  param("id").isMongoId().withMessage("Invalid citation ID"),
  body("isDriverTheOwner")
    .optional()
    .isBoolean()
    .withMessage("isDriverTheOwner must be a boolean"),
  body("ownershipStatus")
    .optional()
    .isIn([
      "DRIVER_IS_OWNER",
      "DRIVER_NOT_OWNER",
      "OWNER_UNKNOWN",
      "UNVERIFIED",
    ])
    .withMessage("Invalid ownership status"),
];

// Get citation by citation number
router.get("/number/:citationNo", getCitationByNumber);

// Create citation 
router.post(
  "/",
  //authenticate,
  validate(createCitationValidation),
  createCitation
);

// Get citation by ID
router.get("/:id", validate(getByIdValidation), getCitationById);

// Get all citations with filters 
router.get(
  "/",
  //authenticate,
  getAllCitations
);

// Get statistics (Admin)
router.get(
  "/reports/statistics",
  //authenticate,
  getStatistics
);

// Update citation (Admin)
router.put(
  "/:id",
  //authenticate,
  validate(updateCitationValidation),
  updateCitation
);

// Update citation status (Admin)
router.patch(
  "/:id/status",
  //authenticate,
  validate(updateStatusValidation),
  updateCitationStatus
);

// Void citation (Admin) - Deprecated, use PATCH /:id/status instead
router.delete(
  "/:id",
  //authenticate,
  validate(voidCitationValidation),
  voidCitation
);

export default router;
