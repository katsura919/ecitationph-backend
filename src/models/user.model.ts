import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Types - Discriminator for different user roles
 */
export enum UserType {
  ADMIN = 'admin',
  ENFORCER = 'enforcer',
  DRIVER = 'driver',
  VEHICLE_OWNER = 'vehicle_owner'
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * Enforcer Roles
 */
export enum EnforcerRole {
  ADMIN = 'Admin',
  OFFICER = 'Officer',
  TREASURER = 'Treasurer'
}

/**
 * Base User Interface - Common fields for all user types
 */
export interface IUser extends Document {
  userType: UserType;
  email: string;
  password: string;
  contactNo: string;
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
  };
  status: UserStatus;
  profilePic?: string;
  
  // Type-specific fields (optional based on userType)
  // Admin/Enforcer fields
  badgeNo?: string;
  name?: string;
  username?: string;
  role?: EnforcerRole;
  
  // Driver/Vehicle Owner fields
  licenseNo?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  bday?: Date;
  nationality?: string;
  
  // Vehicle Owner specific
  vehicles?: mongoose.Types.ObjectId[]; // Reference to Vehicle model
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

/**
 * Admin/Enforcer specific interface
 */
export interface IEnforcer extends IUser {
  userType: UserType.ADMIN | UserType.ENFORCER;
  badgeNo: string;
  name: string;
  username: string;
  role: EnforcerRole;
}

/**
 * Driver specific interface
 */
export interface IDriver extends IUser {
  userType: UserType.DRIVER;
  licenseNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  bday: Date;
  nationality: string;
}

/**
 * Vehicle Owner specific interface
 */
export interface IVehicleOwner extends IUser {
  userType: UserType.VEHICLE_OWNER;
  firstName: string;
  lastName: string;
  middleName?: string;
  bday?: Date;
  nationality?: string;
  licenseNo?: string; // Optional for vehicle owners
  vehicles?: mongoose.Types.ObjectId[];
}

/**
 * Base User Schema - Contains common fields for all user types
 */
const UserSchema: Schema = new Schema(
  {
    userType: {
      type: String,
      required: [true, 'User type is required'],
      enum: {
        values: Object.values(UserType),
        message: '{VALUE} is not a valid user type',
      },
      index: true,
    },
    
    // Common fields for all user types
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
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: Object.values(UserStatus),
        message: '{VALUE} is not a valid status',
      },
      default: UserStatus.ACTIVE,
      index: true,
    },
    profilePic: {
      type: String,
      default: null,
    },
    
    // Admin/Enforcer specific fields (optional)
    badgeNo: {
      type: String,
      sparse: true, // Allows null values but enforces uniqueness when present
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    username: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username must not exceed 50 characters'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(EnforcerRole),
        message: '{VALUE} is not a valid role',
      },
    },
    
    // Driver/Vehicle Owner specific fields (optional)
    licenseNo: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name must not exceed 50 characters'],
    },
    bday: {
      type: Date,
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [50, 'Nationality must not exceed 50 characters'],
    },
    
    // Vehicle Owner specific
    vehicles: [{
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    }],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    discriminatorKey: 'userType', // Uses userType field for discrimination
  }
);

// Indexes for efficient querying
UserSchema.index({ userType: 1, status: 1 });
UserSchema.index({ email: 1, userType: 1 });

/**
 * Validation: Ensure required fields based on userType
 */
UserSchema.pre('save', function (next) {
  const user = this;
  
  // Validate Admin/Enforcer required fields
  if (user.userType === UserType.ADMIN || user.userType === UserType.ENFORCER) {
    if (!user.badgeNo) {
      return next(new Error('Badge number is required for admin/enforcer'));
    }
    if (!user.name) {
      return next(new Error('Name is required for admin/enforcer'));
    }
    if (!user.username) {
      return next(new Error('Username is required for admin/enforcer'));
    }
    if (!user.role) {
      return next(new Error('Role is required for admin/enforcer'));
    }
  }
  
  // Validate Driver required fields
  if (user.userType === UserType.DRIVER) {
    if (!user.licenseNo) {
      return next(new Error('License number is required for driver'));
    }
    if (!user.firstName || !user.lastName) {
      return next(new Error('First name and last name are required for driver'));
    }
    if (!user.bday) {
      return next(new Error('Birthday is required for driver'));
    }
    if (!user.nationality) {
      return next(new Error('Nationality is required for driver'));
    }
  }
  
  // Validate Vehicle Owner required fields
  if (user.userType === UserType.VEHICLE_OWNER) {
    if (!user.firstName || !user.lastName) {
      return next(new Error('First name and last name are required for vehicle owner'));
    }
  }
  
  next();
});

/**
 * Hash password before saving
 */
UserSchema.pre<IUser>('save', async function (next) {
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
 * Method to compare password
 */
UserSchema.methods.comparePassword = async function (
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
 * Returns formatted name based on user type
 */
UserSchema.methods.getFullName = function (): string {
  if (this.userType === UserType.ADMIN || this.userType === UserType.ENFORCER) {
    return this.name || '';
  }
  
  // For Driver/Vehicle Owner
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(' ');
};

/**
 * Static method: Find users by type
 */
UserSchema.statics.findByType = function (userType: UserType, status?: UserStatus) {
  const query: any = { userType };
  if (status) {
    query.status = status;
  }
  return this.find(query);
};

/**
 * Static method: Find enforcer by badge number
 */
UserSchema.statics.findByBadgeNo = function (badgeNo: string) {
  return this.findOne({ 
    badgeNo, 
    userType: { $in: [UserType.ADMIN, UserType.ENFORCER] } 
  });
};

/**
 * Static method: Find driver by license number
 */
UserSchema.statics.findByLicenseNo = function (licenseNo: string) {
  return this.findOne({ 
    licenseNo: licenseNo.toUpperCase(),
    userType: { $in: [UserType.DRIVER, UserType.VEHICLE_OWNER] }
  });
};

// Export the base model
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
