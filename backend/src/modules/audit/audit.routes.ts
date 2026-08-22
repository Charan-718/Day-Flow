import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as service from './audit.service';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { sendSuccess } from '../../utils/responseEnvelope';
import { auditQuerySchema } from './audit.service';

const router = Router();

router.use(requireAuth, requireRole(Role.HR_ADMIN));

router.get(
  '/',
  validate(auditQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.listAuditLogs(req.query as never);
      return sendSuccess(res, data, 'OK');
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
