import mongoose, { Document, Model } from 'mongoose';    
import { CitationStatus } from './citation.model.types';

/**
 * Log Action Types
 */
export enum LogActionType {
    STATUS_CHANGE = 'STATUS_CHANGE',
    NOTE_ADDED = 'NOTE_ADDED',
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    CONTESTED = 'CONTESTED',
    CONTEST_RESOLVED = 'CONTEST_RESOLVED',
    VOIDED = 'VOIDED',
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    IMAGE_ADDED = 'IMAGE_ADDED',
    IMAGE_REMOVED = 'IMAGE_REMOVED',
}

/**
 * User Role Enum (who performed the action)
 */
export enum UserRole {
    ENFORCER = 'ENFORCER',
    ADMIN = 'ADMIN',
    DRIVER = 'DRIVER',
    SYSTEM = 'SYSTEM',
} 

/**
 * Citation Log Document Interface
 */
export interface ICitationLog extends Document {
    // Citation Reference
    citationId: mongoose.Types.ObjectId;
    citationNo: string; // Denormalized for faster queries

    // Action Details
    actionType: LogActionType;
    description: string; // Human-readable description of the action

    // Status Change Details (if applicable)
    previousStatus?: CitationStatus;
    newStatus?: CitationStatus;

    // User Information
    performedBy: mongoose.Types.ObjectId; // User/Enforcer/Admin ID
    performedByRole: UserRole;
    performedByName?: string; // Denormalized for display

    // Additional Data
    reason?: string; // Reason for void, contest, etc.
    notes?: string; // Additional notes
    amount?: number; // Payment amount if applicable
    metadata?: Record<string, any>; // Flexible field for additional data

    // IP and System Info
    ipAddress?: string;
    userAgent?: string;

    // Timestamps
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Citation Log Model Interface with Static Methods
 */
export interface ICitationLogModel extends Model<ICitationLog> {
    logStatusChange(
        citationId: mongoose.Types.ObjectId,
        citationNo: string,
        previousStatus: CitationStatus,
        newStatus: CitationStatus,
        performedBy: mongoose.Types.ObjectId,
        performedByRole: UserRole,
        reason?: string,
        metadata?: Record<string, any>
    ): Promise<ICitationLog>;

    logNote(
        citationId: mongoose.Types.ObjectId,
        citationNo: string,
        note: string,
        performedBy: mongoose.Types.ObjectId,
        performedByRole: UserRole
    ): Promise<ICitationLog>;

    logPayment(
        citationId: mongoose.Types.ObjectId,
        citationNo: string,
        amount: number,
        performedBy: mongoose.Types.ObjectId,
        performedByRole: UserRole,
        metadata?: Record<string, any>
    ): Promise<ICitationLog>;

    getLogsByCitation(
        citationId: mongoose.Types.ObjectId
    ): Promise<ICitationLog[]>;

    getLogsByUser(userId: mongoose.Types.ObjectId): Promise<ICitationLog[]>;
}
