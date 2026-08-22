import { AirplaneIcon } from './icons';

// DESIGN_SYSTEM §22.1 — sentence case, never the raw enum: "Half day", not "HALF_DAY".
function formatStatusLabel(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    APPROVED: 'bg-[var(--success-soft)] text-[var(--success)]',
    REJECTED: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    PRESENT: 'bg-[var(--success-soft)] text-[var(--success)]',
    ABSENT: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    HALF_DAY: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    // DESIGN_SYSTEM §1.4 — a distinct hue from --accent, so "on leave" never reads as
    // a clickable/primary element the way it did sharing the brand color.
    LEAVE: 'bg-[var(--info-soft)] text-[var(--info)]',
    // §1.4 — ACTIVE is quiet on purpose: almost everyone is active, so it should not
    // compete for attention with the two-or-three accounts that are actually flagged.
    ACTIVE: 'bg-[var(--bg)] text-[var(--muted)]',
    PENDING_ACTIVATION: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    SUSPENDED: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
        map[status] || 'bg-[var(--bg)] text-[var(--muted)]'
      }`}
    >
      {label ?? formatStatusLabel(status)}
    </span>
  );
}

/** Binary checked-in/out indicator for the nav check-in widget — that control's own
 *  state genuinely is binary, unlike a directory card's daily status (see PresenceDot). */
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

export type PresenceState = 'IN_OFFICE' | 'ON_LEAVE' | 'ABSENT' | 'CHECKED_OUT';

/** DESIGN_SYSTEM §1.4/§22.2 — four states, matching the wireframe's 🟢/✈️/🟡 distinction
 *  instead of collapsing "on leave", "absent", and "worked and went home" into one dot. */
export function derivePresenceState(today: {
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  isCheckedIn: boolean;
}): PresenceState {
  if (today.status === 'LEAVE') return 'ON_LEAVE';
  if (today.isCheckedIn) return 'IN_OFFICE';
  if (today.checkIn && today.checkOut) return 'CHECKED_OUT';
  return 'ABSENT';
}

const PRESENCE_LABEL: Record<PresenceState, string> = {
  IN_OFFICE: 'In office',
  ON_LEAVE: 'On approved leave',
  ABSENT: 'Absent — no time off on file',
  CHECKED_OUT: 'Checked out for the day',
};

export function PresenceDot({ state, size = 10 }: { state: PresenceState; size?: number }) {
  const label = PRESENCE_LABEL[state];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {state === 'ON_LEAVE' ? (
        <AirplaneIcon size={size} className="text-[var(--info)]" aria-hidden="true" />
      ) : state === 'ABSENT' ? (
        <span className="block h-full w-full rounded-full border-2 border-[var(--warning)] bg-white" />
      ) : (
        <span
          className={`block h-full w-full rounded-full ${
            state === 'IN_OFFICE' ? 'bg-[var(--success)]' : 'bg-[var(--muted)]'
          }`}
        />
      )}
    </span>
  );
}
