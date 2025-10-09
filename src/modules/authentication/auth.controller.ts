import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/user.model';

// Generate JWT Token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
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
      position,
      role,
      status,
      profilePic,
    } = req.body;

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

    // Create new user
    const user = await User.create({
      badgeNo,
      name,
      username,
      email,
      password,
      contactNo,
      address,
      position,
      role: role || 'Officer',
      status: status || 'Enabled',
      profilePic,
    });

    // Generate token
    const token = generateToken((user._id as any).toString());

    // Return user data without password
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          badgeNo: user.badgeNo,
          name: user.name,
          username: user.username,
          email: user.email,
          contactNo: user.contactNo,
          address: user.address,
          position: user.position,
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

// @desc    Login user
// @route   POST /api/auth/login
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

    // Find user by username or email (allow login with either)
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is disabled
    if (user.status === 'Disabled') {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled. Please contact administrator.',
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
      token,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
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

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        badgeNo: user.badgeNo,
        name: user.name,
        username: user.username,
        email: user.email,
        contactNo: user.contactNo,
        address: user.address,
        position: user.position,
        role: user.role,
        status: user.status,
        profilePic: user.profilePic,
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
