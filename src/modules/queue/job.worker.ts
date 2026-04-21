import pLimit from 'p-limit';
import { JobStatus } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { sleep } from '@/shared/utils/sleep.utils';
import { generateOutreach } from '@/modules/llm/llm.service';
import {
  updateJobStatus,
  appendResult,
  appendError,
  finalizeJob,
} from '@/modules/jobs/job.repository';
import type { ParsedRow } from '@/modules/csv/csv.validator';

export async function processJob(jobId: string, rows: ParsedRow[]): Promise<void> {
  logger.info(`[WORKER] Starting job ${jobId} — ${rows.length} rows`);

  await updateJobStatus(jobId, JobStatus.PROCESSING);

  const limit = pLimit(env.WORKER_CONCURRENCY);

  const tasks = rows.map((row) =>
    limit(() => processRowWithRetry(jobId, row)),
  );

  // allSettled ensures all rows are attempted even if some fail
  await Promise.allSettled(tasks);

  await finalizeJob(jobId);

  logger.info(`[WORKER] Job ${jobId} finalized`);
}

async function processRowWithRetry(
  jobId: string,
  row: ParsedRow,
  attempt = 1,
): Promise<void> {
  try {
    logger.debug(
      `[ROW] job=${jobId} row=${row._rowIndex} attempt=${attempt} name=${row.name}`,
    );

    const output = await generateOutreach({
      rowIndex: row._rowIndex,
      name: row.name,
      company: row.company,
      industry: row.industry,
      city: row.city,
    });

    await appendResult({
      jobId,
      rowIndex: row._rowIndex,
      name: row.name,
      company: row.company,
      industry: row.industry,
      city: row.city,
      openingLine: output.openingLine,
      email: output.email,
      subjectLine1: output.subjectLines[0],
      subjectLine2: output.subjectLines[1],
    });

    logger.debug(`[ROW OK] job=${jobId} row=${row._rowIndex} name=${row.name}`);
  } catch (err) {
    const errMessage = (err as Error).message;

    if (attempt < env.ROW_MAX_RETRIES) {
      // Exponential backoff: 1s → 2s → 4s
      const delay = 1000 * Math.pow(2, attempt - 1);
      logger.warn(
        `[RETRY] job=${jobId} row=${row._rowIndex} attempt=${attempt} — retrying in ${delay}ms`,
      );
      await sleep(delay);
      return processRowWithRetry(jobId, row, attempt + 1);
    }

    logger.error(
      `[ROW FAIL] job=${jobId} row=${row._rowIndex} name=${row.name} — ${errMessage}`,
    );

    await appendError({
      jobId,
      rowIndex: row._rowIndex,
      name: row.name,
      error: 'ROW_FAILED',
      message: errMessage,
    });
  }
}