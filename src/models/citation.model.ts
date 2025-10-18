import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Citation Status Enum
 */
export enum CitationStatus {
  PENDING = 'PENDING',           // Citation issued, awaiting payment
  PAID = 'PAID',                 // Fine paid in full
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Partial payment made
  OVERDUE = 'OVERDUE',           // Past due date
  CONTESTED = 'CONTESTED',       // Driver is contesting the citation
  DISMISSED = 'DISMISSED',       // Citation dismissed/cancelled
  VOID = 'VOID'                  // Citation voided by admin
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  GCASH = 'GCASH',
  PAYMAYA = 'PAYMAYA'
}

/**
 * Violation Item Interface (each violation in the citation)
 */
export interface IViolationItem {
  violationId: mongoose.Types.ObjectId;  // Reference to the violation document
  code: string;                          // Stored for historical reference
  title: string;                         // Stored for historical reference
  description: string;                   // Stored for historical reference
  fineAmount: number;                    // Calculated fine amount for this specific violation
  offenseCount?: number;                 // 1st, 2nd, 3rd offense (for progressive fines)
}

/**
 * Payment Record Interface
 */
export interface IPaymentRecord {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  referenceNo?: string;           // Transaction reference number
  receiptNo?: string;             // Official receipt number
  processedBy?: mongoose.Types.ObjectId; // Admin/Officer who processed payment
  remarks?: string;
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
  citationNo: string;             // Unique citation ticket number (e.g., "TCT-2025-000001")
  
  // Driver/Violator Information
  driverId?: mongoose.Types.ObjectId;  // Reference to Driver model (if registered)
  driverInfo: {
    licenseNo?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    address?: string;
    contactNo?: string;
  };
  
  // Vehicle Information
  vehicleInfo: {
    plateNo: string;
    vehicleType: 'PRIVATE' | 'FOR_HIRE';  // Affects fine calculation
    make?: string;                         // e.g., Toyota
    model?: string;                        // e.g., Vios
    color?: string;
    vehicleOwnerId?: mongoose.Types.ObjectId; // Reference to VehicleOwner model (if registered)
  };
  
  // Violations
  violations: IViolationItem[];   // Array of violations committed
  
  // Financial Information
  totalAmount: number;            // Total fine amount
  amountPaid: number;             // Amount paid so far
  amountDue: number;              // Remaining balance
  
  // Enforcer Information
  issuedBy: mongoose.Types.ObjectId;  // Reference to Enforcer model
  enforcerInfo: {                     // Stored for historical reference
    badgeNo: string;
    name: string;
  };
  
  // Location and Time
  location: ILocation;            // Where the violation occurred
  violationDateTime: Date;        // When the violation occurred
  issuedAt: Date;                 // When the citation was issued
  
  // Status and Payment
  status: CitationStatus;
  dueDate: Date;                  // Payment due date
  paymentHistory: IPaymentRecord[]; // Array of payment transactions
  
  // Evidence/Documentation
  images?: string[];              // URLs to violation photos
  notes?: string;                 // Additional notes by enforcer
  
  // Contest/Appeal Information
  contestedAt?: Date;
  contestReason?: string;
  contestedBy?: mongoose.Types.ObjectId; // Driver who contested
  contestResolution?: string;
  contestResolvedAt?: Date;
  contestResolvedBy?: mongoose.Types.ObjectId; // Admin who resolved
  
  // System Information
  isVoid: boolean;                // If citation was voided
  voidReason?: string;
  voidedBy?: mongoose.Types.ObjectId; // Admin who voided
  voidedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Instance Methods
  calculateTotalAmount(): number;
  addPayment(payment: IPaymentRecord): Promise<ICitation>;
  markAsPaid(): Promise<ICitation>;
  contestCitation(reason: string, contestedBy: mongoose.Types.ObjectId): Promise<ICitation>;
  voidCitation(reason: string, voidedBy: mongoose.Types.ObjectId): Promise<ICitation>;
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

const CitationSchema = new Schema<ICitation, ICitationModel>(
  {
    citationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    
    // Driver/Violator Information
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver'
    },
    driverInfo: {
      licenseNo: String,
      firstName: { type: String, required: true },
      middleName: String,
      lastName: { type: String, required: true },
      address: String,
      contactNo: String
    },
    
    // Vehicle Information
    vehicleInfo: {
      plateNo: { type: String, required: true, uppercase: true },
      vehicleType: { 
        type: String, 
        enum: ['PRIVATE', 'FOR_HIRE'],
        required: true 
      },
      make: String,
      model: String,
      color: String,
      vehicleOwnerId: {
        type: Schema.Types.ObjectId,
        ref: 'VehicleOwner'
      }
    },
    
    // Violations
    violations: [{
      violationId: {
        type: Schema.Types.ObjectId,
        ref: 'Violation',
        required: true
      },
      code: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      fineAmount: { type: Number, required: true },
      offenseCount: { type: Number, default: 1 }
    }],
    
    // Financial Information
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Enforcer Information
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Enforcer',
      required: true
    },
    enforcerInfo: {
      badgeNo: { type: String, required: true },
      name: { type: String, required: true }
    },
    
