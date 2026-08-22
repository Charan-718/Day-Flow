import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminAttendance,
  getMyAttendance,
  getTimeline,
} from '../../services/attendance';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatStrip,
} from '../../components/ui';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

  const { data, isLoading, isError, refetch } = useQuery({
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

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Your monthly presence record"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-[var(--line)] bg-white px-2 py-1"
              onClick={() => shift(-1)}
            >
              ←
            </button>
            <span className="text-sm font-medium">
              {month}/{year}
            </span>
            <button
              type="button"
              className="rounded border border-[var(--line)] bg-white px-2 py-1"
              onClick={() => shift(1)}
            >
              →
            </button>
          </div>
        }
      />

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState message="Failed to load attendance" onRetry={() => refetch()} />}

      {data && (
        <>
          <StatStrip
            items={[
              { label: 'Days present', value: data.summary.presentDays },
              { label: 'Working days', value: data.summary.totalWorkingDays },
              { label: 'Leave days', value: data.summary.leaveCount },
              { label: 'Payable days', value: data.summary.payableDays ?? '—' },
            ]}
          />

          <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Check In</th>
                  <th className="px-3 py-2 font-medium">Check Out</th>
                  <th className="px-3 py-2 font-medium">Work Hours</th>
                  <th className="px-3 py-2 font-medium">Extra</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.days.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                      No attendance recorded this month
                    </td>
                  </tr>
                )}
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
                    <tr key={d.id} className="border-b border-[var(--line)]">
                      <td className="px-3 py-2">
                        {new Date(d.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.checkIn ? new Date(d.checkIn).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.checkOut ? new Date(d.checkOut).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-3 py-2">{d.workHours ?? '—'}</td>
                      <td className="px-3 py-2">{d.extraHours || '—'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-8 text-base font-semibold">Attendance timeline</h2>
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
                    <p className="font-medium">
                      {new Date(d.date).toLocaleDateString()} ·{' '}
                      <StatusBadge status={d.status} />
                    </p>
                    <p className="text-[var(--muted)]">
                      {d.checkIn ? new Date(d.checkIn).toLocaleTimeString() : '—'} →{' '}
                      {d.checkOut ? new Date(d.checkOut).toLocaleTimeString() : '—'}
                      {d.durationMinutes != null
                        ? ` · ${(d.durationMinutes / 60).toFixed(1)}h`
                        : ''}
                    </p>
                  </li>
                )
              )}
            </ol>
          ) : (
            <EmptyState title="No timeline events yet" />
          )}
        </>
      )}
    </div>
  );
}

function AdminAttendance() {
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-admin', date, search],
    queryFn: () => getAdminAttendance(date, search || undefined),
  });

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Organization check-in for a selected day" />
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
        <input
          placeholder="Search employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
      </div>

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState message="Failed to load" onRetry={() => refetch()} />}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Check In</th>
                <th className="px-3 py-2 font-medium">Check Out</th>
                <th className="px-3 py-2 font-medium">Work Hours</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(
                (row: {
                  employee: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    employeeCode: string;
                  };
                  checkIn: string | null;
                  checkOut: string | null;
                  workHours: number | null;
                  status: string;
                }) => (
                  <tr key={row.employee.id} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium text-[var(--accent)] hover:underline"
                        to={`/employees/${row.employee.id}`}
                      >
                        {row.employee.firstName} {row.employee.lastName}
                      </Link>
                      <div className="font-mono text-xs text-[var(--muted)]">
                        {row.employee.employeeCode}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-3 py-2">{row.workHours ?? '—'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
