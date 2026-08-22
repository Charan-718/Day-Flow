import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/responseEnvelope';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.login(req.body);
    return sendSuccess(res, data, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.createEmployee(
      req.body,
      req.user!.userId,
      req.user!.role,
      req.clientIp
    );
    return sendSuccess(res, data, 'Employee created successfully', 201);
  } catch (err) {
    return next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.verifyEmail(req.body);
    return sendSuccess(res, data, 'Account activated');
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getMe(req.user!.userId);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  return sendSuccess(res, null, 'Logged out');
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.changePassword(
      req.user!.userId,
      req.body,
      req.clientIp
    );
    return sendSuccess(res, data, 'Password updated');
  } catch (err) {
    return next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.register(req.body, req.clientIp);
    return sendSuccess(res, data, 'Organisation created', 201);
  } catch (err) {
    return next(err);
  }
}

export async function registrationStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await authService.registrationOpen(), 'OK');
  } catch (err) {
    return next(err);
  }
}
