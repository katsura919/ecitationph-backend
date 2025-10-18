import { Router } from 'express';
import authAdminRoutes from '../modules/authentication/admin/admin.auth.routes';
import authEnforcerRoutes from '../modules/authentication/enforcer/enforcer.auth.routes';
import authDriverRoutes from '../modules/authentication/driver/driver.auth.routes';

const router = Router();

// Mount routes
router.use('/auth/admin', authAdminRoutes);
router.use('/auth/enforcer', authEnforcerRoutes);
router.use('/auth/driver', authDriverRoutes);

export default router;
