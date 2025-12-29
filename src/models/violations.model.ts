import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Penalty structure for each offense level
 */
interface IPenalty {
    offense: string; // "First Offense", "Second Offense", etc.
    amount: number; // Fine amount (0 for community service)
}

/**
 * Violation Document Interface
 *
 * Violations are grouped under Ordinances. Once an ordinance is approved and active,
 * violations under it cannot be edited. To make changes, a new version of the
 * ordinance must be created with updated violations.
 * - Violations can be soft deleted (isActive flag)
 * - Citation tickets reference specific violation IDs
 */
export interface IViolation extends Document {
    // Identification
    code: string; // e.g., "R.A 10054", "1i", "1j1"

    // Parent Ordinance (required)
    ordinanceId: mongoose.Types.ObjectId; // Reference to parent Ordinance

    // Violation Details
    title: string;
    description: string;
    legalReference?: string; // e.g., "R.A 10054 Sec. 7c", "DOTC JAO 2014-01"

    // Penalties (array of offenses with amounts)
    penalties: IPenalty[];

    // Additional Information
    accessoryPenalty?: string; // Additional penalties or requirements
    remarks?: string;

    // Status
    isActive: boolean; // false = soft deleted

    // Metadata
    createdBy?: mongoose.Types.ObjectId; // Admin who created this violation
    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    softDelete(): Promise<IViolation>;
}

/**
 * Violation Model Interface with Static Methods
 */
export interface IViolationModel extends Model<IViolation> {
    getByCode(code: string): Promise<IViolation | null>;
    getAllActive(): Promise<IViolation[]>;
    getByOrdinance(ordinanceId: mongoose.Types.ObjectId): Promise<IViolation[]>;
}

const ViolationSchema = new Schema<IViolation, IViolationModel>(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        ordinanceId: {
            type: Schema.Types.ObjectId,
            ref: 'Ordinance',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        legalReference: {
            type: String,
            trim: true,
        },
        penalties: [
            {
                offense: {
                    type: String,
                    required: true,
                    trim: true,
                },
                amount: {
                    type: Number,
                    required: true,
                    min: 0,
                },
            },
        ],
        accessoryPenalty: {
            type: String,
            trim: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        collection: 'violations',
    }
);

/**
 * Validation: Ensure penalties array is not empty
 */
ViolationSchema.pre('save', function (next) {
    if (!this.penalties || this.penalties.length === 0) {
        next(new Error('At least one penalty must be provided'));
    } else {
        next();
    }
});

/**
 * Static method: Get violation by code
 */
ViolationSchema.statics.getByCode = function (code: string) {
    return this.findOne({
        code,
        isActive: true,
    }).populate('ordinanceId');
};

/**
 * Static method: Get all active violations
 */
ViolationSchema.statics.getAllActive = function () {
    return this.find({ isActive: true })
        .populate('ordinanceId')
        .sort({ code: 1 });
};

/**
 * Static method: Get all violations by ordinance
 */
ViolationSchema.statics.getByOrdinance = function (
    ordinanceId: mongoose.Types.ObjectId
) {
    return this.find({
        ordinanceId,
        isActive: true,
    }).sort({ code: 1 });
};

/**
 * Instance method: Soft delete (deactivate) this violation
 */
ViolationSchema.methods.softDelete = async function () {
    this.isActive = false;
    await this.save();
    return this;
};

const Violation = mongoose.model<IViolation, IViolationModel>(
    'Violation',
    ViolationSchema
);

export default Violation;
