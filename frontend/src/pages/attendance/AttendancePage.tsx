import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminAttendance, getMyAttendance, getTimeline } from '../../services/attendance';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeftIcon, ArrowRightIcon, InboxIcon, SearchIcon } from '../../components/icons';
import { EmptyState, ErrorState, PageHeader, StatStrip } from '../../components/ui';
import { getApiError } from '../../api/client';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function countWeekdaysBetween(start: Date, end: Date) {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function AttendancePage() {
  const { user } = useAuth();
  if (user?.role === 'HR_ADMIN') return <AdminAttendance />;
  return <MyAttendance />;
}

function MyAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance-me', month, year],
    queryFn: () => getMyAttendance(month, year),
  });

  const timeline = useQuery({
    queryKey: ['timeline', user?.employeeId],
    queryFn: () => getTimeline(user!.employeeId!),
    enabled: Boolean(user?.employeeId),
  });

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const workingDaysStat = isCurrentMonth
    ? {
        label: 'Working days elapsed',
        value: countWeekdaysBetween(new Date(year, month - 1, 1), now),
      }
    : { label: 'Working days', value: data?.summary.totalWorkingDays ?? 0 };

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Your monthly presence record"
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border-control)] bg-white text-[var(--muted)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <ArrowLeftIcon size={16} />
            </button>
            <span className="min-w-[110px] text-center text-sm font-medium text-[var(--ink)]">
              {new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift(1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border-control)] bg-white text-[var(--muted)] hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <ArrowRightIcon size={16} />
            </button>
          </div>
        }
      />

      {isLoading && <TableSkeleton columns={5} />}
      {isError && <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <StatStrip
            items={[
              { label: 'Days present', value: data.summary.presentDays },
              { label: workingDaysStat.label, value: workingDaysStat.value },
              { label: 'Leave days', value: data.summary.leaveCount },
            ]}
          />

          {data.days.length === 0 ? (
            <EmptyState
              title="No attendance this month"
              hint="Check in from the header to start recording."
              icon={<InboxIcon size={22} />}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-[var(--line)] bg-white shadow-[var(--shadow)] md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Daily attendance for the selected month</caption>
                  <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Check In</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Check Out</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Work Hours</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Extra</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map(
                      (d: {
                        id: string;
                        date: string;
                        checkIn: string | null;
                        checkOut: string | null;
                        workHours: number | null;
                        extraHours: number;
                        status: string;
                      }) => (
                        <tr key={d.id} className="border-b border-[var(--line)] last:border-0">
                          <td className="px-3 py-2.5">{formatDate(d.date)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{formatTime(d.checkIn)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{formatTime(d.checkOut)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{d.workHours ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{d.extraHours || '—'}</td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={d.status} />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {data.days.map(
                  (d: {
                    id: string;
                    date: string;
                    checkIn: string | null;
                    checkOut: string | null;
                    workHours: number | null;
                    status: string;
                  }) => (
                    <div key={d.id} className="rounded-lg border border-[var(--line)] bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--ink)]">{formatDate(d.date)}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                        {formatTime(d.checkIn)} – {formatTime(d.checkOut)}
                        {d.workHours != null ? ` · ${d.workHours}h` : ''}
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          <h2 className="mb-3 mt-8 text-base font-semibold text-[var(--ink)]">Attendance timeline</h2>
          {timeline.isLoading && <TableSkeleton columns={1} rows={4} />}
          {timeline.data?.days?.length ? (
            <ol className="space-y-2 border-l-2 border-[var(--accent)] pl-4">
              {timeline.data.days.slice(0, 14).map(
                (d: {
                  date: string;
                  checkIn: string | null;
                  checkOut: string | null;
                  durationMinutes: number | null;
                  status: string;
                }) => (
                  <li key={String(d.date)} className="relative text-sm">
                    <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
                      {formatDate(d.date)}
                      <StatusBadge status={d.status} />
                    </p>
                    <p className="text-[var(--muted)]">
                      {formatTime(d.checkIn)} → {formatTime(d.checkOut)}
                      {d.durationMinutes != null ? ` · ${(d.durationMinutes / 60).toFixed(1)}h` : ''}
                    </p>
                  </li>
                )
              )}
            </ol>
          ) : (
            !timeline.isLoading && <EmptyState title="No timeline events yet" icon={<InboxIcon size={22} />} />
          )}
        </>
      )}
    </div>
  );
}

function AdminAttendance() {
  const [date, setDate] = useState(todayStr());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance-admin', date, search],
    queryFn: () => getAdminAttendance(date, search || undefined),
  });

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Organization check-in for a selected day" />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="block text-sm">
          <span className="sr-only">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-[var(--border-control)] bg-white px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          />
        </label>
        <label className="block text-sm">
          <span className="sr-only">Search employee</span>
          <div className="relative">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              placeholder="Search employee…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-md border border-[var(--border-control)] bg-white py-2 pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            />
          </div>
        </label>
      </div>

      {isLoading && <TableSkeleton columns={5} />}
      {isError && <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState
          title={`No records for ${formatDate(date)}`}
          hint="Nobody has checked in on this date yet."
          icon={<InboxIcon size={22} />}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-[var(--line)] bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Attendance for {formatDate(date)}</caption>
              <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-medium">Employee</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Check In</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Check Out</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Work Hours</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(
                  (row: {
                    employee: { id: string; firstName: string; lastName: string; employeeCode: string };
                    checkIn: string | null;
                    checkOut: string | null;
                    workHours: number | null;
                    status: string;
                  }) => (
                    <tr key={row.employee.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-3 py-2.5">
                        <Link
                          className="rounded font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          to={`/employees/${row.employee.id}`}
                        >
                          {row.employee.firstName} {row.employee.lastName}
                        </Link>
                        <div className="font-mono text-xs text-[var(--muted)]">{row.employee.employeeCode}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{formatTime(row.checkIn)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{formatTime(row.checkOut)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.workHours ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {data.items.map(
              (row: {
                employee: { id: string; firstName: string; lastName: string; employeeCode: string };
                checkIn: string | null;
                checkOut: string | null;
                status: string;
              }) => (
                <Link
                  key={row.employee.id}
                  to={`/employees/${row.employee.id}`}
                  className="block rounded-lg border border-[var(--line)] bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                    {formatTime(row.checkIn)} – {formatTime(row.checkOut)}
                  </p>
                </Link>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-[var(--line)] px-3 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-3 w-16 animate-pulse rounded bg-[var(--line)]/60" />
          ))}
        </div>
      ))}
    </div>
  );
}
