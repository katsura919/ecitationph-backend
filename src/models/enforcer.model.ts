import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Enforcer Status
 */
export enum EnforcerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * Enforcer Interface (Officers)
 */
export interface IEnforcer extends Document {
  enforcerID: string; // Unique enforcer identifier
  badgeNo: string;
  name: string;
  username: string;
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
  
  profilePic?: string;
  status: EnforcerStatus;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

/**
 * Enforcer Schema
 */
const EnforcerSchema: Schema = new Schema(
  {
    enforcerID: {
      type: String,
      required: [true, 'Enforcer ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    badgeNo: {
      type: String,
      required: [true, 'Badge number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username must not exceed 50 characters'],
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
    
    profilePic: {
      type: String,
      default: null,
    },
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: Object.values(EnforcerStatus),
        message: '{VALUE} is not a valid status',
      },
      default: EnforcerStatus.ACTIVE,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);



/**
 * Hash password before saving
 */
EnforcerSchema.pre<IEnforcer>('save', async function (next) {
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
 * Auto-generate enforcerID if not provided
 */
EnforcerSchema.pre<IEnforcer>('save', async function (next) {
  if (!this.enforcerID) {
    // Generate a unique enforcer ID (e.g., ENF-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.enforcerID = `ENF-${dateStr}-${random}`;
  }
  next();
});

/**
 * Method to compare password
 */
EnforcerSchema.methods.comparePassword = async function (
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
EnforcerSchema.methods.getFullName = function (): string {
  return this.name || '';
};

/**
 * Static method: Find enforcer by badge number
 */
EnforcerSchema.statics.findByBadgeNo = function (badgeNo: string) {
  return this.findOne({ badgeNo });
};

/**
 * Static method: Find enforcer by username
 */
EnforcerSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username });
};

/**
 * Static method: Find active enforcers
 */
EnforcerSchema.statics.findActiveEnforcers = function () {
  return this.find({ status: EnforcerStatus.ACTIVE });
};

// Export the model
const Enforcer = mongoose.model<IEnforcer>('Enforcer', EnforcerSchema);

export default Enforcer;
