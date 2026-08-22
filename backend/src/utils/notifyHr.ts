import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { Prisma } from '@prisma/client';

export async function notifyHrAdmins(
  tx: Prisma.TransactionClient,
  type: string,
  message: string
) {
  const admins = await tx.user.findMany({
    where: { role: Role.HR_ADMIN },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await tx.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type,
      message,
    })),
  });
}
