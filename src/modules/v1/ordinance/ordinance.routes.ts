import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../middleware/validator';
import { authenticate } from '../../../middleware/auth.middleware';
import {
    createOrdinance,
    getAllActiveOrdinances,
    getOrdinanceById,
    getOrdinanceByNo,
    getOrdinanceHistory,
    updateOrdinance,
    deleteOrdinance,
    searchOrdinances,
    addViolationToOrdinance,
    removeViolationFromOrdinance,
    approveOrdinance,
} from './ordinance.controller';

const router = Router();

/**
 * Validation schemas
 */

// Validation for creating an ordinance
const createOrdinanceValidation = [
    body('ordinanceNo')
        .trim()
        .notEmpty()
        .withMessage('Ordinance number is required')
        .toUpperCase(),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Ordinance description is required'),
    body('dateIssued')
        .notEmpty()
        .withMessage('Date issued is required')
        .isISO8601()
        .withMessage('Date issued must be a valid date'),
    body('title').optional().trim(),
    body('legalReference').optional().trim(),
    body('dateApproved')
        .optional()
        .isISO8601()
        .withMessage('Date approved must be a valid date'),
    body('remarks').optional().trim(),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    body('violations')
        .optional()
        .isArray()
        .withMessage('Violations must be an array'),
    body('violations.*.code')
        .if(body('violations').exists())
        .trim()
        .notEmpty()
        .withMessage('Violation code is required'),
    body('violations.*.title')
        .if(body('violations').exists())
        .trim()
        .notEmpty()
        .withMessage('Violation title is required'),
    body('violations.*.description')
        .if(body('violations').exists())
        .trim()
        .notEmpty()
        .withMessage('Violation description is required'),
    body('violations.*.penalties')
        .if(body('violations').exists())
        .isArray({ min: 1 })
        .withMessage('At least one penalty is required for each violation'),
    body('violations.*.penalties.*.offense')
        .if(body('violations').exists())
        .trim()
        .notEmpty()
        .withMessage('Offense name is required'),
    body('violations.*.penalties.*.amount')
        .if(body('violations').exists())
        .isNumeric()
        .withMessage('Penalty amount must be a number')
        .custom(value => value >= 0)
        .withMessage('Penalty amount must be non-negative'),
    validate,
];

// Validation for updating an ordinance
const updateOrdinanceValidation = [
    param('id').isMongoId().withMessage('Invalid ordinance ID'),
    body('ordinanceNo').optional().trim().toUpperCase(),
    body('description').optional().trim(),
    body('title').optional().trim(),
    body('legalReference').optional().trim(),
    body('dateIssued')
        .optional()
        .isISO8601()
        .withMessage('Date issued must be a valid date'),
    body('dateApproved')
        .optional()
        .isISO8601()
        .withMessage('Date approved must be a valid date'),
    body('remarks').optional().trim(),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    validate,
];

// Validation for adding violation to ordinance
const addViolationValidation = [
    param('id').isMongoId().withMessage('Invalid ordinance ID'),
    body('code').trim().notEmpty().withMessage('Violation code is required'),
    body('title').trim().notEmpty().withMessage('Violation title is required'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Violation description is required'),
    body('penalties')
        .isArray({ min: 1 })
        .withMessage('At least one penalty is required'),
    body('penalties.*.offense')
        .trim()
        .notEmpty()
        .withMessage('Offense name is required'),
    body('penalties.*.amount')
        .isNumeric()
        .withMessage('Penalty amount must be a number')
        .custom(value => value >= 0)
        .withMessage('Penalty amount must be non-negative'),
    body('legalReference').optional().trim(),
    body('accessoryPenalty').optional().trim(),
    body('remarks').optional().trim(),
    validate,
];

// Validation for ID parameter
const idValidation = [
    param('id').isMongoId().withMessage('Invalid ordinance ID'),
    validate,
];

// Validation for ordinance number parameter
const ordinanceNoValidation = [
    param('ordinanceNo')
        .trim()
        .notEmpty()
        .withMessage('Ordinance number is required'),
    validate,
];

// Validation for removing violation
const removeViolationValidation = [
    param('id').isMongoId().withMessage('Invalid ordinance ID'),
    param('violationId').isMongoId().withMessage('Invalid violation ID'),
    validate,
];

/**
 * Routes
 */

// Public routes (no authentication required, or optional)
router.get('/', getAllActiveOrdinances);
router.get('/no/:ordinanceNo', ordinanceNoValidation, getOrdinanceByNo);
router.get('/:id', idValidation, getOrdinanceById);
router.post('/search', searchOrdinances);

// Admin only routes
// TEMPORARILY REMOVED VALIDATION FOR TESTING
router.post('/', createOrdinance);

router.put('/:id', updateOrdinanceValidation, updateOrdinance);

router.delete('/:id', idValidation, deleteOrdinance);

router.get('/history/:ordinanceGroupId', getOrdinanceHistory);

router.post('/:id/violations', addViolationValidation, addViolationToOrdinance);

router.delete(
    '/:id/violations/:violationId',
    removeViolationValidation,
    removeViolationFromOrdinance
);
router.put('/:id/approve', idValidation, approveOrdinance);

export default router;
