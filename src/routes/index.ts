import { Router } from 'express';
import authAdminRoutes from '../modules/authentication/admin/admin.auth.routes';
import authEnforcerRoutes from '../modules/authentication/enforcer/enforcer.auth.routes';
import authDriverRoutes from '../modules/authentication/driver/driver.auth.routes';
import violationsRoutes from '../modules/violations/violations.routes';
import citationsRoutes from '../modules/citations/citations.routes';

const router = Router();

// Mount routes
router.use('/auth/admin', authAdminRoutes);
router.use('/auth/enforcer', authEnforcerRoutes);
router.use('/auth/driver', authDriverRoutes);
router.use('/violations', violationsRoutes);
router.use('/citations', citationsRoutes);

export default router;
