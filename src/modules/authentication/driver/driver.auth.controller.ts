import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Driver from '../../../models/driver.model';

// Generate JWT Token
const generateToken = (driverId: string): string => {
  return jwt.sign(
    { id: driverId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// @desc    Register new driver
// @route   POST /api/driver-auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const {
      licenseNo,
      firstName,
      lastName,
      middleName,
      address,
      bday,
      nationality,
      email,
      password,
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { licenseNo }],
    });

    if (existingDriver) {
      if (existingDriver.email === email) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
      if (existingDriver.licenseNo === licenseNo) {
        return res.status(400).json({
          success: false,
          error: 'License number already exists',
        });
      }
    }

    // Create new driver
    const driver = await Driver.create({
      licenseNo,
      firstName,
      lastName,
      middleName,
      address,
      bday,
      nationality,
      email,
      password,
    });

    // Generate token
    const token = generateToken((driver._id as any).toString());

    // Return driver data without password
    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      data: {
        driver: {
          id: driver._id,
          licenseNo: driver.licenseNo,
          firstName: driver.firstName,
          lastName: driver.lastName,
          middleName: driver.middleName,
          address: driver.address,
          bday: driver.bday,
          nationality: driver.nationality,
          email: driver.email,
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
// @route   POST /api/driver-auth/login
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

    // Find driver by email
    const driver = await Driver.findOne({ email }).select('+password');

    if (!driver) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check password
    const isPasswordMatch = await driver.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken((driver._id as any).toString());

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

// @desc    Get current logged in driver
// @route   GET /api/driver-auth/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    // Driver is already attached to req by auth middleware
    const driver = await Driver.findById((req as any).driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: driver._id,
        licenseNo: driver.licenseNo,
        firstName: driver.firstName,
        lastName: driver.lastName,
        middleName: driver.middleName,
        address: driver.address,
        bday: driver.bday,
        nationality: driver.nationality,
        email: driver.email,
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
