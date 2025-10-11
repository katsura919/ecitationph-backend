import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Driver, { IDriver } from '../../../models/driver.model';

// Extend Express Request to include driver
declare global {
  namespace Express {
    interface Request {
      driver?: {
        id: string;
        email: string;
      };
    }
  }
}

// Protect routes - verify JWT token
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { id: string };

      // Get driver from token
      const driver = await Driver.findById(decoded.id);

      if (!driver) {
        return res.status(401).json({
          success: false,
          error: 'Driver not found',
        });
      }

      // Attach driver to request
      req.driver = {
        id: (driver._id as any).toString(),
        email: driver.email,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};
