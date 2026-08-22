import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
import { getApiError } from '../../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('rahul@dayflow.local');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
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
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Dayflow</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Sign in to your HR workspace</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Email or Login ID</span>
          <input
            className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Password</span>
          <input
            type="password"
            className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-md bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">Demo accounts</p>
        <p className="mt-1">HR: priya@dayflow.local</p>
        <p>Employee: rahul@dayflow.local</p>
        <p className="font-mono">Password@123</p>
      </div>
    </div>
  );
}
