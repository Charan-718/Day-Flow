import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { listAuditLogs } from '../../services/admin';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
} from '../../components/ui';

export function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', entityType],
    queryFn: () =>
      listAuditLogs({
        page: 1,
        pageSize: 50,
        ...(entityType ? { entityType } : {}),
      }),
  });

  const items = (data as { items?: Array<Record<string, unknown>> } | undefined)?.items || [];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable trail of HR mutations"
        actions={
          <select
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All entities</option>
            <option value="Employee">Employee</option>
            <option value="LeaveRequest">LeaveRequest</option>
            <option value="AttendanceEvent">AttendanceEvent</option>
            <option value="SalaryStructure">SalaryStructure</option>
          </select>
        }
      />

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState message="Failed to load audit logs" onRetry={() => refetch()} />}
      {!isLoading && items.length === 0 && <EmptyState title="No audit entries yet" />}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = String(row.id);
                const actor = row.actor as { loginId: string };
                return (
                  <Fragment key={id}>
                    <tr className="border-b border-[var(--line)]">
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(String(row.createdAt)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{actor.loginId}</td>
                      <td className="px-3 py-2 font-medium">{String(row.action)}</td>
                      <td className="px-3 py-2">
                        {String(row.entityType)}
                        <div className="font-mono text-[10px] text-[var(--muted)]">
                          {String(row.entityId).slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)]"
                          onClick={() => setExpanded(expanded === id ? null : id)}
                        >
                          {expanded === id ? 'Hide' : 'Diff'}
                        </button>
                      </td>
                    </tr>
                    {expanded === id && (
                      <tr className="bg-[var(--bg)]">
                        <td colSpan={5} className="px-3 py-3">
                          <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                            {JSON.stringify(
                              { previous: row.previousValue, next: row.newValue },
                              null,
                              2
                            )}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
