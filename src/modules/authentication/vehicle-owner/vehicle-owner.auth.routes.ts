import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { strictLimiter } from '../../../middleware/rateLimiter';
import { authenticate, validateLoginUserType } from '../../../middleware/auth.middleware';
import { UserType } from '../../../models/user.model';
import * as authController from './vehicle-owner.auth.controller';

const router = Router();

// @route   POST /api/auth/vehicle-owner/register
// @desc    Register new vehicle owner
// @access  Public
router.post(
  '/register',
  strictLimiter,
  validate([
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('middleName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Middle name must not exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('contactNo')
      .trim()
      .notEmpty()
      .withMessage('Contact number is required')
      .matches(/^[0-9]{11}$/)
      .withMessage('Contact number must be 11 digits'),
    body('address.street')
      .trim()
      .notEmpty()
      .withMessage('Street is required')
      .isLength({ max: 100 })
      .withMessage('Street must not exceed 100 characters'),
    body('address.barangay')
      .trim()
      .notEmpty()
      .withMessage('Barangay is required')
      .isLength({ max: 100 })
      .withMessage('Barangay must not exceed 100 characters'),
    body('address.city')
      .trim()
      .notEmpty()
      .withMessage('City is required')
      .isLength({ max: 100 })
      .withMessage('City must not exceed 100 characters'),
    body('address.province')
      .trim()
      .notEmpty()
      .withMessage('Province is required')
      .isLength({ max: 100 })
      .withMessage('Province must not exceed 100 characters'),
    body('address.postalCode')
      .trim()
      .notEmpty()
      .withMessage('Postal code is required')
      .matches(/^[0-9]{4}$/)
      .withMessage('Postal code must be 4 digits'),
    body('bday')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date'),
    body('nationality')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Nationality must not exceed 50 characters'),
    body('licenseNo')
      .optional()
      .trim()
      .isLength({ min: 5, max: 20 })
      .withMessage('License number must be between 5 and 20 characters'),
  ]),
  authController.register
);

// @route   POST /api/auth/vehicle-owner/login
// @desc    Login vehicle owner
// @access  Public
router.post(
  '/login',
  strictLimiter,
  validate([
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ]),
  validateLoginUserType(UserType.VEHICLE_OWNER),
  authController.login
);

// @route   GET /api/auth/vehicle-owner/me
// @desc    Get current logged in vehicle owner
// @access  Private (Vehicle Owner only)
router.get('/me', authenticate, authController.getMe);

export default router;
