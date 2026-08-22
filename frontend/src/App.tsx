import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppShell, AuthLayout } from './layouts/AppShell';
import { RequireAuth, RequireRole, RoleLanding } from './routes/guards';
import { LoginPage } from './pages/auth/Login';
import { EmployeeDirectory } from './pages/employees/EmployeeDirectory';
import { EmployeeProfile } from './pages/employees/EmployeeProfile';
import { Employee360Page } from './pages/employees/Employee360';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { TimeOffPage } from './pages/leave/TimeOffPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { WorkforceHealthPage } from './pages/admin/WorkforceHealth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<RoleLanding />} />
                <Route path="/profile" element={<EmployeeProfile self />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/time-off" element={<TimeOffPage />} />

                <Route element={<RequireRole role="HR_ADMIN" />}>
                  <Route path="/employees" element={<EmployeeDirectory />} />
                  <Route path="/employees/:id" element={<EmployeeProfile />} />
                  <Route path="/employees/:id/360" element={<Employee360Page />} />
                  <Route path="/audit" element={<AuditLogPage />} />
                  <Route path="/health" element={<WorkforceHealthPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
