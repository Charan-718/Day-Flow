import { type FormEvent, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRegistrationStatus } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
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
    <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)] text-lg font-bold text-white">
          Df
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {asHr ? 'Admin / HR sign in' : 'Employee sign in'}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {asHr
            ? 'Manage your organisation, people and approvals'
            : 'Use the Login ID or email provided by HR'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Login ID / Email</span>
          <input
            className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-medium text-[var(--ink)]">Password</span>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              className="rounded text-xs font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {showForgot && (
          <p className="rounded-md bg-[var(--info-soft)] px-3 py-2 text-sm text-[var(--info)]">
            There's no self-service reset. Ask your HR administrator to generate a new
            temporary password from your profile's Security tab.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'SIGN IN'}
        </Button>
      </form>

      {asHr && registration.data?.open ? (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Setting up a new organisation?{' '}
          <Link
            to="/signup"
            className="rounded font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Create your company
          </Link>
        </p>
      ) : asHr ? (
        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          An organisation is already set up for this workspace — sign in with your HR account
          above.
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Employee accounts are provisioned by HR — there is no public sign-up.
        </p>
      )}

      <p className="mt-4 text-center text-sm">
        <Link
          to="/"
          className="rounded text-[var(--muted)] hover:text-[var(--ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
