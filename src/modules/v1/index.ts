import { Router } from 'express';
import violationRoutes from './violations/violations.routes';
import authDriverRoutes from './authentication/driver/driver.auth.routes';
import authEnforcerRoutes from './authentication/enforcer/enforcer.auth.routes';
import authAdminRoutes from './authentication/admin/admin.auth.routes';
import citationRoutes from './citations/citations.routes';
import driverRoutes from './driver/driver.routes';

const router = Router();

router.use('/violations', violationRoutes);
router.use('/auth/driver', authDriverRoutes);
router.use('/auth/enforcer', authEnforcerRoutes);
router.use('/auth/admin', authAdminRoutes);
router.use('/citations', citationRoutes);
router.use('/drivers', driverRoutes);

export default router;