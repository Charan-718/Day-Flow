import { prisma } from '../config/prisma';
import { env } from '../config/env';

function employeeInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().slice(0, 2).toUpperCase().padEnd(2, 'X');
  const l = lastName.trim().slice(0, 2).toUpperCase().padEnd(2, 'X');
  return `${f}${l}`;
}

/**
 * Wireframe format: [CompanyCode][EmployeeInitials][Year][Serial]
 * Example: DF + JODO + 2026 + 0001 → DFJODO20260001
 */
export async function generateLoginId(
  firstName: string,
  lastName: string,
  joiningDate: Date
): Promise<string> {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
  const companyCode = (company?.code ?? env.COMPANY_CODE).toUpperCase().slice(0, 4);
  const empInitials = employeeInitials(firstName, lastName);
  const year = joiningDate.getFullYear().toString();
  const prefix = `${companyCode}${empInitials}${year}`;

  const existing = await prisma.user.findMany({
    where: { loginId: { startsWith: prefix } },
    select: { loginId: true },
  });

  let maxSeq = 0;
  for (const row of existing) {
    const seqStr = row.loginId.slice(prefix.length);
    const seq = parseInt(seqStr, 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const next = (maxSeq + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
}

export async function generateEmployeeCode(joiningDate: Date): Promise<string> {
  const year = joiningDate.getFullYear();
  const prefix = `EMP${year}`;
  const existing = await prisma.employee.findMany({
    where: { employeeCode: { startsWith: prefix } },
    select: { employeeCode: true },
  });

  let maxSeq = 0;
  for (const row of existing) {
    const seqStr = row.employeeCode.slice(prefix.length);
    const seq = parseInt(seqStr, 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  return `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
}
