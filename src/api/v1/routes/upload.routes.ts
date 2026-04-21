import { Router } from 'express';
import { upload } from '@/config/multer.config';
import { uploadCSV } from '../controllers/upload.controller';

const router = Router();

/**
 * POST /api/v1/upload
 * Body: multipart/form-data with field "file" (.csv)
 * Returns: 202 with job_id immediately (non-blocking)
 */
router.post('/', upload.single('file'), uploadCSV);

export default router;