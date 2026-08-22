/** Start of calendar day in UTC (matches Prisma @db.Date usage). */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('Invalid date format, expected YYYY-MM-DD');
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function todayUtc(): Date {
  return startOfDay(new Date());
}

export function parseThresholdToMinutes(threshold: string): number {
  const [h, m] = threshold.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
