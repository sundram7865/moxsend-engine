import { logger } from '@/shared/utils/logger';
import { processJob } from './job.worker';
import type { ParsedRow } from '@/modules/csv/csv.validator';

/**
 * Enqueue a job for async background processing.
 *
 * Uses setImmediate so the HTTP response is sent BEFORE processing begins.
 * The caller gets a job_id in <100ms regardless of CSV size.
 *
 * Production upgrade path:
 *   Replace setImmediate with BullMQ queue.add() — zero other changes needed.
 *   queue.add('process-job', { jobId, rows }) and processJob becomes a BullMQ Worker handler.
 */
export function enqueue(jobId: string, rows: ParsedRow[]): void {
  logger.info(`[QUEUE] Enqueuing job ${jobId} with ${rows.length} rows`);

  setImmediate(() => {
    processJob(jobId, rows).catch((err: Error) => {
      logger.error(`[QUEUE] Unhandled error in job ${jobId}: ${err.message}`);
    });
  });
}