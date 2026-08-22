import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCompany } from '../services/company';
import { CheckInWidget } from '../components/CheckInWidget';
import { NotificationBell } from '../components/NotificationBell';
import { Drawer } from '../components/Drawer';
import { CaretDownIcon, MenuIcon } from '../components/icons';

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees', adminOnly: true },
  { to: '/attendance', label: 'Attendance', adminOnly: false },
  { to: '/time-off', label: 'Time Off', adminOnly: false },
  { to: '/audit', label: 'Audit Log', adminOnly: true },
  { to: '/health', label: 'Workforce Health', adminOnly: true },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav)] ${
    isActive
      ? 'border-b-2 border-[var(--accent)] text-white'
      : 'text-[var(--nav-muted)] hover:text-white'
  }`;

const drawerNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-12 items-center rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
    isActive
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'text-[var(--ink)] hover:bg-[var(--bg)]'
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {visibleItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {user?.employeeId && <CheckInWidget />}
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                  {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </span>
                <span className="hidden text-sm sm:inline">{user?.firstName || user?.loginId}</span>
                <CaretDownIcon size={14} className="hidden text-[var(--nav-muted)] sm:block" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-1.5 w-48 overflow-hidden rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
                    onClick={handleLogout}
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

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="left"
        maxWidth={280}
        ariaLabel="Navigation menu"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--line)] pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.loginId}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={drawerNavLinkClass}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            className={drawerNavLinkClass}
            onClick={() => setMobileNavOpen(false)}
          >
            My Profile
          </NavLink>
        </nav>

        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-full items-center rounded-md px-3 text-left text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2"
          >
            Log Out
          </button>
        </div>
      </Drawer>
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
