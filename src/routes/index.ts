import { Router } from 'express';
import authRoutes from '../modules/authentication/enforcer/enforcer.auth.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);

export default router;
