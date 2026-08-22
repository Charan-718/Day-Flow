import { useMemo, useState, type KeyboardEvent } from 'react';
import type { LeaveRequest } from '../types';
import { formatDate } from '../pages/leave/LeaveReviewDrawer';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-[var(--success)]',
  PENDING: 'bg-[var(--warning)]',
  REJECTED: 'bg-[var(--danger)]',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Holiday = { id: string; name: string; date: string };

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A single interactive month, not a static 12-month readout: navigate months, click a day
 * to see what's on it (holiday / leave request), or jump straight into a prefilled request
 * for an empty day. Days are real buttons with a roving tabindex so arrow keys move focus
 * (including across month boundaries), matching the tab-bar pattern used elsewhere in the
 * app (see EmployeeProfile's handleTabKeyDown).
 */
export function LeaveCalendar({
  requests,
  holidays,
  onRequestDate,
  onViewRequest,
}: {
  requests: LeaveRequest[];
  holidays: Holiday[];
  onRequestDate?: (dateStr: string) => void;
  onViewRequest?: (id: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState(today.getDate());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = new Date(year, month, 1).getDay();
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  function requestsOn(dateStr: string) {
    return requests.filter((r) => {
      const start = r.startDate.slice(0, 10);
      const end = r.endDate.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  }
  function holidayOn(dateStr: string) {
    return holidays.find((h) => h.date.slice(0, 10) === dateStr) || null;
  }

  function goToMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayStr);
    setFocusDay(today.getDate());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, day: number) {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = new Date(year, month, day + delta);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    setFocusDay(next.getDate());
    requestAnimationFrame(() => {
      document
        .getElementById(`cal-day-${next.getFullYear()}-${next.getMonth()}-${next.getDate()}`)
        ?.focus();
    });
  }

  const selectedRequests = selected ? requestsOn(selected) : [];
  const selectedHoliday = selected ? holidayOn(selected) : null;
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-lg border border-[var(--line)] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="Previous month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              aria-label="Next month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              ›
            </button>
            <p className="ml-2 text-sm font-semibold text-[var(--ink)]" aria-live="polite">
              {monthLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded-md border border-[var(--border-control)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Today
          </button>
        </div>

        <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="py-1 font-medium text-[var(--muted)]">
              {d}
            </span>
          ))}
          {Array.from({ length: startPad }).map((_, i) => (
            <span key={`pad-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayRequests = requestsOn(dateStr);
            const holiday = holidayOn(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selected;
            return (
              <button
                key={day}
                id={`cal-day-${year}-${month}-${day}`}
                type="button"
                role="gridcell"
                tabIndex={day === focusDay ? 0 : -1}
                onClick={() => {
                  setSelected(dateStr);
                  setFocusDay(day);
                }}
                onKeyDown={(e) => handleKeyDown(e, day)}
                aria-pressed={isSelected}
                aria-label={`${new Date(year, month, day).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}${holiday ? `, ${holiday.name}` : ''}${
                  dayRequests.length
                    ? `, ${dayRequests.length} time off request${dayRequests.length > 1 ? 's' : ''}`
                    : ''
                }`}
                className={`relative flex h-10 cursor-pointer flex-col items-center justify-center rounded-md text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white'
                    : isToday
                      ? 'border border-[var(--accent)] font-semibold text-[var(--accent)]'
                      : holiday
                        ? 'font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]'
                        : 'text-[var(--ink)] hover:bg-[var(--bg)]'
                }`}
              >
                {day}
                {dayRequests.length > 0 && (
                  <span
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${
                      isSelected ? 'bg-white' : STATUS_COLORS[dayRequests[0].status] || 'bg-[var(--line)]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-[var(--line)] bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
            {selected
              ? new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a date'}
          </p>
          {!selected && (
            <p className="text-xs text-[var(--muted)]">
              Click any day to see what's scheduled, or request time off for it.
            </p>
          )}
          {selected && selectedHoliday && (
            <p className="mb-2 text-sm text-[var(--accent)]">🎉 {selectedHoliday.name}</p>
          )}
          {selected && selectedRequests.length > 0 && (
            <ul className="space-y-2">
              {selectedRequests.map((r) => (
                <li key={r.id} className="rounded-md border border-[var(--line)] p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--ink)]">{r.leaveType.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mb-2 text-xs text-[var(--muted)]">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  </p>
                  {onViewRequest && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => onViewRequest(r.id)}>
                      View details
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selected && selectedRequests.length === 0 && !selectedHoliday && (
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">No time off scheduled.</p>
              {onRequestDate && (
                <Button type="button" size="sm" onClick={() => onRequestDate(selected)}>
                  Request time off
                </Button>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Legend</p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" /> Approved
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" /> Pending
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" /> Rejected
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)]" />{' '}
              Public holiday
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Holidays in {monthLabel}</p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            {monthHolidays.length === 0 && <li>None this month</li>}
            {monthHolidays.map((h) => (
              <li key={h.id}>
                {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:{' '}
                {h.name}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
