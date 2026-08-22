import { AttendanceStatus, LeaveStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AuthUser } from '../../middleware/requireAuth';
import { todayUtc } from '../../utils/dates';
import { getTodayStatus, flagMissingCheckouts } from '../attendance/attendance.service';
import { AppError } from '../../utils/errors';

export async function getSummary(actor: AuthUser) {
  if (actor.role === Role.HR_ADMIN) {
    await flagMissingCheckouts();
    const today = todayUtc();
    const [headcount, pendingLeaveCount, presentToday] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      prisma.attendanceDaySummary.count({
        where: {
          date: today,
          status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY] },
        },
      }),
    ]);

    return {
      role: Role.HR_ADMIN,
      headcount,
      pendingLeaveCount,
      todayAttendancePercent:
        headcount === 0 ? 0 : Math.round((presentToday / headcount) * 100),
    };
  }

  if (!actor.employeeId) {
    throw new AppError('Employee profile required', 'FORBIDDEN', 403);
  }

  const [todayStatus, balances] = await Promise.all([
    getTodayStatus(actor.employeeId),
    prisma.leaveBalance.findMany({
      where: { employeeId: actor.employeeId },
      include: { leaveType: true },
    }),
  ]);

  return {
    role: Role.EMPLOYEE,
    todayStatus,
    leaveBalanceSummary: balances.map((b) => ({
      type: b.leaveType.name,
      code: b.leaveType.code,
      availableDays: Number(b.allocatedDays) - Number(b.usedDays),
    })),
  };
}

/**
 * Deterministic Workforce Health Score (0–100):
 * score = 0.4*attendanceHealth + 0.2*leaveWorkflowHealth + 0.2*(1 - exceptionRate) + 0.2*(1 - pendingActionsRatio)
 * Each sub-score is 0–1, then scaled to 0–100.
 */
export async function getHealthScore() {
  const today = todayUtc();
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);

  const headcount = await prisma.employee.count({
    where: { employmentStatus: 'ACTIVE' },
  });

  const attendanceRows = await prisma.attendanceDaySummary.findMany({
    where: { date: { gte: windowStart, lte: today } },
  });

  const presentish = attendanceRows.filter(
    (r) =>
      r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.HALF_DAY
  ).length;
  const expected = Math.max(attendanceRows.length, 1);
  const attendanceHealth = Math.min(1, presentish / expected);

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { createdAt: { gte: windowStart } },
  });
  const resolved = leaveRequests.filter((r) => r.status !== LeaveStatus.PENDING);
  const leaveWorkflowHealth =
    leaveRequests.length === 0 ? 1 : resolved.length / leaveRequests.length;

  const exceptions = attendanceRows.filter((r) => r.isException).length;
  const exceptionRate = attendanceRows.length === 0 ? 0 : exceptions / attendanceRows.length;

  const pendingLeave = await prisma.leaveRequest.count({
    where: { status: LeaveStatus.PENDING },
  });
  const pendingActionsRatio = Math.min(1, pendingLeave / Math.max(headcount, 1));

  const score01 =
    0.4 * attendanceHealth +
    0.2 * leaveWorkflowHealth +
    0.2 * (1 - exceptionRate) +
    0.2 * (1 - pendingActionsRatio);

  const score = Math.round(score01 * 100);

  return {
    score,
    formula:
      '0.4*attendance + 0.2*leaveWorkflow + 0.2*(1-exceptionRate) + 0.2*(1-pendingActionsRatio)',
    breakdown: {
      attendanceHealth: {
        weight: 0.4,
        value: +attendanceHealth.toFixed(3),
        contribution: +(0.4 * attendanceHealth * 100).toFixed(1),
      },
      leaveWorkflowHealth: {
        weight: 0.2,
        value: +leaveWorkflowHealth.toFixed(3),
        contribution: +(0.2 * leaveWorkflowHealth * 100).toFixed(1),
      },
      exceptionHealth: {
        weight: 0.2,
        value: +(1 - exceptionRate).toFixed(3),
        contribution: +(0.2 * (1 - exceptionRate) * 100).toFixed(1),
      },
      pendingActionsHealth: {
        weight: 0.2,
        value: +(1 - pendingActionsRatio).toFixed(3),
        contribution: +(0.2 * (1 - pendingActionsRatio) * 100).toFixed(1),
      },
    },
    windowDays: 30,
    headcount,
    pendingLeave,
  };
}
