import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({ method: req.method, url: req.originalUrl }, 'Route not found');
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // method/url travel with every log line below so each block is self-contained —
  // pino-http stays silent on error responses (see app.ts) so this is the only
  // place a failed request gets logged, and it always shows where it came from.
  const context = { method: req.method, url: req.originalUrl };

  if (err instanceof ZodError) {
    logger.warn({ err, ...context }, 'Validation failed');
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ err, ...context }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err, ...context }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
