import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminAttendance, getMyAttendance, getTimeline } from '../../services/attendance';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeftIcon, ArrowRightIcon, InboxIcon, SearchIcon } from '../../components/icons';
import { EmptyState, ErrorState, PageHeader } from '../../components/ui';
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
    <div className="w-full space-y-8 pb-12">
      {/* 1. Attendance Header with Integrated Month Navigation */}
      <PageHeader
        title="Attendance"
        subtitle="Your monthly presence record"
        actions={
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-md">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none"
            >
              <ArrowLeftIcon size={16} />
            </button>
            <span className="min-w-[140px] text-center text-base font-black text-[var(--color-powder-blue)]">
              {new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift(1)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none"
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
          {/* 2. Attendance Statistics Section (Equal 4-Column Grid on Desktop) */}
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Days Present',
                value: data.summary.presentDays,
                subtext: 'This month',
                accentColor: 'text-[var(--color-powder-blue)]',
              },
              {
                label: workingDaysStat.label,
                value: workingDaysStat.value,
                subtext: isCurrentMonth ? 'Period elapsed' : 'Total in month',
                accentColor: 'text-[var(--color-text-secondary)]',
              },
              {
                label: 'Leave Days',
                value: data.summary.leaveCount,
                subtext: 'Approved leaves',
                accentColor: data.summary.leaveCount > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-powder-blue)]',
              },
              {
                label: 'Payable Days',
                value: data.summary.payableDays ?? '—',
                subtext: 'Net payable',
                accentColor: 'text-[var(--color-powder-blue)]',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex h-full min-h-[120px] flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xl transition-all hover:border-[var(--color-powder-blue)]/40 hover:shadow-2xl"
              >
                <div>
                  <p className="text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {stat.label}
                  </p>
                  <p className={`mt-3 text-[var(--font-size-md)] font-black tabular-nums ${stat.accentColor}`}>
                    {stat.value}
                  </p>
                </div>
                <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
                  {stat.subtext}
                </p>
              </div>
            ))}
          </div>

          {/* 3. Attendance Records Section Card */}
          <div className="space-y-4">
            <h2 className="text-[var(--font-size-md)] font-extrabold text-[var(--color-heading)] tracking-tight">
              Attendance Records
            </h2>

            {data.days.length === 0 ? (
              <EmptyState
                title="No attendance this month"
                hint="Check in from the header to start recording."
                icon={<InboxIcon size={22} />}
              />
            ) : (
              <>
                <div className="hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xl md:block">
                  <div className="overflow-hidden rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-background-deep)]">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Daily attendance for the selected month</caption>
                      <thead className="border-b border-[var(--color-border)] bg-[var(--color-background-deep)] text-[var(--color-text-secondary)]">
                        <tr>
                          <th scope="col" className="px-6 py-4.5 font-bold uppercase text-xs tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-4.5 font-bold uppercase text-xs tracking-wider">Check In</th>
                          <th scope="col" className="px-6 py-4.5 font-bold uppercase text-xs tracking-wider">Check Out</th>
                          <th scope="col" className="px-6 py-4.5 text-right font-bold uppercase text-xs tracking-wider">Work Hours</th>
                          <th scope="col" className="px-6 py-4.5 text-right font-bold uppercase text-xs tracking-wider">Extra</th>
                          <th scope="col" className="px-6 py-4.5 font-bold uppercase text-xs tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/50 bg-[var(--color-surface)]">
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
                            <tr key={d.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                              <td className="px-6 py-4.5 font-bold text-[var(--color-text)]">{formatDate(d.date)}</td>
                              <td className="px-6 py-4.5 font-mono text-xs text-[var(--color-powder-blue)]">{formatTime(d.checkIn)}</td>
                              <td className="px-6 py-4.5 font-mono text-xs text-[var(--color-powder-blue)]">{formatTime(d.checkOut)}</td>
                              <td className="px-6 py-4.5 text-right font-mono font-bold text-[var(--color-text)]">
                                {d.workHours != null ? `${d.workHours.toFixed(1)}h` : '—'}
                              </td>
                              <td className="px-6 py-4.5 text-right font-mono font-bold text-[var(--color-text-muted)]">
                                {d.extraHours ? `+${d.extraHours.toFixed(1)}h` : '—'}
                              </td>
                              <td className="px-6 py-4.5">
                                <StatusBadge status={d.status} />
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {data.days.map(
                    (d: {
                      id: string;
                      date: string;
                      checkIn: string | null;
                      checkOut: string | null;
                      workHours: number | null;
                      status: string;
                    }) => (
                      <div key={d.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[var(--color-text)]">{formatDate(d.date)}</p>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="mt-2 font-mono text-xs text-[var(--color-powder-blue)]">
                          {formatTime(d.checkIn)} – {formatTime(d.checkOut)}
                          {d.workHours != null ? ` · ${d.workHours.toFixed(1)}h` : ''}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* 4. Attendance Timeline Section Card */}
          <div className="space-y-4">
            <h2 className="text-[var(--font-size-md)] font-extrabold text-[var(--color-heading)] tracking-tight">
              Attendance Timeline
            </h2>

            {timeline.isLoading && <TableSkeleton columns={1} rows={4} />}
            {timeline.data?.days?.length ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xl">
                <ol className="relative space-y-6 border-l-2 border-[var(--color-primary)]/80 pl-6 ml-2">
                  {timeline.data.days.slice(0, 14).map(
                    (d: {
                      date: string;
                      checkIn: string | null;
                      checkOut: string | null;
                      durationMinutes: number | null;
                      status: string;
                    }) => (
                      <li key={String(d.date)} className="relative">
                        <span className="absolute -left-[1.95rem] top-1.5 h-3.5 w-3.5 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-surface)] shadow-md" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold text-[var(--color-text)]">{formatDate(d.date)}</span>
                            <StatusBadge status={d.status} />
                          </div>
                          {d.durationMinutes != null && (
                            <span className="font-mono text-xs font-bold text-[var(--color-powder-blue)]">
                              {(d.durationMinutes / 60).toFixed(1)} hours
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 font-mono text-xs font-medium text-[var(--color-text-secondary)]">
                          <span>{formatTime(d.checkIn)}</span>
                          <span className="text-[var(--color-primary)]">→</span>
                          <span>{formatTime(d.checkOut)}</span>
                        </div>
                      </li>
                    )
                  )}
                </ol>
              </div>
            ) : (
              !timeline.isLoading && <EmptyState title="No timeline events yet" icon={<InboxIcon size={22} />} />
            )}
          </div>
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
    <div className="w-full space-y-6 pb-12">
      <PageHeader title="Attendance" subtitle="Organization check-in for a selected day" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="block text-sm">
          <span className="sr-only">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
          />
        </label>
        <label className="block text-sm">
          <span className="sr-only">Search employee</span>
          <div className="relative">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              placeholder="Search employee…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30"
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
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Attendance for {formatDate(date)}</caption>
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-background-deep)] text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-5 py-4 font-bold uppercase text-xs tracking-wider">Employee</th>
                  <th scope="col" className="px-5 py-4 font-bold uppercase text-xs tracking-wider">Check In</th>
                  <th scope="col" className="px-5 py-4 font-bold uppercase text-xs tracking-wider">Check Out</th>
                  <th scope="col" className="px-5 py-4 text-right font-bold uppercase text-xs tracking-wider">Work Hours</th>
                  <th scope="col" className="px-5 py-4 font-bold uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {data.items.map(
                  (row: {
                    employee: { id: string; firstName: string; lastName: string; employeeCode: string };
                    checkIn: string | null;
                    checkOut: string | null;
                    workHours: number | null;
                    status: string;
                  }) => (
                    <tr key={row.employee.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          className="font-bold text-[var(--color-powder-blue)] hover:underline focus-visible:outline-none"
                          to={`/employees/${row.employee.id}`}
                        >
                          {row.employee.firstName} {row.employee.lastName}
                        </Link>
                        <div className="font-mono text-xs text-[var(--color-text-muted)]">{row.employee.employeeCode}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[var(--color-powder-blue)]">{formatTime(row.checkIn)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[var(--color-powder-blue)]">{formatTime(row.checkOut)}</td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-[var(--color-text)]">{row.workHours ?? '—'}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
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
                  className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-md focus-visible:outline-none hover:border-[var(--color-powder-blue)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-[var(--color-powder-blue)]">
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
    <div aria-busy="true" aria-label="Loading" className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-[var(--color-border)] px-5 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-3.5 w-20 animate-pulse rounded bg-[var(--color-border)]/60" />
          ))}
        </div>
      ))}
    </div>
  );
}
