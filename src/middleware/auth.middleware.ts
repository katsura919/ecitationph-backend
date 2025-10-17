import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserType, EnforcerRole, UserStatus } from '../models/user.model';

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
 * Authorization middleware - Check user type
 * Compares the allowed user types with the user's userType from token
 * 
 * Usage:
 * router.get('/admin-only', authenticate, authorize(UserType.ADMIN), controller)
 * router.post('/citations', authenticate, authorize(UserType.ADMIN, UserType.ENFORCER), controller)
 */
export const authorize = (...allowedUserTypes: UserType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated.',
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
 * Role authorization middleware - Check enforcer role
 * Compares the allowed roles with the user's role from token
 * Only works for ADMIN and ENFORCER user types
 * 
 * Usage:
 * router.delete('/users/:id', authenticate, authorizeRole(EnforcerRole.ADMIN), controller)
 * router.post('/approve', authenticate, authorizeRole(EnforcerRole.ADMIN, EnforcerRole.OFFICER), controller)
 */
export const authorizeRole = (...allowedRoles: EnforcerRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated.',
      });
    }

    // Check if user is enforcer/admin
    if (req.user.userType !== UserType.ADMIN && req.user.userType !== UserType.ENFORCER) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Enforcer/Admin only.',
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient role permissions.',
      });
    }

    next();
  };
};
