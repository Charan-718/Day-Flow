import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, getToday } from '../services/attendance';
import { AttendanceDot } from './StatusBadge';
import { getApiError } from '../api/client';

function formatElapsed(since: string | null) {
  if (!since) return '0:00';
  const ms = Date.now() - new Date(since).getTime();
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function CheckInWidget() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['attendance-today'], queryFn: getToday });
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

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
    onSuccess: () => {
      setError('');
      void qc.invalidateQueries({ queryKey: ['attendance-today'] });
      void qc.invalidateQueries({ queryKey: ['attendance-me'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => setError(getApiError(err).message),
  });

  void tick;

  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5">
      <AttendanceDot checkedIn={Boolean(data?.isCheckedIn)} />
      <span className="hidden text-xs text-[var(--nav-muted)] sm:inline">
        {data?.isCheckedIn ? formatElapsed(data.checkIn) : 'Out'}
      </span>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {mutation.isPending ? '…' : data?.isCheckedIn ? 'Check Out' : 'Check In'}
      </button>
      {error && (
        <span className="max-w-[120px] truncate text-[10px] text-red-300" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
