import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { strictLimiter } from '../../../middleware/rateLimiter';
import { authenticate } from '../../../middleware/auth.middleware';
import * as authController from './admin.auth.controller';

const router = Router();

// @route   POST /api/auth/admin/register
// @desc    Register new admin/officer/treasurer
// @access  Private (Admin only)
router.post(
  '/register',
  //strictLimiter,
  //authenticate,
  //authorize(UserType.ADMIN),
  validate([
    body('userType')
      .notEmpty()
      .withMessage('User type is required')
      .isIn(['admin', 'treasurer'])
      .withMessage('User type must be admin or treasurer'),
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
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ]),
  authController.register
);

// @route   POST /api/auth/admin/login
// @desc    Login admin/officer/treasurer
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

// @route   GET /api/auth/admin/me
// @desc    Get current logged in admin/officer/treasurer
// @access  Private (Staff only)
router.get('/me', authenticate, authController.getMe);

export default router;
