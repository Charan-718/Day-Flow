import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from './errors';

/**
 * Employee name prefix: first two letters of first name + first two of last name.
 * Names shorter than two characters are padded with X so the segment is always 4 chars.
 */
function employeeInitials(firstName: string, lastName: string): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const f = clean(firstName).slice(0, 2).padEnd(2, 'X');
  const l = clean(lastName).slice(0, 2).padEnd(2, 'X');
  return `${f}${l}`;
}

/** Company prefix derived from the company name, e.g. "Odoo India" -> "OI". */
export function deriveCompanyCode(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'CO';

  // Multi-word: initials of the first up-to-4 words ("Odoo India" -> "OI").
  // Single word: first two letters ("Dayflow" -> "DA").
  const code =
    words.length > 1
      ? words.slice(0, 4).map((w) => w[0]).join('')
      : words[0].slice(0, 2);

  return code.toUpperCase().slice(0, 4).padEnd(2, 'X');
}

async function currentCompanyCode(): Promise<string> {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
  return (company?.code ?? env.COMPANY_CODE).toUpperCase().slice(0, 4);
}

/** Highest serial already issued for a prefix, computed in SQL rather than in memory. */
async function nextSerial(
  table: 'user' | 'employee',
  column: 'loginId' | 'employeeCode',
  prefix: string
): Promise<number> {
  const rows =
    table === 'user'
      ? await prisma.user.findMany({
          where: { loginId: { startsWith: prefix } },
          select: { loginId: true },
          orderBy: { loginId: 'desc' },
          take: 1,
        })
      : await prisma.employee.findMany({
          where: { employeeCode: { startsWith: prefix } },
          select: { employeeCode: true },
          orderBy: { employeeCode: 'desc' },
          take: 1,
        });

  if (rows.length === 0) return 1;
  const value = table === 'user' ? (rows[0] as { loginId: string }).loginId : (rows[0] as { employeeCode: string }).employeeCode;
  const parsed = parseInt(value.slice(prefix.length), 10);
  return Number.isNaN(parsed) ? 1 : parsed + 1;
}

/**
 * Runs `attempt` against successive candidate identifiers, retrying when the database
 * rejects one with a unique-constraint violation (Prisma P2002).
 *
 * Reading the max serial and inserting cannot be made atomic without a dedicated sequence
 * table, so two concurrent creations can compute the same candidate. The unique index is
 * the real guard: whichever transaction loses gets P2002 and simply takes the next serial.
 * This is what makes concurrent employee creation safe.
 */
export async function withUniqueRetry<T>(
  buildCandidate: (serial: number) => string,
  firstSerial: number,
  attempt: (candidate: string) => Promise<T>,
  maxAttempts = 25
): Promise<T> {
  let serial = firstSerial;

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = buildCandidate(serial);
    try {
      return await attempt(candidate);
    } catch (err) {
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isUniqueViolation) throw err;
      serial += 1;
    }
  }

  throw new AppError(
    'Could not allocate a unique identifier, please retry',
    'ID_ALLOCATION_FAILED',
    503
  );
}

export interface LoginIdParts {
  prefix: string;
  firstSerial: number;
  build: (serial: number) => string;
}

/**
 * Login ID format: [CompanyCode][NamePrefix][JoiningYear][Serial]
 * e.g. Odoo India + John Doe + 2022 -> OIJODO20220001
 *
 * Returns the pieces rather than a finished string so the caller can wrap creation in
 * withUniqueRetry and re-derive the id per attempt.
 */
export async function buildLoginIdParts(
  firstName: string,
  lastName: string,
  joiningDate: Date
): Promise<LoginIdParts> {
  const companyCode = await currentCompanyCode();
  const prefix = `${companyCode}${employeeInitials(firstName, lastName)}${joiningDate.getUTCFullYear()}`;
  return {
    prefix,
    firstSerial: await nextSerial('user', 'loginId', prefix),
    build: (serial: number) => `${prefix}${serial.toString().padStart(4, '0')}`,
  };
}

export async function buildEmployeeCodeParts(joiningDate: Date): Promise<LoginIdParts> {
  const prefix = `EMP${joiningDate.getUTCFullYear()}`;
  return {
    prefix,
    firstSerial: await nextSerial('employee', 'employeeCode', prefix),
    build: (serial: number) => `${prefix}${serial.toString().padStart(4, '0')}`,
  };
}

/** Convenience single-shot generation. Prefer buildLoginIdParts + withUniqueRetry on write paths. */
export async function generateLoginId(
  firstName: string,
  lastName: string,
  joiningDate: Date
): Promise<string> {
  const parts = await buildLoginIdParts(firstName, lastName, joiningDate);
  return parts.build(parts.firstSerial);
}

export async function generateEmployeeCode(joiningDate: Date): Promise<string> {
  const parts = await buildEmployeeCodeParts(joiningDate);
  return parts.build(parts.firstSerial);
}
