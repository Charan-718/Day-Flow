import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCompany } from '../services/company';
import { CheckInWidget } from '../components/CheckInWidget';
import { NotificationBell } from '../components/NotificationBell';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'border-b-2 border-[var(--accent)] text-white'
      : 'text-[var(--nav-muted)] hover:text-white'
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === 'HR_ADMIN';
  const company = useQuery({ queryKey: ['company'], queryFn: getCompany });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--nav)] text-[var(--nav-text)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            {company.data?.logoUrl ? (
              <img src={company.data.logoUrl} alt="" className="h-7 w-7 rounded object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded bg-[var(--accent)] text-xs font-bold text-white">
                {company.data?.code?.slice(0, 2) || 'Df'}
              </span>
            )}
            {company.data?.name || 'Dayflow'}
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {isAdmin && (
              <NavLink to="/employees" className={linkClass}>
                Employees
              </NavLink>
            )}
            <NavLink to="/attendance" className={linkClass}>
              Attendance
            </NavLink>
            <NavLink to="/time-off" className={linkClass}>
              Time Off
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/audit" className={linkClass}>
                  Audit
                </NavLink>
                <NavLink to="/health" className={linkClass}>
                  Health
                </NavLink>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user?.employeeId && <CheckInWidget />}
            <NotificationBell />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                  {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </span>
                <span className="hidden text-sm sm:inline">
                  {user?.firstName || user?.loginId}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--bg)]"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--bg)]"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate('/login');
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
