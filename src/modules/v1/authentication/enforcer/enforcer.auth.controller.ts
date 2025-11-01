import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Enforcer, { EnforcerStatus } from "../../../../models/enforcer.model";

// Generate JWT Token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRE || "7d" } as jwt.SignOptions
  );
};

// @desc    Register new officer
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
      status,
      profilePic,
    } = req.body;

    // Check if enforcer already exists
    const existingEnforcer = await Enforcer.findOne({
      $or: [{ email }, { username }, { badgeNo }],
    });

    if (existingEnforcer) {
      if (existingEnforcer.email === email) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }
      if (existingEnforcer.username === username) {
        return res.status(400).json({
          success: false,
          error: "Username already taken",
        });
      }
      if (existingEnforcer.badgeNo === badgeNo) {
        return res.status(400).json({
          success: false,
          error: "Badge number already exists",
        });
      }
    }

    // Create new enforcer (officer)
    const enforcer = await Enforcer.create({
      badgeNo,
      name,
      username,
      email,
      password,
      contactNo,
      address,
      status: status || EnforcerStatus.ACTIVE,
      profilePic,
    });

    // Generate token
    const token = generateToken((enforcer._id as any).toString());

    // Return enforcer data without password
    res.status(201).json({
      success: true,
      message: "Officer registered successfully",
      data: {
        enforcer: {
          id: enforcer._id,
          badgeNo: enforcer.badgeNo,
          name: enforcer.name,
          username: enforcer.username,
          email: enforcer.email,
          contactNo: enforcer.contactNo,
          address: enforcer.address,
          status: enforcer.status,
          profilePic: enforcer.profilePic,
        },
        token,
      },
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        messages,
      });
    }

    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

// @desc    Login officer
// @route   POST /api/auth/enforcer/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate request
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide username and password",
      });
    }

    // Find enforcer by username or email
    const enforcer = await Enforcer.findOne({
      $or: [{ username }, { email: username }],
    }).select("+password");

    if (!enforcer) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if enforcer is inactive or suspended
    if (enforcer.status === EnforcerStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        error: "Account is inactive. Please contact administrator.",
      });
    }

    if (enforcer.status === EnforcerStatus.SUSPENDED) {
      return res.status(403).json({
        success: false,
        error: "Account is suspended. Please contact administrator.",
      });
    }

    // Check password
    const isPasswordMatch = await enforcer.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken((enforcer._id as any).toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

// @desc    Get current logged in enforcer (officer)
// @route   GET /api/auth/enforcer/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    // Enforcer ID is attached to req by auth middleware
    const enforcer = await Enforcer.findById((req as any).user.id);

    if (!enforcer) {
      return res.status(404).json({
        success: false,
        error: "Enforcer not found",
      });
    }

    // Check if enforcer is active
    if (enforcer.status !== EnforcerStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        error: `Account is ${enforcer.status}. Please contact administrator.`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: enforcer._id,
        badgeNo: enforcer.badgeNo,
        name: enforcer.name,
        fullName: enforcer.getFullName(),
        username: enforcer.username,
        email: enforcer.email,
        contactNo: enforcer.contactNo,
        address: enforcer.address,
        status: enforcer.status,
        profilePic: enforcer.profilePic,
        createdAt: enforcer.createdAt,
        updatedAt: enforcer.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};
