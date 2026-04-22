import * as amqplib from 'amqplib';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import type { ParsedRow } from '@/modules/csv/csv.validator';

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

export interface QueueMessage {
  jobId: string;
  rows: ParsedRow[];
}

// ── Connect ───────────────────────────────────────────────────────────────────

async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  logger.info('[QUEUE] Connecting to RabbitMQ...');

  connection = await amqplib.connect(env.RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue(env.RABBITMQ_QUEUE, {
    durable: true,
  });

  connection.on('error', (err: Error) => {
    logger.error(`[QUEUE] RabbitMQ connection error: ${err.message}`);
    connection = null;
    channel = null;
  });

  connection.on('close', () => {
    logger.warn('[QUEUE] RabbitMQ connection closed');
    connection = null;
    channel = null;
  });

  logger.info('[QUEUE] RabbitMQ connected successfully');
  return channel;
}

// ── Publish ───────────────────────────────────────────────────────────────────

export async function enqueue(jobId: string, rows: ParsedRow[]): Promise<void> {
  try {
    const ch = await getChannel();

    const message: QueueMessage = { jobId, rows };
    const payload = Buffer.from(JSON.stringify(message));

    ch.sendToQueue(env.RABBITMQ_QUEUE, payload, {
      persistent: true,
      contentType: 'application/json',
    });

    logger.info(`[QUEUE] Published job ${jobId} with ${rows.length} rows to RabbitMQ`);
  } catch (err) {
    logger.error(`[QUEUE] Failed to publish job ${jobId}: ${(err as Error).message}`);
    throw err;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectQueue(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('[QUEUE] RabbitMQ disconnected');
  } catch (err) {
    logger.error(`[QUEUE] Error disconnecting RabbitMQ: ${(err as Error).message}`);
  }
}