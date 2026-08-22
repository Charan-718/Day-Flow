import { AttendanceStatus, LeaveTypeCode } from '@prisma/client';
import { prisma } from '../config/prisma';

function isWeekend(d: Date) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Wireframe: payable days from attendance; unpaid leave & absences reduce payable days. */
export async function computePayableDays(employeeId: string, month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  const periodEnd = end < today ? end : today;

  const [holidays, summaries, unpaidLeaves, salary] = await Promise.all([
    prisma.publicHoliday.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.attendanceDaySummary.findMany({
      where: { employeeId, date: { gte: start, lt: periodEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        leaveType: { code: LeaveTypeCode.UNPAID },
        startDate: { lt: end },
        endDate: { gte: start },
      },
    }),
    prisma.salaryStructure.findUnique({ where: { employeeId } }),
  ]);

  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const summaryMap = new Map(summaries.map((s) => [dateKey(s.date), s]));

  let workingDaysInMonth = 0;
  let payableDays = 0;
  let presentDays = 0;
  let paidLeaveDays = 0;
  let absentDays = 0;
  let unpaidLeaveDays = 0;

  const cur = new Date(start);
  while (cur < end) {
    const key = dateKey(cur);
    const isWorkday = !isWeekend(cur) && !holidaySet.has(key);
    if (isWorkday) workingDaysInMonth += 1;

    if (cur < periodEnd && isWorkday) {
      const summary = summaryMap.get(key);
      if (summary?.status === AttendanceStatus.PRESENT) {
        payableDays += 1;
        presentDays += 1;
      } else if (summary?.status === AttendanceStatus.HALF_DAY) {
        payableDays += 0.5;
        presentDays += 0.5;
      } else if (summary?.status === AttendanceStatus.LEAVE) {
        payableDays += 1;
        paidLeaveDays += 1;
      } else {
        const onUnpaid = unpaidLeaves.some(
          (l) => cur >= l.startDate && cur <= l.endDate
        );
        if (onUnpaid) {
          unpaidLeaveDays += 1;
        } else {
          absentDays += 1;
        }
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const monthlyWage = salary ? Number(salary.monthlyWage) : 0;
  const dailyRate = workingDaysInMonth > 0 ? monthlyWage / workingDaysInMonth : 0;
  const estimatedGross = round2(dailyRate * payableDays);
  const professionalTax = 200;
  const netEstimate = round2(Math.max(0, estimatedGross - professionalTax));

  return {
    month,
    year,
    workingDaysInMonth,
    payableDays: round2(payableDays),
    presentDays: round2(presentDays),
    paidLeaveDays: round2(paidLeaveDays),
    absentDays,
    unpaidLeaveDays,
    dailyRate: round2(dailyRate),
    monthlyWage,
    estimatedGross,
    professionalTax,
    netEstimate,
  };
}
