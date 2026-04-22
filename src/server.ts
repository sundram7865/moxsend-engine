import 'dotenv/config';
import app from './app';
import { env } from '@/config/env';
import { connectDB, disconnectDB } from '@/config/prisma.config';
import { logger } from '@/shared/utils/logger';
import { startWorker } from './modules/queue/job.worker';

async function bootstrap(): Promise<void> {
  // Connect to Postgres via Prisma
  await connectDB();
  logger.info('✅  Database connected');
  await startWorker();
  logger.info('✅  RabbitMQ worker started');
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  Moxsend Engine running on http://localhost:${env.PORT}`);
    logger.info(`📦  Environment: ${env.NODE_ENV}`);
    logger.info(`🤖  LLM mode: ${env.LLM_MODE}`);
    logger.info(`⚙️   Worker concurrency: ${env.WORKER_CONCURRENCY}`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[SHUTDOWN] ${signal} received — closing server...`);

    server.close(async () => {
      await disconnectDB();
      logger.info('[SHUTDOWN] Database disconnected. Bye 👋');
      process.exit(0);
    });

    // Force exit if not closed in 10s
    setTimeout(() => {
      logger.error('[SHUTDOWN] Forced exit after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[UNHANDLED REJECTION]', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[UNCAUGHT EXCEPTION]', err);
    process.exit(1);
  });
}

bootstrap().catch((err: Error) => {
  console.error('❌  Failed to start server:', err.message);
  process.exit(1);
});