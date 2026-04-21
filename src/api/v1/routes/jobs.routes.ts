import { Router } from 'express';
import {
  fetchJobStatus,
  fetchJobResults,
  fetchAllJobs,
} from '../controllers/jobs.controller';

const router = Router();

/**
 * GET /api/v1/jobs
 * List all jobs with pagination (?page=1&limit=20)
 */
router.get('/', fetchAllJobs);

/**
 * GET /api/v1/jobs/:jobId/status
 * Poll job progress — processed count, %, ETA
 */
router.get('/:jobId/status', fetchJobStatus);

/**
 * GET /api/v1/jobs/:jobId/results
 * Fetch partial or complete results for a job
 */
router.get('/:jobId/results', fetchJobResults);

export default router;