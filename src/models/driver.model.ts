import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Driver Status
 */
export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired'
}

/**
 * Blood Type Enum
 */
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-'
}

/**
 * Sex/Gender Enum
 */
export enum Sex {
  MALE = 'male',
  FEMALE = 'female'
}

/**
 * Driver Interface
 */
export interface IDriver extends Document {
  driverID: string; // Unique driver identifier
  licenseNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nationality: string;
  sex: Sex;
  birthDate: Date;
  weight?: number; // in kg
  height?: number; // in cm
  
  // Address breakdown
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
  };
  
  // License details
  expirationDate: Date;
  agencyCode?: string;
  
  // Physical characteristics
  bloodType?: BloodType;
  conditions?: string[]; // Medical conditions or restrictions
  eyesColor?: string;
  
  // DI Codes (Driving Restrictions/Conditions)
  diCodes?: string[]; // e.g., ['1', '2'] for restriction codes
  
  // Profile and authentication
  picture?: string; // URL or path to driver's photo
  email: string;
  password: string;
  contactNo: string; // Contact number
  
  status: DriverStatus;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  isLicenseExpired(): boolean;
  getAge(): number;
}

/**
 * Driver Schema
 */
const DriverSchema: Schema = new Schema(
  {
    driverID: {
      type: String,
      required: [true, 'Driver ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    licenseNo: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
      uppercase: true,
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
    nationality: {
      type: String,
      required: [true, 'Nationality is required'],
      trim: true,
      maxlength: [50, 'Nationality must not exceed 50 characters'],
      default: 'Filipino',
    },
    sex: {
      type: String,
      required: [true, 'Sex is required'],
      enum: {
        values: Object.values(Sex),
        message: '{VALUE} is not a valid sex',
      },
    },
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required'],
      validate: {
        validator: function(value: Date) {
          // Must be at least 18 years old
          const eighteenYearsAgo = new Date();
          eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
          return value <= eighteenYearsAgo;
        },
        message: 'Driver must be at least 18 years old',
      },
    },
    weight: {
      type: Number,
      min: [30, 'Weight must be at least 30 kg'],
      max: [300, 'Weight must not exceed 300 kg'],
    },
    height: {
      type: Number,
      min: [100, 'Height must be at least 100 cm'],
      max: [250, 'Height must not exceed 250 cm'],
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
    
    // License details
    expirationDate: {
      type: Date,
      required: [true, 'License expiration date is required'],
      validate: {
        validator: function(value: Date) {
          // Expiration date should be in the future for new registrations
          return true; // Allow expired licenses to be recorded
        },
        message: 'Invalid expiration date',
      },
    },
    agencyCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Agency code must not exceed 20 characters'],
    },
    
    // Physical characteristics
    bloodType: {
      type: String,
      enum: {
        values: Object.values(BloodType),
        message: '{VALUE} is not a valid blood type',
      },
    },
    conditions: [{
      type: String,
      trim: true,
    }],
    eyesColor: {
      type: String,
      trim: true,
      maxlength: [20, 'Eye color must not exceed 20 characters'],
    },
    
    // DI Codes (Driving Restrictions)
    diCodes: [{
      type: String,
      trim: true,
    }],
    
    // Profile and authentication
    picture: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
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
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: Object.values(DriverStatus),
        message: '{VALUE} is not a valid status',
      },
      default: DriverStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);


/**
 * Hash password before saving
 */
DriverSchema.pre<IDriver>('save', async function (next) {
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
 * Auto-generate driverID if not provided
 */
DriverSchema.pre<IDriver>('save', async function (next) {
  if (!this.driverID) {
    // Generate a unique driver ID (e.g., DRV-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.driverID = `DRV-${dateStr}-${random}`;
  }
  next();
});

/**
 * Method to compare password
 */
DriverSchema.methods.comparePassword = async function (
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
DriverSchema.methods.getFullName = function (): string {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(' ');
};

/**
 * Method to check if license is expired
 */
DriverSchema.methods.isLicenseExpired = function (): boolean {
  return new Date() > this.expirationDate;
};

/**
 * Method to get age
 */
DriverSchema.methods.getAge = function (): number {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Static method: Find driver by license number
 */
DriverSchema.statics.findByLicenseNo = function (licenseNo: string) {
  return this.findOne({ licenseNo: licenseNo.toUpperCase() });
};

/**
 * Static method: Find drivers with expired licenses
 */
DriverSchema.statics.findExpiredLicenses = function () {
  return this.find({ 
    expirationDate: { $lt: new Date() },
    status: { $ne: DriverStatus.EXPIRED }
  });
};

/**
 * Static method: Find active drivers
 */
DriverSchema.statics.findActiveDrivers = function () {
  return this.find({ status: DriverStatus.ACTIVE });
};

// Export the model
const Driver = mongoose.model<IDriver>('Driver', DriverSchema);

export default Driver;
