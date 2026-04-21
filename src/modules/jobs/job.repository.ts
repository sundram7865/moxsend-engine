import { JobStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.config';
import type {
  CreateJobInput,
  AppendResultInput,
  AppendErrorInput,
  JobWithRelations,
} from './job.types';

// ── Create ────────────────────────────────────────────────────────────────────

export async function createJob(input: CreateJobInput): Promise<JobWithRelations> {
  return prisma.job.create({
    data: {
      id: input.id,
      totalRows: input.totalRows,
      status: JobStatus.QUEUED,
    },
    include: { results: true, rowErrors: true },
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function findJobById(id: string): Promise<JobWithRelations | null> {
  return prisma.job.findUnique({
    where: { id },
    include: {
      results: { orderBy: { rowIndex: 'asc' } },
      rowErrors: { orderBy: { rowIndex: 'asc' } },
    },
  });
}

export async function findJobByIdOrThrow(id: string): Promise<JobWithRelations> {
  const job = await findJobById(id);
  if (!job) {
    throw Object.assign(new Error(`Job not found: ${id}`), { code: 'JOB_NOT_FOUND' });
  }
  return job;
}

export async function listJobs(
  page: number,
  limit: number,
): Promise<{ jobs: JobWithRelations[]; total: number }> {
  const skip = (page - 1) * limit;

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { results: false, rowErrors: false },
    }),
    prisma.job.count(),
  ]);

  return { jobs: jobs as unknown as JobWithRelations[], total };
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { status },
  });
}

export async function appendResult(input: AppendResultInput): Promise<void> {
  await prisma.$transaction([
    prisma.result.create({
      data: {
        jobId: input.jobId,
        rowIndex: input.rowIndex,
        name: input.name,
        company: input.company,
        industry: input.industry,
        city: input.city,
        openingLine: input.openingLine,
        email: input.email,
        subjectLine1: input.subjectLine1,
        subjectLine2: input.subjectLine2,
      },
    }),
    prisma.job.update({
      where: { id: input.jobId },
      data: { processed: { increment: 1 } },
    }),
  ]);
}

export async function appendError(input: AppendErrorInput): Promise<void> {
  await prisma.$transaction([
    prisma.rowError.create({
      data: {
        jobId: input.jobId,
        rowIndex: input.rowIndex,
        name: input.name,
        error: input.error,
        message: input.message,
      },
    }),
    prisma.job.update({
      where: { id: input.jobId },
      data: { failed: { increment: 1 } },
    }),
  ]);
}

export async function finalizeJob(id: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return;

  let finalStatus: JobStatus;

  if (job.failed === 0) {
    finalStatus = JobStatus.COMPLETED;
  } else if (job.processed > 0) {
    finalStatus = JobStatus.PARTIAL_SUCCESS;
  } else {
    finalStatus = JobStatus.FAILED;
  }

  await prisma.job.update({
    where: { id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
    },
  });
}