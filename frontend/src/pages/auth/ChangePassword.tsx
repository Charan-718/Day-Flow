import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { getApiError } from '../../api/client';

export function ChangePasswordPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: async () => {
      await refresh();
      navigate(user?.role === 'HR_ADMIN' ? '/employees' : '/profile');
    },
    onError: (err) => setError(getApiError(err).message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="landing-vibrant-card relative flex min-h-[90vh] w-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-12 shadow-2xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-heading)] mb-2">Change password</h1>
      <p className="text-sm font-medium text-[var(--color-text-muted)]">
        You must set a new password before continuing.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Current password</label>
          <input
            type="password"
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-4 py-3 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">New password</label>
          <input
            type="password"
            required
            minLength={12}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-4 py-3 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <span className="mt-1.5 block text-xs text-[var(--color-text-muted)]">
            Min 12 chars, upper + lower + number
          </span>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Confirm new password</label>
          <input
            type="password"
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-4 py-3 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <div role="alert" className="rounded-xl border border-[var(--color-bordeaux-main)]/40 bg-[var(--color-bordeaux-alpha-15)] p-4 text-sm font-medium text-[#ff7b79]">
            {error}
          </div>
        )}
        <button type="submit" className="landing-btn-primary w-full justify-center py-3.5 text-base font-bold shadow-[var(--shadow-md)] cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
