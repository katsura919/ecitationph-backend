import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Driver, { DriverStatus } from '../../../models/driver.model';

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
      birthDate,
      nationality,
      sex,
      weight,
      height,
      expirationDate,
      agencyCode,
      bloodType,
      conditions,
      eyesColor,
      diCodes,
      picture,
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { licenseNo: licenseNo.toUpperCase() }],
    });

    if (existingDriver) {
      if (existingDriver.email === email) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
      if (existingDriver.licenseNo === licenseNo.toUpperCase()) {
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
      email,
      password,
      contactNo,
      address,
      birthDate: new Date(birthDate),
      nationality,
      sex,
      weight,
      height,
      expirationDate: new Date(expirationDate),
      agencyCode,
      bloodType,
      conditions,
      eyesColor,
      diCodes,
      picture,
      status: DriverStatus.ACTIVE,
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
          driverID: driver.driverID,
          licenseNo: driver.licenseNo,
          firstName: driver.firstName,
          lastName: driver.lastName,
          middleName: driver.middleName,
          fullName: driver.getFullName(),
          email: driver.email,
          contactNo: driver.contactNo,
          address: driver.address,
          birthDate: driver.birthDate,
          age: driver.getAge(),
          nationality: driver.nationality,
          sex: driver.sex,
          weight: driver.weight,
          height: driver.height,
          expirationDate: driver.expirationDate,
          isLicenseExpired: driver.isLicenseExpired(),
          agencyCode: driver.agencyCode,
          bloodType: driver.bloodType,
          conditions: driver.conditions,
          eyesColor: driver.eyesColor,
          diCodes: driver.diCodes,
          picture: driver.picture,
          status: driver.status,
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
    const driver = await Driver.findOne({
      $or: [
        { licenseNo: licenseNo.toUpperCase() },
        { email: licenseNo.toLowerCase() }
      ],
    }).select('+password');

    if (!driver) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if driver is inactive or suspended
    if (driver.status === DriverStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
      });
    }

    if (driver.status === DriverStatus.SUSPENDED) {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended. Please contact administrator.',
      });
    }

    if (driver.status === DriverStatus.EXPIRED) {
      return res.status(403).json({
        success: false,
        error: 'License has expired. Please renew your license.',
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
    // Driver is already attached to req by auth middleware
    const driver = await Driver.findById((req as any).user.id);

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
        driverID: driver.driverID,
        licenseNo: driver.licenseNo,
        firstName: driver.firstName,
        lastName: driver.lastName,
        middleName: driver.middleName,
        fullName: driver.getFullName(),
        email: driver.email,
        contactNo: driver.contactNo,
        address: driver.address,
        birthDate: driver.birthDate,
        age: driver.getAge(),
        nationality: driver.nationality,
        sex: driver.sex,
        weight: driver.weight,
        height: driver.height,
        expirationDate: driver.expirationDate,
        isLicenseExpired: driver.isLicenseExpired(),
        agencyCode: driver.agencyCode,
        bloodType: driver.bloodType,
        conditions: driver.conditions,
        eyesColor: driver.eyesColor,
        diCodes: driver.diCodes,
        picture: driver.picture,
        status: driver.status,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
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
