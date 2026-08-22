import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { getEmployee, getSalary, updateEmployee } from '../../services/employees';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { ErrorState, PageHeader } from '../../components/ui';
import { getApiError } from '../../api/client';

type Tab = 'info' | 'private' | 'salary' | 'about';

const ALL_TABS: Array<{ key: Tab; label: string }> = [
  { key: 'info', label: 'Info' },
  { key: 'private', label: 'Private Info' },
  { key: 'salary', label: 'Salary Info' },
  { key: 'about', label: 'About' },
];

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function EmployeeProfile({ self }: { self?: boolean }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const employeeId = self ? user?.employeeId || '' : id || '';
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ phone: '', address: '' });
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: Boolean(employeeId),
  });

  const salary = useQuery({
    queryKey: ['salary', employeeId],
    queryFn: () => getSalary(employeeId),
    enabled: Boolean(employeeId) && tab === 'salary' && user?.role === 'HR_ADMIN',
  });

  const emp = (data?.employee || {}) as Record<string, unknown>;
  const privateInfo = (emp.privateInfo || {}) as Record<string, unknown>;
  const canViewSalary = Boolean(data?.canViewSalary);
  const canEdit = Boolean(data?.canEdit);
  const isAdmin = user?.role === 'HR_ADMIN';

  const tabs = useMemo(
    () => ALL_TABS.filter((t) => t.key !== 'salary' || canViewSalary),
    [canViewSalary]
  );

  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, currentKey: Tab) {
    const idx = tabs.findIndex((t) => t.key === currentKey);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(idx + delta + tabs.length) % tabs.length];
      setTab(next.key);
      document.getElementById(`profile-tab-${next.key}`)?.focus();
    }
  }

  const save = useMutation({
    mutationFn: () => updateEmployee(employeeId, draft),
    onSuccess: () => {
      setEditing(false);
      showToast('success', 'Profile updated');
      void qc.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  if (isLoading) return <ProfileSkeleton />;
  if (isError || !data) {
    return <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />;
  }

  if (data.access === 'directory') {
    return (
      <div>
        <PageHeader title={`${emp.firstName} ${emp.lastName}`} />
        <p className="text-sm text-[var(--muted)]">
          Directory view only — private HR fields are hidden.
        </p>
      </div>
    );
  }

  // DESIGN_SYSTEM: only show Edit where something is actually editable — the Info tab is
  // the only one wired to a save action today, so Edit no longer appears on tabs where
  // clicking it opened a Save/Cancel bar over read-only text.
  const editableOnThisTab = tab === 'info';

  return (
    <div>
      <PageHeader
        title={`${emp.firstName} ${emp.lastName}`}
        subtitle={`${emp.designation || '—'} · ${emp.employeeCode}`}
        actions={
          <div className="flex gap-2">
            {isAdmin && !self && (
              <Link to={`/employees/${employeeId}/360`}>
                <Button variant="secondary">360° View</Button>
              </Link>
            )}
            {canEdit && editableOnThisTab && !editing && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft({
                    phone: String(emp.phone || ''),
                    address: String(emp.address || ''),
                  });
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div role="tablist" aria-label="Profile sections" className="mb-4 flex gap-1 border-b border-[var(--line)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`profile-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`profile-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => handleTabKeyDown(e, t.key)}
            className={`px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              tab === t.key
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`profile-panel-${tab}`}
        aria-labelledby={`profile-tab-${tab}`}
        className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
      >
        {tab === 'info' && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" value="Dayflow" />
            <Field label="Login ID" value={String(emp.loginId || '')} mono />
            <Field label="Email" value={String(emp.email || '')} />
            <Field label="Department" value={(emp.department as { name?: string })?.name || '—'} />
            <Field
              label="Manager"
              value={
                emp.manager
                  ? `${(emp.manager as { firstName: string }).firstName} ${(emp.manager as { lastName: string }).lastName}`
                  : '—'
              }
            />
            <Field label="Mobile" value={editing ? undefined : String(emp.phone || '—')}>
              {editing && (
                <input
                  className="w-full rounded-md border border-[var(--border-control)] px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              )}
            </Field>
            <Field label="Location" value={editing ? undefined : String(emp.address || '—')}>
              {editing && (
                <input
                  className="w-full rounded-md border border-[var(--border-control)] px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              )}
            </Field>
            <Field label="Job Position" value={String(emp.designation || '—')} />
            <Field
              label="Date of Joining"
              value={
                emp.joiningDate
                  ? new Date(String(emp.joiningDate)).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
            <Field label="Emp Code" value={String(emp.employeeCode || '')} mono />
          </dl>
        )}

        {tab === 'private' && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of Birth"
              value={
                privateInfo.dateOfBirth
                  ? new Date(String(privateInfo.dateOfBirth)).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
            <Field label="Gender" value={String(privateInfo.gender || '—')} />
            <Field label="Marital Status" value={String(privateInfo.maritalStatus || '—')} />
            <Field label="Nationality" value={String(privateInfo.nationality || '—')} />
            <Field label="Personal Email" value={String(privateInfo.personalEmail || '—')} />
            <Field label="Bank Name" value={String(privateInfo.bankName || '—')} />
            <Field label="Account Number" value={String(privateInfo.bankAccountNumber || '—')} mono />
            <Field label="IFSC" value={String(privateInfo.ifscCode || '—')} mono />
            <Field label="PAN" value={String(privateInfo.panNumber || '—')} mono />
            <Field label="UAN" value={String(privateInfo.uanNumber || '—')} mono />
          </dl>
        )}

        {tab === 'salary' && isAdmin && (
          <div>
            {salary.isLoading && <SalarySkeleton />}
            {salary.isError && (
              <ErrorState message={getApiError(salary.error).message} onRetry={() => salary.refetch()} />
            )}
            {!salary.isLoading && !salary.isError && salary.data == null && (
              <p className="text-sm text-[var(--muted)]">No salary structure configured.</p>
            )}
            {!salary.isLoading && !salary.isError && salary.data && (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Monthly wage"
                    value={formatCurrency(Number((salary.data as { monthlyWage: number }).monthlyWage))}
                    mono
                  />
                  <Field
                    label="Yearly wage"
                    value={formatCurrency(Number((salary.data as { yearlyWage: number }).yearlyWage))}
                    mono
                  />
                  <Field
                    label="Working days / week"
                    value={String((salary.data as { workingDaysPerWeek: number }).workingDaysPerWeek)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Salary components</caption>
                    <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                      <tr>
                        <th scope="col" className="py-2 font-medium">
                          Component
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Basis
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        salary.data as {
                          components: Array<{
                            name: string;
                            basis: string;
                            amount: number;
                            percentage: number | null;
                          }>;
                        }
                      ).components.map((c) => (
                        <tr key={c.name} className="border-b border-[var(--line)] last:border-0">
                          <td className="py-2">{c.name}</td>
                          <td className="py-2 text-[var(--muted)]">
                            {c.basis === 'PERCENT_OF_BASIC' ? `${c.percentage}% of Basic` : 'Fixed'}
                          </td>
                          <td className="py-2 text-right font-mono">{formatCurrency(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-[var(--ink)]">Bio</p>
              <p className="mt-0.5 text-[var(--muted)]">{String(emp.bio || '—')}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--ink)]">What I love about my job</p>
              <p className="mt-0.5 text-[var(--muted)]">{String(emp.jobLoveNote || '—')}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--ink)]">Interests</p>
              <p className="mt-0.5 text-[var(--muted)]">{String(emp.interests || '—')}</p>
            </div>
            <div>
              <p className="mb-2 font-medium text-[var(--ink)]">Skills</p>
              <div className="flex flex-wrap gap-2">
                {((emp.skills as string[]) || []).length === 0 && (
                  <span className="text-[var(--muted)]">—</span>
                )}
                {((emp.skills as string[]) || []).map((s) => (
                  <span
                    key={s}
                    className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--line)] pt-4">
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.isPending}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className={`mt-1 text-sm text-[var(--ink)] ${mono ? 'font-mono' : ''}`}>{children || value}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <div className="mb-5 h-6 w-48 animate-pulse rounded bg-[var(--line)]/60" />
      <div className="mb-4 flex gap-4 border-b border-[var(--line)] pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-16 animate-pulse rounded bg-[var(--line)]/60" />
        ))}
      </div>
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-[var(--line)]/60" />
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--line)]/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SalarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading salary" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--line)]/60" />
            <div className="h-4 w-20 animate-pulse rounded bg-[var(--line)]/60" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-[var(--line)]/60" />
        ))}
      </div>
    </div>
  );
}
