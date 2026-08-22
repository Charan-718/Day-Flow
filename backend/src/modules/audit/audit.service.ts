import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { parseDateOnly } from '../../utils/dates';

export const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function listAuditLogs(query: z.infer<typeof auditQuerySchema>) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.entityType) where.entityType = query.entityType;
  if (query.actorId) where.actorId = query.actorId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = parseDateOnly(query.from);
    if (query.to) {
      const end = parseDateOnly(query.to);
      end.setUTCDate(end.getUTCDate() + 1);
      where.createdAt.lt = end;
    }
  }

  const skip = (query.page - 1) * query.pageSize;
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, loginId: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    },
  };
}
