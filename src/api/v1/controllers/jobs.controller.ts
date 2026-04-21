import type { Request, Response, NextFunction } from 'express';
import { getJobStatus, getJobResults, getPaginatedJobs } from '@/modules/jobs/job.service';

export async function fetchJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getJobStatus(req.params.jobId as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function fetchJobResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getJobResults(req.params.jobId as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function fetchAllJobs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));

    const result = await getPaginatedJobs(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}