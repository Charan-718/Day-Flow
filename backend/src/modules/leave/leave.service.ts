import { LeaveStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError, assertFound } from '../../utils/errors';
import { AuthUser } from '../../middleware/requireAuth';
import { writeAuditLog } from '../../utils/auditWriter';
import { daysBetweenInclusive, parseDateOnly } from '../../utils/dates';
import { z } from 'zod';
import {
  createLeaveSchema,
  listLeaveQuerySchema,
  rejectLeaveSchema,
  reviewLeaveSchema,
} from './leave.schema';

type CreateInput = z.infer<typeof createLeaveSchema>;
type ListQuery = z.infer<typeof listLeaveQuerySchema>;

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function listLeaveTypes() {
  return prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
}

export async function listPublicHolidays() {
  return prisma.publicHoliday.findMany({ orderBy: { date: 'asc' } });
}

export async function getMyBalances(actor: AuthUser) {
  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: actor.employeeId },
    include: { leaveType: true },
  });

  return balances.map((b) => ({
    id: b.id,
    leaveType: b.leaveType,
    allocatedDays: Number(b.allocatedDays),
    usedDays: Number(b.usedDays),
    availableDays: Number(b.allocatedDays) - Number(b.usedDays),
  }));
}

export async function createLeaveRequest(
  input: CreateInput,
  actor: AuthUser,
  ipAddress?: string
) {
  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (endDate < startDate) {
    throw new AppError('End date must be on or after start date', 'VALIDATION_ERROR', 400);
  }

  const leaveType = assertFound(
    await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } }),
    'Leave type not found'
  );

  if (leaveType.requiresAttachment && !input.attachmentUrl) {
    throw new AppError(
      'Attachment is required for this leave type',
      'LEAVE_ATTACHMENT_REQUIRED',
      400
    );
  }

  // daysRequested is client-supplied, so it must be reconciled with the actual range:
  // otherwise a month-long absence could be booked while consuming half a day of balance.
  const spanDays = daysBetweenInclusive(startDate, endDate);
  const daysRequested = input.daysRequested ?? spanDays;
  if (daysRequested <= 0) {
    throw new AppError('Days requested must be positive', 'VALIDATION_ERROR', 400);
  }
  // Must stay consistent with the selected period. The band allows a half-day at each end
  // of the range (a real HR case) while blocking the abuse of booking a long absence that
  // only debits a fraction of a day from the balance.
  const minDays = Math.max(0.5, spanDays - 1);
  if (daysRequested > spanDays || daysRequested < minDays) {
    throw new AppError(
      `Days requested (${daysRequested}) must be between ${minDays} and ${spanDays} for the selected period`,
      'VALIDATION_ERROR',
      400
    );
  }

  const employeeId = actor.employeeId;

  const overlapping = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
    },
  });

  for (const existing of overlapping) {
    if (rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
      throw new AppError(
        'Leave dates overlap with an existing request',
        'LEAVE_OVERLAP',
        409
      );
    }
  }

  // Unpaid leave does not consume a finite paid/sick balance in the same way,
  // but we still track usedDays against its allocation for visibility.
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId: { employeeId, leaveTypeId: leaveType.id },
    },
  });

  if (!balance) {
    throw new AppError('Leave balance not configured', 'NOT_FOUND', 404);
  }

  const available = Number(balance.allocatedDays) - Number(balance.usedDays);
  if (daysRequested > available) {
    throw new AppError(
      `Insufficient leave balance. Available: ${available} days`,
      'LEAVE_INSUFFICIENT_BALANCE',
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        daysRequested,
        remarks: input.remarks,
        attachmentUrl: input.attachmentUrl || null,
        status: LeaveStatus.PENDING,
      },
      include: { leaveType: true },
    });

    // Notify all HR_ADMIN users
    const admins = await tx.user.findMany({
      where: { role: Role.HR_ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: 'NEW_LEAVE_REQUEST',
          message: `New ${leaveType.name} request pending review (${input.startDate} → ${input.endDate})`,
        })),
      });
    }

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'LEAVE_REQUESTED',
      entityType: 'LeaveRequest',
      entityId: request.id,
      newValue: {
        leaveType: leaveType.code,
        startDate: input.startDate,
        endDate: input.endDate,
        daysRequested,
      },
      ipAddress,
    });

    return request;
  });
}

