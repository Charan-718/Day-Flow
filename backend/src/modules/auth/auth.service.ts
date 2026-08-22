import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AccountStatus, ComponentBasis, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { signToken } from '../../utils/jwt';
import {
  buildEmployeeCodeParts,
  buildLoginIdParts,
  deriveCompanyCode,
  withUniqueRetry,
} from '../../utils/loginIdGenerator';
import { parseDateOnly, todayUtc } from '../../utils/dates';
import { writeAuditLog } from '../../utils/auditWriter';
import { saveBase64File } from '../../utils/fileStore';
import { resolveEmployeeRole } from '../../utils/roleResolver';
import { calculateSalaryComponents } from '../../utils/salaryCalculator';
import { z } from 'zod';
import {
  changePasswordSchema,
  createEmployeeSchema,
  loginSchema,
  registerSchema,
  verifyEmailSchema,
} from './auth.schema';

type LoginInput = z.infer<typeof loginSchema>;
type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

function generateTempPassword(): string {
  return crypto.randomBytes(16).toString('base64url').slice(0, 16);
}

async function ensureDefaultLeaveBalances(tx: Prisma.TransactionClient, employeeId: string) {
  const types = await tx.leaveType.findMany();
  const defaults: Record<string, number> = { PAID: 24, SICK: 7, UNPAID: 30 };
  for (const type of types) {
    await tx.leaveBalance.create({
      data: {
        employeeId,
        leaveTypeId: type.id,
        allocatedDays: defaults[type.code] ?? 0,
        usedDays: 0,
      },
    });
  }
}

async function createSalaryStructure(
  tx: Prisma.TransactionClient,
  employeeId: string,
  monthlyWage: number
) {
  const calc = calculateSalaryComponents(monthlyWage);
  await tx.salaryStructure.create({
    data: {
      employeeId,
      monthlyWage: calc.monthlyWage,
      yearlyWage: calc.yearlyWage,
      workingDaysPerWeek: 5,
      breakTimeMinutes: 60,
      components: {
        create: calc.components.map((c) => ({
          name: c.name,
          basis: c.basis as ComponentBasis,
          percentage: c.percentage,
          amount: c.amount,
        })),
      },
    },
  });
}

export async function login(input: LoginInput) {
  const identifier = input.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { loginId: input.email.trim() }],
    },
    include: { employee: true },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  if (user.status === AccountStatus.SUSPENDED) {
    throw new AppError('Account is suspended', 'ACCOUNT_SUSPENDED', 403);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  if (user.status === AccountStatus.PENDING_ACTIVATION && !user.mustChangePassword) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: AccountStatus.ACTIVE, emailVerifiedAt: new Date() },
    });
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    employeeId: user.employee?.id ?? null,
  });

  return {
    token,
    user: {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id ?? null,
      firstName: user.employee?.firstName ?? null,
      lastName: user.employee?.lastName ?? null,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  ipAddress?: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 'NOT_FOUND', 404);

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 'INVALID_CREDENTIALS', 401);
  }

  if (input.currentPassword === input.newPassword) {
    throw new AppError('New password must differ from current password', 'VALIDATION_ERROR', 400);
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });

    await writeAuditLog(tx, {
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ipAddress,
    });
  });

  return { ok: true };
}


/**
 * HR-mediated password reset — there's no email service configured, so there's no
 * self-service "forgot password" flow. Instead an HR Admin generates a fresh temporary
 * password from the employee's profile and relays it to them directly; the account is
 * forced to change it on next login, same as a freshly provisioned employee.
 */
export async function resetEmployeePassword(
  employeeId: string,
  actorId: string,
  actorRole: Role,
  ipAddress?: string
) {
  if (actorRole !== Role.HR_ADMIN) {
    throw new AppError('Only HR Admin can reset a password', 'FORBIDDEN', 403);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { id: true, loginId: true, email: true } } },
  });
  if (!employee) throw new AppError('Employee not found', 'NOT_FOUND', 404);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: employee.user.id },
      data: { passwordHash, mustChangePassword: true },
    });

    await writeAuditLog(tx, {
      actorId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: employee.user.id,
      ipAddress,
    });
  });

  return {
    loginId: employee.user.loginId,
    email: employee.user.email,
    temporaryPassword: tempPassword,
  };
}

