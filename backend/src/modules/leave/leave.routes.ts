import { Router } from 'express';
import { Role } from '@prisma/client';
import * as controller from './leave.controller';
import {
  requireAuth,
  requireEmployeeProfile,
  requireRole,
} from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  createLeaveSchema,
  listLeaveQuerySchema,
  rejectLeaveSchema,
  reviewLeaveSchema,
} from './leave.schema';

const router = Router();

router.use(requireAuth);

router.get('/types', controller.types);
router.get('/holidays', controller.holidays);
router.get('/balance', requireEmployeeProfile(), controller.balance);
router.get('/requests', validate(listLeaveQuerySchema, 'query'), controller.list);
router.post(
  '/requests',
  requireEmployeeProfile(),
  validate(createLeaveSchema),
  controller.create
);
router.patch(
  '/requests/:id/approve',
  requireRole(Role.HR_ADMIN),
  validate(reviewLeaveSchema),
  controller.approve
);
router.patch(
  '/requests/:id/reject',
  requireRole(Role.HR_ADMIN),
  validate(rejectLeaveSchema),
  controller.reject
);

export default router;
