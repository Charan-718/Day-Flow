import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState, type ReactNode } from 'react';
import { getEmployee, getSalary, updateEmployee } from '../../services/employees';
import { updateSalaryFromWage } from '../../services/payroll';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
} from '../../components/ui';
import { getApiError } from '../../api/client';

type Tab = 'info' | 'resume' | 'private' | 'salary' | 'about' | 'security';

export function EmployeeProfile({ self }: { self?: boolean }) {
  const { id } = useParams();
  const { user } = useAuth();
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

  const { data, isLoading, isError, refetch } = useQuery({
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
      const body: Record<string, unknown> = { ...draft };
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
      void qc.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
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

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (isError || !data) {
    return <ErrorState message="Failed to load profile" onRetry={() => refetch()} />;
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
            {canEdit && !editing && (
              <Button variant="secondary" onClick={startEditing}>
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-[var(--line)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        {tab === 'info' && (
          <dl className="grid gap-4 sm:grid-cols-2">
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
                  className="w-full rounded border border-[var(--line)] px-2 py-1"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              )}
            </Field>
            <Field label="Location" value={editing ? undefined : String(emp.address || '—')}>
              {editing && (
                <input
                  className="w-full rounded border border-[var(--line)] px-2 py-1"
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
                  ? new Date(String(emp.joiningDate)).toLocaleDateString()
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
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of Birth"
              value={
                privateInfo.dateOfBirth
                  ? new Date(String(privateInfo.dateOfBirth)).toLocaleDateString()
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
            {salary.isLoading && <LoadingSkeleton />}
            {salary.data == null && !salary.isLoading && (
              <p className="text-sm text-[var(--muted)]">No salary structure configured.</p>
            )}
            {salary.data && (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Monthly wage"
                    value={`₹${Number((salary.data as { monthlyWage: number }).monthlyWage).toLocaleString()}`}
                  />
                  <Field
                    label="Yearly wage"
                    value={`₹${Number((salary.data as { yearlyWage: number }).yearlyWage).toLocaleString()}`}
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
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                    <tr>
                      <th className="py-2 font-medium">Component</th>
                      <th className="py-2 font-medium">Basis</th>
                      <th className="py-2 font-medium text-right">Amount</th>
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
                      <tr key={c.name} className="border-b border-[var(--line)]">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2 text-[var(--muted)]">
                          {c.basis === 'PERCENT_OF_BASIC'
                            ? `${c.percentage}% of Basic`
                            : 'Fixed'}
                        </td>
                        <td className="py-2 text-right font-mono">
                          ₹{c.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Bio</p>
              <p className="text-[var(--muted)]">{String(emp.bio || '—')}</p>
            </div>
            <div>
              <p className="font-medium">What I love about my job</p>
              <p className="text-[var(--muted)]">{String(emp.jobLoveNote || '—')}</p>
            </div>
            <div>
              <p className="font-medium">Interests</p>
              <p className="text-[var(--muted)]">{String(emp.interests || '—')}</p>
            </div>
            <div>
              <p className="mb-2 font-medium">Skills</p>
              <div className="flex flex-wrap gap-2">
                {((emp.skills as string[]) || []).map((s) => (
                  <span
                    key={s}
                    className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]"
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
          </dl>
        )}

        {editing && (
          <div className="mt-4 flex gap-2 border-t border-[var(--line)] pt-4">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {save.isError && (
              <span className="text-sm text-[var(--danger)]">
                {getApiError(save.error).message}
              </span>
            )}
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
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>
        {children || value}
      </dd>
    </div>
  );
}
