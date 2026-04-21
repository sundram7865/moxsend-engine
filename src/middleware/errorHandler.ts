import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';

interface AppError extends Error {
  code?: string;
  statusCode?: number;
  rowErrors?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(`[ERROR] ${err.message}`, { stack: err.stack, code: err.code });

  // Known application errors
  const knownErrors: Record<string, { status: number }> = {
    JOB_NOT_FOUND: { status: 404 },
    INVALID_CSV: { status: 422 },
    EMPTY_CSV: { status: 422 },
    TOO_MANY_ROWS: { status: 422 },
    NO_VALID_ROWS: { status: 422 },
    NO_FILE: { status: 400 },
  };

  const code = err.code ?? 'INTERNAL_ERROR';
  const known = knownErrors[code];

  res.status(known?.status ?? err.statusCode ?? 500).json({
    error: code,
    message: err.message,
    ...(err.rowErrors ? { rowErrors: err.rowErrors } : {}),
  });
}