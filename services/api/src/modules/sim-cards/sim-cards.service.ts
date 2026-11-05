import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { CreateSimCardDto, ListSimCardsQuery, UpdateSimCardDto } from './sim-cards.dto';
import { toSimCard } from './sim-cards.mapper';

const INCLUDE = { tracker: { select: { vehicle: { select: { id: true, code: true } } } } } as const;

const BOTH_TARGETS = 'Informe a moto ou o rastreador, não os dois.';

/** Alvo do vínculo: o rastreador desta moto (`vehicleId`) ou o próprio rastreador (`trackerId`). */
type LinkTarget = { vehicleId: string } | { trackerId: string };

function isUnique(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Cadastro de chips (SIM) e vínculo ao rastreador da moto. */
@Injectable()
export class SimCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: ListSimCardsQuery) {
    const where: Prisma.SimCardWhereInput = {};
    if (q.q) where.OR = [{ iccid: { contains: q.q } }, { msisdn: { contains: q.q } }];
    if (q.status) where.status = q.status;
    if (q.unlinked) where.trackerId = null;
    const rows = await this.prisma.simCard.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, take: 500 });
    return { items: rows.map(toSimCard) };
  }

  async create(dto: CreateSimCardDto, actor: Principal) {
    if (dto.vehicleId != null && dto.trackerId != null) throw badRequest(BOTH_TARGETS);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const target: LinkTarget | null = dto.vehicleId ? { vehicleId: dto.vehicleId } : dto.trackerId ? { trackerId: dto.trackerId } : null;
        const trackerId = target ? await this.trackerFor(tx, target, undefined) : null;
        const created = await tx.simCard.create({
          data: {
            iccid: dto.iccid,
            msisdn: dto.msisdn ?? null,
            carrier: dto.carrier,
            apn: dto.apn ?? null,
            status: dto.status ?? 'active',
            notes: dto.notes ?? null,
            trackerId,
          },
          include: INCLUDE,
        });
        // Sem ICCID/linha no metadata (dado pessoal indireto).
        await this.audit.record({ actor, action: 'sim_card.create', entityType: 'SimCard', entityId: created.id, metadata: { linked: !!trackerId, status: created.status } }, tx);
        return created;
      });
      return toSimCard(row);
    } catch (err) {
      if (isUnique(err)) throw conflict('conflict', 'ICCID já cadastrado ou rastreador já tem chip.');
      throw err;
    }
  }

  async update(id: string, dto: UpdateSimCardDto, actor: Principal) {
    if (dto.vehicleId !== undefined && dto.trackerId !== undefined) throw badRequest(BOTH_TARGETS);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const current = await tx.simCard.findUnique({ where: { id } });
        if (!current) throw notFound('Chip não encontrado.');
        const data: Prisma.SimCardUncheckedUpdateInput = {};
        if (dto.iccid !== undefined) data.iccid = dto.iccid;
        if (dto.msisdn !== undefined) data.msisdn = dto.msisdn;
        if (dto.carrier !== undefined) data.carrier = dto.carrier;
        if (dto.apn !== undefined) data.apn = dto.apn;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.notes !== undefined) data.notes = dto.notes;
        let link: 'linked' | 'unlinked' | undefined;
        const target = dto.vehicleId !== undefined ? dto.vehicleId : dto.trackerId;
        if (target === null) {
          data.trackerId = null;
          link = 'unlinked';
        } else if (target !== undefined) {
          const trackerId = await this.trackerFor(tx, dto.vehicleId ? { vehicleId: dto.vehicleId } : { trackerId: target }, id);
          // Mover direto para outro rastreador não vale: desvincule antes (evita trocar o chip de moto sem querer).
          if (current.trackerId && current.trackerId !== trackerId) throw conflict('conflict', 'Chip já vinculado a outro rastreador; desvincule antes.');
          data.trackerId = trackerId;
          link = 'linked';
        }
        const updated = await tx.simCard.update({ where: { id }, data, include: INCLUDE });
        await this.audit.record(
          { actor, action: 'sim_card.update', entityType: 'SimCard', entityId: id, metadata: { fields: Object.keys(dto).filter((k) => k !== 'vehicleId' && k !== 'trackerId'), link } },
          tx,
        );
        return updated;
      });
      return toSimCard(row);
    } catch (err) {
      if (isUnique(err)) throw conflict('conflict', 'ICCID já cadastrado ou rastreador já tem chip.');
      throw err;
    }
  }

  /**
   * Rastreador do vínculo (o da moto ou o informado); 404 se o rastreador não existe, 409 se a moto não tem rastreador ou ele já
   * tem outro chip (`selfId` = o próprio chip).
   */
  private async trackerFor(tx: Prisma.TransactionClient, target: LinkTarget, selfId: string | undefined): Promise<string> {
    const where = 'trackerId' in target ? { id: target.trackerId } : { vehicleId: target.vehicleId };
    const tracker = await tx.tracker.findUnique({ where, include: { simCard: { select: { id: true } } } });
    if (!tracker) {
      if ('trackerId' in target) throw notFound('Rastreador não encontrado.');
      const vehicle = await tx.vehicle.findUnique({ where: { id: target.vehicleId }, select: { id: true } });
      if (!vehicle) throw notFound('Moto não encontrada.');
      throw conflict('conflict', 'A moto não tem rastreador.');
    }
    if (tracker.simCard && tracker.simCard.id !== selfId) throw conflict('conflict', 'O rastreador já tem outro chip.');
    return tracker.id;
  }
}
