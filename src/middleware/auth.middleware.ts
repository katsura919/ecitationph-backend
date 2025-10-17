import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserType, UserStatus } from '../models/user.model';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

/**
 * Basic authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized. No token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Invalid token.',
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Contact administrator.`,
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized. Invalid token.',
    });
  }
};


/**
 * Authorization middleware - Check if authenticated user has required user type(s)
 * This runs AFTER authenticate middleware to check user permissions
 * 
 * @param allowedUserTypes - One or more user types allowed to access the route
 * 
 * Usage:
 * router.post('/register', authenticate, authorize(UserType.ADMIN), controller)
 * router.get('/data', authenticate, authorize(UserType.ADMIN, UserType.OFFICER), controller)
 */
export const authorize = (...allowedUserTypes: UserType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    // Check if user's type is in allowed types
    if (!allowedUserTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * Login validation middleware - Check if user exists and has correct user type
 * This runs BEFORE authentication in login routes to validate user type
 * 
 * @param allowedUserType - The user type allowed for this login endpoint
 * 
 * Usage:
 * router.post('/login', validateLoginUserType(UserType.DRIVER), controller)
 */
export const validateLoginUserType = (allowedUserType: UserType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get identifier from request body (different for each user type)
      const { username, email, licenseNo } = req.body;

      let user;

      // Find user based on user type
      if (allowedUserType === UserType.DRIVER) {
        // Driver uses licenseNo or email
        if (!licenseNo) {
          return next(); // Let controller handle missing field
        }
        user = await User.findOne({
          $or: [
            { licenseNo: licenseNo.toUpperCase() },
            { email: licenseNo.toLowerCase() }
          ],
        }).select('userType');
      } else if (allowedUserType === UserType.VEHICLE_OWNER) {
        // Vehicle owner uses email
        if (!email) {
          return next(); // Let controller handle missing field
        }
        user = await User.findOne({
          email: email.toLowerCase(),
        }).select('userType');
      } else if (allowedUserType === UserType.ADMIN || allowedUserType === UserType.OFFICER || allowedUserType === UserType.TREASURER) {
        // Staff (Admin/Officer/Treasurer) uses username or email
        if (!username) {
          return next(); // Let controller handle missing field
        }
        user = await User.findOne({
          $or: [{ username }, { email: username }],
        }).select('userType');
      }

      // If user not found, let controller handle it (will return invalid credentials)
      if (!user) {
        return next();
      }

      // Check if user type matches
      const staffTypes = [UserType.ADMIN, UserType.OFFICER, UserType.TREASURER];
      if (staffTypes.includes(allowedUserType)) {
        // For staff endpoints, allow all staff types
        if (!staffTypes.includes(user.userType)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied. This login is for staff members only. Please use the correct login endpoint for your account type.',
          });
        }
      } else {
        // For other user types, must match exactly
        if (user.userType !== allowedUserType) {
          const userTypeLabel = allowedUserType === UserType.DRIVER ? 'drivers' : 'vehicle owners';
          return res.status(403).json({
            success: false,
            error: `Access denied. This login is for ${userTypeLabel} only. Please use the correct login endpoint for your account type.`,
          });
        }
      }

      // User type is valid, continue to controller
      next();
    } catch (error) {
      // On error, let controller handle it
      next();
    }
  };
};
