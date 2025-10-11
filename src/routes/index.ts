import { Router } from 'express';
import authRoutes from '../modules/authentication/user/user.auth.routes';
import driverAuthRoutes from '../modules/authentication/driver/driver.auth.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/driver-auth', driverAuthRoutes);

export default router;
