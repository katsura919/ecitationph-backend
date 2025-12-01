import mongoose, { Schema, Document } from "mongoose";

/**
 * Vehicle Owner Status
 */
export enum VehicleOwnerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/**
 * Vehicle Owner Interface
 */
export interface IVehicleOwner extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;

  status: VehicleOwnerStatus;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  getFullName(): string;
}

/**
 * Vehicle Owner Schema
 */
const VehicleOwnerSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must not exceed 50 characters"],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, "Middle name must not exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name must not exceed 50 characters"],
    },

    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: Object.values(VehicleOwnerStatus),
        message: "{VALUE} is not a valid status",
      },
      default: VehicleOwnerStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Method to get full name
 */
VehicleOwnerSchema.methods.getFullName = function (): string {
  const parts = [this.firstName, this.middleName, this.lastName].filter(
    Boolean
  );
  return parts.join(" ");
};

/**
 * Static method: Find active vehicle owners
 */
VehicleOwnerSchema.statics.findActiveOwners = function () {
  return this.find({ status: VehicleOwnerStatus.ACTIVE });
};

// Export the model
const VehicleOwner = mongoose.model<IVehicleOwner>(
  "VehicleOwner",
  VehicleOwnerSchema
);

export default VehicleOwner;
