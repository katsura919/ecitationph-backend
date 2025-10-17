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

// @desc    Register new driver
// @route   POST /api/auth/driver/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const {
      licenseNo,
      firstName,
      lastName,
      middleName,
      email,
      password,
      contactNo,
      address,
      bday,
      nationality,
      profilePic,
    } = req.body;

    // Check if driver already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { licenseNo: licenseNo.toUpperCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
      if (existingUser.licenseNo === licenseNo.toUpperCase()) {
        return res.status(400).json({
          success: false,
          error: 'License number already exists',
        });
      }
    }

    // Create new driver user
    const user = await User.create({
      userType: UserType.DRIVER,
      licenseNo,
      firstName,
      lastName,
      middleName,
      email,
      password,
      contactNo,
      address,
      bday: new Date(bday),
      nationality,
      status: UserStatus.ACTIVE,
      profilePic,
    });

    // Generate token
    const token = generateToken((user._id as any).toString());

    // Return user data without password
    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      data: {
        user: {
          id: user._id,
          userType: user.userType,
          licenseNo: user.licenseNo,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          email: user.email,
          contactNo: user.contactNo,
          address: user.address,
          bday: user.bday,
          nationality: user.nationality,
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

// @desc    Login driver
// @route   POST /api/auth/driver/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { licenseNo, password } = req.body;

    // Validate request
    if (!licenseNo || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide license number and password',
      });
    }

    // Find driver by license number or email
    const user = await User.findOne({
      $or: [
        { licenseNo: licenseNo.toUpperCase() },
        { email: licenseNo.toLowerCase() }
      ],
      userType: UserType.DRIVER, // Only drivers (validated by middleware)
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

// @desc    Get current logged in driver
// @route   GET /api/auth/driver/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById((req as any).user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify user is a driver
    if (user.userType !== UserType.DRIVER) {
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
        licenseNo: user.licenseNo,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        fullName: user.getFullName(),
        email: user.email,
        contactNo: user.contactNo,
        address: user.address,
        bday: user.bday,
        nationality: user.nationality,
        status: user.status,
        profilePic: user.profilePic,
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
