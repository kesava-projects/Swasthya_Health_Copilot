import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error occurred';

  // Log error with safe metadata
  logger.error('Unhandled Application Error:', {
    path: req.originalUrl,
    method: req.method,
    status,
    message,
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Never leak internal stack trace in production
  res.status(status).json({
    success: false,
    error: status === 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
