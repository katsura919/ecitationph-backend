import { Router } from 'express';
import authAdminRoutes from '../modules/authentication/admin/admin.auth.routes';
import authEnforcerRoutes from '../modules/authentication/enforcer/enforcer.auth.routes';
import authVehicleOwnerRoutes from '../modules/authentication/vehicle-owner/vehicle-owner.auth.routes';
import authDriverRoutes from '../modules/authentication/driver/driver.auth.routes';

const router = Router();

// Mount routes
router.use('/auth/admin', authAdminRoutes);
router.use('/auth/enforcer', authEnforcerRoutes);
router.use('/auth/vehicle-owner', authVehicleOwnerRoutes);
router.use('/auth/driver', authDriverRoutes);

export default router;
