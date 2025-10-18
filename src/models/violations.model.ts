import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Vehicle Type for fine calculation
 */
export enum VehicleType {
  PRIVATE = 'PRIVATE',
  FOR_HIRE = 'FOR_HIRE'
}

/**
 * Fine structure for different offender types
 */
interface IFine {
  private: {
    driver: number;
    mvOwner: number; // Motor Vehicle Owner
  };
  forHire: {
    driver: number;
    operator: number;
  };
}

/**
 * Offense penalty structure with progressive fines
 */
interface IOffensePenalty {
  firstOffense: number;
  secondOffense?: number;
  thirdOffense?: number;
  subsequentOffense?: number;
}

/**
 * Violation Document Interface
 * 
 * This model uses a versioning system to maintain data immutability:
 * - Violations are never actually deleted (soft delete with isActive flag)
 * - Updates create a new version instead of modifying existing records
 * - Citation tickets reference specific violation IDs, ensuring historical accuracy
 * - The version field tracks the evolution of a violation rule
 */
export interface IViolation extends Document {
  // Identification
  code: string; // e.g., "R.A 10054", "1i", "1j1"
  violationGroupId?: string; // Groups related versions of the same violation
  version: number; // Version number for this violation rule
  
  // Violation Details
  title: string;
  description: string;
  legalReference?: string; // e.g., "R.A 10054 Sec. 7c", "DOTC JAO 2014-01"
  
  // Fine Structure
  fineStructure: 'FIXED' | 'PROGRESSIVE'; // Fixed fine or progressive (1st, 2nd, 3rd offense)
  
  // For FIXED fines (single penalty regardless of offense count)
  fixedFine?: IFine;
  
  // For PROGRESSIVE fines (escalating penalties)
  progressiveFine?: {
    private: {
      driver: IOffensePenalty;
      mvOwner: IOffensePenalty;
    };
    forHire: {
      driver: IOffensePenalty;
      operator: IOffensePenalty;
    };
  };
  
  // Additional Information
  accessoryPenalty?: string; // Additional penalties or requirements
  remarks?: string;
  
  // Versioning and Status
  isActive: boolean; // false = soft deleted or superseded by newer version
  supersededBy?: mongoose.Types.ObjectId; // Reference to newer version if updated
  effectiveFrom: Date; // When this version becomes effective
  effectiveUntil?: Date; // When this version is no longer active
  
  // Metadata
  createdBy?: mongoose.Types.ObjectId; // Admin who created this version
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  createNewVersion(updates: Partial<IViolation>, createdBy?: mongoose.Types.ObjectId): Promise<IViolation>;
  softDelete(): Promise<IViolation>;
}

/**
 * Violation Model Interface with Static Methods
 */
export interface IViolationModel extends Model<IViolation> {
  getCurrentByCode(code: string): Promise<IViolation | null>;
  getAllActive(): Promise<IViolation[]>;
  getHistory(violationGroupId: string): Promise<IViolation[]>;
}

const ViolationSchema = new Schema<IViolation, IViolationModel>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    violationGroupId: {
      type: String,
      index: true,
      // Used to group all versions of the same violation rule
      // Generated once for the first version and reused for subsequent versions
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    legalReference: {
      type: String,
      trim: true
    },
    fineStructure: {
      type: String,
      enum: ['FIXED', 'PROGRESSIVE'],
      required: true
    },
    fixedFine: {
      type: {
        private: {
          driver: { type: Number, required: true },
          mvOwner: { type: Number, required: true }
        },
        forHire: {
          driver: { type: Number, required: true },
          operator: { type: Number, required: true }
        }
      },
      required: false
    },
    progressiveFine: {
      type: {
        private: {
          driver: {
            firstOffense: { type: Number, required: true },
            secondOffense: Number,
            thirdOffense: Number,
            subsequentOffense: Number
          },
          mvOwner: {
            firstOffense: { type: Number, required: true },
            secondOffense: Number,
            thirdOffense: Number,
            subsequentOffense: Number
          }
        },
        forHire: {
          driver: {
            firstOffense: { type: Number, required: true },
            secondOffense: Number,
            thirdOffense: Number,
            subsequentOffense: Number
          },
          operator: {
            firstOffense: { type: Number, required: true },
            secondOffense: Number,
            thirdOffense: Number,
            subsequentOffense: Number
          }
        }
      },
      required: false
    },
    accessoryPenalty: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    supersededBy: {
      type: Schema.Types.ObjectId,
      ref: 'Violation'
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    effectiveUntil: {
      type: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    collection: 'violations'
  }
);

// Indexes for efficient querying
ViolationSchema.index({ code: 1, version: 1 });
ViolationSchema.index({ violationGroupId: 1, version: -1 });
ViolationSchema.index({ isActive: 1, effectiveFrom: 1 });

// Compound index for finding current active violations
ViolationSchema.index({ 
  isActive: 1, 
  effectiveFrom: -1, 
  effectiveUntil: 1 
});

/**
 * Validation: Ensure either fixedFine or progressiveFine is provided based on fineStructure
 */
ViolationSchema.pre('save', function(next) {
  if (this.fineStructure === 'FIXED' && !this.fixedFine) {
    next(new Error('fixedFine is required when fineStructure is FIXED'));
  } else if (this.fineStructure === 'PROGRESSIVE' && !this.progressiveFine) {
    next(new Error('progressiveFine is required when fineStructure is PROGRESSIVE'));
  } else {
    next();
  }
});

/**
 * Static method: Get current active violation by code
 */
ViolationSchema.statics.getCurrentByCode = function(code: string) {
  const now = new Date();
  return this.findOne({
    code,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } }
    ]
  }).sort({ version: -1 });
};

/**
 * Static method: Get all active violations
 */
ViolationSchema.statics.getAllActive = function() {
  const now = new Date();
  const query: any = {
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } }
    ]
  };
  
  return this.find(query).sort({ code: 1, version: -1 });
};

/**
 * Static method: Get violation history (all versions) by violationGroupId
 */
ViolationSchema.statics.getHistory = function(violationGroupId: string) {
  return this.find({ violationGroupId }).sort({ version: -1 });
};

/**
 * Instance method: Create a new version of this violation
 * This is how you "update" a violation - by creating a new version
 */
ViolationSchema.methods.createNewVersion = async function(updates: Partial<IViolation>, createdBy?: mongoose.Types.ObjectId) {
  const Violation = this.constructor as any;
  
  // Mark current version as superseded
  this.isActive = false;
  this.effectiveUntil = new Date();
  
  // Create new version
  const newVersion = new Violation({
    ...this.toObject(),
    _id: new mongoose.Types.ObjectId(),
    version: this.version + 1,
    ...updates,
    violationGroupId: this.violationGroupId,
    supersededBy: undefined,
    effectiveFrom: new Date(),
    effectiveUntil: undefined,
    isActive: true,
    createdBy
  });
  
  // Save both
  this.supersededBy = newVersion._id;
  await this.save();
  await newVersion.save();
  
  return newVersion;
};

/**
 * Instance method: Soft delete (deactivate) this violation
 */
ViolationSchema.methods.softDelete = async function() {
  this.isActive = false;
  this.effectiveUntil = new Date();
  await this.save();
  return this;
};

const Violation = mongoose.model<IViolation, IViolationModel>('Violation', ViolationSchema);

export default Violation;
