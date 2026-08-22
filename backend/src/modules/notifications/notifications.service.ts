import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError, assertFound } from '../../utils/errors';
import { AuthUser } from '../../middleware/requireAuth';

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

export async function listNotifications(actor: AuthUser, unreadOnly?: boolean) {
  return prisma.notification.findMany({
    where: {
      userId: actor.userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markRead(id: string, actor: AuthUser) {
  const n = assertFound(
    await prisma.notification.findUnique({ where: { id } }),
    'Notification not found'
  );

  if (n.userId !== actor.userId) {
    throw new AppError('You cannot modify this notification', 'FORBIDDEN', 403);
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllRead(actor: AuthUser) {
  await prisma.notification.updateMany({
    where: { userId: actor.userId, isRead: false },
    data: { isRead: true },
  });
  return { ok: true };
}
