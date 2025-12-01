import mongoose, { Schema, Document } from "mongoose";

/**
 * Vehicle Type Enum
 */
export enum VehicleType {
  PRIVATE = "PRIVATE",
  FOR_HIRE = "FOR_HIRE",
  GOVERNMENT = "GOVERNMENT",
  DIPLOMATIC = "DIPLOMATIC",
}

/**
 * Vehicle Status Enum
 */
export enum VehicleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  IMPOUNDED = "IMPOUNDED",
  SUSPENDED = "SUSPENDED",
}

/**
 * Vehicle Interface
 */
export interface IVehicle extends Document {
  plateNo: string;
  vehicleType: VehicleType;
  classification?: string;
  make?: string;
  vehicleModel?: string;
  year?: number;
  color?: string;
  bodyMark?: string;
  registeredOwner?: string;
  ownerId: mongoose.Types.ObjectId;
  registrationDate?: Date;
  expirationDate?: Date;
  status: VehicleStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isRegistrationExpired(): boolean;
  getOwnerName(): string;
}

const VehicleSchema: Schema = new Schema(
  {
    plateNo: {
      type: String,
      required: [true, "Plate number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      match: [
        /^[A-Z0-9\-]+$/,
        "Plate number must contain only letters, numbers, and hyphens",
      ],
    },
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: {
        values: Object.values(VehicleType),
        message: "{VALUE} is not a valid vehicle type",
      },
      default: VehicleType.PRIVATE,
    },
    classification: {
      type: String,
      trim: true,
      maxlength: [50, "Classification must not exceed 50 characters"],
    },
    make: {
      type: String,
      trim: true,
      maxlength: [50, "Make must not exceed 50 characters"],
    },
    vehicleModel: {
      type: String,
      trim: true,
      maxlength: [50, "Model must not exceed 50 characters"],
    },
    year: {
      type: Number,
      min: [1900, "Year must be 1900 or later"],
      max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, "Color must not exceed 30 characters"],
    },
    bodyMark: {
      type: String,
      trim: true,
      maxlength: [100, "Body mark must not exceed 100 characters"],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleOwner",
      index: true,
    },
    registrationDate: {
      type: Date,
    },
    expirationDate: {
      type: Date,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: Object.values(VehicleStatus),
        message: "{VALUE} is not a valid status",
      },
      default: VehicleStatus.ACTIVE,
      index: true,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes must not exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    collection: "vehicles",
  }
);

VehicleSchema.index({ plateNo: 1, status: 1 });
VehicleSchema.index({ ownerId: 1, status: 1 });
VehicleSchema.index({ vehicleType: 1 });
VehicleSchema.index({ createdAt: -1 });

VehicleSchema.methods.isRegistrationExpired = function (): boolean {
  if (!this.expirationDate) return false;
  return this.expirationDate < new Date();
};

VehicleSchema.methods.getOwnerName = function (): string {
  if (this.populated("ownerId") && this.ownerId) {
    return (this.ownerId as any).getFullName?.() || "Unknown";
  }
  return "Unknown";
};

VehicleSchema.statics.findByPlateNo = function (plateNo: string) {
  return this.findOne({ plateNo: plateNo.toUpperCase() });
};

VehicleSchema.statics.findByOwner = function (
  ownerId: mongoose.Types.ObjectId
) {
  return this.find({ ownerId, status: VehicleStatus.ACTIVE });
};

VehicleSchema.statics.findActiveVehicles = function () {
  return this.find({ status: VehicleStatus.ACTIVE });
};

VehicleSchema.statics.searchVehicles = function (searchTerm: string) {
  const searchRegex = new RegExp(searchTerm, "i");
  return this.find({
    $or: [
      { plateNo: searchRegex },
      { make: searchRegex },
      { vehicleModel: searchRegex },
    ],
  }).populate("ownerId");
};

const Vehicle = mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
