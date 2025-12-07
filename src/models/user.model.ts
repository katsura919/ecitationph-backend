import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Types - Admin and Treasurer only
 */
export enum UserType {
  ADMIN = "ADMIN",
  TREASURER = "TREASURER",
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

/**
 * Base User Interface - For Admin/Treasurer only
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

  // User specific fields
  badgeNo: string;
  name: string;
  username: string;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

/**
 * Admin/Treasurer specific interface (alias for IUser)
 */
export interface IAdmin extends IUser {
  userType: UserType.ADMIN | UserType.TREASURER;
}

/**
 * Base User Schema - Contains common fields for all user types
 */
const UserSchema: Schema = new Schema(
  {
    userType: {
      type: String,
      required: [true, "User type is required"],
      enum: {
        values: Object.values(UserType),
        message: "{VALUE} is not a valid user type",
      },
      index: true,
    },

    // Common fields for all user types
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default in queries
    },
    contactNo: {
      type: String,
      required: [true, "Contact number is required"],
      trim: true,
      match: [/^[0-9]{11}$/, "Please provide a valid 11-digit contact number"],
    },
    address: {
      street: {
        type: String,
        required: [true, "Street is required"],
        trim: true,
        maxlength: [100, "Street must not exceed 100 characters"],
      },
      barangay: {
        type: String,
        required: [true, "Barangay is required"],
        trim: true,
        maxlength: [100, "Barangay must not exceed 100 characters"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        maxlength: [100, "City must not exceed 100 characters"],
      },
      province: {
        type: String,
        required: [true, "Province is required"],
        trim: true,
        maxlength: [100, "Province must not exceed 100 characters"],
      },
      postalCode: {
        type: String,
        required: [true, "Postal code is required"],
        trim: true,
        match: [/^[0-9]{4}$/, "Please provide a valid 4-digit postal code"],
      },
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: Object.values(UserStatus),
        message: "{VALUE} is not a valid status",
      },
      default: UserStatus.ACTIVE,
      index: true,
    },
    profilePic: {
      type: String,
      default: null,
    },

    // User specific fields (required)
    badgeNo: {
      type: String,
      required: [true, "Badge number is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must not exceed 100 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [50, "Username must not exceed 50 characters"],
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    discriminatorKey: "userType", // Uses userType field for discrimination
  }
);

/**
 * Hash password before saving
 */
UserSchema.pre<IUser>("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
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
 */
UserSchema.methods.getFullName = function (): string {
  return this.name || "";
};

/**
 * Static method: Find users by type
 */
UserSchema.statics.findByType = function (
  userType: UserType,
  status?: UserStatus
) {
  const query: any = { userType };
  if (status) {
    query.status = status;
  }
  return this.find(query);
};

/**
 * Static method: Find user by badge number
 */
UserSchema.statics.findByBadgeNo = function (badgeNo: string) {
  return this.findOne({ badgeNo });
};

/**
 * Static method: Find user by username
 */
UserSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username });
};

// Export the base model
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
