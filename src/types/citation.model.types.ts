import mongoose, { Document, Model } from 'mongoose';


/**
 * Citation Status Enum
 */
export enum CitationStatus {
    PENDING = 'PENDING', // Citation issued, awaiting payment
    PAID = 'PAID', // Fine paid in full
    PARTIALLY_PAID = 'PARTIALLY_PAID', // Partial payment made
    OVERDUE = 'OVERDUE', // Past due date
    CONTESTED = 'CONTESTED', // Driver is contesting the citation
    DISMISSED = 'DISMISSED', // Citation dismissed/cancelled
    VOID = 'VOID', // Citation voided by admin
}

/**
 * Violation Item Interface (each violation in the citation)
 */
export interface IViolationItem {
    violationId: mongoose.Types.ObjectId; // Reference to the violation document
    code: string; // Stored for historical reference
    title: string; // Stored for historical reference
    description: string; // Stored for historical reference
    fineAmount: number; // Calculated fine amount for this specific violation
    offenseCount?: number; // 1st, 2nd, 3rd offense (for progressive fines)
}

/**
 * Location Interface
 */
export interface ILocation {
    street?: string;
    barangay: string;
    city: string;
    province: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

/**
 * Citation Document Interface
 */
export interface ICitation extends Document {
    // Citation Identification
    citationNo: string; // Unique citation ticket number (e.g., "TCT-2025-000001")

    // Driver/Violator Information
    driverId: mongoose.Types.ObjectId; // Reference to Driver model (required)

    // Vehicle Information
    vehicleId: mongoose.Types.ObjectId; // Reference to Vehicle model (required)

    // Violations
    violations: IViolationItem[]; // Array of violations committed

    // Financial Information
    totalAmount: number; // Total fine amount
    amountPaid: number; // Amount paid so far
    amountDue: number; // Remaining balance

    // Enforcer Information
    issuedBy: mongoose.Types.ObjectId; // Reference to Enforcer model

    // Location and Time
    location: ILocation; // Where the violation occurred
    violationDateTime: Date; // When the violation occurred
    issuedAt: Date; // When the citation was issued

    // Status and Payment
    status: CitationStatus;
    dueDate: Date; // Payment due date

    // Evidence/Documentation
    images?: string[]; // URLs to violation photos
    notes?: string; // Additional notes by enforcer

    // Contest/Appeal Information
    contestedAt?: Date;
    contestReason?: string;
    contestedBy?: mongoose.Types.ObjectId; // Driver who contested
    contestResolution?: string;
    contestResolvedAt?: Date;
    contestResolvedBy?: mongoose.Types.ObjectId; // Admin who resolved

    // System Information
    isVoid: boolean; // If citation was voided
    voidReason?: string;
    voidedBy?: mongoose.Types.ObjectId; // Admin who voided
    voidedAt?: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;

    // Instance Methods
    calculateTotalAmount(): number;
    markAsPaid(): Promise<ICitation>;
    contestCitation(
        reason: string,
        contestedBy: mongoose.Types.ObjectId
    ): Promise<ICitation>;
    voidCitation(
        reason: string,
        voidedBy: mongoose.Types.ObjectId
    ): Promise<ICitation>;
    checkOverdue(): boolean;
}

/**
 * Citation Model Interface with Static Methods
 */
export interface ICitationModel extends Model<ICitation> {
    generateCitationNo(): Promise<string>;
    getByDriver(driverId: mongoose.Types.ObjectId): Promise<ICitation[]>;
    getByEnforcer(enforcerId: mongoose.Types.ObjectId): Promise<ICitation[]>;
    getOverdueCitations(): Promise<ICitation[]>;
    getStatistics(startDate?: Date, endDate?: Date): Promise<any>;
}
