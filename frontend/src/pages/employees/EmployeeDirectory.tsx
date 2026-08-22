import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listEmployees, createEmployee, listDepartments } from '../../services/employees';
import { getDashboardSummary } from '../../services/admin';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { PresenceDot, derivePresenceState } from '../../components/StatusBadge';
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

  const [form, setForm] = useState(emptyForm);

  const create = useMutation({
    mutationFn: () =>
      createEmployee({
        ...form,
        departmentId: form.departmentId || null,
        role: 'EMPLOYEE',
      }),
    onSuccess: (res) => {
      setCreatedCreds({
        loginId: res.loginId,
        temporaryPassword: res.temporaryPassword,
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

      <label className="mb-4 block">
        <span className="sr-only">Search employees</span>
        <div className="relative max-w-md">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            placeholder="Search name, code, department…"
            className="w-full rounded-md border border-[var(--border-control)] bg-white py-2 pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((emp) => {
          const presence = derivePresenceState(emp.todayAttendance);
          return (
            <Link
              key={emp.id}
              to={`/employees/${emp.id}`}
              className="group relative rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <span className="absolute right-3 top-3">
                <PresenceDot state={presence} />
              </span>
              <div className="flex items-center gap-3">
                {emp.profilePictureUrl ? (
                  <img
                    src={emp.profilePictureUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                    {emp.firstName[0]}
                    {emp.lastName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {emp.designation || '—'} · {emp.department?.name || 'Unassigned'}
                  </p>
                  <p className="font-mono text-xs text-[var(--muted)]">{emp.employeeCode}</p>
                </div>
              </div>
            </Link>
          );
        })}
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
            <p className="text-[var(--ink)]">Share these credentials with the new hire:</p>
            <div className="rounded-md bg-[var(--bg)] p-3 font-mono">
              <p>Login ID: {createdCreds.loginId}</p>
              <p>Temp password: {createdCreds.temporaryPassword}</p>
            </div>
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
                className="w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
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
        <div key={i} className="rounded-lg border border-[var(--line)] bg-white p-4">
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
