import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for TypeScript
export interface IUser extends Document {
  badgeNo: string;
  name: string;
  username: string;
  email: string;
  password: string;
  contactNo: string;
  address: string;
  position: string;
  role: 'Admin' | 'Officer' | 'Treasurer' ;
  status: 'Enabled' | 'Disabled';
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mongoose Schema
const UserSchema: Schema = new Schema(
  {
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
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address must not exceed 200 characters'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      enum: {
        values: [
          'Traffic Enforcement Officer',
          'Road Traffic Inspector',
          'Highway Patrol Officer',
          'Traffic Warden',
          'Accident Investigator',
        ],
        message: '{VALUE} is not a valid position',
      },
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['Admin', 'Officer', 'Treasurer'],
        message: '{VALUE} is not a valid role',
      },
      default: 'Officer',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Enabled', 'Disabled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Enabled',
    },
    profilePic: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries (email, username, badgeNo already indexed via unique: true)
UserSchema.index({ status: 1 });

// Hash password before saving
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

// Method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Export the model
export default mongoose.model<IUser>('User', UserSchema);
