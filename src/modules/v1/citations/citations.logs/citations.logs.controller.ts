import { Request, Response } from 'express';
import CitationLog, {
    ICitationLog,
    LogActionType,
    UserRole,
} from '../../../../models/citation.log.model';
import Citation from '../../../../models/citation.model';
import mongoose from 'mongoose';

/**
 * Get all logs for a specific citation
 */
export const getCitationLogs = async (req: Request, res: Response) => {
    try {
        const { citationId } = req.params;

        const citation = await Citation.findById(citationId);
        if (!citation) {
            return res.status(404).json({
                success: false,
                error: 'Citation not found',
            });
        }

        const logs = await CitationLog.getLogsByCitation(
            new mongoose.Types.ObjectId(citationId)
        );

        return res.status(200).json({
            success: true,
            data: logs,
            count: logs.length,
        });
    } catch (error: any) {
        console.error('Error fetching citation logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch citation logs',
            details: error.message,
        });
    }
};

/**
 * Get logs by citation number
 */
export const getCitationLogsByNumber = async (req: Request, res: Response) => {
    try {
        const { citationNo } = req.params;

        const citation = await Citation.findOne({ citationNo });
        if (!citation) {
            return res.status(404).json({
                success: false,
                error: 'Citation not found',
            });
        }

        const logs = await CitationLog.getLogsByCitation(
            citation._id as mongoose.Types.ObjectId
        );

        return res.status(200).json({
            success: true,
            data: logs,
            count: logs.length,
        });
    } catch (error: any) {
        console.error('Error fetching citation logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch citation logs',
            details: error.message,
        });
    }
};

/**
 * Add a note to a citation (creates a log entry)
 */
export const addCitationNote = async (req: Request, res: Response) => {
    try {
        const { citationId } = req.params;
        const { note } = req.body;

        if (!mongoose.Types.ObjectId.isValid(citationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid citation ID',
            });
        }

        if (!note || note.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Note is required',
            });
        }

        const citation = await Citation.findById(citationId);
        if (!citation) {
            return res.status(404).json({
                success: false,
                error: 'Citation not found',
            });
        }

        // Determine user role based on req.user (adjust based on your auth implementation)
        const userRole = req.user?.role || UserRole.ADMIN;

        const log = await CitationLog.logNote(
            new mongoose.Types.ObjectId(citationId),
            citation.citationNo,
            note,
            req.user?.id,
            userRole
        );

        return res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: log,
        });
    } catch (error: any) {
        console.error('Error adding citation note:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to add note',
            details: error.message,
        });
    }
};

/**
 * Get all logs by a specific user
 */
export const getUserLogs = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID',
            });
        }

        const logs = await CitationLog.getLogsByUser(
            new mongoose.Types.ObjectId(userId)
        );

        return res.status(200).json({
            success: true,
            data: logs,
            count: logs.length,
        });
    } catch (error: any) {
        console.error('Error fetching user logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user logs',
            details: error.message,
        });
    }
};

/**
 * Get logs with filters
 */
export const getFilteredLogs = async (req: Request, res: Response) => {
    try {
        const {
            citationId,
            actionType,
            performedBy,
            startDate,
            endDate,
            page = 1,
            limit = 50,
        } = req.query;

        const query: any = {};

        if (citationId) {
            if (!mongoose.Types.ObjectId.isValid(citationId as string)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid citation ID',
                });
            }
            query.citationId = citationId;
        }

        if (actionType) {
            query.actionType = actionType;
        }

        if (performedBy) {
            if (!mongoose.Types.ObjectId.isValid(performedBy as string)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                });
            }
            query.performedBy = performedBy;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate as string);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate as string);
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            CitationLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('performedBy', 'name email badgeNo')
                .populate('citationId', 'citationNo status'),
            CitationLog.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('Error fetching filtered logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
            details: error.message,
        });
    }
};

/**
 * Get activity summary/statistics
 */
export const getActivitySummary = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, userId } = req.query;

        const matchStage: any = {};

        if (startDate || endDate) {
            matchStage.timestamp = {};
            if (startDate) {
                matchStage.timestamp.$gte = new Date(startDate as string);
            }
            if (endDate) {
                matchStage.timestamp.$lte = new Date(endDate as string);
            }
        }

        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId as string)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                });
            }
            matchStage.performedBy = new mongoose.Types.ObjectId(
                userId as string
            );
        }

        const summary = await CitationLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$actionType',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    actionType: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
        ]);

        // Get total count
        const totalLogs = await CitationLog.countDocuments(matchStage);

        // Get most active users
        const topUsers = await CitationLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$performedBy',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    userId: '$_id',
                    count: 1,
                    userName: '$user.name',
                    _id: 0,
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalLogs,
                actionSummary: summary,
                topUsers,
            },
        });
    } catch (error: any) {
        console.error('Error fetching activity summary:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch activity summary',
            details: error.message,
        });
    }
};
