import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDismissableMenu } from '../hooks/useDismissableMenu';
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
  `relative flex items-center h-[72px] px-1 text-base font-bold transition-colors focus-visible:outline-none ${
    isActive
      ? 'text-[var(--color-powder-blue)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-[var(--color-powder-blue)]'
      : 'text-[var(--color-text-secondary)] hover:text-white'
  }`;

const drawerNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-12 items-center rounded-xl px-3 text-base font-bold transition-colors ${
    isActive
      ? 'bg-[var(--color-primary-alpha-12)] text-[var(--color-powder-blue)]'
      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = user?.role === 'HR_ADMIN';
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const company = useQuery({ queryKey: ['company'], queryFn: getCompany });

  const menuRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(menuRef, menuOpen, () => setMenuOpen(false));

  async function handleLogout() {
    setMenuOpen(false);
    setMobileNavOpen(false);
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 72px Fixed Height Full-Width Navbar with 24-48px Horizontal Padding */}
      <header className="sticky top-0 z-30 h-[72px] w-full border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
        <div className="flex h-full w-full items-center justify-between px-6 sm:px-8 lg:px-12 xl:px-16">
          {/* LEFT: Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="-ml-1 rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white md:hidden focus-visible:outline-none"
            >
              <MenuIcon size={22} />
            </button>

            <NavLink to="/" className="flex items-center gap-3 font-black text-xl tracking-tight text-[var(--color-powder-blue)] shrink-0">
              {company.data?.logoUrl ? (
                <img src={company.data.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-extrabold text-white shadow-md">
                  {company.data?.code?.slice(0, 2) || 'DF'}
                </span>
              )}
              <span>{company.data?.name || 'DayFlow'}</span>
            </NavLink>

            {/* CENTER: Main Navigation Links */}
            <nav className="ml-10 hidden items-center gap-7 lg:gap-8 md:flex h-full">
              {visibleItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* RIGHT: Controls, Notification & User Profile */}
          <div className="flex items-center gap-5 sm:gap-6">
            {user?.employeeId && <CheckInWidget />}
            <NotificationBell />

            {/* User Profile */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-3 rounded-2xl p-2 hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none cursor-pointer"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-alpha-12)] text-base font-bold text-[var(--color-powder-blue)] border border-[var(--color-border)] shadow-sm">
                  {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </span>
                <span className="hidden text-base font-bold text-[var(--color-text)] sm:inline">
                  {user?.firstName || user?.loginId}
                </span>
                <CaretDownIcon size={14} className="hidden text-[var(--color-text-muted)] sm:block" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-5 py-3 text-left text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none cursor-pointer"
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
                    className="block w-full px-5 py-3 text-left text-sm font-bold text-[#ff7b79] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-10 flex flex-col flex-1 min-h-[calc(100dvh-72px)]">
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
    <div className="bg-grid-pattern flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-[80vw] min-h-[90vh] flex flex-col justify-center">
        <Outlet />
      </div>
    </div>
  );
}
