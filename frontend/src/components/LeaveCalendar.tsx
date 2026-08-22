import type { LeaveRequest } from '../types';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  REJECTED: 'bg-red-500',
};

type Holiday = { id: string; name: string; date: string };

export function LeaveCalendar({
  year,
  requests,
  holidays,
}: {
  year: number;
  requests: LeaveRequest[];
  holidays: Holiday[];
}) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  function dayStatus(dateStr: string): string | null {
    const d = dateStr.slice(0, 10);
    for (const r of requests) {
      const start = r.startDate.slice(0, 10);
      const end = r.endDate.slice(0, 10);
      if (d >= start && d <= end) return r.status;
    }
    return null;
  }

  function isHoliday(dateStr: string) {
    return holidays.some((h) => h.date.slice(0, 10) === dateStr);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => (
          <MonthGrid
            key={month}
            year={year}
            month={month}
            dayStatus={dayStatus}
            isHoliday={isHoliday}
          />
        ))}
      </div>
      <aside className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Legend</p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Validated
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> To approve
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Refused
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Public holidays</p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            {holidays.length === 0 && <li>None configured</li>}
            {holidays.map((h) => (
              <li key={h.id}>
                {new Date(h.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
                : {h.name}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  dayStatus,
  isHoliday,
}: {
  year: number;
  month: number;
  dayStatus: (d: string) => string | null;
  isHoliday: (d: string) => boolean;
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const label = first.toLocaleString(undefined, { month: 'short' });

  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
          <span key={d} className="py-0.5 text-[var(--muted)]">
            {d}
          </span>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = dayStatus(dateStr);
          const holiday = isHoliday(dateStr);
          return (
            <span
              key={day}
              title={holiday ? 'Public holiday' : status || undefined}
              className={`relative rounded py-0.5 ${
                holiday ? 'font-semibold text-[var(--accent)]' : ''
              }`}
            >
              {day}
              {status && (
                <span
                  className={`absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${STATUS_COLORS[status] || 'bg-gray-300'}`}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
