import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, getToday } from '../services/attendance';
import { AttendanceDot } from './StatusBadge';
import { useToast } from './Toast';
import { getApiError } from '../api/client';

function formatElapsed(since: string | null) {
  if (!since) return '0:00';
  const ms = Date.now() - new Date(since).getTime();
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function CheckInWidget() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ['attendance-today'], queryFn: getToday });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!data?.isCheckedIn) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [data?.isCheckedIn]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (data?.isCheckedIn) return checkOut();
      return checkIn();
    },
    onSuccess: (result) => {
      const at = (result as { event?: { occurredAt?: string } })?.event?.occurredAt;
      showToast('success', data?.isCheckedIn ? `Checked out${at ? ` at ${formatTime(at)}` : ''}` : `Checked in${at ? ` at ${formatTime(at)}` : ''}`);
      void qc.invalidateQueries({ queryKey: ['attendance-today'] });
      void qc.invalidateQueries({ queryKey: ['attendance-me'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const isCheckedIn = Boolean(data?.isCheckedIn);
  const statusLabel = isCheckedIn
    ? `Checked in${data?.checkIn ? ` at ${formatTime(data.checkIn)}` : ''}, ${formatElapsed(data?.checkIn ?? null)} elapsed`
    : 'Not checked in';

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-3 py-1.5 shadow-sm"
      title={statusLabel}
    >
      <div className="flex items-center gap-1.5">
        <AttendanceDot checkedIn={isCheckedIn} />
        <span className="hidden font-mono text-xs font-bold text-[var(--color-text-secondary)] sm:inline">
          {isCheckedIn ? formatElapsed(data?.checkIn ?? null) : 'Out'}
        </span>
      </div>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        aria-label={`${isCheckedIn ? 'Check out' : 'Check in'}. ${statusLabel}.`}
        className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-3 py-1 text-xs font-black text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none"
      >
        {mutation.isPending ? '…' : isCheckedIn ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );
}
