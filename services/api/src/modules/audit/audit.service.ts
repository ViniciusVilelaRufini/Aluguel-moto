import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Principal } from '../auth/principal';

export type AuditActor = Principal | { system: true; name?: string };

export interface AuditEntry {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

type Tx = Pick<PrismaService, 'auditLog'>;

/** AuditLog: quem, quando, motivo (somente inserção). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx: Tx = this.prisma): Promise<void> {
    const isSystem = 'system' in entry.actor;
    const p = entry.actor as Principal;
    await tx.auditLog.create({
      data: {
        actorType: isSystem ? 'system' : p.pool === 'staff' ? 'staff' : 'customer',
        actorId: isSystem ? null : p.userId,
        actorName: isSystem ? ((entry.actor as { name?: string }).name ?? 'sistema') : null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: entry.reason ?? null,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
