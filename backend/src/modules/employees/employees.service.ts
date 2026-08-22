import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError, assertFound } from '../../utils/errors';
import { AuthUser } from '../../middleware/requireAuth';
import { writeAuditLog } from '../../utils/auditWriter';
import { parseDateOnly, todayUtc } from '../../utils/dates';
import { z } from 'zod';
import { listEmployeesQuerySchema, updateEmployeeSchema } from './employees.schema';

type ListQuery = z.infer<typeof listEmployeesQuerySchema>;
type UpdateInput = z.infer<typeof updateEmployeeSchema>;

const EMPLOYEE_SELF_ALLOWLIST = new Set(['phone', 'address', 'profilePictureUrl']);

function toPublicDirectory(employee: {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  profilePictureUrl: string | null;
  department: { id: string; name: string } | null;
  employmentStatus: string;
}) {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    designation: employee.designation,
    profilePictureUrl: employee.profilePictureUrl,
    department: employee.department,
    employmentStatus: employee.employmentStatus,
  };
}

export async function listEmployees(query: ListQuery) {
  const where: Prisma.EmployeeWhereInput = {};
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { employeeCode: { contains: q, mode: 'insensitive' } },
      { department: { name: { contains: q, mode: 'insensitive' } } },
      { designation: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        department: true,
        user: { select: { loginId: true, email: true, role: true, status: true } },
      },
    }),
  ]);

  const today = todayUtc();
  const summaries = await prisma.attendanceDaySummary.findMany({
    where: {
      date: today,
      employeeId: { in: rows.map((r) => r.id) },
    },
  });
  const summaryMap = new Map(summaries.map((s) => [s.employeeId, s]));

  return {
    items: rows.map((e) => ({
      ...toPublicDirectory(e),
      loginId: e.user.loginId,
      email: e.user.email,
      role: e.user.role,
      todayAttendance: summaryMap.get(e.id)
        ? {
            status: summaryMap.get(e.id)!.status,
            checkIn: summaryMap.get(e.id)!.checkIn,
            checkOut: summaryMap.get(e.id)!.checkOut,
            isCheckedIn: Boolean(
              summaryMap.get(e.id)!.checkIn && !summaryMap.get(e.id)!.checkOut
            ),
          }
        : { status: null, checkIn: null, checkOut: null, isCheckedIn: false },
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    },
  };
}

export async function getEmployeeById(id: string, actor: AuthUser) {
  const employee = assertFound(
    await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, designation: true },
        },
        user: {
          select: { loginId: true, email: true, role: true, status: true },
        },
        documents: true,
        leaveBalances: { include: { leaveType: true } },
      },
    }),
    'Employee not found'
  );

  const isAdmin = actor.role === Role.HR_ADMIN;
  const isSelf = actor.employeeId === id;

  if (!isAdmin && !isSelf) {
    // Coworker directory-safe subset only
    return {
      access: 'directory' as const,
      canViewSalary: false,
      canEdit: false,
      employee: toPublicDirectory(employee),
    };
  }

  const base = {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    profilePictureUrl: employee.profilePictureUrl,
    phone: employee.phone,
    address: employee.address,
    department: employee.department,
    designation: employee.designation,
    manager: employee.manager,
    joiningDate: employee.joiningDate,
    employmentStatus: employee.employmentStatus,
    loginId: employee.user.loginId,
    email: employee.user.email,
    role: employee.user.role,
    accountStatus: employee.user.status,
    bio: employee.bio,
    jobLoveNote: employee.jobLoveNote,
    interests: employee.interests,
    skills: employee.skills,
    certifications: employee.certifications,
    documents: employee.documents,
    leaveBalances: employee.leaveBalances.map((b) => ({
      leaveType: b.leaveType,
      allocatedDays: Number(b.allocatedDays),
      usedDays: Number(b.usedDays),
      availableDays: Number(b.allocatedDays) - Number(b.usedDays),
    })),
  };

  const privateInfo = {
    personalEmail: employee.personalEmail,
    dateOfBirth: employee.dateOfBirth,
    gender: employee.gender,
    maritalStatus: employee.maritalStatus,
    nationality: employee.nationality,
    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
    ifscCode: employee.ifscCode,
    panNumber: employee.panNumber,
    uanNumber: employee.uanNumber,
  };

  return {
    access: isAdmin ? ('admin' as const) : ('self' as const),
    canViewSalary: isAdmin,
    canEdit: isAdmin || isSelf,
    editableFields: isAdmin
      ? 'all'
      : (['phone', 'address', 'profilePictureUrl'] as const),
    employee: {
      ...base,
      privateInfo,
    },
  };
}

