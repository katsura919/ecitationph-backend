import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Vehicle Owner Status
 */
export enum VehicleOwnerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * Vehicle Owner Interface
 */
export interface IVehicleOwner extends Document {
  vehicleOwnerID: string; // Unique vehicle owner identifier
  firstName: string;
  middleName?: string;
  lastName: string;
  
  // Contact information
  email: string;
  password: string;
  contactNo: string;
  
  // Address breakdown
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
  };
  
  // Optional personal information
  bday?: Date;
  nationality?: string;
  licenseNo?: string; // Optional - vehicle owner may or may not have a license
  
  // Profile
  profilePic?: string;
  
  // Vehicles owned
  vehicles: mongoose.Types.ObjectId[]; // Reference to Vehicle model
  
  status: VehicleOwnerStatus;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  getAge(): number | null;
}

/**
 * Vehicle Owner Schema
 */
const VehicleOwnerSchema: Schema = new Schema(
  {
    vehicleOwnerID: {
      type: String,
      required: [true, 'Vehicle Owner ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    
    // Contact information
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default in queries
    },
    contactNo: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      match: [/^[0-9]{11}$/, 'Please provide a valid 11-digit contact number'],
    },
    
    // Address breakdown
    address: {
      street: {
        type: String,
        required: [true, 'Street is required'],
        trim: true,
        maxlength: [100, 'Street must not exceed 100 characters'],
      },
      barangay: {
        type: String,
        required: [true, 'Barangay is required'],
        trim: true,
        maxlength: [100, 'Barangay must not exceed 100 characters'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        maxlength: [100, 'City must not exceed 100 characters'],
      },
      province: {
        type: String,
        required: [true, 'Province is required'],
        trim: true,
        maxlength: [100, 'Province must not exceed 100 characters'],
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true,
        match: [/^[0-9]{4}$/, 'Please provide a valid 4-digit postal code'],
      },
    },
    
    // Optional personal information
    bday: {
      type: Date,
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [50, 'Nationality must not exceed 50 characters'],
    },
    licenseNo: {
      type: String,
      sparse: true, // Allows null but enforces uniqueness when present
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    
    // Profile
    profilePic: {
      type: String,
      default: null,
    },
    
    // Vehicles owned
    vehicles: [{
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    }],
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: Object.values(VehicleOwnerStatus),
        message: '{VALUE} is not a valid status',
      },
      default: VehicleOwnerStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for efficient querying
VehicleOwnerSchema.index({ email: 1, status: 1 });
VehicleOwnerSchema.index({ vehicleOwnerID: 1 });
VehicleOwnerSchema.index({ licenseNo: 1 });
VehicleOwnerSchema.index({ 'address.city': 1 });

/**
 * Hash password before saving
 */
VehicleOwnerSchema.pre<IVehicleOwner>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Auto-generate vehicleOwnerID if not provided
 */
VehicleOwnerSchema.pre<IVehicleOwner>('save', async function (next) {
  if (!this.vehicleOwnerID) {
    // Generate a unique vehicle owner ID (e.g., VO-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.vehicleOwnerID = `VO-${dateStr}-${random}`;
  }
  next();
});

/**
 * Method to compare password
 */
VehicleOwnerSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Method to get full name
 */
VehicleOwnerSchema.methods.getFullName = function (): string {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(' ');
};

/**
 * Method to get age
 */
VehicleOwnerSchema.methods.getAge = function (): number | null {
  if (!this.bday) return null;
  
  const today = new Date();
  const birthDate = new Date(this.bday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Static method: Find vehicle owner by license number
 */
VehicleOwnerSchema.statics.findByLicenseNo = function (licenseNo: string) {
  return this.findOne({ licenseNo: licenseNo.toUpperCase() });
};

/**
 * Static method: Find vehicle owner by email
 */
VehicleOwnerSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Static method: Find active vehicle owners
 */
VehicleOwnerSchema.statics.findActiveOwners = function () {
  return this.find({ status: VehicleOwnerStatus.ACTIVE });
};

/**
 * Static method: Find vehicle owners with vehicles
 */
VehicleOwnerSchema.statics.findOwnersWithVehicles = function () {
  return this.find({ 
    vehicles: { $exists: true, $ne: [] },
    status: VehicleOwnerStatus.ACTIVE
  }).populate('vehicles');
};

// Export the model
const VehicleOwner = mongoose.model<IVehicleOwner>('VehicleOwner', VehicleOwnerSchema);

export default VehicleOwner;
