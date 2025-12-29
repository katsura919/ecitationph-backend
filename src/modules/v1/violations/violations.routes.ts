import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { authenticate } from '../../../middleware/auth.middleware';
import {
    createViolation,
    getAllActiveViolations,
    getViolationByCode,
    getViolationById,
    deleteViolation,
    searchViolations,
    bulkCreateViolations,
} from './violations.controller';

const router = Router();

/**
 * Validation schemas
 */

// Validation for creating a violation
const createViolationValidation = [
    body('code').trim().notEmpty().withMessage('Violation code is required'),
    body('title').trim().notEmpty().withMessage('Violation title is required'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Violation description is required'),
    body('fineStructure')
        .isIn(['FIXED', 'PROGRESSIVE'])
        .withMessage('Fine structure must be either FIXED or PROGRESSIVE'),
    body('legalReference').optional().trim(),
    body('accessoryPenalty').optional().trim(),
    body('remarks').optional().trim(),
    body('effectiveFrom')
        .optional()
        .isISO8601()
        .withMessage('Effective from must be a valid date'),
];

// Validation for updating a violation
const updateViolationValidation = [
    param('id').isMongoId().withMessage('Invalid violation ID'),
    body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Title cannot be empty'),
    body('description')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Description cannot be empty'),
    body('fineStructure')
        .optional()
        .isIn(['FIXED', 'PROGRESSIVE'])
        .withMessage('Fine structure must be either FIXED or PROGRESSIVE'),
];

// Validation for getting violation by ID
const getByIdValidation = [
    param('id').isMongoId().withMessage('Invalid violation ID'),
];

// Validation for getting violation by code
const getByCodeValidation = [
    param('code').trim().notEmpty().withMessage('Violation code is required'),
];

// Validation for calculating fine
const calculateFineValidation = [
    query('code').trim().notEmpty().withMessage('Violation code is required'),
    query('vehicleType')
        .isIn(['PRIVATE', 'FOR_HIRE'])
        .withMessage('Vehicle type must be either PRIVATE or FOR_HIRE'),
    query('offenderType')
        .isIn(['driver', 'mvOwner', 'operator'])
        .withMessage('Offender type must be driver, mvOwner, or operator'),
    query('offenseCount')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Offense count must be a positive integer'),
];

/**
 * Public/Authenticated Routes (read-only)
 */

// Get all active violations
router.get('/', getAllActiveViolations);

// Get violation by code
router.get('/code/:code', validate(getByCodeValidation), getViolationByCode);

// Search violations (POST for complex query body)
router.post('/search', searchViolations);

// Get violation by ID
router.get('/:id', validate(getByIdValidation), getViolationById);

// Create a new violation (Admin only)
router.post(
    '/create',
    //authenticate, // Add admin role check here
    validate(createViolationValidation),
    createViolation
);

// Bulk create violations (Admin only - for seeding)
router.post(
    '/bulk',
    authenticate, // Add admin role check here
    bulkCreateViolations
);

// Soft delete violation (Admin only)
router.delete(
    '/:id',
    //authenticate, // Add admin role check here
    validate(getByIdValidation),
    deleteViolation
);

export default router;
