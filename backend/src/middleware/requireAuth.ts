import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/responseEnvelope';

export interface AuthUser extends JwtPayload {}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      clientIp?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    req.clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 'UNAUTHORIZED', 401);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 'FORBIDDEN', 403);
      return;
    }
    next();
  };
}

export function requireSelfOrAdmin(paramKey = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }
    if (req.user.role === Role.HR_ADMIN) {
      next();
      return;
    }
    const targetId = req.params[paramKey];
    if (req.user.employeeId && req.user.employeeId === targetId) {
      next();
      return;
    }
    sendError(res, 'You cannot access this resource', 'FORBIDDEN', 403);
  };
}

export function requireEmployeeProfile() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.employeeId) {
      sendError(res, 'Employee profile required', 'FORBIDDEN', 403);
      return;
    }
    next();
  };
}
