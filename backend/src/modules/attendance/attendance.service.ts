import { AttendanceEventType, AttendanceStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError, assertFound } from '../../utils/errors';
import { AuthUser } from '../../middleware/requireAuth';
import { writeAuditLog } from '../../utils/auditWriter';
import {
  parseDateOnly,
  parseThresholdToMinutes,
  startOfDay,
  todayUtc,
} from '../../utils/dates';
import { env } from '../../config/env';

function dayBounds(day: Date) {
  const start = startOfDay(day);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function getOpenCheckIn(employeeId: string, day: Date) {
  const { start, end } = dayBounds(day);
  const events = await prisma.attendanceEvent.findMany({
    where: {
      employeeId,
      occurredAt: { gte: start, lt: end },
    },
    orderBy: { occurredAt: 'asc' },
  });

  let openCheckIn: (typeof events)[number] | null = null;
  for (const ev of events) {
    if (ev.type === AttendanceEventType.CHECK_IN) {
      openCheckIn = ev;
    } else if (ev.type === AttendanceEventType.CHECK_OUT) {
      openCheckIn = null;
    }
  }
  return { events, openCheckIn };
}

function isLateCheckIn(checkIn: Date): boolean {
  const minutes = checkIn.getUTCHours() * 60 + checkIn.getUTCMinutes();
  // Threshold is wall-clock local demo time; treat as UTC for hackathon consistency
  return minutes > parseThresholdToMinutes(env.LATE_CHECKIN_THRESHOLD);
}

function deriveStatus(workedMinutes: number | null, hasLeave: boolean): AttendanceStatus {
  if (hasLeave) return AttendanceStatus.LEAVE;
  if (workedMinutes == null) return AttendanceStatus.PRESENT; // checked in, not out yet
  if (workedMinutes < 240) return AttendanceStatus.HALF_DAY;
  return AttendanceStatus.PRESENT;
}

export async function checkIn(actor: AuthUser, ipAddress?: string) {
  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const employeeId = actor.employeeId;
  const now = new Date();
  const day = startOfDay(now);

  return prisma.$transaction(async (tx) => {
    const { start, end } = dayBounds(day);
    const events = await tx.attendanceEvent.findMany({
      where: { employeeId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: 'asc' },
    });

    let open = false;
    for (const ev of events) {
      if (ev.type === AttendanceEventType.CHECK_IN) open = true;
      if (ev.type === AttendanceEventType.CHECK_OUT) open = false;
    }
    if (open) {
      throw new AppError(
        'Already checked in today. Check out first.',
        'ATTENDANCE_ALREADY_CHECKED_IN',
        409
      );
    }

    const event = await tx.attendanceEvent.create({
      data: {
        employeeId,
        type: AttendanceEventType.CHECK_IN,
        occurredAt: now,
      },
    });

    const late = isLateCheckIn(now);
    const summary = await tx.attendanceDaySummary.upsert({
      where: { employeeId_date: { employeeId, date: day } },
      create: {
        employeeId,
        date: day,
        checkIn: now,
        checkOut: null,
        workedMinutes: null,
        status: AttendanceStatus.PRESENT,
        isException: late,
      },
      update: {
        checkIn: now,
        checkOut: null,
        workedMinutes: null,
        status: AttendanceStatus.PRESENT,
        isException: late,
      },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'ATTENDANCE_CHECK_IN',
      entityType: 'AttendanceEvent',
      entityId: event.id,
      newValue: { employeeId, occurredAt: now.toISOString(), late },
      ipAddress,
    });

    return { event, summary, isCheckedIn: true };
  });
}

export async function checkOut(actor: AuthUser, ipAddress?: string) {
  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const employeeId = actor.employeeId;
  const now = new Date();
  const day = startOfDay(now);

  return prisma.$transaction(async (tx) => {
    const { start, end } = dayBounds(day);
    const events = await tx.attendanceEvent.findMany({
      where: { employeeId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: 'asc' },
    });

    let openCheckIn: (typeof events)[number] | null = null;
    for (const ev of events) {
      if (ev.type === AttendanceEventType.CHECK_IN) openCheckIn = ev;
      if (ev.type === AttendanceEventType.CHECK_OUT) openCheckIn = null;
    }

    if (!openCheckIn) {
      throw new AppError(
        'Not checked in. Check in first.',
        'ATTENDANCE_NOT_CHECKED_IN',
        409
      );
    }

    const event = await tx.attendanceEvent.create({
      data: {
        employeeId,
        type: AttendanceEventType.CHECK_OUT,
        occurredAt: now,
      },
    });

    const workedMinutes = Math.max(
      0,
      Math.round((now.getTime() - openCheckIn.occurredAt.getTime()) / 60000)
    );
    const late = isLateCheckIn(openCheckIn.occurredAt);

    const summary = await tx.attendanceDaySummary.upsert({
      where: { employeeId_date: { employeeId, date: day } },
      create: {
        employeeId,
        date: day,
        checkIn: openCheckIn.occurredAt,
        checkOut: now,
        workedMinutes,
        status: deriveStatus(workedMinutes, false),
        isException: late,
      },
      update: {
        checkIn: openCheckIn.occurredAt,
        checkOut: now,
        workedMinutes,
        status: deriveStatus(workedMinutes, false),
        isException: late,
      },
    });

    await writeAuditLog(tx, {
      actorId: actor.userId,
      action: 'ATTENDANCE_CHECK_OUT',
      entityType: 'AttendanceEvent',
      entityId: event.id,
      newValue: { employeeId, occurredAt: now.toISOString(), workedMinutes },
      ipAddress,
    });

    return { event, summary, isCheckedIn: false };
  });
}

export async function getMyAttendance(
  actor: AuthUser,
  month?: number,
  year?: number
) {
  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const now = new Date();
  const m = (month ?? now.getUTCMonth() + 1) - 1;
  const y = year ?? now.getUTCFullYear();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));

  const days = await prisma.attendanceDaySummary.findMany({
    where: {
      employeeId: actor.employeeId,
      date: { gte: start, lt: end },
    },
    orderBy: { date: 'asc' },
  });

  const presentDays = days.filter(
    (d) => d.status === AttendanceStatus.PRESENT || d.status === AttendanceStatus.HALF_DAY
  ).length;
  const leaveCount = days.filter((d) => d.status === AttendanceStatus.LEAVE).length;
  const totalWorkingDays = countWeekdays(start, end);

  const todayStatus = await getTodayStatus(actor.employeeId);

  return {
    month: m + 1,
    year: y,
    summary: {
      presentDays,
      totalWorkingDays,
      leaveCount,
      exceptionCount: days.filter((d) => d.isException).length,
    },
    days: days.map((d) => ({
      ...d,
      workHours: d.workedMinutes != null ? +(d.workedMinutes / 60).toFixed(2) : null,
      extraHours:
        d.workedMinutes != null && d.workedMinutes > 480
          ? +((d.workedMinutes - 480) / 60).toFixed(2)
          : 0,
    })),
    today: todayStatus,
  };
}

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export async function getTodayStatus(employeeId: string) {
  const day = todayUtc();
  const summary = await prisma.attendanceDaySummary.findUnique({
    where: { employeeId_date: { employeeId, date: day } },
  });
  const { openCheckIn } = await getOpenCheckIn(employeeId, day);
  return {
    date: day,
    isCheckedIn: Boolean(openCheckIn),
    checkIn: summary?.checkIn ?? openCheckIn?.occurredAt ?? null,
    checkOut: summary?.checkOut ?? null,
    status: summary?.status ?? null,
    workedMinutes: summary?.workedMinutes ?? null,
  };
}

