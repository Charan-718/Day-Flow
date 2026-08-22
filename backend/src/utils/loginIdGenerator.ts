import { prisma } from '../config/prisma';

/**
 * Login ID format: [Initials][YearOfJoining][SerialNumber]
 * Example: Aditi Sharma, 7th hire in 2026 → AS2026007
 */
export async function generateLoginId(
  firstName: string,
  lastName: string,
  joiningDate: Date
): Promise<string> {
  const initials =
    (firstName.trim().charAt(0) + lastName.trim().charAt(0)).toUpperCase() || 'XX';
  const year = joiningDate.getFullYear().toString();
  const prefix = `${initials}${year}`;

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

  const next = (maxSeq + 1).toString().padStart(3, '0');
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
