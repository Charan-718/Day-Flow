import { Router } from 'express';
import { Role } from '@prisma/client';
import * as controller from './attendance.controller';
import {
  requireAuth,
  requireEmployeeProfile,
  requireRole,
  requireSelfOrAdmin,
} from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { dateQuerySchema, monthQuerySchema } from './attendance.schema';

const router = Router();

router.use(requireAuth);

router.post('/check-in', requireEmployeeProfile(), controller.checkIn);
router.post('/check-out', requireEmployeeProfile(), controller.checkOut);
router.get('/today', requireEmployeeProfile(), controller.today);
router.get('/me', requireEmployeeProfile(), validate(monthQuerySchema, 'query'), controller.me);
router.get(
  '/',
  requireRole(Role.HR_ADMIN),
  validate(dateQuerySchema, 'query'),
  controller.adminDay
);
router.get(
  '/:employeeId/timeline',
  requireSelfOrAdmin('employeeId'),
  controller.timeline
);

export default router;