/** Allocates a company code, retrying on collision since Company.code is unique. */
async function reserveCompanyCode(base: string, tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base.slice(0, 3)}${i}`;
    const clash = await tx.company.findUnique({ where: { code: candidate } });
    if (!clash) return candidate;
  }
  throw new AppError('Could not allocate a company code', 'ID_ALLOCATION_FAILED', 503);
}

/**
 * Public HR / company sign-up.
 *
 * This is the only unauthenticated way an account can be created, and it is restricted to
 * bootstrapping the very first company + its HR Admin. Once a company exists the endpoint
 * refuses, so employees can never self-register — they must be provisioned by an HR Admin
 * through createEmployee(), which is the path that generates their Login ID.
 */
export async function register(input: RegisterInput, ipAddress?: string) {
  const existingCompany = await prisma.company.findFirst();
  if (existingCompany) {
    throw new AppError(
      'This workspace already has an organisation. Ask your HR Admin for an account.',
      'REGISTRATION_CLOSED',
      403
    );
  }

  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError('Email already in use', 'EMAIL_EXISTS', 409);
  }

  const companyName = input.companyName.trim();
  const joiningDate = todayUtc();
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  // Persist the logo before opening the transaction so a bad image fails fast with a 400
  // rather than aborting a partially-built organisation.
  let logoUrl: string | null = null;
  if (input.companyLogoBase64 && input.companyLogoFileName) {
    logoUrl = saveBase64File(input.companyLogoFileName, input.companyLogoBase64, {
      imagesOnly: true,
      maxBytes: 2 * 1024 * 1024,
    }).url;
  }

  const created = await prisma.$transaction(async (tx) => {
    const code = await reserveCompanyCode(deriveCompanyCode(companyName), tx);

    const company = await tx.company.create({
      data: { name: companyName, code, logoUrl },
    });

    // HR team department so roleResolver keeps classifying later HR hires correctly.
    const hrDepartment = await tx.department.upsert({
      where: { name: 'Human Resources' },
      create: { name: 'Human Resources', isHrTeam: true },
      update: { isHrTeam: true },
    });

    const initials = `${input.firstName.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase().padEnd(2, 'X')}${input.lastName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 2)
      .toUpperCase()
      .padEnd(2, 'X')}`;
    const loginId = `${code}${initials}${joiningDate.getUTCFullYear()}0001`;

    // The founder signs up with their own password, so nothing is system-generated and
    // there is no forced rotation (unlike provisioned employees).
    const user = await tx.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role: Role.HR_ADMIN,
        status: AccountStatus.ACTIVE,
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        employeeCode: `EMP${joiningDate.getUTCFullYear()}0001`,
        phone: input.phone.trim(),
        departmentId: hrDepartment.id,
        designation: 'HR Admin',
        joiningDate,
      },
    });

    await ensureDefaultLeaveBalances(tx, employee.id);

    await writeAuditLog(tx, {
      actorId: user.id,
      action: 'COMPANY_REGISTERED',
      entityType: 'Company',
      entityId: company.id,
      newValue: { companyName, code, loginId },
      ipAddress,
    });

    return { user, employee, company };
  });

  const token = signToken({
    userId: created.user.id,
    role: created.user.role,
    employeeId: created.employee.id,
  });

  // Never echo the password back.
  return {
    token,
    user: {
      id: created.user.id,
      loginId: created.user.loginId,
      email: created.user.email,
      role: created.user.role,
      employeeId: created.employee.id,
      firstName: created.employee.firstName,
      lastName: created.employee.lastName,
      mustChangePassword: false,
    },
    company: {
      name: created.company.name,
      code: created.company.code,
      logoUrl: created.company.logoUrl,
    },
  };
}

/** True when no organisation exists yet, i.e. the sign-up screen should be reachable. */
export async function registrationOpen() {
  const company = await prisma.company.findFirst();
  return { open: !company };
}

export async function createEmployee(
  input: CreateEmployeeInput,
  actorId: string,
  actorRole: Role,
  ipAddress?: string
) {
  if (actorRole !== Role.HR_ADMIN) {
    throw new AppError('Only HR Admin can provision employees', 'FORBIDDEN', 403);
  }

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already in use', 'EMAIL_EXISTS', 409);
  }

  const joiningDate = parseDateOnly(input.joiningDate);
  const role = await resolveEmployeeRole({
    departmentId: input.departmentId,
    designation: input.designation,
    requestedRole: input.role as Role | undefined,
    actorRole,
  });

  const loginIdParts = await buildLoginIdParts(input.firstName, input.lastName, joiningDate);
  const employeeCodeParts = await buildEmployeeCodeParts(joiningDate);
  const tempPassword = input.temporaryPassword || generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  // The unique index on User.loginId is the real concurrency guard: if two admins create
  // an employee at the same moment one insert loses with P2002 and retries on the next
  // serial, so duplicate Login IDs cannot be issued.
  const result = await withUniqueRetry(
    loginIdParts.build,
    loginIdParts.firstSerial,
    (loginId) =>
      prisma.$transaction(async (tx) => {
    const employeeCode = await (async () => {
      const taken = await tx.employee.findMany({
        where: { employeeCode: { startsWith: employeeCodeParts.prefix } },
        select: { employeeCode: true },
        orderBy: { employeeCode: 'desc' },
        take: 1,
      });
      const next = taken.length
        ? parseInt(taken[0].employeeCode.slice(employeeCodeParts.prefix.length), 10) + 1
        : employeeCodeParts.firstSerial;
      return employeeCodeParts.build(Number.isNaN(next) ? employeeCodeParts.firstSerial : next);
    })();

    const user = await tx.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role,
        status: AccountStatus.PENDING_ACTIVATION,
        mustChangePassword: true,
      },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        employeeCode,
        phone: input.phone,
        personalEmail: input.personalEmail || null,
        address: input.address,
        departmentId: input.departmentId || null,
        designation: input.designation,
        managerId: input.managerId || null,
        joiningDate,
        dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
        gender: input.gender,
        maritalStatus: input.maritalStatus,
        nationality: input.nationality,
        bio: input.bio,
        jobLoveNote: input.jobLoveNote,
        interests: input.interests,
        skills: input.skills ?? [],
        certifications: input.certifications ?? [],
      },
      include: {
        department: true,
        user: { select: { loginId: true, email: true, role: true, status: true } },
      },
    });

    await ensureDefaultLeaveBalances(tx, employee.id);

    if (input.monthlyWage) {
      await createSalaryStructure(tx, employee.id, input.monthlyWage);
    }

    await writeAuditLog(tx, {
      actorId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      newValue: { loginId, email, employeeCode, role },
      ipAddress,
    });

    return { user, employee, temporaryPassword: tempPassword, assignedRole: role };
      })
  );

  return {
    loginId: result.user.loginId,
    temporaryPassword: result.temporaryPassword,
    assignedRole: result.assignedRole,
    employee: result.employee,
  };
}

export async function verifyEmail(input: VerifyEmailInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email.trim().toLowerCase(),
      ...(input.loginId ? { loginId: input.loginId } : {}),
    },
  });

  if (!user) {
    throw new AppError('Account not found', 'NOT_FOUND', 404);
  }

  if (user.status === AccountStatus.ACTIVE) {
    return { status: user.status, alreadyActive: true };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      status: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  return { status: updated.status, alreadyActive: false };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });
  if (!user) {
    throw new AppError('User not found', 'NOT_FOUND', 404);
  }

  const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });

  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    employeeId: user.employee?.id ?? null,
    company: company ? { name: company.name, code: company.code } : null,
    employee: user.employee
      ? {
          id: user.employee.id,
          firstName: user.employee.firstName,
          lastName: user.employee.lastName,
          employeeCode: user.employee.employeeCode,
          designation: user.employee.designation,
          department: user.employee.department,
          profilePictureUrl: user.employee.profilePictureUrl,
        }
      : null,
  };
}
