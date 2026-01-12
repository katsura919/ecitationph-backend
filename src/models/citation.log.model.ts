import mongoose, { Document, Schema, Model } from 'mongoose';
import { CitationStatus } from '../types/citation.model.types';
import { ICitationLog, ICitationLogModel, LogActionType, UserRole } from '../types/citation.log.types';




const CitationLogSchema = new Schema<ICitationLog, ICitationLogModel>(
    {
        // Citation Reference
        citationId: {
            type: Schema.Types.ObjectId,
            ref: 'Citation',
            required: true,
            index: true,
        },
        citationNo: {
            type: String,
            required: true,
            index: true,
        },

        // Action Details
        actionType: {
            type: String,
            enum: Object.values(LogActionType),
            required: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },

        // Status Change Details
        previousStatus: {
            type: String,
            enum: Object.values(CitationStatus),
        },
        newStatus: {
            type: String,
            enum: Object.values(CitationStatus),
        },

        // User Information
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        performedByRole: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },
        performedByName: {
            type: String,
        },

        // Additional Data
        reason: String,
        notes: String,
        amount: Number,
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },

        // IP and System Info
        ipAddress: String,
        userAgent: String,

        // Timestamps
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'citation_logs',
    }
);

// Compound Indexes for efficient querying
CitationLogSchema.index({ citationId: 1, timestamp: -1 });
CitationLogSchema.index({ performedBy: 1, timestamp: -1 });
CitationLogSchema.index({ actionType: 1, timestamp: -1 });
CitationLogSchema.index({ citationNo: 1, timestamp: -1 });

/**
 * Static Method: Log Status Change
 */
CitationLogSchema.statics.logStatusChange = async function (
    citationId: mongoose.Types.ObjectId,
    citationNo: string,
    previousStatus: CitationStatus,
    newStatus: CitationStatus,
    performedBy: mongoose.Types.ObjectId,
    performedByRole: UserRole,
    reason?: string,
    metadata?: Record<string, any>
): Promise<ICitationLog> {
    const description = `Status changed from ${previousStatus} to ${newStatus}${
        reason ? `: ${reason}` : ''
    }`;

    return this.create({
        citationId,
        citationNo,
        actionType: LogActionType.STATUS_CHANGE,
        description,
        previousStatus,
        newStatus,
        performedBy,
        performedByRole,
        reason,
        metadata,
    });
};

/**
 * Static Method: Log Note
 */
CitationLogSchema.statics.logNote = async function (
    citationId: mongoose.Types.ObjectId,
    citationNo: string,
    note: string,
    performedBy: mongoose.Types.ObjectId,
    performedByRole: UserRole
): Promise<ICitationLog> {
    return this.create({
        citationId,
        citationNo,
        actionType: LogActionType.NOTE_ADDED,
        description: 'Note added to citation',
        notes: note,
        performedBy,
        performedByRole,
    });
};

/**
 * Static Method: Log Payment
 */
CitationLogSchema.statics.logPayment = async function (
    citationId: mongoose.Types.ObjectId,
    citationNo: string,
    amount: number,
    performedBy: mongoose.Types.ObjectId,
    performedByRole: UserRole,
    metadata?: Record<string, any>
): Promise<ICitationLog> {
    return this.create({
        citationId,
        citationNo,
        actionType: LogActionType.PAYMENT_RECORDED,
        description: `Payment of ₱${amount.toFixed(2)} recorded`,
        amount,
        performedBy,
        performedByRole,
        metadata,
    });
};

/**
 * Static Method: Get all logs for a citation
 */
CitationLogSchema.statics.getLogsByCitation = async function (
    citationId: mongoose.Types.ObjectId
): Promise<ICitationLog[]> {
    return this.find({ citationId })
        .sort({ timestamp: -1 })
        .populate('performedBy', 'name email badgeNo');
};

/**
 * Static Method: Get all logs by a user
 */
CitationLogSchema.statics.getLogsByUser = async function (
    userId: mongoose.Types.ObjectId
): Promise<ICitationLog[]> {
    return this.find({ performedBy: userId })
        .sort({ timestamp: -1 })
        .populate('citationId', 'citationNo status');
};

const CitationLog = mongoose.model<ICitationLog, ICitationLogModel>(
    'CitationLog',
    CitationLogSchema
);

export default CitationLog;
