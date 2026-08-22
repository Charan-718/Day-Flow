import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
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
    <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
      <h1 className="text-xl font-semibold">Change password</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        You must set a new password before continuing.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Current password</span>
          <input
            type="password"
            required
            className="w-full rounded-md border border-[var(--line)] px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">New password</span>
          <input
            type="password"
            required
            minLength={12}
            className="w-full rounded-md border border-[var(--line)] px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Min 12 chars, upper + lower + number
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Confirm new password</span>
          <input
            type="password"
            required
            className="w-full rounded-md border border-[var(--line)] px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
