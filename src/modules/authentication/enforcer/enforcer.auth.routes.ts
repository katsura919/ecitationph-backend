import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { strictLimiter } from '../../../middleware/rateLimiter';
import { authenticate } from '../../../middleware/auth.middleware';
import * as authController from './enforcer.auth.controller';

const router = Router();

// @route   POST /api/auth/enforcer/register
// @desc    Register new enforcer/admin
// @access  Public
router.post(
  '/register',
  strictLimiter,
  validate([
    body('userType')
      .optional()
      .isIn(['admin', 'enforcer'])
      .withMessage('User type must be admin or enforcer'),
    body('badgeNo')
      .trim()
      .notEmpty()
      .withMessage('Badge number is required'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
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
    body('role')
      .optional()
      .isIn(['Admin', 'Officer', 'Treasurer'])
      .withMessage('Invalid role'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ]),
  authController.register
);

// @route   POST /api/auth/enforcer/login
// @desc    Login enforcer/admin
// @access  Public
router.post(
  '/login',
  strictLimiter,
  validate([
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ]),
  authController.login
);

// @route   GET /api/auth/enforcer/me
// @desc    Get current logged in enforcer/admin
// @access  Private
router.get('/me', authenticate, authController.getMe);

export default router;
