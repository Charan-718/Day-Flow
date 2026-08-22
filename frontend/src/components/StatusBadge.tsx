export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    APPROVED: 'bg-[var(--success-soft)] text-[var(--success)]',
    REJECTED: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    PRESENT: 'bg-[var(--success-soft)] text-[var(--success)]',
    ABSENT: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    HALF_DAY: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    LEAVE: 'bg-[var(--accent-soft)] text-[var(--accent)]',
    ACTIVE: 'bg-[var(--success-soft)] text-[var(--success)]',
  };
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold tracking-wide ${
        map[status] || 'bg-[var(--bg)] text-[var(--muted)]'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function PresenceIndicator({ presence }: { presence: 'present' | 'on_leave' | 'absent' }) {
  if (presence === 'on_leave') {
    return (
      <span title="On leave" className="text-sm" aria-label="On leave">
        ✈️
      </span>
    );
  }
  if (presence === 'present') {
    return (
      <span
        title="Present"
        className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--success)]"
      />
    );
  }
  return (
    <span
      title="Absent"
      className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--warning)]"
    />
  );
}

export function AttendanceDot({ checkedIn }: { checkedIn: boolean }) {
  return (
    <span
      title={checkedIn ? 'Checked in' : 'Checked out'}
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        checkedIn ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
      }`}
    />
  );
}
