import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/responseEnvelope';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

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

  // Map Prisma failures to stable envelope codes instead of an opaque 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      sendError(
        res,
        target ? `That ${target} is already in use` : 'That value is already in use',
        'DUPLICATE_VALUE',
        409
      );
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 'NOT_FOUND', 404);
      return;
    }
    if (err.code === 'P2003') {
      sendError(res, 'Related record does not exist', 'INVALID_REFERENCE', 400);
      return;
    }
  }

  console.error('[unhandled]', err);
  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
}