export async function updateEmployee(
  id: string,
  input: UpdateInput,
  actor: AuthUser,
  ipAddress?: string
) {
  const existing = assertFound(
    await prisma.employee.findUnique({ where: { id } }),
    'Employee not found'
  );

  const isAdmin = actor.role === Role.HR_ADMIN;
  const isSelf = actor.employeeId === id;

  if (!isAdmin && !isSelf) {
    throw new AppError('You cannot edit this employee', 'FORBIDDEN', 403);
  }

  const keys = Object.keys(input);
  if (!isAdmin) {
    const disallowed = keys.filter((k) => !EMPLOYEE_SELF_ALLOWLIST.has(k));
    if (disallowed.length > 0) {
      throw new AppError(
        `Employees may only update: phone, address, profilePictureUrl. Rejected: ${disallowed.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }
  }

  const data: Prisma.EmployeeUpdateInput = {};
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.profilePictureUrl !== undefined) {
    data.profilePictureUrl = input.profilePictureUrl || null;
  }

  if (isAdmin) {
    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.personalEmail !== undefined) data.personalEmail = input.personalEmail || null;
    if (input.designation !== undefined) data.designation = input.designation;
    if (input.employmentStatus !== undefined) data.employmentStatus = input.employmentStatus;
    if (input.gender !== undefined) data.gender = input.gender;
    if (input.maritalStatus !== undefined) data.maritalStatus = input.maritalStatus;
    if (input.nationality !== undefined) data.nationality = input.nationality;
    if (input.bankName !== undefined) data.bankName = input.bankName;
    if (input.bankAccountNumber !== undefined) data.bankAccountNumber = input.bankAccountNumber;
    if (input.ifscCode !== undefined) data.ifscCode = input.ifscCode;
    if (input.panNumber !== undefined) data.panNumber = input.panNumber;
    if (input.uanNumber !== undefined) data.uanNumber = input.uanNumber;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.jobLoveNote !== undefined) data.jobLoveNote = input.jobLoveNote;
    if (input.interests !== undefined) data.interests = input.interests;
    if (input.skills !== undefined) data.skills = input.skills;
    if (input.certifications !== undefined) data.certifications = input.certifications;
    if (input.dateOfBirth !== undefined) {
      data.dateOfBirth = input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null;
    }
    if (input.departmentId !== undefined) {
      data.department = input.departmentId
        ? { connect: { id: input.departmentId } }
        : { disconnect: true };
    }
    if (input.managerId !== undefined) {
      data.manager = input.managerId
        ? { connect: { id: input.managerId } }
        : { disconnect: true };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const emp = await tx.employee.update({
      where: { id },
      data,
      include: {
        department: true,
        user: { select: { loginId: true, email: true, role: true } },
      },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: id,
      previousValue: {
        phone: existing.phone,
        address: existing.address,
        designation: existing.designation,
      },
      newValue: input as Prisma.InputJsonValue,
      ipAddress,
    });

    return emp;
  });

  return updated;
}

export async function getEmployee360(id: string) {
  const employee = assertFound(
    await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { loginId: true, email: true, role: true } },
        salaryStructure: { include: { components: true } },
        leaveBalances: { include: { leaveType: true } },
        leaveRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { leaveType: true },
        },
      },
    }),
    'Employee not found'
  );

  const today = todayUtc();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const attendance = await prisma.attendanceDaySummary.findMany({
    where: { employeeId: id, date: { gte: monthStart, lte: today } },
    orderBy: { date: 'desc' },
  });

  const recentActivity = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'Employee', entityId: id },
        { entityType: 'LeaveRequest', entityId: { in: employee.leaveRequests.map((r) => r.id) } },
        { entityType: 'AttendanceEvent', entityId: id },
        { entityType: 'SalaryStructure', entityId: id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      actor: { select: { loginId: true, email: true } },
    },
  });

  return {
    profile: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designation: employee.designation,
      department: employee.department,
      manager: employee.manager,
      joiningDate: employee.joiningDate,
      loginId: employee.user.loginId,
      email: employee.user.email,
      phone: employee.phone,
      profilePictureUrl: employee.profilePictureUrl,
    },
    attendanceSnapshot: {
      presentDays: attendance.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY')
        .length,
      leaveDays: attendance.filter((a) => a.status === 'LEAVE').length,
      exceptions: attendance.filter((a) => a.isException).length,
      recent: attendance.slice(0, 7),
    },
    leaveSnapshot: {
      balances: employee.leaveBalances.map((b) => ({
        type: b.leaveType.name,
        available: Number(b.allocatedDays) - Number(b.usedDays),
      })),
      recentRequests: employee.leaveRequests,
    },
    salarySnapshot: employee.salaryStructure
      ? {
          monthlyWage: Number(employee.salaryStructure.monthlyWage),
          yearlyWage: Number(employee.salaryStructure.yearlyWage),
          components: employee.salaryStructure.components.map((c) => ({
            name: c.name,
            amount: Number(c.amount),
            basis: c.basis,
          })),
        }
      : null,
    recentActivity,
  };
}

export async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: 'asc' } });
}
