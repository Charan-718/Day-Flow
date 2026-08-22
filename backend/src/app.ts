import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import employeesRoutes from './modules/employees/employees.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import auditRoutes from './modules/audit/audit.routes';
import filesRoutes from './modules/files/files.routes';
import companyRoutes from './modules/company/company.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '6mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Dayflow API healthy', data: { status: 'ok' } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/employees', payrollRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leave', leaveRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/files', filesRoutes);
  app.use('/api/company', companyRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
