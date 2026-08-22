import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getEmployee360 } from '../../services/employees';
import { StatusBadge } from '../../components/StatusBadge';
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatStrip,
} from '../../components/ui';

export function Employee360Page() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employee-360', id],
    queryFn: () => getEmployee360(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingSkeleton rows={10} />;
  if (isError || !data) {
    return <ErrorState message="Failed to load 360 view" onRetry={() => refetch()} />;
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
          <Link to={`/employees/${id}`} className="text-sm text-[var(--accent)]">
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
            value: d.salarySnapshot
              ? `₹${d.salarySnapshot.monthlyWage.toLocaleString()}`
              : '—',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-4">
          <h2 className="mb-3 font-semibold">Profile</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Login</dt>
              <dd className="font-mono">{d.profile.loginId}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Email</dt>
              <dd>{d.profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Department</dt>
              <dd>{d.profile.department?.name || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4">
          <h2 className="mb-3 font-semibold">Leave balances</h2>
          <ul className="space-y-1 text-sm">
            {d.leaveSnapshot.balances.map((b) => (
              <li key={b.type} className="flex justify-between">
                <span>{b.type}</span>
                <span className="font-medium">{b.available} days</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4">
          <h2 className="mb-3 font-semibold">Recent leave</h2>
          <ul className="space-y-2 text-sm">
            {d.leaveSnapshot.recentRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span>
                  {r.leaveType.name} · {new Date(r.startDate).toLocaleDateString()}
                </span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-4">
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {d.recentActivity.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.action}</span>
                <span className="text-[var(--muted)]">
                  {' '}
                  by {a.actor.loginId} · {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
