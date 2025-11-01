import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Contest Status Enum
 */
export enum ContestStatus {
  SUBMITTED = "SUBMITTED", // Contest submitted, awaiting review
  UNDER_REVIEW = "UNDER_REVIEW", // Being reviewed by admin
  APPROVED = "APPROVED", // Contest approved - citation dismissed
  REJECTED = "REJECTED", // Contest rejected - citation stands
  WITHDRAWN = "WITHDRAWN", // Driver withdrew the contest
}

/**
 * Contest Document Interface
 */
export interface IContest extends Document {
  // Reference to Citation
  citationId: mongoose.Types.ObjectId; // Reference to Citation model

  // Driver Information (for efficient querying)
  driverId: mongoose.Types.ObjectId; // Reference to Driver model (redundant but efficient)

  // Contest Information
  contestNo: string; // Unique contest number (e.g., "CON-2025-000001")
  reason: string; // Reason for contesting the citation
  description?: string; // Detailed description/explanation

  // Submitter Information
  contestedBy: mongoose.Types.ObjectId; // Reference to Driver who contested
  submittedAt: Date; // When contest was submitted

  // Supporting Documents/Evidence
  supportingDocuments?: string[]; // URLs to uploaded documents/evidence
  witnessInfo?: {
    name: string;
    contactNo?: string;
    statement?: string;
  }[];

  // Admin Review Information
  reviewedBy?: mongoose.Types.ObjectId; // Reference to Admin/User who reviewed
  reviewedAt?: Date; // When contest was reviewed
  reviewNotes?: string; // Admin's review notes
  resolution?: string; // Final resolution/decision explanation

  // Status and Workflow
  status: ContestStatus;
  statusHistory: {
    status: ContestStatus;
    changedAt: Date;
    changedBy: mongoose.Types.ObjectId;
    changedByModel: "Driver" | "User";
    notes?: string;
  }[];

  // System Information
  isActive: boolean; // If contest is still active

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  approve(
    resolvedBy: mongoose.Types.ObjectId,
    resolution: string,
    reviewNotes?: string
  ): Promise<IContest>;
  reject(
    resolvedBy: mongoose.Types.ObjectId,
    resolution: string,
    reviewNotes?: string
  ): Promise<IContest>;
  withdraw(): Promise<IContest>;
  addStatusHistory(
    status: ContestStatus,
    changedBy: mongoose.Types.ObjectId,
    notes?: string
  ): void;
}

/**
 * Contest Model Interface with Static Methods
 */
export interface IContestModel extends Model<IContest> {
  generateContestNo(): Promise<string>;
  getByCitation(citationId: mongoose.Types.ObjectId): Promise<IContest | null>;
  getByDriver(driverId: mongoose.Types.ObjectId): Promise<IContest[]>;
  getPendingContests(): Promise<IContest[]>;
  getStatistics(startDate?: Date, endDate?: Date): Promise<any>;
}

const ContestSchema = new Schema<IContest, IContestModel>(
  {
    // Reference to Citation
    citationId: {
      type: Schema.Types.ObjectId,
      ref: "Citation",
      required: true,
      unique: true, // Ensures one contest per citation
      index: true,
    },

    // Driver Information (for efficient querying)
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    // Contest Information
    contestNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Submitter Information
    contestedBy: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Supporting Documents/Evidence
    supportingDocuments: [String],
    witnessInfo: [
      {
        name: { type: String, required: true },
        contactNo: String,
        statement: String,
      },
    ],

    // Admin Review Information
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
    resolution: String,

    // Status and Workflow
    status: {
      type: String,
      enum: Object.values(ContestStatus),
      default: ContestStatus.SUBMITTED,
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(ContestStatus),
          required: true,
        },
        changedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        changedBy: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "statusHistory.changedByModel",
        },
        changedByModel: {
          type: String,
          required: true,
          enum: ["Driver", "User"],
        },
        notes: String,
      },
    ],

    // System Information
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "contests",
  }
);

// Additional indexes for efficient querying
// Note: citationId, driverId, contestedBy, and status already have indexes from field definitions
ContestSchema.index({ submittedAt: -1 });
ContestSchema.index({ createdAt: -1 });

// Compound indexes
ContestSchema.index({ status: 1, submittedAt: -1 });
ContestSchema.index({ driverId: 1, status: 1 });
ContestSchema.index({ contestedBy: 1, status: 1 });

/**
 * Pre-save middleware: Add status history entry
 */
ContestSchema.pre("save", function (next) {
  // If status changed, add to history
  if (this.isModified("status") && !this.isNew) {
    // We'll handle this in the instance methods for better control
  }

  // Initialize status history for new documents
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.contestedBy,
      changedByModel: "Driver",
      notes: "Contest submitted",
    });
  }

  next();
});

/**
 * Static Methods - Delegated to helpers for better organization
 * See: src/modules/v1/contests/contest.helpers.ts
 */
import * as ContestHelpers from "../modules/v1/contests/contest.helpers";

ContestSchema.statics.generateContestNo = async function (): Promise<string> {
  return ContestHelpers.generateContestNo(this);
};

ContestSchema.statics.getByCitation = function (
  citationId: mongoose.Types.ObjectId
) {
  return ContestHelpers.getByCitation(this, citationId);
};

ContestSchema.statics.getByDriver = function (
  driverId: mongoose.Types.ObjectId
) {
  return ContestHelpers.getByDriver(this, driverId);
};

ContestSchema.statics.getPendingContests = function () {
  return ContestHelpers.getPendingContests(this);
};

ContestSchema.statics.getStatistics = function (
  startDate?: Date,
  endDate?: Date
) {
  return ContestHelpers.getStatistics(this, startDate, endDate);
};

/**
 * Instance Methods - Delegated to helpers for better organization
 * See: src/modules/v1/contests/contest.helpers.ts
 */
ContestSchema.methods.approve = async function (
  resolvedBy: mongoose.Types.ObjectId,
  resolution: string,
  reviewNotes?: string
) {
  return ContestHelpers.approveContest(
    this as IContest,
    resolvedBy,
    resolution,
    reviewNotes
  );
};

ContestSchema.methods.reject = async function (
  resolvedBy: mongoose.Types.ObjectId,
  resolution: string,
  reviewNotes?: string
) {
  return ContestHelpers.rejectContest(
    this as IContest,
    resolvedBy,
    resolution,
    reviewNotes
  );
};

ContestSchema.methods.withdraw = async function () {
  return ContestHelpers.withdrawContest(this as IContest);
};

ContestSchema.methods.addStatusHistory = function (
  status: ContestStatus,
  changedBy: mongoose.Types.ObjectId,
  notes?: string
) {
  ContestHelpers.addStatusHistory(this as IContest, status, changedBy, notes);
};

const Contest = mongoose.model<IContest, IContestModel>(
  "Contest",
  ContestSchema
);

export default Contest;
