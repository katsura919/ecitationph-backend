import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createCitation,
  getAllCitations,
  getCitationById,
  getCitationByNumber,
  searchCitations,
  getCitationsByDriver,
  getCitationsByEnforcer,
  getOverdueCitations,
  addPayment,
  contestCitation,
  resolveContest,
  voidCitation,
  getStatistics,
  updateCitation
} from './citations.controller';

const router = Router();

/**
 * Validation Schemas
 */

// Create citation validation
const createCitationValidation = [
  body('driverInfo.firstName')
    .trim()
    .notEmpty()
    .withMessage('Driver first name is required'),
  body('driverInfo.lastName')
    .trim()
    .notEmpty()
    .withMessage('Driver last name is required'),
  body('vehicleInfo.plateNo')
    .trim()
    .notEmpty()
    .withMessage('Plate number is required')
    .toUpperCase(),
  body('vehicleInfo.vehicleType')
    .isIn(['PRIVATE', 'FOR_HIRE'])
    .withMessage('Vehicle type must be PRIVATE or FOR_HIRE'),
  body('violationIds')
    .isArray({ min: 1 })
    .withMessage('At least one violation must be specified'),
  body('violationIds.*')
    .isMongoId()
    .withMessage('Invalid violation ID'),
  body('location.barangay')
    .trim()
    .notEmpty()
    .withMessage('Barangay is required'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.province')
    .trim()
    .notEmpty()
    .withMessage('Province is required'),
  body('violationDateTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid violation date time'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date')
];

// Add payment validation
const addPaymentValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than zero'),
  body('paymentMethod')
    .isIn(['CASH', 'ONLINE', 'BANK_TRANSFER', 'GCASH', 'PAYMAYA'])
    .withMessage('Invalid payment method'),
  body('referenceNo')
    .optional()
    .trim(),
  body('receiptNo')
    .optional()
    .trim(),
  body('remarks')
    .optional()
    .trim()
];

// Contest citation validation
const contestCitationValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Contest reason is required')
    .isLength({ min: 10 })
    .withMessage('Contest reason must be at least 10 characters')
];

// Resolve contest validation
const resolveContestValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID'),
  body('resolution')
    .trim()
    .notEmpty()
    .withMessage('Resolution is required'),
  body('approve')
    .isBoolean()
    .withMessage('Approve must be a boolean')
];

// Void citation validation
const voidCitationValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Void reason is required')
    .isLength({ min: 10 })
    .withMessage('Void reason must be at least 10 characters')
];

// Get by ID validation
const getByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID')
];

// Update citation validation
const updateCitationValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid citation ID'),
  body('notes')
    .optional()
    .trim(),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date')
];

/**
 * PUBLIC/AUTHENTICATED ROUTES
 */

// Get citation by citation number (public - for drivers to check their tickets)
router.get(
  '/number/:citationNo',
  getCitationByNumber
);

// Get citation by ID
router.get(
  '/:id',
  validate(getByIdValidation),
  getCitationById
);

/**
 * PROTECTED ROUTES - Require Authentication
 */

// Create citation (Enforcer only - should add role check)
router.post(
  '/',
  authenticate,
  validate(createCitationValidation),
  createCitation
);

// Get all citations with filters (Admin/Enforcer)
router.get(
  '/',
  authenticate,
  getAllCitations
);

// Search citations (Admin/Enforcer)
router.post(
  '/search',
  authenticate,
  searchCitations
);

// Get citations by driver
router.get(
  '/driver/:driverId',
  authenticate,
  getCitationsByDriver
);

// Get citations by enforcer
router.get(
  '/enforcer/:enforcerId',
  authenticate,
  getCitationsByEnforcer
);

// Get overdue citations (Admin)
router.get(
  '/status/overdue',
  authenticate,
  getOverdueCitations
);

// Get statistics (Admin)
router.get(
  '/reports/statistics',
  authenticate,
  getStatistics
);

// Add payment (Admin/Cashier)
router.post(
  '/:id/payment',
  authenticate,
  validate(addPaymentValidation),
  addPayment
);

// Contest citation (Driver)
router.put(
  '/:id/contest',
  authenticate,
  validate(contestCitationValidation),
  contestCitation
);

// Resolve contest (Admin)
router.put(
  '/:id/resolve-contest',
  authenticate,
  validate(resolveContestValidation),
  resolveContest
);

// Update citation (Admin)
router.put(
  '/:id',
  authenticate,
  validate(updateCitationValidation),
  updateCitation
);

// Void citation (Admin)
router.delete(
  '/:id',
  authenticate,
  validate(voidCitationValidation),
  voidCitation
);

export default router;
