import { findJobByIdOrThrow, listJobs } from './job.repository';
import type { JobStatusResponse, JobResultsResponse, JobSummary, ResultRow, RowErrorResponse } from '@/shared/types/api.types';
import type { PaginatedResponse } from '@/shared/types/common.types';

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const job = await findJobByIdOrThrow(jobId);

  const total = job.totalRows;
  const done = job.processed + job.failed;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    jobId: job.id,
    status: job.status,
    progressPct,
    totalRows: job.totalRows,
    processed: job.processed,
    failed: job.failed,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function getJobResults(jobId: string): Promise<JobResultsResponse> {
  const job = await findJobByIdOrThrow(jobId);

  const results: ResultRow[] = job.results.map((r) => ({
    id: r.id,
    rowIndex: r.rowIndex,
    name: r.name,
    company: r.company,
    industry: r.industry,
    city: r.city,
    openingLine: r.openingLine,
    email: r.email,
    subjectLines: [r.subjectLine1, r.subjectLine2],
    processedAt: r.processedAt.toISOString(),
  }));

  const errors: RowErrorResponse[] = job.rowErrors.map((e) => ({
    rowIndex: e.rowIndex,
    name: e.name,
    error: e.error,
    message: e.message,
    failedAt: e.failedAt.toISOString(),
  }));

  return {
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processed: job.processed,
    failed: job.failed,
    results,
    errors: errors.length > 0 ? errors : undefined,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function getPaginatedJobs(
  page: number,
  limit: number,
): Promise<PaginatedResponse<JobSummary>> {
  const { jobs, total } = await listJobs(page, limit);

  const data: JobSummary[] = jobs.map((j) => ({
    jobId: j.id,
    status: j.status,
    totalRows: j.totalRows,
    processed: j.processed,
    failed: j.failed,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}