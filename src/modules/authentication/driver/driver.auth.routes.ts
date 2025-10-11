import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { strictLimiter } from '../../../middleware/rateLimiter';
import * as authController from './driver.auth.controller';
import { protect } from './driver.auth.middleware';

const router = Router();

// @route   POST /api/driver-auth/register
// @desc    Register new driver
// @access  Public
router.post(
  '/register',
  strictLimiter,
  validate([
    body('licenseNo')
      .trim()
      .notEmpty()
      .withMessage('License number is required'),
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
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters'),
    body('bday')
      .notEmpty()
      .withMessage('Birthday is required')
      .isISO8601()
      .withMessage('Please provide a valid date (YYYY-MM-DD)'),
    body('nationality')
      .trim()
      .notEmpty()
      .withMessage('Nationality is required')
      .isLength({ max: 50 })
      .withMessage('Nationality must not exceed 50 characters'),
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
  ]),
  authController.register
);

// @route   POST /api/driver-auth/login
// @desc    Login driver
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
  authController.login
);

// @route   GET /api/driver-auth/me
// @desc    Get current logged in driver
// @access  Private
router.get('/me', protect, authController.getMe);

export default router;
