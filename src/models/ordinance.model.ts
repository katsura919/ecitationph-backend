import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Ordinance Document Interface
 *
 * This model groups related violations under a single ordinance/law.
 * Uses the same versioning system as Violations for data immutability:
 * - Ordinances are never actually deleted (soft delete with isActive flag)
 * - Updates create a new version instead of modifying existing records
 * - The version field tracks the evolution of an ordinance
 * - Violations reference their parent ordinance
 */
export interface IOrdinance extends Document {
  // Identification
  ordinanceNo: string; // e.g., "ORD-2020-001", "R.A. 4136"
  ordinanceGroupId?: string; // Groups related versions of the same ordinance
  version: number; // Version number for this ordinance

  // Ordinance Details
  title?: string; // Short title of the ordinance
  description: string; // Full description or summary
  legalReference?: string; // Complete legal reference

  // Associated Violations
  violations: mongoose.Types.ObjectId[]; // References to Violation documents

  // Dates
  dateIssued: Date; // Official date the ordinance was issued/enacted
  dateApproved?: Date; // Date ordinance was approved

  // Versioning and Status
  isActive: boolean; // false = soft deleted or superseded by newer version
  supersededBy?: mongoose.Types.ObjectId; // Reference to newer version if updated
  effectiveFrom: Date; // When this version becomes effective
  effectiveUntil?: Date; // When this version is no longer active

  // Additional Information
  remarks?: string;
  attachments?: string[]; // URLs or paths to ordinance documents/PDFs

  // Metadata
  createdBy?: mongoose.Types.ObjectId; // Admin who created this version
  approvedBy?: mongoose.Types.ObjectId; // Admin who approved this ordinance
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  createNewVersion(
    updates: Partial<IOrdinance>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IOrdinance>;
  softDelete(): Promise<IOrdinance>;
  addViolation(violationId: mongoose.Types.ObjectId): Promise<IOrdinance>;
  removeViolation(violationId: mongoose.Types.ObjectId): Promise<IOrdinance>;
}

/**
 * Ordinance Model Interface with Static Methods
 */
export interface IOrdinanceModel extends Model<IOrdinance> {
  getCurrentByOrdinanceNo(ordinanceNo: string): Promise<IOrdinance | null>;
  getAllActive(): Promise<IOrdinance[]>;
  getHistory(ordinanceGroupId: string): Promise<IOrdinance[]>;
  searchByKeyword(keyword: string): Promise<IOrdinance[]>;
}

const OrdinanceSchema = new Schema<IOrdinance, IOrdinanceModel>(
  {
    ordinanceNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
      uppercase: true,
    },
    ordinanceGroupId: {
      type: String,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    title: {
      type: String,
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
    violations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Violation",
      },
    ],
    dateIssued: {
      type: Date,
      required: true,
    },
    dateApproved: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    supersededBy: {
      type: Schema.Types.ObjectId,
      ref: "Ordinance",
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "ordinances",
  }
);

// Indexes for efficient querying
OrdinanceSchema.index({ ordinanceNo: 1, version: 1 });
OrdinanceSchema.index({ ordinanceGroupId: 1, version: -1 });
OrdinanceSchema.index({ isActive: 1, effectiveFrom: 1 });
OrdinanceSchema.index({ dateIssued: -1 });

// Compound index for finding current active ordinances
OrdinanceSchema.index({
  isActive: 1,
  effectiveFrom: -1,
  effectiveUntil: 1,
});

// Text index for search functionality
OrdinanceSchema.index({
  ordinanceNo: "text",
  title: "text",
  description: "text",
});

/**
 * Pre-save hook: Generate ordinanceGroupId for new ordinances
 */
OrdinanceSchema.pre("save", function (next) {
  if (this.isNew && !this.ordinanceGroupId) {
    this.ordinanceGroupId = new mongoose.Types.ObjectId().toString();
  }
  next();
});

/**
 * Static method: Get current active ordinance by ordinanceNo
 */
OrdinanceSchema.statics.getCurrentByOrdinanceNo = function (
  ordinanceNo: string
) {
  const now = new Date();
  return this.findOne({
    ordinanceNo: ordinanceNo.toUpperCase(),
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } },
    ],
  })
    .populate("violations")
    .populate("createdBy", "firstname lastname email")
    .populate("approvedBy", "firstname lastname email")
    .sort({ version: -1 });
};

/**
 * Static method: Get all active ordinances
 */
OrdinanceSchema.statics.getAllActive = function () {
  const now = new Date();
  const query: any = {
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } },
    ],
  };

  return this.find(query)
    .populate("violations")
    .populate("createdBy", "firstname lastname email")
    .sort({ dateIssued: -1, ordinanceNo: 1 });
};

/**
 * Static method: Get ordinance history (all versions) by ordinanceGroupId
 */
OrdinanceSchema.statics.getHistory = function (ordinanceGroupId: string) {
  return this.find({ ordinanceGroupId })
    .populate("violations")
    .populate("createdBy", "firstname lastname email")
    .populate("supersededBy")
    .sort({ version: -1 });
};

/**
 * Static method: Search ordinances by keyword
 */
OrdinanceSchema.statics.searchByKeyword = function (keyword: string) {
  const now = new Date();
  return this.find({
    $text: { $search: keyword },
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } },
    ],
  })
    .populate("violations")
    .populate("createdBy", "firstname lastname email");
};

/**
 * Instance method: Create a new version of this ordinance
 * This is how you "update" an ordinance - by creating a new version
 */
OrdinanceSchema.methods.createNewVersion = async function (
  updates: Partial<IOrdinance>,
  createdBy?: mongoose.Types.ObjectId
) {
  const Ordinance = this.constructor as any;

  // Mark current version as superseded
  this.isActive = false;
  this.effectiveUntil = new Date();

  // Create new version
  const newVersion = new Ordinance({
    ...this.toObject(),
    _id: new mongoose.Types.ObjectId(),
    version: this.version + 1,
    ...updates,
    ordinanceGroupId: this.ordinanceGroupId,
    supersededBy: undefined,
    effectiveFrom: new Date(),
    effectiveUntil: undefined,
    isActive: true,
    createdBy,
  });

  // Save both
  this.supersededBy = newVersion._id;
  await this.save();
  await newVersion.save();

  return newVersion;
};

/**
 * Instance method: Soft delete (deactivate) this ordinance
 */
OrdinanceSchema.methods.softDelete = async function () {
  this.isActive = false;
  this.effectiveUntil = new Date();
  await this.save();
  return this;
};

/**
 * Instance method: Add a violation to this ordinance
 */
OrdinanceSchema.methods.addViolation = async function (
  violationId: mongoose.Types.ObjectId
) {
  if (!this.violations.includes(violationId)) {
    this.violations.push(violationId);
    await this.save();
  }
  return this;
};

/**
 * Instance method: Remove a violation from this ordinance
 */
OrdinanceSchema.methods.removeViolation = async function (
  violationId: mongoose.Types.ObjectId
) {
  this.violations = this.violations.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== violationId.toString()
  );
  await this.save();
  return this;
};

const Ordinance = mongoose.model<IOrdinance, IOrdinanceModel>(
  "Ordinance",
  OrdinanceSchema
);

export default Ordinance;
