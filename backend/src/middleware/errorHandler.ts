import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/responseEnvelope';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    sendError(res, message, 'VALIDATION_ERROR', 400);
    return;
  }

  console.error('[unhandled]', err);
  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
}
