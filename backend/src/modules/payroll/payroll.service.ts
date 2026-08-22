import { ComponentBasis, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError, assertFound } from '../../utils/errors';
import { AuthUser } from '../../middleware/requireAuth';
import { writeAuditLog } from '../../utils/auditWriter';
import { z } from 'zod';
import { upsertSalarySchema } from './payroll.schema';

type UpsertInput = z.infer<typeof upsertSalarySchema>;

function assertCanViewSalary(employeeId: string, actor: AuthUser) {
  const isAdmin = actor.role === Role.HR_ADMIN;
  const isSelf = actor.employeeId === employeeId;
  if (!isAdmin && !isSelf) {
    throw new AppError(
      'You cannot view this employee\'s salary',
      'FORBIDDEN',
      403
    );
  }
}

export async function getSalary(employeeId: string, actor: AuthUser) {
  // Defense in depth — re-check ownership in the service layer
  assertCanViewSalary(employeeId, actor);

  assertFound(
    await prisma.employee.findUnique({ where: { id: employeeId } }),
    'Employee not found'
  );

  const structure = await prisma.salaryStructure.findUnique({
    where: { employeeId },
    include: { components: { orderBy: { name: 'asc' } } },
  });

  if (!structure) {
    return null;
  }

  return {
    id: structure.id,
    employeeId: structure.employeeId,
    monthlyWage: Number(structure.monthlyWage),
    yearlyWage: Number(structure.yearlyWage),
    workingDaysPerWeek: structure.workingDaysPerWeek,
    breakTimeMinutes: structure.breakTimeMinutes,
    updatedAt: structure.updatedAt,
    components: structure.components.map((c) => ({
      id: c.id,
      name: c.name,
      basis: c.basis,
      percentage: c.percentage != null ? Number(c.percentage) : null,
      amount: Number(c.amount),
    })),
    computedTotal: structure.components.reduce((sum, c) => sum + Number(c.amount), 0),
    readOnly: actor.role !== Role.HR_ADMIN,
  };
}

export async function upsertSalary(
  employeeId: string,
  input: UpsertInput,
  actor: AuthUser,
  ipAddress?: string
) {
  if (actor.role !== Role.HR_ADMIN) {
    throw new AppError('Only HR Admin can update salary', 'FORBIDDEN', 403);
  }

  assertFound(
    await prisma.employee.findUnique({ where: { id: employeeId } }),
    'Employee not found'
  );

  const yearlyWage = input.yearlyWage ?? input.monthlyWage * 12;

  // Recompute PERCENT_OF_BASIC amounts from Basic component when present
  const basic = input.components.find((c) => c.name.toLowerCase().includes('basic'));
  const basicAmount = basic?.amount ?? 0;
  const components = input.components.map((c) => {
    if (c.basis === 'PERCENT_OF_BASIC' && c.percentage != null) {
      return {
        ...c,
        amount: Math.round(((basicAmount * c.percentage) / 100) * 100) / 100,
      };
    }
    return c;
  });

  return prisma.$transaction(async (tx) => {
    const previous = await tx.salaryStructure.findUnique({
      where: { employeeId },
      include: { components: true },
    });

    if (previous) {
      await tx.salaryComponent.deleteMany({
        where: { salaryStructureId: previous.id },
      });
      await tx.salaryStructure.delete({ where: { id: previous.id } });
    }

    const created = await tx.salaryStructure.create({
      data: {
        employeeId,
        monthlyWage: input.monthlyWage,
        yearlyWage,
        workingDaysPerWeek: input.workingDaysPerWeek,
        breakTimeMinutes: input.breakTimeMinutes,
        components: {
          create: components.map((c) => ({
            name: c.name,
            basis: c.basis as ComponentBasis,
            percentage: c.percentage ?? null,
            amount: c.amount,
          })),
        },
      },
      include: { components: true },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'SALARY_UPDATED',
      entityType: 'SalaryStructure',
      entityId: employeeId,
      previousValue: previous
        ? ({
            monthlyWage: Number(previous.monthlyWage),
            components: previous.components.map((c) => ({
              name: c.name,
              amount: Number(c.amount),
            })),
          } as Prisma.InputJsonValue)
        : null,
      newValue: {
        monthlyWage: input.monthlyWage,
        components: components.map((c) => ({ name: c.name, amount: c.amount })),
      },
      ipAddress,
    });

    return {
      ...created,
      monthlyWage: Number(created.monthlyWage),
      yearlyWage: Number(created.yearlyWage),
      components: created.components.map((c) => ({
        ...c,
        amount: Number(c.amount),
        percentage: c.percentage != null ? Number(c.percentage) : null,
      })),
    };
  });
}
