import { Router, Request, Response, NextFunction } from 'express';
import * as service from './notifications.service';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { sendSuccess } from '../../utils/responseEnvelope';
import { listNotificationsQuerySchema } from './notifications.service';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  validate(listNotificationsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const unreadOnly = (req.query as { unreadOnly?: boolean }).unreadOnly;
      const data = await service.listNotifications(req.user!, unreadOnly);
      return sendSuccess(res, data, 'OK');
    } catch (err) {
      return next(err);
    }
  }
);

router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.markRead(req.params.id, req.user!);
    return sendSuccess(res, data, 'Marked as read');
  } catch (err) {
    return next(err);
  }
});

router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.markAllRead(req.user!);
    return sendSuccess(res, data, 'All notifications marked as read');
  } catch (err) {
    return next(err);
  }
});

export default router;
