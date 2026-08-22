import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { sendError } from '../utils/responseEnvelope';

type RequestPart = 'body' | 'query' | 'params';

// ZodTypeAny (not AnyZodObject) so schemas using .refine()/.superRefine() — e.g. the
// register schema's password-confirmation check — can be validated too.
export function validate(schema: ZodTypeAny, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      if (part === 'query') {
        // Express 4 query is read-only-ish; merge onto req for typed access
        Object.assign(req.query, parsed);
      } else {
        req[part] = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        sendError(res, message || 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
      }
      next(err);
    }
  };
}
