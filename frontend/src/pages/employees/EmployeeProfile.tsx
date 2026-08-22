import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { getEmployee, getSalary, updateEmployee } from '../../services/employees';
import { resetEmployeePassword } from '../../services/auth';
import { updateSalaryFromWage } from '../../services/payroll';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { AvatarUpload } from '../../components/AvatarUpload';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorState, PageHeader } from '../../components/ui';
import { getApiError } from '../../api/client';

type Tab = 'info' | 'resume' | 'private' | 'salary' | 'about' | 'security';

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
  const [draft, setDraft] = useState<Record<string, string | string[]>>({});
  const [salaryDraft, setSalaryDraft] = useState({
    monthlyWage: '',
    workingDaysPerWeek: '5',
    breakTimeMinutes: '60',
  });
  const [uploadLabel, setUploadLabel] = useState('Resume');
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
  const isSelf = Boolean(self || user?.employeeId === employeeId);

  const tabs = useMemo(() => {
    const list: Array<{ key: Tab; label: string }> = [
      { key: 'info', label: 'Info' },
      { key: 'resume', label: 'Resume' },
      { key: 'private', label: 'Private Info' },
      { key: 'about', label: 'About' },
    ];
    if (canViewSalary) list.splice(3, 0, { key: 'salary', label: 'Salary Info' });
    if (isSelf || isAdmin) list.push({ key: 'security', label: 'Security' });
    return list;
  }, [canViewSalary, isSelf, isAdmin]);

  const save = useMutation({
    mutationFn: () => {
      // The backend rejects any field outside phone/address/profilePictureUrl for a
      // self-edit (non-admin) — draft can carry more (admin fields get populated by
      // startEditing() too), so scope what's actually sent by role.
      const body: Record<string, unknown> = isAdmin
        ? { ...draft }
        : { phone: draft.phone, address: draft.address };
      if (typeof body.skills === 'string') {
        body.skills = body.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return updateEmployee(employeeId, body);
    },
    onSuccess: () => {
      setEditing(false);
      showToast('success', 'Profile updated');
      void qc.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const [resetResult, setResetResult] = useState<{ temporaryPassword: string } | null>(null);
  const resetPassword = useMutation({
    mutationFn: () => resetEmployeePassword(employeeId),
    onSuccess: (data) => {
      setResetResult({ temporaryPassword: data.temporaryPassword });
      showToast('success', 'Password reset — share the temporary password with the employee');
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const saveSalary = useMutation({
    mutationFn: () =>
      updateSalaryFromWage(employeeId, {
        monthlyWage: Number(salaryDraft.monthlyWage),
        workingDaysPerWeek: Number(salaryDraft.workingDaysPerWeek),
        breakTimeMinutes: Number(salaryDraft.breakTimeMinutes),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['salary', employeeId] });
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve((fr.result as string).split(',')[1] || '');
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      const { uploadDocument } = await import('../../services/employees');
      return uploadDocument(employeeId, {
        label: uploadLabel,
        fileName: file.name,
        dataBase64,
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['employee', employeeId] }),
  });

  function startEditing() {
    setDraft({
      phone: String(emp.phone || ''),
      address: String(emp.address || ''),
      firstName: String(emp.firstName || ''),
      lastName: String(emp.lastName || ''),
      designation: String(emp.designation || ''),
      bio: String(emp.bio || ''),
      jobLoveNote: String(emp.jobLoveNote || ''),
      interests: String(emp.interests || ''),
      skills: ((emp.skills as string[]) || []).join(', '),
      gender: String(privateInfo.gender || ''),
      maritalStatus: String(privateInfo.maritalStatus || ''),
      nationality: String(privateInfo.nationality || ''),
      personalEmail: String(privateInfo.personalEmail || ''),
      bankName: String(privateInfo.bankName || ''),
      bankAccountNumber: String(privateInfo.bankAccountNumber || ''),
      ifscCode: String(privateInfo.ifscCode || ''),
      panNumber: String(privateInfo.panNumber || ''),
      uanNumber: String(privateInfo.uanNumber || ''),
    });
    setEditing(true);
  }

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

  return (
    <div>
      {/* Profile header — identity first, then the facts people look up most often. */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
        <div className="h-24 bg-gradient-to-r from-[var(--color-background-deep)] to-[var(--color-surface)]" aria-hidden="true" />
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-12 flex flex-col gap-6 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              <AvatarUpload
                employeeId={employeeId}
                currentUrl={emp.profilePictureUrl as string | null}
                firstName={String(emp.firstName || '')}
                lastName={String(emp.lastName || '')}
                editable={canEdit}
                size={96}
              />
              <div className="pb-1 text-center sm:pb-2 sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-powder-blue)]">
                  {String(emp.firstName || '')} {String(emp.lastName || '')}
                </h1>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  {String(emp.designation || '—')} · <span className="font-mono text-[var(--color-powder-blue)]">{String(emp.employeeCode || '')}</span>
                </p>
                {emp.accountStatus ? (
                  <span className="mt-2.5 inline-flex">
                    <StatusBadge status={String(emp.accountStatus)} />
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 justify-center gap-3 sm:justify-end sm:pb-2">
              {isAdmin && !self && (
                <Link to={`/employees/${employeeId}/360`}>
                  <Button variant="secondary">360° View</Button>
                </Link>
              )}
              {canEdit && editableOnThisTab && !editing && (
                <Button variant="secondary" onClick={startEditing}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Profile sections" className="mb-6 flex flex-wrap gap-3 border-b border-[var(--color-border)] pb-2 px-1">
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
            className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-xl cursor-pointer ${
              tab === t.key
                ? 'border-b-2 border-[var(--color-powder-blue)] text-[var(--color-powder-blue)] bg-[var(--color-surface)] shadow-md'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background-deep)]'
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
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 lg:p-10 shadow-xl"
      >
        {tab === 'info' && (
          <dl className="grid gap-6 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-8">
            <Field label="Company" value={String(emp.companyName || 'Dayflow')} />
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

        {tab === 'resume' && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-medium">Documents</p>
              <ul className="space-y-2">
                {((emp.documents as Array<{ id: string; label: string; fileUrl: string }>) || []).map(
                  (d) => (
                    <li key={d.id} className="flex items-center justify-between rounded border border-[var(--line)] px-3 py-2">
                      <span>{d.label}</span>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  )
                )}
                {!(emp.documents as unknown[])?.length && (
                  <p className="text-[var(--muted)]">No documents uploaded yet.</p>
                )}
              </ul>
            </div>
            {(canEdit || isAdmin) && (
              <div className="border-t border-[var(--line)] pt-4">
                <p className="mb-2 font-medium">Upload document</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    placeholder="Label (e.g. Resume)"
                    className="rounded border border-[var(--line)] px-2 py-1"
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                  />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDoc.mutate(file);
                    }}
                  />
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 font-medium">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {((emp.certifications as string[]) || []).map((c) => (
                  <span key={c} className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'private' && (
          <dl className="grid gap-6 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-8">
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
            <div className="mb-4 rounded-md border border-[var(--line)] bg-[var(--bg)] p-4">
              <p className="mb-2 text-sm font-medium">Update monthly wage (auto-calculates components)</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  placeholder="Monthly wage ₹"
                  className="rounded border border-[var(--line)] px-2 py-1 text-sm"
                  value={salaryDraft.monthlyWage}
                  onChange={(e) => setSalaryDraft({ ...salaryDraft, monthlyWage: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Working days/week"
                  className="rounded border border-[var(--line)] px-2 py-1 text-sm"
                  value={salaryDraft.workingDaysPerWeek}
                  onChange={(e) =>
                    setSalaryDraft({ ...salaryDraft, workingDaysPerWeek: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Break time (mins)"
                  className="rounded border border-[var(--line)] px-2 py-1 text-sm"
                  value={salaryDraft.breakTimeMinutes}
                  onChange={(e) =>
                    setSalaryDraft({ ...salaryDraft, breakTimeMinutes: e.target.value })
                  }
                />
              </div>
              <Button
                className="mt-2"
                disabled={!salaryDraft.monthlyWage || saveSalary.isPending}
                onClick={() => saveSalary.mutate()}
              >
                Recalculate salary
              </Button>
            </div>
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
                  <Field
                    label="Break time"
                    value={`${String((salary.data as { breakTimeMinutes: number }).breakTimeMinutes)} mins / day`}
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

        {tab === 'security' && (isSelf || isAdmin) && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Login ID" value={String(emp.loginId || '')} mono />
            <Field label="Account email" value={String(emp.email || '')} />
            <Field label="System role" value={String(emp.role || '')} />
            <Field label="Account status" value={String(emp.accountStatus || '')} />
            {isSelf && (
              <div className="sm:col-span-2">
                <Link
                  to="/change-password"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Change password →
                </Link>
              </div>
            )}
            {isAdmin && !isSelf && (
              <div className="sm:col-span-2 border-t border-[var(--line)] pt-4">
                <p className="mb-2 text-sm font-medium text-[var(--ink)]">Reset password</p>
                <p className="mb-3 text-xs text-[var(--muted)]">
                  There's no self-service reset — generate a new temporary password and share
                  it with {String(emp.firstName || 'the employee')} directly. They'll be
                  required to set their own password on next login.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => resetPassword.mutate()}
                  loading={resetPassword.isPending}
                >
                  Reset password
                </Button>
                {resetResult && (
                  <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2.5">
                    <p className="text-xs font-medium text-[var(--muted)]">Temporary password</p>
                    <p className="mt-0.5 font-mono text-sm text-[var(--ink)]">
                      {resetResult.temporaryPassword}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      Share this now — it won't be shown again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </dl>
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
      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</dt>
      <dd className={`mt-1.5 text-base font-semibold text-[var(--color-text)] ${mono ? 'font-mono text-[var(--color-powder-blue)]' : ''}`}>{children || value}</dd>
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
