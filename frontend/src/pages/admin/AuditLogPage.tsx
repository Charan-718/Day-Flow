import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { listAuditLogs } from '../../services/admin';
import { InboxIcon } from '../../components/icons';
import { EmptyState, ErrorState, PageHeader } from '../../components/ui';
import { getApiError } from '../../api/client';

export function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
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
          <label className="block text-sm">
            <span className="sr-only">Filter by entity type</span>
            <select
              className="rounded-md border border-[var(--border-control)] bg-white px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All entities</option>
              <option value="Employee">Employee</option>
              <option value="LeaveRequest">Leave request</option>
              <option value="AttendanceEvent">Attendance event</option>
              <option value="SalaryStructure">Salary structure</option>
            </select>
          </label>
        }
      />

      {isLoading && <Skeleton />}
      {isError && <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          title="No matching activity"
          hint="Adjust the filters or widen the date range."
          icon={<InboxIcon size={22} />}
        />
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Audit log entries</caption>
            <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium">When</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Actor</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Entity</th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = String(row.id);
                const actor = row.actor as { loginId: string };
                const isOpen = expanded === id;
                return (
                  <Fragment key={id}>
                    <tr className="border-b border-[var(--line)] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[var(--muted)]">
                        {new Date(String(row.createdAt)).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{actor.loginId}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--ink)]">{String(row.action)}</td>
                      <td className="px-3 py-2.5">
                        {String(row.entityType)}
                        <div className="font-mono text-[11px] text-[var(--muted)]">
                          {String(row.entityId).slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`audit-diff-${id}`}
                          onClick={() => setExpanded(isOpen ? null : id)}
                          className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          {isOpen ? 'Hide' : 'Diff'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[var(--bg)]">
                        <td id={`audit-diff-${id}`} colSpan={5} className="px-3 py-3">
                          <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                            {JSON.stringify({ previous: row.previousValue, next: row.newValue }, null, 2)}
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

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading audit log" className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-[var(--line)] px-3 py-3.5 last:border-0">
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--line)]/60" />
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--line)]/60" />
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--line)]/60" />
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--line)]/60" />
        </div>
      ))}
    </div>
  );
}
