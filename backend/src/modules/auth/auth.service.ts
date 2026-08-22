import bcrypt from 'bcrypt';
import { AccountStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { signToken } from '../../utils/jwt';
import { generateEmployeeCode, generateLoginId } from '../../utils/loginIdGenerator';
import { parseDateOnly } from '../../utils/dates';
import { writeAuditLog } from '../../utils/auditWriter';
import { z } from 'zod';
import { createEmployeeSchema, loginSchema, verifyEmailSchema } from './auth.schema';

type LoginInput = z.infer<typeof loginSchema>;
type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

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

  // First successful login activates PENDING_ACTIVATION accounts
  if (user.status === AccountStatus.PENDING_ACTIVATION) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
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
    },
  };
}

export async function createEmployee(
  input: CreateEmployeeInput,
  actorId: string,
  ipAddress?: string
) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already in use', 'EMAIL_EXISTS', 409);
  }

  const joiningDate = parseDateOnly(input.joiningDate);
  const loginId = await generateLoginId(input.firstName, input.lastName, joiningDate);
  const employeeCode = await generateEmployeeCode(joiningDate);
  const tempPassword = input.temporaryPassword || `Welcome@${joiningDate.getFullYear()}`;
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role: input.role as Role,
        status: AccountStatus.PENDING_ACTIVATION,
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

    await writeAuditLog(tx, {
      actorId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      newValue: {
        loginId,
        email,
        employeeCode,
        role: input.role,
      },
      ipAddress,
    });

    return { user, employee, temporaryPassword: tempPassword };
  });

  return {
    loginId: result.user.loginId,
    temporaryPassword: result.temporaryPassword,
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

  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    role: user.role,
    status: user.status,
    employeeId: user.employee?.id ?? null,
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
