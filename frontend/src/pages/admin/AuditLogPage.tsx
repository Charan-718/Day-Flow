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
    <div className="w-full space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable trail of HR mutations"
        actions={
          <label className="block text-sm">
            <span className="sr-only">Filter by entity type</span>
            <select
              className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-powder-blue)] focus-visible:ring-2 focus-visible:ring-[var(--color-powder-blue)]"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="" className="bg-[var(--color-surface)] text-[var(--color-text)]">All entities</option>
              <option value="Employee" className="bg-[var(--color-surface)] text-[var(--color-text)]">Employee</option>
              <option value="LeaveRequest" className="bg-[var(--color-surface)] text-[var(--color-text)]">Leave request</option>
              <option value="AttendanceEvent" className="bg-[var(--color-surface)] text-[var(--color-text)]">Attendance event</option>
              <option value="SalaryStructure" className="bg-[var(--color-surface)] text-[var(--color-text)]">Salary structure</option>
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
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Audit log entries</caption>
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-background-deep)] text-[var(--color-text-secondary)] uppercase text-xs tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-4 font-bold">When</th>
                  <th scope="col" className="px-5 py-4 font-bold">Actor</th>
                  <th scope="col" className="px-5 py-4 font-bold">Action</th>
                  <th scope="col" className="px-5 py-4 font-bold">Entity</th>
                  <th scope="col" className="px-5 py-4 font-bold text-right">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {items.map((row) => {
                  const id = String(row.id);
                  const actor = row.actor as { loginId: string };
                  const isOpen = expanded === id;
                  return (
                    <Fragment key={id}>
                      <tr className="hover:bg-[var(--color-surface-hover)]/60 transition-colors">
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-[var(--color-text-secondary)]">
                          {new Date(String(row.createdAt)).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-block rounded-md bg-[var(--color-powder-blue-light)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-powder-blue)] border border-[var(--color-powder-blue)]/20">
                            {actor.loginId}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-[var(--color-text)]">{String(row.action)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-[var(--color-text)]">
                          {String(row.entityType)}
                          <div className="font-mono text-[11px] font-normal text-[var(--color-text-muted)]">
                            {String(row.entityId).slice(0, 8)}…
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={`audit-diff-${id}`}
                            onClick={() => setExpanded(isOpen ? null : id)}
                            className="cursor-pointer rounded-xl bg-[var(--color-accent-cyan-alpha-12)] px-3 py-1.5 text-xs font-bold text-[var(--color-powder-blue)] border border-[var(--color-powder-blue)]/30 hover:bg-[var(--color-powder-blue)] hover:text-[#212121] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-powder-blue)]"
                          >
                            {isOpen ? 'Hide Diff' : 'View Diff'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[var(--color-background-deep)]">
                          <td id={`audit-diff-${id}`} colSpan={5} className="p-4">
                            <pre className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 font-mono text-xs text-[var(--color-text-secondary)] shadow-inner">
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
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading audit log" className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-[var(--color-border)]/50 px-5 py-4 last:border-0">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-border)]/60" />
          <div className="h-5 w-20 animate-pulse rounded-md bg-[var(--color-border)]/60" />
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-border)]/60" />
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-border)]/60" />
        </div>
      ))}
    </div>
  );
}

