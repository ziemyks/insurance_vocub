import type { Prisma } from "./generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function audit(
  tx: Tx,
  entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    details?: unknown;
  },
) {
  await tx.auditLog.create({
    data: { ...entry, details: (entry.details ?? undefined) as Prisma.InputJsonValue | undefined },
  });
}
