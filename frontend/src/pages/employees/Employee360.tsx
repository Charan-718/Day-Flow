import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getEmployee360 } from '../../services/employees';
import { StatusBadge } from '../../components/StatusBadge';
import { InboxIcon } from '../../components/icons';
import { EmptyState, ErrorState, PageHeader, StatStrip } from '../../components/ui';
import { getApiError } from '../../api/client';

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Employee360Page() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['employee-360', id],
    queryFn: () => getEmployee360(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <Skeleton />;
  if (isError || !data) {
    return <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />;
  }

  const d = data as {
    profile: {
      firstName: string;
      lastName: string;
      designation: string | null;
      employeeCode: string;
      email: string;
      loginId: string;
      department: { name: string } | null;
    };
    attendanceSnapshot: {
      presentDays: number;
      leaveDays: number;
      exceptions: number;
    };
    leaveSnapshot: {
      balances: Array<{ type: string; available: number }>;
      recentRequests: Array<{
        id: string;
        status: string;
        startDate: string;
        leaveType: { name: string };
      }>;
    };
    salarySnapshot: {
      monthlyWage: number;
    } | null;
    recentActivity: Array<{
      id: string;
      action: string;
      createdAt: string;
      actor: { loginId: string };
    }>;
  };

  return (
    <div>
      <PageHeader
        title={`${d.profile.firstName} ${d.profile.lastName} — 360°`}
        subtitle={`${d.profile.designation || '—'} · ${d.profile.employeeCode}`}
        actions={
          <Link
            to={`/employees/${id}`}
            className="rounded text-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Open profile →
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: 'Present (month)', value: d.attendanceSnapshot.presentDays },
          { label: 'Leave days', value: d.attendanceSnapshot.leaveDays },
          { label: 'Exceptions', value: d.attendanceSnapshot.exceptions },
          {
            label: 'Monthly wage',
            value: d.salarySnapshot ? formatCurrency(d.salarySnapshot.monthlyWage) : '—',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Profile</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Login</dt>
              <dd className="font-mono text-[var(--ink)]">{d.profile.loginId}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Email</dt>
              <dd className="text-[var(--ink)]">{d.profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Department</dt>
              <dd className="text-[var(--ink)]">{d.profile.department?.name || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Leave balances</h2>
          {d.leaveSnapshot.balances.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No leave types configured.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {d.leaveSnapshot.balances.map((b) => (
                <li key={b.type} className="flex justify-between">
                  <span className="text-[var(--ink)]">{b.type}</span>
                  <span className="font-mono font-medium text-[var(--ink)]">{b.available} days</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Recent leave</h2>
          {d.leaveSnapshot.recentRequests.length === 0 ? (
            <EmptyState title="No requests yet" icon={<InboxIcon size={18} />} />
          ) : (
            <ul className="space-y-2 text-sm">
              {d.leaveSnapshot.recentRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--ink)]">
                    {r.leaveType.name} · {formatDate(r.startDate)}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Recent activity</h2>
          {d.recentActivity.length === 0 ? (
            <EmptyState title="No recorded activity" icon={<InboxIcon size={18} />} />
          ) : (
            <ul className="space-y-2 text-sm">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="text-[var(--ink)]">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-[var(--muted)]">
                    {' '}
                    by <span className="font-mono">{a.actor.loginId}</span> ·{' '}
                    {new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading employee overview">
      <div className="mb-5 h-6 w-64 animate-pulse rounded bg-[var(--line)]/60" />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--line)]/40" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-[var(--line)]/40" />
        ))}
      </div>
    </div>
  );
}
