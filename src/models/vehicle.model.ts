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
  ownerFirstName?: string;
  ownerMiddleName?: string;
  ownerLastName?: string;
  registrationDate?: Date;
  expirationDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isRegistrationExpired(): boolean;
  getOwnerFullName(): string;
}

const VehicleSchema: Schema = new Schema(
  {
    plateNo: {
      type: String,
      unique: true,
      sparse: true,
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
    ownerFirstName: {
      type: String,
      trim: true,
      maxlength: [50, "Owner first name must not exceed 50 characters"],
    },
    ownerMiddleName: {
      type: String,
      trim: true,
      maxlength: [50, "Owner middle name must not exceed 50 characters"],
    },
    ownerLastName: {
      type: String,
      trim: true,
      maxlength: [50, "Owner last name must not exceed 50 characters"],
    },
    registrationDate: {
      type: Date,
    },
    expirationDate: {
      type: Date,
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

VehicleSchema.methods.isRegistrationExpired = function (): boolean {
  if (!this.expirationDate) return false;
  return this.expirationDate < new Date();
};

VehicleSchema.methods.getOwnerFullName = function (): string {
  const nameParts = [
    this.ownerFirstName,
    this.ownerMiddleName,
    this.ownerLastName,
  ].filter(Boolean);
  return nameParts.length > 0 ? nameParts.join(" ") : "Unknown";
};

VehicleSchema.statics.findByPlateNo = function (plateNo: string) {
  return this.findOne({ plateNo: plateNo.toUpperCase() });
};

VehicleSchema.statics.searchVehicles = function (searchTerm: string) {
  const searchRegex = new RegExp(searchTerm, "i");
  return this.find({
    $or: [
      { plateNo: searchRegex },
      { make: searchRegex },
      { vehicleModel: searchRegex },
      { ownerFirstName: searchRegex },
      { ownerLastName: searchRegex },
    ],
  });
};

const Vehicle = mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
