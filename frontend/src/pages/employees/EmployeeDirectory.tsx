import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { listEmployees, createEmployee, listDepartments } from '../../services/employees';
import { getDashboardSummary } from '../../services/admin';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceDot } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatStrip,
} from '../../components/ui';
import { getApiError } from '../../api/client';

export function EmployeeDirectory() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    loginId: string;
    temporaryPassword: string;
  } | null>(null);
  const qc = useQueryClient();

  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data, isLoading, isError, refetch } = useQuery({
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
  });

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
      void qc.invalidateQueries({ queryKey: ['employees'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
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
          <Button onClick={() => { setOpen(true); setCreatedCreds(null); }}>NEW</Button>
        }
      />
      {stats.length > 0 && <StatStrip items={stats} />}

      <div className="mb-4">
        <input
          placeholder="Search name, code, department…"
          className="w-full max-w-md rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <LoadingSkeleton rows={6} />}
      {isError && <ErrorState message="Failed to load employees" onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No employees found" hint="Try a different search or add a new hire." />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((emp) => (
          <Link
            key={emp.id}
            to={`/employees/${emp.id}`}
            className="group relative rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)] transition hover:border-[var(--accent)]"
          >
            <span className="absolute right-3 top-3">
              <AttendanceDot checkedIn={emp.todayAttendance.isCheckedIn} />
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                {emp.firstName[0]}
                {emp.lastName[0]}
              </div>
              <div>
                <p className="font-semibold group-hover:text-[var(--accent)]">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {emp.designation || '—'} · {emp.department?.name || 'Unassigned'}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">{emp.employeeCode}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Modal
        open={open}
        title={createdCreds ? 'Employee provisioned' : 'Add employee'}
        onClose={() => setOpen(false)}
      >
        {createdCreds ? (
          <div className="space-y-3 text-sm">
            <p>Share these credentials with the new hire:</p>
            <div className="rounded-md bg-[var(--bg)] p-3 font-mono">
              <p>Login ID: {createdCreds.loginId}</p>
              <p>Temp password: {createdCreds.temporaryPassword}</p>
            </div>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="First name"
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <input
                required
                placeholder="Last name"
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <input
              required
              type="email"
              placeholder="Work email"
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Job position"
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
            <select
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">Department</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              required
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
            {create.isError && (
              <p className="text-sm text-[var(--danger)]">{getApiError(create.error).message}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Discard
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
