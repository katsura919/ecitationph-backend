import { Router } from 'express';
import {
    getCitationLogs,
    getCitationLogsByNumber,
    addCitationNote,
    getUserLogs,
    getFilteredLogs,
    getActivitySummary,
} from './citations.logs.controller';

const router = Router();

/**
 * @route   GET /api/v1/citations/logs
 * @desc    Get logs with filters (pagination supported)
 * @access  Private
 * @query   citationId, actionType, performedBy, startDate, endDate, page, limit
 */
router.get('/', getFilteredLogs);

/**
 * @route   GET /api/v1/citations/logs/activity-summary
 * @desc    Get activity summary/statistics
 * @access  Private (Admin only)
 * @query   startDate, endDate, userId
 */
router.get('/activity-summary', getActivitySummary);

/**
 * @route   GET /api/v1/citations/logs/citation/:citationId
 * @desc    Get all logs for a specific citation by ID
 * @access  Private
 */
router.get('/citation/:citationId', getCitationLogs);

/**
 * @route   GET /api/v1/citations/logs/citation-no/:citationNo
 * @desc    Get all logs for a specific citation by citation number
 * @access  Private
 */
router.get('/citation-no/:citationNo', getCitationLogsByNumber);

/**
 * @route   POST /api/v1/citations/logs/citation/:citationId/note
 * @desc    Add a note to a citation (creates a log entry)
 * @access  Private
 * @body    { note: string }
 */
router.post('/citation/:citationId/note', addCitationNote);

/**
 * @route   GET /api/v1/citations/logs/user/:userId
 * @desc    Get all logs by a specific user
 * @access  Private (Admin only)
 */
router.get('/user/:userId', getUserLogs);

export default router;
