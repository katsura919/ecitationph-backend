/**
 * AUTH MIDDLEWARE USAGE EXAMPLES
 * 
 * Simple role-based authorization:
 * - authenticate: Verify JWT token
 * - authorize(...userTypes): Check user type
 * - authorizeRole(...roles): Check enforcer role
 */

import { Router } from 'express';
import { authenticate, authorize, authorizeRole } from './auth.middleware';
import { UserType, EnforcerRole } from '../models/user.model';

const router = Router();

// ============================================================================
// BASIC USAGE
// ============================================================================

// Any authenticated user
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Admin only
router.delete('/users/:id', 
  authenticate, 
  authorize(UserType.ADMIN), 
  (req, res) => {
    res.json({ message: 'User deleted' });
  }
);

// Enforcer or Admin
router.post('/citations', 
  authenticate, 
  authorize(UserType.ADMIN, UserType.ENFORCER), 
  (req, res) => {
    res.json({ message: 'Citation created' });
  }
);

// Driver only
router.get('/my-citations', 
  authenticate, 
  authorize(UserType.DRIVER), 
  (req, res) => {
    res.json({ citations: [] });
  }
);

// Vehicle Owner only
router.get('/my-vehicles', 
  authenticate, 
  authorize(UserType.VEHICLE_OWNER), 
  (req, res) => {
    res.json({ vehicles: [] });
  }
);

// Multiple user types
router.get('/violations', 
  authenticate, 
  authorize(UserType.DRIVER, UserType.VEHICLE_OWNER), 
  (req, res) => {
    res.json({ violations: [] });
  }
);

// ============================================================================
// ROLE-BASED AUTHORIZATION (For Enforcers/Admins)
// ============================================================================

// Admin role only
router.put('/settings', 
  authenticate, 
  authorizeRole(EnforcerRole.ADMIN), 
  (req, res) => {
    res.json({ message: 'Settings updated' });
  }
);

// Admin or Officer roles
router.get('/reports', 
  authenticate, 
  authorizeRole(EnforcerRole.ADMIN, EnforcerRole.OFFICER), 
  (req, res) => {
    res.json({ reports: [] });
  }
);

// Treasurer role only
router.get('/payments', 
  authenticate, 
  authorizeRole(EnforcerRole.TREASURER), 
  (req, res) => {
    res.json({ payments: [] });
  }
);

// ============================================================================
// COMBINED AUTHORIZATION
// ============================================================================

// Only Admin/Enforcer with Admin or Officer role
router.post('/citations/approve',
  authenticate,
  authorize(UserType.ADMIN, UserType.ENFORCER),
  authorizeRole(EnforcerRole.ADMIN, EnforcerRole.OFFICER),
  (req, res) => {
    res.json({ message: 'Citation approved' });
  }
);

// ============================================================================
// SUMMARY
// ============================================================================

/*
MIDDLEWARE:

1. authenticate
   - Verifies JWT token from Authorization header
   - Attaches user to req.user
   - Checks if user status is active

2. authorize(...userTypes)
   - Pass one or more UserType enums
   - Compares with req.user.userType
   - Examples:
     * authorize(UserType.ADMIN)
     * authorize(UserType.ADMIN, UserType.ENFORCER)
     * authorize(UserType.DRIVER, UserType.VEHICLE_OWNER)

3. authorizeRole(...roles)
   - Pass one or more EnforcerRole enums
   - Only works for ADMIN and ENFORCER user types
   - Compares with req.user.role
   - Examples:
     * authorizeRole(EnforcerRole.ADMIN)
     * authorizeRole(EnforcerRole.ADMIN, EnforcerRole.OFFICER)
     * authorizeRole(EnforcerRole.TREASURER)

USAGE PATTERN:
router.METHOD('/path', authenticate, authorize(...), authorizeRole(...), controller)

SIMPLE!
*/

export default router;
