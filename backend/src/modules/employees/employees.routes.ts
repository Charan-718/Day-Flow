import { Router } from 'express';
import { Role } from '@prisma/client';
import * as controller from './employees.controller';
import { requireAuth, requireRole, requireSelfOrAdmin } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { listEmployeesQuerySchema, updateEmployeeSchema } from './employees.schema';

const router = Router();

router.use(requireAuth);

router.get('/departments', controller.departments);
router.get(
  '/',
  requireRole(Role.HR_ADMIN),
  validate(listEmployeesQuerySchema, 'query'),
  controller.list
);
router.get('/:id/360', requireRole(Role.HR_ADMIN), controller.get360);
router.get('/:id', requireSelfOrAdmin('id'), controller.getById);
router.patch(
  '/:id',
  requireSelfOrAdmin('id'),
  validate(updateEmployeeSchema),
  controller.update
);

export default router;
