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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)] items-stretch w-full">
      {/* Calendar Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-xl flex flex-col justify-between w-full min-h-[460px]">
        {/* Calendar Header Toolbar */}
        <div className="mb-6 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="Previous month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none"
            >
              ‹
            </button>
            <p className="min-w-[140px] text-center text-lg sm:text-xl font-black text-[var(--color-powder-blue)]" aria-live="polite">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              aria-label="Next month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-4 py-2 text-xs font-bold text-[var(--color-powder-blue)] hover:text-white transition-colors focus-visible:outline-none shadow-sm"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1.5 sm:gap-2.5 text-center text-xs w-full">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="py-2.5 font-bold uppercase tracking-wider text-[var(--color-text-secondary)] text-[11px]">
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
                className={`relative flex h-11 sm:h-12 lg:h-14 cursor-pointer flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-lg font-bold scale-[1.03]'
                    : isToday
                      ? 'border-2 border-[var(--color-powder-blue)] text-[var(--color-powder-blue)] font-extrabold bg-[var(--color-background-deep)]'
                      : holiday
                        ? 'font-bold text-[var(--color-powder-blue)] bg-[var(--color-primary-alpha-12)] hover:bg-[var(--color-surface-hover)]'
                        : 'text-[var(--color-text)] bg-[var(--color-background-deep)] hover:bg-[var(--color-surface-hover)] hover:text-white'
                }`}
              >
                <span>{day}</span>
                {dayRequests.length > 0 && (
                  <span
                    className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-white' : STATUS_COLORS[dayRequests[0].status] || 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right-Side Date Details & Information Panel */}
      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl space-y-6">
        {/* Selected Date Info Section */}
        <div>
          <p className="mb-2 text-base font-extrabold text-[var(--color-text)]">
            {selected
              ? new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a date'}
          </p>
          {!selected && (
            <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed">
              Click any day to see what's scheduled, or request time off for it.
            </p>
          )}
          {selected && selectedHoliday && (
            <p className="mb-3 text-sm font-bold text-[var(--color-powder-blue)]">🎉 {selectedHoliday.name}</p>
          )}
          {selected && selectedRequests.length > 0 && (
            <ul className="space-y-3 mt-3">
              {selectedRequests.map((r) => (
                <li key={r.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] p-3.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--color-text)]">{r.leaveType.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mb-3 text-xs font-mono text-[var(--color-text-muted)]">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  </p>
                  {onViewRequest && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => onViewRequest(r.id)} className="w-full justify-center">
                      View details
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selected && selectedRequests.length === 0 && !selectedHoliday && (
            <div className="mt-2">
              <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">No time off scheduled.</p>
              {onRequestDate && (
                <Button type="button" size="sm" onClick={() => onRequestDate(selected)} className="w-full justify-center font-bold">
                  Request time off
                </Button>
              )}
            </div>
          )}
        </div>

        <hr className="border-t border-[var(--color-border)]/60" />

        {/* Legend Section */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Legend</p>
          <ul className="space-y-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <li className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)] shadow-sm" /> Approved
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)] shadow-sm" /> Pending
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)] shadow-sm" /> Rejected
            </li>
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--color-powder-blue)]" />{' '}
              Public holiday
            </li>
          </ul>
        </div>

        <hr className="border-t border-[var(--color-border)]/60" />

        {/* Holidays Section */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Holidays in {monthLabel}</p>
          <ul className="space-y-2 text-xs font-semibold text-[var(--color-text-secondary)]">
            {monthHolidays.length === 0 && <li className="text-[var(--color-text-muted)] font-normal">None this month</li>}
            {monthHolidays.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <span className="font-mono text-[var(--color-powder-blue)] font-bold">
                  {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:
                </span>{' '}
                <span className="text-[var(--color-text)]">{h.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
