import { Router } from 'express';
import { Role } from '@prisma/client';
import * as controller from './payroll.controller';
import { requireAuth, requireRole, requireSelfOrAdmin } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { upsertSalarySchema } from './payroll.schema';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/:id/salary', requireSelfOrAdmin('id'), controller.get);
router.put(
  '/:id/salary',
  requireRole(Role.HR_ADMIN),
  validate(upsertSalarySchema),
  controller.upsert
);

export default router;
