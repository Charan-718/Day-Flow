import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listEmployees, createEmployee, listDepartments } from '../../services/employees';
import { getDashboardSummary } from '../../services/admin';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { PresenceIndicator } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { SearchIcon, UserPlusIcon } from '../../components/icons';
import { EmptyState, ErrorState, PageHeader, StatStrip } from '../../components/ui';
import { getApiError } from '../../api/client';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  designation: '',
  departmentId: '',
  joiningDate: new Date().toISOString().slice(0, 10),
  monthlyWage: '',
};

export function EmployeeDirectory() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    loginId: string;
    temporaryPassword: string;
    assignedRole?: string;
  } | null>(null);
  const qc = useQueryClient();

  // 250ms debounce — the previous version fired a request on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => listEmployees(search),
  });

  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: open,
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    designation: '',
    departmentId: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    monthlyWage: '',
  });

  const create = useMutation({
    mutationFn: () =>
      createEmployee({
        ...form,
        departmentId: form.departmentId || null,
        monthlyWage: form.monthlyWage ? Number(form.monthlyWage) : undefined,
      }),
    onSuccess: (res) => {
      setCreatedCreds({
        loginId: res.loginId,
        temporaryPassword: res.temporaryPassword,
        assignedRole: res.assignedRole,
      });
      showToast('success', `Employee created — Login ID ${res.loginId}`);
      void qc.invalidateQueries({ queryKey: ['employees'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => showToast('error', getApiError(err).message),
  });

  const stats =
    summary.data && user?.role === 'HR_ADMIN'
      ? [
          { label: 'Headcount', value: summary.data.headcount },
          { label: 'Pending leave', value: summary.data.pendingLeaveCount },
          { label: "Today's attendance", value: `${summary.data.todayAttendancePercent}%` },
        ]
      : [];

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Directory of everyone in the organization"
        actions={
          <Button
            onClick={() => {
              setOpen(true);
              setCreatedCreds(null);
              setForm(emptyForm);
              create.reset();
            }}
          >
            <UserPlusIcon size={16} />
            New employee
          </Button>
        }
      />
      {stats.length > 0 && <StatStrip items={stats} />}

      <label className="mt-6 mb-6 block">
        <span className="sr-only">Search employees</span>
        <div className="group relative max-w-lg">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-powder-blue)] transition-colors group-focus-within:text-[var(--color-powder-blue)]"
          />
          <input
            placeholder="Search name, code, department…"
            className="w-full rounded-2xl border border-[var(--color-powder-blue)]/70 bg-[var(--color-surface)] py-3 pl-11 pr-10 text-sm font-medium text-[var(--color-text)] placeholder-[var(--color-text-muted)] shadow-[0_0_18px_rgba(176,255,61,0.22)] outline-none transition-all hover:border-[var(--color-powder-blue)] hover:shadow-[0_0_24px_rgba(176,255,61,0.35)] focus:border-[var(--color-powder-blue)] focus:shadow-[0_0_28px_rgba(176,255,61,0.45)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/40"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-powder-blue)] transition-colors p-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </label>

      {isLoading && <CardGridSkeleton />}
      {isError && <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          title={search ? `No employees match "${search}"` : 'No employees yet'}
          hint={search ? 'Try a different name, code, or department.' : 'Add your first employee to get started.'}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((emp) => (
          <Link
            key={emp.id}
            to={`/employees/${emp.id}`}
            className="group relative rounded-2xl border border-[var(--color-primary)]/60 bg-[var(--color-surface)] p-5 shadow-[0_0_16px_rgba(140,61,255,0.2)] transition-all hover:border-[var(--color-primary-hover)] hover:shadow-[0_0_24px_rgba(140,61,255,0.4)] hover:-translate-y-1"
          >
            <span className="absolute right-3 top-3">
              <PresenceIndicator
                presence={emp.presence || emp.todayAttendance.presence || 'absent'}
              />
            </span>
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/20 text-sm font-extrabold text-[var(--color-powder-blue)] shadow-md">
                {emp.profilePictureUrl ? (
                  <img
                    src={String(emp.profilePictureUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    {emp.firstName[0]}
                    {emp.lastName[0]}
                  </>
                )}
              </div>
              <div>
                <p className="font-extrabold text-base text-[var(--color-powder-blue)] group-hover:brightness-125 transition-all">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-sm font-semibold text-[var(--color-primary-hover)]">
                  {emp.designation || '—'} · {emp.department?.name || 'Unassigned'}
                </p>
                <p className="font-mono text-xs font-medium text-[var(--color-text-muted)]">{emp.employeeCode}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Modal
        open={open}
        title={createdCreds ? 'Employee provisioned' : 'Add employee'}
        onClose={() => setOpen(false)}
        footer={
          createdCreds ? (
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
                Discard
              </Button>
              <Button type="submit" form="add-employee-form" loading={create.isPending}>
                Create
              </Button>
            </div>
          )
        }
      >
        {createdCreds ? (
          <div className="space-y-3 text-sm">
            <p>Share these credentials with the new hire:</p>
            <div className="rounded-md bg-[var(--bg)] p-3 font-mono text-xs">
              <p>Login ID: {createdCreds.loginId}</p>
              <p>Role: {createdCreds.assignedRole || 'EMPLOYEE'}</p>
              <p>Temp password: {createdCreds.temporaryPassword}</p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              HR department or HR job title automatically receives HR Admin access.
            </p>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form
            id="add-employee-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">First name</span>
                <input
                  required
                  className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">Last name</span>
                <input
                  required
                  className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">Work email</span>
              <input
                required
                type="email"
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">
                Job position <span className="font-normal text-[var(--muted)]">(optional)</span>
              </span>
              <input
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">
                Department <span className="font-normal text-[var(--muted)]">(optional)</span>
              </span>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-powder-blue)] focus-visible:ring-2 focus-visible:ring-[var(--color-powder-blue)]"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="" className="bg-[var(--color-surface)] text-[var(--color-text)]">Unassigned</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">Joining date</span>
              <input
                type="date"
                required
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                value={form.joiningDate}
                onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--ink)]">
                Monthly wage (₹) <span className="font-normal text-[var(--muted)]">(optional)</span>
              </span>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                value={form.monthlyWage}
                onChange={(e) => setForm({ ...form, monthlyWage: e.target.value })}
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Role is assigned automatically: Human Resources → HR Admin, all other departments →
              Employee.
            </p>
            {create.isError && (
              <p role="alert" className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
                {getApiError(create.error).message}
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading employees" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[var(--line)]/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-[var(--line)]/60" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--line)]/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
