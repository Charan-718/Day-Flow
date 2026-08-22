import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from './errors';

const HR_DEPARTMENT_MARKERS = ['human resources', 'hr', 'people operations'];
const HR_TITLE_PATTERN =
  /\b(hr officer|hr admin|human resource|people ops|hr manager|hr executive)\b/i;

/**
 * Production role assignment:
 * - Human Resources department OR HR job title → HR_ADMIN
 * - Everything else → EMPLOYEE
 * - Only an existing HR_ADMIN may explicitly grant HR_ADMIN via requestedRole
 */
export async function resolveEmployeeRole(opts: {
  departmentId?: string | null;
  designation?: string | null;
  requestedRole?: Role;
  actorRole: Role;
}): Promise<Role> {
  let inferred: Role = Role.EMPLOYEE;

  if (opts.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: opts.departmentId } });
    if (dept?.isHrTeam || HR_DEPARTMENT_MARKERS.includes(dept?.name.toLowerCase() ?? '')) {
      inferred = Role.HR_ADMIN;
    }
  }

  if (opts.designation && HR_TITLE_PATTERN.test(opts.designation)) {
    inferred = Role.HR_ADMIN;
  }

  if (opts.requestedRole === Role.HR_ADMIN) {
    if (opts.actorRole !== Role.HR_ADMIN) {
      throw new AppError('Only HR Admin can assign the HR Admin role', 'FORBIDDEN', 403);
    }
    return Role.HR_ADMIN;
  }

  if (opts.requestedRole === Role.EMPLOYEE) {
    return Role.EMPLOYEE;
  }

  return inferred;
}

export async function syncUserRoleForEmployee(employeeId: string, departmentId: string | null, designation: string | null) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!employee) return;

  const role = await resolveEmployeeRole({
    departmentId,
    designation,
    actorRole: Role.HR_ADMIN,
  });

  if (employee.user.role !== role) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { role },
    });
  }
}
