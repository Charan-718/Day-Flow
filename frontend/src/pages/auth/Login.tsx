import { type FormEvent, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRegistrationStatus } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { getApiError } from '../../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Set by the landing page's role buttons — tailors copy and the sign-up affordance.
  // Purely presentational: the real role always comes from the server on login.
  const [params] = useSearchParams();
  const asHr = params.get('role') === 'hr';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  // Only surface sign-up while no organisation exists — employees never self-register.
  const registration = useQuery({
    queryKey: ['registration-status'],
    queryFn: getRegistrationStatus,
    retry: false,
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate(user.role === 'HR_ADMIN' ? '/employees' : '/profile');
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-vibrant-card relative flex min-h-[90vh] w-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-12 lg:p-16 shadow-2xl">
      {/* Top Header */}
      <div className="text-center pt-2">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-white shadow-[var(--glow-primary)] border border-[var(--color-night-bordeaux)] overflow-hidden">
          <img src="/dayflow-logo.svg" alt="DayFlow Logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--color-heading)] mb-3">
          {asHr ? 'Admin / HR sign in' : 'Employee sign in'}
        </h1>
        <p className="text-base sm:text-lg font-medium text-[var(--color-text-muted)] max-w-xl mx-auto">
          {asHr
            ? 'Manage your organisation, people and approvals'
            : 'Use the Login ID or email provided by HR'}
        </p>
      </div>

      {/* Form Credentials Container */}
      <form onSubmit={onSubmit} className="my-auto mx-auto w-full max-w-2xl space-y-7 py-6" noValidate>
        <div>
          <label className="mb-2.5 block text-base font-semibold text-[var(--color-text-secondary)]">
            Login ID / Email
          </label>
          <input
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-6 py-4 text-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="e.g. alex@company.com or HR-1002"
            required
          />
        </div>

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label className="text-base font-semibold text-[var(--color-text-secondary)]">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              className="text-sm font-semibold text-[var(--color-powder-blue)] hover:text-white transition-colors focus:outline-none"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-6 py-4 text-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
          />
        </div>

        {showForgot && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-deep)] p-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-powder-blue)] block mb-1">Reset Password Info</span>
            There&apos;s no self-service reset. Ask your HR administrator to generate a new
            temporary password from your profile&apos;s Security tab.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-[var(--color-bordeaux-main)]/40 bg-[var(--color-bordeaux-alpha-15)] p-4 text-base font-medium text-[#ff7b79]">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="landing-btn-primary w-full justify-center py-4 text-lg font-extrabold shadow-lg rounded-2xl cursor-pointer"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'SIGN IN'}
        </button>
      </form>

      {/* Footer info & Navigation */}
      <div className="pb-2 text-center">
        {asHr && registration.data?.open ? (
          <p className="text-base text-[var(--color-text-muted)] mb-3">
            Setting up a new organisation?{' '}
            <Link
              to="/signup"
              className="font-bold text-[var(--color-powder-blue)] hover:underline transition-colors"
            >
              Create your company
            </Link>
          </p>
        ) : asHr ? (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
            An organisation is already set up for this workspace — sign in with your HR account
            above.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
            Employee accounts are provisioned by HR — there is no public sign-up.
          </p>
        )}

        <p className="text-base">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-powder-blue)] transition-colors"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
