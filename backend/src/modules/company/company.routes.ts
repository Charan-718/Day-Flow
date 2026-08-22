import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import * as service from '../employees/employees.service';
import { sendSuccess } from '../../utils/responseEnvelope';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res, next) => {
  try {
    const data = await service.getCompanyInfo();
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
});

export default router;
