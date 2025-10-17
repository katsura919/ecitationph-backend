import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserType, UserStatus, EnforcerRole } from '../../../models/user.model';

// Generate JWT Token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// @desc    Register new enforcer/admin
// @route   POST /api/auth/enforcer/register
// @access  Public
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
      role,
      status,
      profilePic,
      userType, // Can be 'admin' or 'enforcer'
    } = req.body;

    // Validate userType
    const validUserType = userType === UserType.ADMIN ? UserType.ADMIN : UserType.ENFORCER;

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

    // Create new enforcer/admin user
    const user = await User.create({
      userType: validUserType,
      badgeNo,
      name,
      username,
      email,
      password,
      contactNo,
      address,
      role: role || EnforcerRole.OFFICER,
      status: status || UserStatus.ACTIVE,
      profilePic,
    });

    // Generate token
    const token = generateToken((user._id as any).toString());

    // Return user data without password
    res.status(201).json({
      success: true,
      message: 'Enforcer registered successfully',
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
          role: user.role,
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

// @desc    Login enforcer/admin
// @route   POST /api/auth/enforcer/login
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

    // Find enforcer/admin by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      userType: { $in: [UserType.ADMIN, UserType.ENFORCER] }, // Only enforcer/admin (validated by middleware)
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
          badgeNo: user.badgeNo,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
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

// @desc    Get current logged in enforcer/admin
// @route   GET /api/auth/enforcer/me
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

    // Verify user is enforcer/admin
    if (user.userType !== UserType.ADMIN && user.userType !== UserType.ENFORCER) {
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
        badgeNo: user.badgeNo,
        name: user.name,
        username: user.username,
        email: user.email,
        contactNo: user.contactNo,
        address: user.address,
        role: user.role,
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
