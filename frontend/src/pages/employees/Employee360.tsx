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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-surface)] p-6 shadow-xl transition-all hover:border-[var(--color-primary-hover)] hover:shadow-[0_0_20px_rgba(140,61,255,0.3)]">
          <h2 className="mb-4 text-base font-extrabold text-[var(--color-powder-blue)] tracking-tight">Profile</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Login</dt>
              <dd className="font-mono font-bold text-[var(--color-powder-blue)]">{d.profile.loginId}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Email</dt>
              <dd className="font-semibold text-[var(--color-primary-hover)]">{d.profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Department</dt>
              <dd className="font-semibold text-[var(--color-primary-hover)]">{d.profile.department?.name || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-surface)] p-6 shadow-xl transition-all hover:border-[var(--color-primary-hover)] hover:shadow-[0_0_20px_rgba(140,61,255,0.3)]">
          <h2 className="mb-4 text-base font-extrabold text-[var(--color-powder-blue)] tracking-tight">Leave balances</h2>
          {d.leaveSnapshot.balances.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--color-text-muted)]">No leave types configured.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.leaveSnapshot.balances.map((b) => (
                <li key={b.type} className="flex justify-between border-b border-[var(--color-border)]/40 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-[var(--color-primary-hover)]">{b.type}</span>
                  <span className="font-mono font-bold text-[var(--color-powder-blue)]">{b.available} days</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-surface)] p-6 shadow-xl transition-all hover:border-[var(--color-primary-hover)] hover:shadow-[0_0_20px_rgba(140,61,255,0.3)]">
          <h2 className="mb-4 text-base font-extrabold text-[var(--color-powder-blue)] tracking-tight">Recent leave</h2>
          {d.leaveSnapshot.recentRequests.length === 0 ? (
            <EmptyState title="No requests yet" icon={<InboxIcon size={18} />} />
          ) : (
            <ul className="space-y-3 text-sm">
              {d.leaveSnapshot.recentRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/40 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-[var(--color-primary-hover)]">
                    {r.leaveType.name} · {formatDate(r.startDate)}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-surface)] p-6 shadow-xl transition-all hover:border-[var(--color-primary-hover)] hover:shadow-[0_0_20px_rgba(140,61,255,0.3)]">
          <h2 className="mb-4 text-base font-extrabold text-[var(--color-powder-blue)] tracking-tight">Recent activity</h2>
          {d.recentActivity.length === 0 ? (
            <EmptyState title="No recorded activity" icon={<InboxIcon size={18} />} />
          ) : (
            <ul className="space-y-3 text-sm">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="border-b border-[var(--color-border)]/40 pb-2 text-[var(--color-text)] last:border-0 last:pb-0">
                  <span className="font-bold text-[var(--color-primary-hover)]">{a.action}</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {' '}
                    by <span className="font-mono text-[var(--color-powder-blue)]">{a.actor.loginId}</span> ·{' '}
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
