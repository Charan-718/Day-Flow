import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useMemo, useState } from 'react';
import {
  approveLeave,
  createLeaveRequest,
  getLeaveBalance,
  getLeaveTypes,
  getPublicHolidays,
  listLeaveRequests,
  rejectLeave,
} from '../../services/leave';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { LeaveCalendar } from '../../components/LeaveCalendar';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatStrip,
} from '../../components/ui';
import { uploadFile } from '../../services/files';
import { getApiError } from '../../api/client';
import type { LeaveRequest } from '../../types';

function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function TimeOffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';
  const [open, setOpen] = useState(false);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const types = useQuery({ queryKey: ['leave-types'], queryFn: getLeaveTypes });
  const balances = useQuery({
    queryKey: ['leave-balance'],
    queryFn: getLeaveBalance,
    enabled: !isAdmin,
  });
  const requests = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => listLeaveRequests(isAdmin ? { status: undefined } : undefined),
  });
  const calendarYear = new Date().getFullYear();
  const holidays = useQuery({
    queryKey: ['public-holidays', calendarYear],
    queryFn: () => getPublicHolidays(calendarYear),
    enabled: !isAdmin,
  });

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    daysRequested: 1,
    remarks: '',
    attachmentUrl: '',
  });

  const selectedType = useMemo(
    () => types.data?.find((t) => t.id === form.leaveTypeId),
    [types.data, form.leaveTypeId]
  );

  const create = useMutation({
    mutationFn: () =>
      createLeaveRequest({
        ...form,
        attachmentUrl: form.attachmentUrl || undefined,
        daysRequested: form.daysRequested,
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['leave-balance'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const approve = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approveLeave(id, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      rejectLeave(id, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leave-requests'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  function onDateChange(start: string, end: string) {
    const days = start && end && end >= start ? daysBetween(start, end) : 1;
    setForm((f) => ({ ...f, startDate: start, endDate: end, daysRequested: days }));
  }

  return (
    <div>
      <PageHeader
        title="Time Off"
        subtitle={isAdmin ? 'Review and approve leave requests' : 'Balances and your requests'}
        actions={
          !isAdmin ? (
            <Button
              onClick={() => {
                setOpen(true);
                create.reset();
              }}
            >
              NEW
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

      {!isAdmin && requests.data && (
        <div className="mb-6">
          {holidays.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <LeaveCalendar
              year={calendarYear}
              requests={requests.data.items}
              holidays={holidays.data || []}
            />
          )}
        </div>
      )}

      {requests.isLoading && <LoadingSkeleton />}
      {requests.isError && (
        <ErrorState message="Failed to load leave" onRetry={() => requests.refetch()} />
      )}
      {!requests.isLoading && requests.data?.items.length === 0 && (
        <EmptyState title="No leave requests yet" />
      )}

      {requests.data && requests.data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                {isAdmin && <th className="px-3 py-2 font-medium">Employee</th>}
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
                <th className="px-3 py-2 font-medium">Days</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Workflow</th>
                {isAdmin && <th className="px-3 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.data.items.map((r: LeaveRequest) => (
                <tr key={r.id} className="border-b border-[var(--line)] align-top">
                  {isAdmin && (
                    <td className="px-3 py-2">
                      {r.employee
                        ? `${r.employee.firstName} ${r.employee.lastName}`
                        : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2">{r.leaveType.name}</td>
                  <td className="px-3 py-2">
                    {new Date(r.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{r.daysRequested}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    <WorkflowTrail request={r} />
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      {r.status === 'PENDING' ? (
                        <div className="space-y-2">
                          <input
                            placeholder="Comment"
                            className="w-40 rounded border border-[var(--line)] px-2 py-1 text-xs"
                            value={commentMap[r.id] || ''}
                            onChange={(e) =>
                              setCommentMap({ ...commentMap, [r.id]: e.target.value })
                            }
                          />
                          <div className="flex gap-1">
                            <Button
                              className="!px-2 !py-1 text-xs"
                              onClick={() =>
                                approve.mutate({
                                  id: r.id,
                                  comment: commentMap[r.id],
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              className="!px-2 !py-1 text-xs"
                              onClick={() => {
                                const comment = commentMap[r.id];
                                if (!comment) {
                                  alert('Comment required to reject');
                                  return;
                                }
                                reject.mutate({ id: r.id, comment });
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          {r.reviewComment || '—'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title="Time Off Request" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (selectedType?.requiresAttachment && !form.attachmentUrl) {
              return;
            }
            create.mutate();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Time Off Type</span>
            <select
              required
              className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
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
              <span className="mb-1 block font-medium">Start</span>
              <input
                type="date"
                required
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
                value={form.startDate}
                onChange={(e) => onDateChange(e.target.value, form.endDate || e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">End</span>
              <input
                type="date"
                required
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
                value={form.endDate}
                onChange={(e) => onDateChange(form.startDate || e.target.value, e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Allocation (days)</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              required
              className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              value={form.daysRequested}
              onChange={(e) =>
                setForm({ ...form, daysRequested: Number(e.target.value) })
              }
            />
          </label>
          {selectedType?.requiresAttachment && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Attachment (required for Sick Leave certificate)
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                required={!form.attachmentUrl}
                className="w-full text-sm"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadFile(file);
                  setForm({ ...form, attachmentUrl: url });
                }}
              />
              {form.attachmentUrl && (
                <span className="mt-1 block text-xs text-[var(--success)]">Uploaded ✓</span>
              )}
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Remarks</span>
            <textarea
              className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </label>
          {create.isError && (
            <p className="text-sm text-[var(--danger)]">{getApiError(create.error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Discard
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function WorkflowTrail({ request }: { request: LeaveRequest }) {
  const steps = request.workflow?.steps || [
    { key: 'SUBMITTED', label: 'Submitted', done: true },
    { key: 'PENDING', label: 'Pending HR', done: request.status !== 'PENDING' },
    {
      key: request.status,
      label: request.status === 'REJECTED' ? 'Rejected' : 'Approved',
      done: request.status !== 'PENDING',
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          <span
            className={`rounded px-1.5 py-0.5 ${
              s.done
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'bg-[var(--bg)] text-[var(--muted)]'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-[var(--muted)]">→</span>}
        </span>
      ))}
    </div>
  );
}
