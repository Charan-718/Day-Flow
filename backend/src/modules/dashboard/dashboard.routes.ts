import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as service from './dashboard.service';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { sendSuccess } from '../../utils/responseEnvelope';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getSummary(req.user!);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
});

router.get(
  '/health-score',
  requireRole(Role.HR_ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.getHealthScore();
      return sendSuccess(res, data, 'OK');
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
