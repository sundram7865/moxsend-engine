import { Router } from 'express';
import uploadRoutes from './upload.routes';
import jobsRoutes from './jobs.routes';

const router = Router();

router.use('/upload', uploadRoutes);
router.use('/jobs', jobsRoutes);

export default router;