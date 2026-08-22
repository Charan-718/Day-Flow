import { useEffect, useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Drawer } from '../../components/Drawer';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { PaperclipIcon } from '../../components/icons';
import { getApiError } from '../../api/client';
import type { LeaveRequest } from '../../types';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

interface WorkflowStep {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
}

/** DESIGN_SYSTEM §22.3 — the final step must never claim an outcome that hasn't happened. */
function stepDisplayLabel(step: WorkflowStep, index: number, total: number) {
  const isFinal = index === total - 1;
  return isFinal && !step.done ? 'Decision' : step.label;
}

function WorkflowTrail({ request }: { request: LeaveRequest }) {
  const steps: WorkflowStep[] =
    request.workflow?.steps ?? [
      { key: 'SUBMITTED', label: 'Submitted', at: request.createdAt, done: true },
      { key: 'PENDING', label: 'Pending HR review', at: null, done: request.status !== 'PENDING' },
      {
        key: request.status,
        label: request.status === 'REJECTED' ? 'Rejected' : 'Approved',
        at: request.reviewedAt ?? null,
        done: request.status !== 'PENDING',
      },
    ];

  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.key} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              step.done
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--border-control)] bg-white'
            }`}
          >
            {step.done && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4 3.5 6.5 9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div className="min-w-0 pb-0.5">
            <p className={`text-sm ${step.done ? 'font-medium text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
              {stepDisplayLabel(step, i, steps.length)}
            </p>
            {step.at && <p className="text-xs text-[var(--muted)]">{formatDateTime(step.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--ink)]">{value}</dd>
    </div>
  );
}

interface LeaveReviewDrawerProps {
  request: LeaveRequest | null;
  isAdmin: boolean;
  onClose: () => void;
  approveMutation: UseMutationResult<unknown, unknown, { id: string; comment?: string }>;
  rejectMutation: UseMutationResult<unknown, unknown, { id: string; comment: string }>;
}

export function LeaveReviewDrawer({
  request,
  isAdmin,
  onClose,
  approveMutation,
  rejectMutation,
}: LeaveReviewDrawerProps) {
  const [comment, setComment] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);

  useEffect(() => {
    setComment('');
    setConfirmingReject(false);
  }, [request?.id]);

  const canAct = isAdmin && request?.status === 'PENDING';
  const trimmedComment = comment.trim();
  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const mutationErr = approveMutation.error ?? rejectMutation.error;

  return (
    <>
      <Drawer
        open={Boolean(request)}
        onClose={onClose}
        title={request ? request.leaveType.name : ''}
        subtitle={
          isAdmin && request?.employee
            ? `${request.employee.firstName} ${request.employee.lastName} · ${request.employee.employeeCode}`
            : undefined
        }
        footer={
          canAct ? (
            <div className="space-y-3">
              {mutationErr != null && (
                <p
                  role="alert"
                  className="break-words rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  {getApiError(mutationErr).message}
                </p>
              )}
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-[var(--ink)]">
                  Comment{' '}
                  <span id="reject-comment-hint" className="font-normal text-[var(--muted)]">
                    (required to reject)
                  </span>
                </span>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-[var(--border-control)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:bg-[var(--bg)]"
                  placeholder="Add context for the employee…"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="danger"
                  disabled={!trimmedComment || isPending}
                  aria-describedby={!trimmedComment ? 'reject-comment-hint' : undefined}
                  onClick={() => setConfirmingReject(true)}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={approveMutation.isPending}
                  disabled={rejectMutation.isPending}
                  onClick={() =>
                    request &&
                    approveMutation.mutate({ id: request.id, comment: trimmedComment || undefined })
                  }
                >
                  Approve
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {request && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={request.status} />
              <span className="text-sm text-[var(--muted)]">
                Submitted {formatDate(request.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4">
              <Field label="Start date" value={formatDate(request.startDate)} />
              <Field label="End date" value={formatDate(request.endDate)} />
              <Field label="Days requested" value={String(request.daysRequested)} />
              <Field label="Type" value={request.leaveType.name} />
            </dl>

            {request.remarks && (
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">Remarks</p>
                <p className="mt-1 break-words text-sm text-[var(--ink)]">{request.remarks}</p>
              </div>
            )}

            {request.attachmentUrl && (
              <a
                href={request.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-control)] px-2.5 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <PaperclipIcon size={16} />
                View attachment
              </a>
            )}

            {!canAct && request.status !== 'PENDING' && request.reviewComment && (
              <div className="rounded-lg border border-[var(--line)] p-4">
                <p className="text-xs font-medium text-[var(--muted)]">
                  Review comment · {request.reviewedAt ? formatDateTime(request.reviewedAt) : ''}
                </p>
                <p className="mt-1 break-words text-sm text-[var(--ink)]">{request.reviewComment}</p>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Workflow
              </h3>
              <WorkflowTrail request={request} />
            </div>

            {!isAdmin && request.status === 'PENDING' && (
              <p className="text-sm text-[var(--muted)]">Waiting for HR review.</p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmingReject}
        title="Reject this request?"
        description={
          request
            ? `${request.employee ? `${request.employee.firstName} ${request.employee.lastName}'s` : "This"} ${request.leaveType.name.toLowerCase()} request for ${formatDate(request.startDate)} – ${formatDate(request.endDate)} will be rejected. This cannot be undone.`
            : ''
        }
        confirmLabel="Reject request"
        variant="danger"
        loading={rejectMutation.isPending}
        onCancel={() => setConfirmingReject(false)}
        onConfirm={() => {
          if (!request) return;
          rejectMutation.mutate(
            { id: request.id, comment: trimmedComment },
            { onSuccess: () => setConfirmingReject(false) }
          );
        }}
      />
    </>
  );
}