export async function getAdminDayView(dateStr: string, search?: string) {
  const date = parseDateOnly(dateStr);
  const employees = await prisma.employee.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: { department: true },
  });

  const summaries = await prisma.attendanceDaySummary.findMany({
    where: { date, employeeId: { in: employees.map((e) => e.id) } },
  });
  const map = new Map(summaries.map((s) => [s.employeeId, s]));

  return {
    date,
    items: employees.map((e) => {
      const s = map.get(e.id);
      return {
        employee: {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
          department: e.department,
        },
        checkIn: s?.checkIn ?? null,
        checkOut: s?.checkOut ?? null,
        workedMinutes: s?.workedMinutes ?? null,
        workHours: s?.workedMinutes != null ? +(s.workedMinutes / 60).toFixed(2) : null,
        extraHours:
          s?.workedMinutes != null && s.workedMinutes > 480
            ? +((s.workedMinutes - 480) / 60).toFixed(2)
            : 0,
        status: s?.status ?? AttendanceStatus.ABSENT,
        isException: s?.isException ?? false,
      };
    }),
  };
}

export async function getTimeline(employeeId: string, actor: AuthUser) {
  const isAdmin = actor.role === Role.HR_ADMIN;
  const isSelf = actor.employeeId === employeeId;
  if (!isAdmin && !isSelf) {
    throw new AppError('You cannot access this attendance timeline', 'FORBIDDEN', 403);
  }

  assertFound(await prisma.employee.findUnique({ where: { id: employeeId } }), 'Employee not found');

  const days = await prisma.attendanceDaySummary.findMany({
    where: { employeeId },
    orderBy: { date: 'desc' },
    take: 60,
  });

  const events = await prisma.attendanceEvent.findMany({
    where: { employeeId },
    orderBy: { occurredAt: 'desc' },
    take: 120,
  });

  return {
    days: days.map((d) => ({
      date: d.date,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      durationMinutes: d.workedMinutes,
      status: d.status,
      isException: d.isException,
    })),
    events,
  };
}

/** Deterministic anomaly flagging on read for past days with missing checkout. */
export async function flagMissingCheckouts() {
  const today = todayUtc();
  const stale = await prisma.attendanceDaySummary.findMany({
    where: {
      date: { lt: today },
      checkIn: { not: null },
      checkOut: null,
      isException: false,
    },
  });

  for (const row of stale) {
    await prisma.attendanceDaySummary.update({
      where: { id: row.id },
      data: { isException: true },
    });
  }

  return { flagged: stale.length };
}
