import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  LLM_MODE: z.enum(['grok', 'mock']).default('mock'),
  XAI_API_KEY: z.string().optional(),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  ROW_MAX_RETRIES: z.coerce.number().default(2),
  LLM_TIMEOUT_MS: z.coerce.number().default(30000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;