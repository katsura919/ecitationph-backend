import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../../../../middleware/validator";
import { strictLimiter } from "../../../../middleware/rateLimiter";
import { authenticate } from "../../../../middleware/auth.middleware";
import * as authController from "./driver.auth.controller";

const router = Router();

// @route   POST /api/auth/driver/register
// @desc    Register new driver
// @access  Private (Admin only)
router.post(
  "/register",
  //strictLimiter,
  //authenticate,
  //authorize(UserType.ADMIN),
  validate([
    body("licenseNo")
      .trim()
      .notEmpty()
      .withMessage("License number is required")
      .isLength({ min: 5, max: 20 })
      .withMessage("License number must be between 5 and 20 characters"),
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("middleName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Middle name must not exceed 50 characters"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("contactNo")
      .trim()
      .notEmpty()
      .withMessage("Contact number is required")
      .matches(/^[0-9]{11}$/)
      .withMessage("Contact number must be 11 digits"),
    body("address.street").trim().notEmpty().withMessage("Street is required"),
    body("address.barangay")
      .trim()
      .notEmpty()
      .withMessage("Barangay is required"),
    body("address.city").trim().notEmpty().withMessage("City is required"),
    body("address.province")
      .trim()
      .notEmpty()
      .withMessage("Province is required"),
    body("address.postalCode")
      .trim()
      .notEmpty()
      .withMessage("Postal code is required")
      .matches(/^[0-9]{4}$/)
      .withMessage("Postal code must be 4 digits"),
    body("birthDate")
      .notEmpty()
      .withMessage("Birth date is required")
      .isISO8601()
      .withMessage("Please provide a valid date"),
    body("nationality")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Nationality must not exceed 50 characters"),
    body("sex")
      .notEmpty()
      .withMessage("Sex is required")
      .isIn(["MALE", "FEMALE", "male", "female"])
      .withMessage("Sex must be either MALE or FEMALE"),
    body("expirationDate")
      .notEmpty()
      .withMessage("License expiration date is required")
      .isISO8601()
      .withMessage("Please provide a valid expiration date"),
    body("weight")
      .optional()
      .isNumeric()
      .withMessage("Weight must be a number"),
    body("height")
      .optional()
      .isNumeric()
      .withMessage("Height must be a number"),
    body("bloodType")
      .optional()
      .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
      .withMessage("Invalid blood type"),
    body("agencyCode")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Agency code must not exceed 20 characters"),
    body("eyesColor")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Eye color must not exceed 20 characters"),
  ]),
  authController.register
);

// @route   POST /api/auth/driver/login
// @desc    Login driver
// @access  Public
router.post(
  "/login",
  strictLimiter,
  validate([
    body("licenseNo")
      .trim()
      .notEmpty()
      .withMessage("License number or email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  authController.login
);

// @route   GET /api/auth/driver/me
// @desc    Get current logged in driver
// @access  Private (Driver only)
router.get(
  "/me",
  //authenticate,
  authController.getMe
);

export default router;
