import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  status = 200
): Response {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  message: string,
  code: string,
  status = 400
): Response {
  return res.status(status).json({ success: false, message, code });
}
