import * as amqplib from 'amqplib';
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
import type { QueueMessage } from './job.queue';

// ── Start Consumer ────────────────────────────────────────────────────────────

export async function startWorker(): Promise<void> {
  logger.info('[WORKER] Connecting to RabbitMQ consumer...');

  const connection = await amqplib.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(env.RABBITMQ_QUEUE, {
    durable: true,
  });

  channel.prefetch(1);

  logger.info(`[WORKER] Waiting for messages on queue: ${env.RABBITMQ_QUEUE}`);

  channel.consume(env.RABBITMQ_QUEUE, async (msg) => {
    if (!msg) return;

    let jobId = 'unknown';

    try {
      const content: QueueMessage = JSON.parse(msg.content.toString());
      jobId = content.jobId;

      logger.info(`[WORKER] Received job ${jobId} — ${content.rows.length} rows`);

      await processJob(jobId, content.rows);

      channel.ack(msg);

      logger.info(`[WORKER] Acknowledged job ${jobId}`);
    } catch (err) {
      logger.error(`[WORKER] Failed to process job ${jobId}: ${(err as Error).message}`);
      channel.nack(msg, false, false);
    }
  });

  connection.on('error', (err: Error) => {
    logger.error(`[WORKER] RabbitMQ connection error: ${err.message}`);
  });

  connection.on('close', () => {
    logger.warn('[WORKER] RabbitMQ connection closed — restarting worker in 5s');
    setTimeout(() => startWorker(), 5000);
  });
}

// ── Process Job ───────────────────────────────────────────────────────────────

async function processJob(jobId: string, rows: ParsedRow[]): Promise<void> {
  await updateJobStatus(jobId, JobStatus.PROCESSING);

  const limit = pLimit(env.WORKER_CONCURRENCY);

  const tasks = rows.map((row) =>
    limit(() => processRowWithRetry(jobId, row)),
  );

  await Promise.allSettled(tasks);

  await finalizeJob(jobId);

  logger.info(`[WORKER] Job ${jobId} finalized`);
}

// ── Process Row ───────────────────────────────────────────────────────────────

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