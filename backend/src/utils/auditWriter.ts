import { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export interface AuditWriteInput {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(
  client: TxClient | typeof import('../config/prisma').prisma,
  input: AuditWriteInput
) {
  return client.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: input.previousValue ?? undefined,
      newValue: input.newValue ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}
