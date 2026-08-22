import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import * as controller from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  createEmployeeSchema,
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  changePasswordSchema,
} from './auth.schema';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts', code: 'RATE_LIMITED' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts', code: 'RATE_LIMITED' },
});

const router = Router();

// Public sign-up is HR/company bootstrap only — the service refuses once an organisation
// exists, so employees can never self-register.
router.get('/registration-status', controller.registrationStatus);
router.post('/register', registerLimiter, validate(registerSchema), controller.register);

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
router.post(
  '/employees',
  requireAuth,
  requireRole(Role.HR_ADMIN),
  validate(createEmployeeSchema),
  controller.createEmployee
);
router.get('/me', requireAuth, controller.me);
router.post('/logout', requireAuth, controller.logout);
router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  controller.changePassword
);

export default router;