export async function listLeaveRequests(query: ListQuery, actor: AuthUser) {
  const where: Prisma.LeaveRequestWhereInput = {};

  if (actor.role !== Role.HR_ADMIN) {
    if (!actor.employeeId) {
      throw new AppError('Employee profile required', 'FORBIDDEN', 403);
    }
    where.employeeId = actor.employeeId;
  } else if (query.employeeId) {
    where.employeeId = query.employeeId;
  }

  if (query.status) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.pageSize;
  const [total, items] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((r) => ({
      ...r,
      daysRequested: Number(r.daysRequested),
      workflow: buildWorkflow(r),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    },
  };
}

function buildWorkflow(r: {
  status: LeaveStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewComment: string | null;
  reviewedById: string | null;
}) {
  return {
    steps: [
      { key: 'SUBMITTED', label: 'Submitted', at: r.createdAt, done: true },
      {
        key: 'PENDING',
        label: 'Pending HR Review',
        at: r.status === LeaveStatus.PENDING ? null : r.createdAt,
        done: r.status !== LeaveStatus.PENDING,
      },
      {
        key: r.status === LeaveStatus.REJECTED ? 'REJECTED' : 'APPROVED',
        label: r.status === LeaveStatus.REJECTED ? 'Rejected' : 'Approved',
        at: r.reviewedAt,
        done: r.status === LeaveStatus.APPROVED || r.status === LeaveStatus.REJECTED,
        comment: r.reviewComment,
        reviewedById: r.reviewedById,
      },
    ],
  };
}

export async function approveLeave(
  id: string,
  input: z.infer<typeof reviewLeaveSchema>,
  actor: AuthUser,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    const request = assertFound(
      await tx.leaveRequest.findUnique({
        where: { id },
        include: { leaveType: true, employee: { include: { user: true } } },
      }),
      'Leave request not found'
    );

    if (request.status !== LeaveStatus.PENDING) {
      throw new AppError(
        'Only pending requests can be approved',
        'LEAVE_INVALID_STATE',
        409
      );
    }

    const balance = assertFound(
      await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
          },
        },
      }),
      'Leave balance not found'
    );

    const available = Number(balance.allocatedDays) - Number(balance.usedDays);
    const days = Number(request.daysRequested);
    if (days > available) {
      throw new AppError(
        'Insufficient leave balance at approval time',
        'LEAVE_INSUFFICIENT_BALANCE',
        400
      );
    }

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        reviewedById: actor.userId,
        reviewComment: input.comment || null,
        reviewedAt: new Date(),
      },
      include: { leaveType: true, employee: true },
    });

    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: { usedDays: { increment: days } },
    });

    // Mark leave days on attendance summaries
    const cur = new Date(request.startDate);
    const end = new Date(request.endDate);
    while (cur <= end) {
      const day = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));
      await tx.attendanceDaySummary.upsert({
        where: {
          employeeId_date: { employeeId: request.employeeId, date: day },
        },
        create: {
          employeeId: request.employeeId,
          date: day,
          status: 'LEAVE',
          isException: false,
        },
        update: { status: 'LEAVE' },
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    await tx.notification.create({
      data: {
        userId: request.employee.userId,
        type: 'LEAVE_APPROVED',
        message: `Your ${request.leaveType.name} request was approved${
          input.comment ? `: ${input.comment}` : ''
        }`,
      },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'LEAVE_APPROVED',
      entityType: 'LeaveRequest',
      entityId: id,
      previousValue: { status: LeaveStatus.PENDING },
      newValue: {
        status: LeaveStatus.APPROVED,
        comment: input.comment || null,
        days,
      },
      ipAddress,
    });

    return {
      ...updated,
      daysRequested: Number(updated.daysRequested),
      workflow: buildWorkflow(updated),
    };
  });
}

export async function rejectLeave(
  id: string,
  input: z.infer<typeof rejectLeaveSchema>,
  actor: AuthUser,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    const request = assertFound(
      await tx.leaveRequest.findUnique({
        where: { id },
        include: { leaveType: true, employee: true },
      }),
      'Leave request not found'
    );

    if (request.status !== LeaveStatus.PENDING) {
      throw new AppError(
        'Only pending requests can be rejected',
        'LEAVE_INVALID_STATE',
        409
      );
    }

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedById: actor.userId,
        reviewComment: input.comment,
        reviewedAt: new Date(),
      },
      include: { leaveType: true, employee: true },
    });

    await tx.notification.create({
      data: {
        userId: request.employee.userId,
        type: 'LEAVE_REJECTED',
        message: `Your ${request.leaveType.name} request was rejected: ${input.comment}`,
      },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'LEAVE_REJECTED',
      entityType: 'LeaveRequest',
      entityId: id,
      previousValue: { status: LeaveStatus.PENDING },
      newValue: { status: LeaveStatus.REJECTED, comment: input.comment },
      ipAddress,
    });

    return {
      ...updated,
      daysRequested: Number(updated.daysRequested),
      workflow: buildWorkflow(updated),
    };
  });
}