    // Location and Time
    location: {
      street: String,
      barangay: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, required: true },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    violationDateTime: {
      type: Date,
      required: true
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    
    // Status and Payment
    status: {
      type: String,
      enum: Object.values(CitationStatus),
      default: CitationStatus.PENDING
    },
    dueDate: {
      type: Date,
      required: true
    },
    paymentHistory: [{
      amount: { type: Number, required: true },
      paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true
      },
      paymentDate: { type: Date, required: true, default: Date.now },
      referenceNo: String,
      receiptNo: String,
      processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      remarks: String
    }],
    
    // Evidence/Documentation
    images: [String],
    notes: String,
    
    // Contest/Appeal Information
    contestedAt: Date,
    contestReason: String,
    contestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Driver'
    },
    contestResolution: String,
    contestResolvedAt: Date,
    contestResolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // System Information
    isVoid: {
      type: Boolean,
      default: false
    },
    voidReason: String,
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    voidedAt: Date
  },
  {
    timestamps: true,
    collection: 'citations'
  }
);

// Indexes for efficient querying
CitationSchema.index({ driverId: 1 });
CitationSchema.index({ 'vehicleInfo.plateNo': 1 });
CitationSchema.index({ issuedBy: 1 });
CitationSchema.index({ status: 1 });
CitationSchema.index({ dueDate: 1 });
CitationSchema.index({ violationDateTime: 1 });
CitationSchema.index({ createdAt: -1 });

// Compound indexes
CitationSchema.index({ status: 1, dueDate: 1 });
CitationSchema.index({ driverId: 1, status: 1 });

/**
 * Pre-save hook: Calculate amounts before saving
 */
CitationSchema.pre('save', function(next) {
  // Calculate total amount from violations
  if (this.violations && this.violations.length > 0) {
    this.totalAmount = this.violations.reduce((sum, violation) => sum + violation.fineAmount, 0);
  }
  
  // Calculate amount due
  this.amountDue = this.totalAmount - this.amountPaid;
  
  // Update status based on payment
  if (this.amountPaid >= this.totalAmount && this.status === CitationStatus.PENDING) {
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
import * as CitationHelpers from '../modules/citations/citations.helpers';

CitationSchema.statics.generateCitationNo = async function(): Promise<string> {
  return CitationHelpers.generateCitationNo(this);
};

CitationSchema.statics.getByDriver = function(driverId: mongoose.Types.ObjectId) {
  return CitationHelpers.getByDriver(this, driverId);
};

CitationSchema.statics.getByEnforcer = function(enforcerId: mongoose.Types.ObjectId) {
  return CitationHelpers.getByEnforcer(this, enforcerId);
};

CitationSchema.statics.getOverdueCitations = function() {
  return CitationHelpers.getOverdueCitations(this);
};

CitationSchema.statics.getStatistics = function(startDate?: Date, endDate?: Date) {
  return CitationHelpers.getStatistics(this, startDate, endDate);
};

/**
 * Instance Methods - Delegated to helpers for better organization
 * See: src/modules/citations/citations.helpers.ts
 */
CitationSchema.methods.calculateTotalAmount = function(): number {
  return CitationHelpers.calculateTotalAmount(this as ICitation);
};

CitationSchema.methods.addPayment = async function(payment: IPaymentRecord) {
  return CitationHelpers.addPayment(this as ICitation, payment);
};

CitationSchema.methods.markAsPaid = async function() {
  return CitationHelpers.markAsPaid(this as ICitation);
};

CitationSchema.methods.contestCitation = async function(
  reason: string, 
  contestedBy: mongoose.Types.ObjectId
) {
  return CitationHelpers.contestCitation(this as ICitation, reason, contestedBy);
};

CitationSchema.methods.voidCitation = async function(
  reason: string, 
  voidedBy: mongoose.Types.ObjectId
) {
  return CitationHelpers.voidCitation(this as ICitation, reason, voidedBy);
};

CitationSchema.methods.checkOverdue = function(): boolean {
  return CitationHelpers.checkOverdue(this as ICitation);
};

const Citation = mongoose.model<ICitation, ICitationModel>('Citation', CitationSchema);

export default Citation;
