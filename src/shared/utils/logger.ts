import winston from 'winston';
import { env } from '@/config/env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const devFormat = combine(colorize(), timestamp({ format: 'HH:mm:ss' }), simple());

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'moxsend-engine' },
  transports: [new winston.transports.Console()],
});