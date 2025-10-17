import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserType, UserStatus } from '../../../models/user.model';

// Generate JWT Token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// @desc    Register new vehicle owner
// @route   POST /api/auth/vehicle-owner/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      email,
      password,
      contactNo,
      address,
      bday,
      nationality,
      licenseNo, // Optional for vehicle owners
      profilePic,
    } = req.body;

    // Check if vehicle owner already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Check license number if provided
    if (licenseNo) {
      const licenseExists = await User.findOne({ licenseNo: licenseNo.toUpperCase() });
      if (licenseExists) {
        return res.status(400).json({
          success: false,
          error: 'License number already exists',
        });
      }
    }

    // Create new vehicle owner user
    const user = await User.create({
      userType: UserType.VEHICLE_OWNER,
      firstName,
      lastName,
      middleName,
      email,
      password,
      contactNo,
      address,
      bday: bday ? new Date(bday) : undefined,
      nationality,
      licenseNo: licenseNo || undefined,
      status: UserStatus.ACTIVE,
      profilePic,
      vehicles: [], // Initialize empty vehicles array
    });

    // Generate token
    const token = generateToken((user._id as any).toString());

    // Return user data without password
    res.status(201).json({
      success: true,
      message: 'Vehicle owner registered successfully',
      data: {
        user: {
          id: user._id,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.getFullName(),
          email: user.email,
          contactNo: user.contactNo,
          address: user.address,
          bday: user.bday,
          nationality: user.nationality,
          licenseNo: user.licenseNo,
          status: user.status,
          profilePic: user.profilePic,
        },
        token,
      },
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        messages,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Login vehicle owner
// @route   POST /api/auth/vehicle-owner/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate request
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Find vehicle owner by email
    const user = await User.findOne({
      email: email.toLowerCase(),
      userType: UserType.VEHICLE_OWNER, // Only vehicle owners (validated by middleware)
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is inactive or suspended
    if (user.status === UserStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended. Please contact administrator.',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.getFullName(),
          email: user.email,
          status: user.status,
        },
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get current logged in vehicle owner
// @route   GET /api/auth/vehicle-owner/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById((req as any).user.id).populate('vehicles');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify user is a vehicle owner
    if (user.userType !== UserType.VEHICLE_OWNER) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Invalid user type.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        fullName: user.getFullName(),
        email: user.email,
        contactNo: user.contactNo,
        address: user.address,
        bday: user.bday,
        nationality: user.nationality,
        licenseNo: user.licenseNo,
        status: user.status,
        profilePic: user.profilePic,
        vehicles: user.vehicles, // Populated vehicle data
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};
