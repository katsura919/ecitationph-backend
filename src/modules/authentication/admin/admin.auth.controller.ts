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

// @desc    Register new admin/officer/treasurer
// @route   POST /api/auth/admin/register
// @access  Private (Admin only)
export const register = async (req: Request, res: Response) => {
  try {
    const {
      badgeNo,
      name,
      username,
      email,
      password,
      contactNo,
      address,
      status,
      profilePic,
      userType, // Can be 'admin', 'officer', or 'treasurer'
    } = req.body;

    // Validate userType - must be one of the admin/treasurer types
    const validUserTypes = [UserType.ADMIN, UserType.TREASURER];
    const finalUserType = validUserTypes.includes(userType) ? userType : UserType.ADMIN;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { badgeNo }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
        });
      }
      if (existingUser.badgeNo === badgeNo) {
        return res.status(400).json({
          success: false,
          error: 'Badge number already exists',
        });
      }
    }

    // Create new admin/officer/treasurer user
    const user = await User.create({
      userType: finalUserType,
      badgeNo,
      name,
      username,
      email,
      password,
      contactNo,
      address,
      status: status || UserStatus.ACTIVE,
      profilePic,
    });

    // Generate token
    const token = generateToken((user._id as any).toString());

    // Return user data without password
    res.status(201).json({
      success: true,
      message: `${finalUserType} registered successfully`,
      data: {
        user: {
          id: user._id,
          userType: user.userType,
          badgeNo: user.badgeNo,
          name: user.name,
          username: user.username,
          email: user.email,
          contactNo: user.contactNo,
          address: user.address,
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

// @desc    Login admin/officer/treasurer
// @route   POST /api/auth/admin/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate request
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password',
      });
    }

    // Find admin/treasurer by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      userType: { $in: [UserType.ADMIN, UserType.TREASURER] },
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

// @desc    Get current logged in admin/officer/treasurer
// @route   GET /api/auth/admin/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    // User ID is attached to req by auth middleware
    const user = await User.findById((req as any).user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact administrator.`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        userType: user.userType,
        badgeNo: user.badgeNo,
        name: user.name,
        fullName: user.getFullName(),
        username: user.username,
        email: user.email,
        contactNo: user.contactNo,
        address: user.address,
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
