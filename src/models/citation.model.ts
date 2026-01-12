import mongoose, { Document, Schema, Model } from 'mongoose';
import { CitationStatus } from '../types/citation.model.types';
import {
    ICitationModel,
    ICitation,
} from '../types/citation.model.types';

const CitationSchema = new Schema<ICitation, ICitationModel>(
    {
        citationNo: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        // Driver/Violator Information
        driverId: {
            type: Schema.Types.ObjectId,
            ref: 'Driver',
            required: true,
        },

        // Vehicle Information
        vehicleId: {
            type: Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: true,
        },

        // Violations
        violations: {
            type: [
                {
                    violationId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Violation',
                        required: true,
                    },
                    code: { type: String, required: true },
                    title: { type: String, required: true },
                    description: { type: String, required: true },
                    fineAmount: { type: Number, required: true },
                    offenseCount: { type: Number, default: 1 },
                },
            ],
            required: true,
            validate: [
                {
                    validator: function (v: any[]) {
                        return v && v.length > 0;
                    },
                    message: 'At least one violation is required',
                },
            ],
        },

        // Financial Information
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        amountPaid: {
            type: Number,
            default: 0,
            min: 0,
        },
        amountDue: {
            type: Number,
            required: true,
            min: 0,
        },

        // Enforcer Information
        issuedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Enforcer',
            required: true,
        },

        // Location and Time
        location: {
            street: String,
            barangay: { type: String, required: true },
            city: { type: String, required: true },
            province: { type: String, required: true },
            coordinates: {
                latitude: Number,
                longitude: Number,
            },
        },
        violationDateTime: {
            type: Date,
            required: true,
        },
        issuedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },

        // Status and Payment
        status: {
            type: String,
            enum: Object.values(CitationStatus),
            default: CitationStatus.PENDING,
        },
        dueDate: {
            type: Date,
            required: true,
        },

        // Evidence/Documentation
        images: [String],
        notes: String,

        // Contest/Appeal Information
        contestedAt: Date,
        contestReason: String,
        contestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Driver',
        },
        contestResolution: String,
        contestResolvedAt: Date,
        contestResolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        // System Information
        isVoid: {
            type: Boolean,
            default: false,
        },
        voidReason: String,
        voidedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        voidedAt: Date,
    },
    {
        timestamps: true,
        collection: 'citations',
    }
);

// Indexes for efficient querying
CitationSchema.index({ driverId: 1 });
CitationSchema.index({ vehicleId: 1 });
CitationSchema.index({ issuedBy: 1 });
CitationSchema.index({ status: 1 });
CitationSchema.index({ dueDate: 1 });
CitationSchema.index({ violationDateTime: 1 });
CitationSchema.index({ createdAt: -1 });

// Compound indexes
CitationSchema.index({ status: 1, dueDate: 1 });
CitationSchema.index({ driverId: 1, status: 1 });

// Indexes for progressive fine calculation (violation history lookup)
CitationSchema.index({ driverId: 1, 'violations.violationId': 1 });
CitationSchema.index({ driverId: 1, violationDateTime: -1 });
CitationSchema.index({ status: 1, isVoid: 1 });

/**
 * Pre-save hook: Calculate amounts before saving
 */
CitationSchema.pre('save', function (next) {
    // Calculate total amount from violations
    if (this.violations && this.violations.length > 0) {
        this.totalAmount = this.violations.reduce(
            (sum, violation) => sum + violation.fineAmount,
            0
        );
    }

    // Calculate amount due
    this.amountDue = this.totalAmount - this.amountPaid;

    // Update status based on payment
    if (
        this.amountPaid >= this.totalAmount &&
        this.status === CitationStatus.PENDING
    ) {
        this.status = CitationStatus.PAID;
    } else if (this.amountPaid > 0 && this.amountPaid < this.totalAmount) {
        this.status = CitationStatus.PARTIALLY_PAID;
    }

    // Check if overdue
    if (this.dueDate < new Date() && this.status === CitationStatus.PENDING) {
        this.status = CitationStatus.OVERDUE;
    }

    next();
});

/**
 * Static Methods - Delegated to helpers for better organization
 * See: src/modules/citations/citations.helpers.ts
 */
import * as CitationHelpers from '../modules/v1/citations/citations.helpers';

CitationSchema.statics.generateCitationNo = async function (): Promise<string> {
    return CitationHelpers.generateCitationNo(this);
};

CitationSchema.statics.getByDriver = function (
    driverId: mongoose.Types.ObjectId
) {
    return CitationHelpers.getByDriver(this, driverId);
};

CitationSchema.statics.getByEnforcer = function (
    enforcerId: mongoose.Types.ObjectId
) {
    return CitationHelpers.getByEnforcer(this, enforcerId);
};

CitationSchema.statics.getOverdueCitations = function () {
    return CitationHelpers.getOverdueCitations(this);
};

CitationSchema.statics.getStatistics = function (
    startDate?: Date,
    endDate?: Date
) {
    return CitationHelpers.getStatistics(this, startDate, endDate);
};

/**
 * Instance Methods - Delegated to helpers for better organization
 * See: src/modules/citations/citations.helpers.ts
 */
CitationSchema.methods.calculateTotalAmount = function (): number {
    return CitationHelpers.calculateTotalAmount(this as ICitation);
};

CitationSchema.methods.markAsPaid = async function () {
    return CitationHelpers.markAsPaid(this as ICitation);
};

CitationSchema.methods.contestCitation = async function (
    reason: string,
    contestedBy: mongoose.Types.ObjectId
) {
    return CitationHelpers.contestCitation(
        this as ICitation,
        reason,
        contestedBy
    );
};

CitationSchema.methods.voidCitation = async function (
    reason: string,
    voidedBy: mongoose.Types.ObjectId
) {
    return CitationHelpers.voidCitation(this as ICitation, reason, voidedBy);
};

CitationSchema.methods.checkOverdue = function (): boolean {
    return CitationHelpers.checkOverdue(this as ICitation);
};

const Citation = mongoose.model<ICitation, ICitationModel>(
    'Citation',
    CitationSchema
);

export default Citation;
