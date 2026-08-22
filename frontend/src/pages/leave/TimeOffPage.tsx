import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useState } from 'react';
import {
  approveLeave,
  createLeaveRequest,
  getLeaveBalance,
  getLeaveTypes,
  listLeaveRequests,
  rejectLeave,
} from '../../services/leave';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState, ErrorState, PageHeader, StatStrip } from '../../components/ui';
import { CheckCircleIcon, InboxIcon, SearchOffIcon } from '../../components/icons';
import { getApiError } from '../../api/client';
import { LeaveReviewDrawer, formatDate } from './LeaveReviewDrawer';
import type { LeaveRequest } from '../../types';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

const emptyForm = {
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  daysRequested: 1,
  remarks: '',
  attachmentUrl: '',
};

export function TimeOffPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'HR_ADMIN';
  const qc = useQueryClient();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(isAdmin ? 'PENDING' : 'ALL');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const types = useQuery({ queryKey: ['leave-types'], queryFn: getLeaveTypes });
  const balances = useQuery({
    queryKey: ['leave-balance'],
    queryFn: getLeaveBalance,
    enabled: !isAdmin,
  });

  const requests = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: () => listLeaveRequests(statusFilter === 'ALL' ? undefined : { status: statusFilter }),
  });

  // Cheap counts for the filter tabs — uses the pagination envelope the API already
  // returns rather than fetching every request just to count them (DESIGN_SYSTEM §14.3).
  const countQueries = useQueries({
    queries: STATUS_TABS.map((tab) => ({
      queryKey: ['leave-requests', 'count', tab.key],
      queryFn: () =>
        listLeaveRequests({
          ...(tab.key === 'ALL' ? {} : { status: tab.key }),
          page: 1,
          pageSize: 1,
        }),
      select: (data: Awaited<ReturnType<typeof listLeaveRequests>>) => data.pagination.total,
      staleTime: 15000,
    })),
  });
  const totalAllCount = countQueries[0]?.data;

  const reviewingRequest: LeaveRequest | null =
    requests.data?.items.find((r) => r.id === reviewingId) ?? null;

  const selectedType = types.data?.find((t) => t.id === form.leaveTypeId);
  const dateRangeInvalid = Boolean(
    form.startDate && form.endDate && form.endDate < form.startDate
  );

  function onDateChange(start: string, end: string) {
    const days = start && end && end >= start ? daysBetween(start, end) : 1;
    setForm((f) => ({ ...f, startDate: start, endDate: end, daysRequested: days }));
  }

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => createLeaveRequest(body),
    onSuccess: () => {
      setRequestModalOpen(false);
      setForm(emptyForm);
      showToast('success', 'Time off request submitted');
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['leave-balance'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const approve = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => approveLeave(id, comment),
    onSuccess: () => {
      showToast('success', 'Leave request approved');
      setReviewingId(null);
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectLeave(id, comment),
    onSuccess: () => {
      showToast('success', 'Leave request rejected');
      setReviewingId(null);
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (dateRangeInvalid) return;
    if (selectedType?.requiresAttachment && !form.attachmentUrl) return;
    create.mutate({
      ...form,
      attachmentUrl: form.attachmentUrl || undefined,
      daysRequested: form.daysRequested,
    });
  }

  let empty: { title: string; hint: string; icon: ReactNode } | null = null;
  if (requests.data && requests.data.items.length === 0) {
    if (totalAllCount === 0) {
      empty = {
        title: 'No time off requests yet',
        hint: isAdmin
          ? 'Requests will appear here once employees submit them.'
          : 'Use "Request time off" to submit your first one.',
        icon: <InboxIcon size={22} />,
      };
    } else if (isAdmin && statusFilter === 'PENDING') {
      empty = {
        title: 'All caught up',
        hint: 'No requests are waiting for review.',
        icon: <CheckCircleIcon size={22} className="text-[var(--success)]" />,
      };
    } else {
      const tabLabel = STATUS_TABS.find((t) => t.key === statusFilter)?.label.toLowerCase() ?? '';
      empty = {
        title: `No ${tabLabel} requests`,
        hint: 'Try a different filter to see more.',
        icon: <SearchOffIcon size={22} />,
      };
    }
  }

  return (
    <div>
      <PageHeader
        title="Time Off"
        subtitle={isAdmin ? 'Review and approve time off requests' : 'Track your balance and requests'}
        actions={
          !isAdmin ? (
            <Button
              onClick={() => {
                setRequestModalOpen(true);
                create.reset();
              }}
            >
              Request time off
            </Button>
          ) : undefined
        }
      />

      {!isAdmin && balances.data && (
        <StatStrip
          items={balances.data.map((b) => ({
            label: b.leaveType.name,
            value: `${b.availableDays} days`,
          }))}
        />
      )}

      <div role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab, i) => {
          const count = countQueries[i]?.data;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-control)] bg-white text-[var(--muted)] hover:bg-[var(--bg)]'
              }`}
            >
              {tab.label}
              {typeof count === 'number' && (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[11px] font-semibold ${
                    isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--muted)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {requests.isLoading && <TableSkeleton isAdmin={isAdmin} />}
      {requests.isError && (
        <ErrorState message={getApiError(requests.error).message} onRetry={() => requests.refetch()} />
      )}
      {empty && <EmptyState title={empty.title} hint={empty.hint} icon={empty.icon} />}

      {requests.data && requests.data.items.length > 0 && (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-[var(--line)] bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Time off requests</caption>
              <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
                <tr>
                  {isAdmin && (
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Employee
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Dates
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Days
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.data.items.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]">
                    {isAdmin && (
                      <td className="px-3 py-2.5">
                        {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—'}
                        {r.employee && (
                          <div className="font-mono text-xs text-[var(--muted)]">
                            {r.employee.employeeCode}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5">{r.leaveType.name}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{r.daysRequested}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setReviewingId(r.id)}>
                        {isAdmin && r.status === 'PENDING' ? 'Review' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list (DESIGN_SYSTEM §7.1) */}
          <div className="space-y-3 md:hidden">
            {requests.data.items.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReviewingId(r.id)}
                className="w-full rounded-lg border border-[var(--line)] bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {isAdmin && r.employee && (
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
                        {r.employee.firstName} {r.employee.lastName}
                      </p>
                    )}
                    <p className="text-sm text-[var(--ink)]">{r.leaveType.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)} · {r.daysRequested} day
                      {r.daysRequested === 1 ? '' : 's'}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Modal
        open={requestModalOpen}
        title="Request time off"
        onClose={() => setRequestModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRequestModalOpen(false)}
              disabled={create.isPending}
            >
              Discard
            </Button>
            <Button type="submit" form="leave-request-form" loading={create.isPending} disabled={dateRangeInvalid}>
              Submit
            </Button>
          </div>
        }
      >
        <form id="leave-request-form" className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">Time off type</span>
            <select
              required
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <option value="">Select…</option>
              {types.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">Start date</span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => onDateChange(e.target.value, form.endDate || e.target.value)}
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">End date</span>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => onDateChange(form.startDate || e.target.value, e.target.value)}
                aria-invalid={dateRangeInvalid || undefined}
                aria-describedby={dateRangeInvalid ? 'date-range-error' : undefined}
                className={`w-full rounded-md border px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  dateRangeInvalid
                    ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]'
                    : 'border-[var(--border-control)] focus-visible:ring-[var(--accent)]'
                }`}
              />
            </label>
          </div>
          {dateRangeInvalid && (
            <p id="date-range-error" role="alert" className="-mt-2 text-sm text-[var(--danger)]">
              End date must be on or after the start date.
            </p>
          )}

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">
              Allocation (days) <span className="font-normal text-[var(--muted)]">— auto-calculated, editable</span>
            </span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              required
              value={form.daysRequested}
              onChange={(e) => setForm({ ...form, daysRequested: Number(e.target.value) })}
              className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            />
          </label>

          {selectedType?.requiresAttachment && (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">
                Attachment URL{' '}
                <span className="font-normal text-[var(--muted)]">— required for {selectedType.name}</span>
              </span>
              <input
                required
                type="url"
                placeholder="https://…"
                value={form.attachmentUrl}
                onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">
              Remarks <span className="font-normal text-[var(--muted)]">(optional)</span>
            </span>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            />
          </label>

          {create.isError && (
            <p role="alert" className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {getApiError(create.error).message}
            </p>
          )}
        </form>
      </Modal>

      <LeaveReviewDrawer
        request={reviewingRequest}
        isAdmin={isAdmin}
        onClose={() => setReviewingId(null)}
        approveMutation={approve}
        rejectMutation={reject}
      />
    </div>
  );
}

/** Mirrors the table's shape so loading never reflows the layout (DESIGN_SYSTEM §19.1). */
function TableSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading time off requests"
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
    >
      <div className="border-b border-[var(--line)] bg-[var(--bg)] px-3 py-2.5">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--line)]" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 border-b border-[var(--line)] px-3 py-3.5 last:border-0"
        >
          {isAdmin && <div className="h-3 w-28 animate-pulse rounded bg-[var(--line)]/70" />}
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--line)]/70" />
          <div className="h-3 w-32 animate-pulse rounded bg-[var(--line)]/70" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-[var(--line)]/70" />
        </div>
      ))}
    </div>
  );
}
