import { JobStatus } from '@prisma/client';
import { parseCSV } from '@/modules/csv/csv.parser';
import { createJob } from '@/modules/jobs/job.repository';
import { enqueue } from '@/modules/queue/job.queue';
import { generateJobId } from '@/shared/utils/id.utils';
import { logger } from '@/shared/utils/logger';
import type { OutreachUploadResult } from './outreach.types';

export async function handleUpload(fileBuffer: Buffer): Promise<OutreachUploadResult> {
  // 1. Parse and validate CSV
  const { validRows, rowErrors } = parseCSV(fileBuffer);

  if (validRows.length === 0) {
    throw Object.assign(
      new Error('CSV contained no processable rows after validation.'),
      { code: 'NO_VALID_ROWS', rowErrors },
    );
  }

  // 2. Create job record in DB
  const jobId = generateJobId();
  await createJob({ id: jobId, totalRows: validRows.length });

  logger.info(`[OUTREACH] Created job ${jobId} — ${validRows.length} valid rows, ${rowErrors.length} skipped`);

  // 3. Fire async processing — does NOT block response
  enqueue(jobId, validRows);

  // 4. Estimate processing time based on concurrency
  const estimatedSecs = Math.ceil(validRows.length / 5) * 3;

  return {
    response: {
      jobId,
      status: JobStatus.QUEUED,
      totalRows: validRows.length,
      skippedRows: rowErrors.length,
      rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
      createdAt: new Date().toISOString(),
      estimatedSecs,
      pollUrl: `/api/v1/jobs/${jobId}/status`,
      resultsUrl: `/api/v1/jobs/${jobId}/results`,
    },
    skippedRows: rowErrors.length,
    rowErrors,
  };
}