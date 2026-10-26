import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { PaymentsService } from '../payments/payments.service';
import type {
  ClaimCreateDto, ClaimUpdateDto, ConversationCreateDto, ConversationUpdateDto, DisputeCreateDto, DisputeResolveDto, IncidentCreateDto, IncidentUpdateDto,
  ListClaimsQuery, ListConversationsQuery, ListDisputesQuery, ListIncidentsQuery, ListMessagesQuery, MessageCreateDto,
} from './support.dto';
import { toClaim, toConversation, toDispute, toIncident, toMessage } from './support.mapper';

const byNewest = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

/** Incidentes, contestações, sinistros e chat de suporte (polling). Cliente só vê os próprios registros. */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly payments: PaymentsService,
  ) {}

  private ownerFilter(user: Principal, customerId?: string): { customerId?: string } {
    if (!isStaff(user)) return { customerId: user.customerId };
    return customerId ? { customerId } : {};
  }

  private assertVisible(user: Principal, ownerId: string | null | undefined, what: string): void {
    if (!isStaff(user) && ownerId !== user.customerId) throw notFound(`${what} não encontrado.`);
  }

  async upload(user: Principal, contentType: string) {
    return presignedUpload(this.storage, this.cfg.buckets.attachments, `support/${user.userId}`, contentType);
  }

  // ── incidentes ──
  async listIncidents(user: Principal, q: ListIncidentsQuery) {
    const where: Prisma.IncidentWhereInput = { ...this.ownerFilter(user, q.customerId) };
    if (q.status) where.status = q.status;
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    const rows = await this.prisma.incident.findMany({ where, orderBy: byNewest, ...pageArgs(q) });
    return toPage(rows, q, toIncident);
  }

  async createIncident(user: Principal, dto: IncidentCreateDto) {
    let customerId: string | undefined = isStaff(user) ? undefined : user.customerId;
    let vehicleId = dto.vehicleId;
    if (dto.rentalId) {
      const r = await this.prisma.rental.findUnique({ where: { id: dto.rentalId }, select: { customerId: true, vehicleId: true } });
      if (!r || (!isStaff(user) && r.customerId !== user.customerId)) throw notFound('Aluguel não encontrado.');
      vehicleId = vehicleId ?? r.vehicleId;
      customerId = customerId ?? r.customerId;
    }
    if (vehicleId && !(await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } }))) throw notFound('Moto não encontrada.');
    const incident = await this.prisma.incident.create({
      data: {
        customerId, rentalId: dto.rentalId, vehicleId, category: dto.category, description: dto.description, photoObjectKeys: dto.photoObjectKeys ?? [],
        lat: dto.lat, lng: dto.lng, createdById: user.userId, createdByType: isStaff(user) ? 'staff' : 'customer',
      },
    });
    if (dto.category === 'accident' || dto.category === 'theft') {
      await this.alerts.create(
        { type: 'incident_reported', priority: 'high', message: dto.category === 'theft' ? 'Furto reportado.' : 'Acidente reportado.', vehicleId, rentalId: dto.rentalId, lat: dto.lat, lng: dto.lng },
        { dedupe: false },
      );
    }
    return toIncident(incident);
  }

  async getIncident(user: Principal, id: string) {
    const i = await this.prisma.incident.findUnique({ where: { id } });
    if (!i) throw notFound('Incidente não encontrado.');
    this.assertVisible(user, i.customerId, 'Incidente');
    return toIncident(i);
  }

  async updateIncident(id: string, dto: IncidentUpdateDto) {
    if (!(await this.prisma.incident.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Incidente não encontrado.');
    return toIncident(await this.prisma.incident.update({ where: { id }, data: { status: dto.status, resolutionNote: dto.resolutionNote } }));
  }

  // ── contestações ──
  async listDisputes(user: Principal, q: ListDisputesQuery) {
    const where: Prisma.DisputeWhereInput = { ...this.ownerFilter(user, q.customerId) };
    if (q.status) where.status = q.status;
    const rows = await this.prisma.dispute.findMany({ where, orderBy: byNewest, ...pageArgs(q) });
    return toPage(rows, q, toDispute);
  }

  async createDispute(user: Principal, dto: DisputeCreateDto) {
    const r = await this.prisma.rental.findUnique({ where: { id: dto.rentalId }, select: { customerId: true, paymentId: true } });
    if (!r || r.customerId !== user.customerId) throw notFound('Aluguel não encontrado.');
    if (dto.paymentId) {
      const p = await this.prisma.payment.findUnique({ where: { id: dto.paymentId }, select: { customerId: true } });
      if (!p || p.customerId !== user.customerId) throw notFound('Pagamento não encontrado.');
    }
    const open = await this.prisma.dispute.findFirst({ where: { rentalId: dto.rentalId, status: { in: ['open', 'under_review'] } } });
    if (open) throw conflict('conflict', 'Já existe uma contestação aberta para este aluguel.');
    const d = await this.prisma.dispute.create({
      data: { customerId: user.customerId!, rentalId: dto.rentalId, paymentId: dto.paymentId ?? r.paymentId, reason: dto.reason, description: dto.description },
    });
    return toDispute(d);
  }

  async getDispute(user: Principal, id: string) {
    const d = await this.prisma.dispute.findUnique({ where: { id } });
    if (!d) throw notFound('Contestação não encontrada.');
    this.assertVisible(user, d.customerId, 'Contestação');
    return toDispute(d);
  }

  /**
   * `accepted` com `refundAmountCents` estorna pelo mesmo pipeline de `PaymentsService.refund` (transição, teto capturado,
   * um estorno aberto, `PaymentRefund`, gateway/carteira), com chave estável `dispute:<id>`: repetir a decisão não estorna duas vezes.
   * A disputa só é fechada depois que o estorno foi reservado, e o fechamento é condicional ao status (fecha a corrida).
   */
  async resolveDispute(actor: Principal, id: string, dto: DisputeResolveDto) {
    const d = await this.prisma.dispute.findUnique({ where: { id } });
    if (!d) throw notFound('Contestação não encontrada.');
    if (d.status !== 'open' && d.status !== 'under_review') throw conflict('conflict', 'Contestação já decidida.');
    const refund = dto.decision === 'accepted' ? dto.refundAmountCents : undefined;
    if (refund) {
      if (!d.paymentId) throw unprocessable('validation-error', 'Não há pagamento para estornar.');
      await this.payments.refund(actor, d.paymentId, { amountCents: refund, reason: dto.resolution }, `dispute:${id}`);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.dispute.updateMany({
        where: { id, status: { in: ['open', 'under_review'] } },
        data: { status: dto.decision, resolution: dto.resolution, refundAmountCents: refund ?? null, resolvedById: actor.userId, resolvedAt: new Date() },
      });
      if (res.count !== 1) throw conflict('conflict', 'Contestação já decidida.');
      await this.audit.record({ actor, action: 'dispute.resolve', entityType: 'Dispute', entityId: id, reason: dto.resolution, metadata: { decision: dto.decision, refundAmountCents: refund } }, tx as any);
      return tx.dispute.findUniqueOrThrow({ where: { id } });
    });
    return toDispute(updated);
  }

  // ── sinistros ──
  async listClaims(user: Principal, q: ListClaimsQuery) {
    const where: Prisma.ClaimWhereInput = { ...this.ownerFilter(user, q.customerId) };
    if (q.status) where.status = q.status;
    const rows = await this.prisma.claim.findMany({ where, orderBy: byNewest, ...pageArgs(q) });
    return toPage(rows, q, toClaim);
  }

  async createClaim(user: Principal, dto: ClaimCreateDto) {
    const r = await this.prisma.rental.findUnique({ where: { id: dto.rentalId }, select: { customerId: true, insurancePolicyId: true } });
    if (!r || r.customerId !== user.customerId) throw notFound('Aluguel não encontrado.');
    if (!r.insurancePolicyId) throw conflict('conflict', 'Este aluguel não tem apólice de seguro.');
    if (dto.incidentId) {
      const i = await this.prisma.incident.findUnique({ where: { id: dto.incidentId }, select: { customerId: true } });
      if (!i || i.customerId !== user.customerId) throw notFound('Incidente não encontrado.');
    }
    const c = await this.prisma.claim.create({
      data: {
        customerId: user.customerId!, rentalId: dto.rentalId, incidentId: dto.incidentId, insurancePolicyId: r.insurancePolicyId, type: dto.type,
        description: dto.description, occurredAt: new Date(dto.occurredAt), lat: dto.lat, lng: dto.lng, photoObjectKeys: dto.photoObjectKeys ?? [],
      },
    });
    return toClaim(c);
  }

  async getClaim(user: Principal, id: string) {
    const c = await this.prisma.claim.findUnique({ where: { id } });
    if (!c) throw notFound('Sinistro não encontrado.');
    this.assertVisible(user, c.customerId, 'Sinistro');
    return toClaim(c);
  }

  async updateClaim(actor: Principal, id: string, dto: ClaimUpdateDto) {
    if (!(await this.prisma.claim.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Sinistro não encontrado.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.claim.update({ where: { id }, data: { status: dto.status, statusNote: dto.statusNote } });
      await this.audit.record({ actor, action: 'claim.update', entityType: 'Claim', entityId: id, reason: dto.statusNote, metadata: { status: dto.status } }, tx as any);
      return u;
    });
    return toClaim(updated);
  }

  // ── chat ──
  async listConversations(user: Principal, q: ListConversationsQuery) {
    const where: Prisma.SupportConversationWhereInput = { ...this.ownerFilter(user, q.customerId) };
    if (q.status) where.status = q.status;
    const rows = await this.prisma.supportConversation.findMany({
      where, include: { customer: { select: { name: true } } }, orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }], ...pageArgs(q),
    });
    const unread = await this.unreadCounts(user, rows.map((r) => r.id));
    return toPage(rows, q, (c) => toConversation({ ...c, unreadCount: unread.get(c.id) ?? 0 }));
  }

  /** Contrato v2: autores "do outro lado" da conversa para quem consulta. */
  private otherSide(user: Principal): Array<'customer' | 'staff' | 'system'> {
    return isStaff(user) ? ['customer'] : ['staff', 'system'];
  }

  /** Mensagens do outro lado ainda não lidas, por conversa. */
  private async unreadCounts(user: Principal, ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.supportMessage.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: ids }, authorType: { in: this.otherSide(user) }, readAt: null },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.conversationId, r._count._all]));
  }

  /** Marca como lidas as mensagens do outro lado até `upToMessageId` (inclusive) ou todas. Idempotente. */
  async markRead(user: Principal, id: string, upToMessageId?: string) {
    const c = await this.conversationFor(user, id);
    let cutoff: Date | undefined;
    if (upToMessageId) {
      const m = await this.prisma.supportMessage.findUnique({ where: { id: upToMessageId }, select: { conversationId: true, createdAt: true } });
      if (!m || m.conversationId !== id) throw notFound('Mensagem não encontrada.');
      cutoff = m.createdAt;
    }
    const now = new Date();
    const filter: Prisma.SupportMessageWhereInput = { conversationId: id, authorType: { in: this.otherSide(user) }, readAt: null, ...(cutoff ? { createdAt: { lte: cutoff } } : {}) };
    await this.prisma.$transaction([
      this.prisma.supportMessage.updateMany({ where: { ...filter, deliveredAt: null }, data: { deliveredAt: now } }),
      this.prisma.supportMessage.updateMany({ where: filter, data: { readAt: now } }),
    ]);
    const unread = await this.unreadCounts(user, [id]);
    return toConversation({ ...c, unreadCount: unread.get(id) ?? 0 });
  }

  async createConversation(user: Principal, dto: ConversationCreateDto) {
    if (dto.rentalId) {
      const r = await this.prisma.rental.findUnique({ where: { id: dto.rentalId }, select: { customerId: true } });
      if (!r || r.customerId !== user.customerId) throw notFound('Aluguel não encontrado.');
    }
    const conv = await this.prisma.$transaction(async (tx) => {
      const c = await tx.supportConversation.create({ data: { customerId: user.customerId!, subject: dto.subject, rentalId: dto.rentalId }, include: { customer: { select: { name: true } } } });
      await tx.supportMessage.create({ data: { conversationId: c.id, authorType: 'customer', authorId: user.customerId, body: dto.message } });
      return c;
    });
    return toConversation(conv);
  }

  private async conversationFor(user: Principal, id: string) {
    const c = await this.prisma.supportConversation.findUnique({ where: { id }, include: { customer: { select: { name: true } } } });
    if (!c) throw notFound('Conversa não encontrada.');
    this.assertVisible(user, c.customerId, 'Conversa');
    return c;
  }

  async updateConversation(user: Principal, id: string, dto: ConversationUpdateDto) {
    await this.conversationFor(user, id);
    const c = await this.prisma.supportConversation.update({ where: { id }, data: { status: dto.status }, include: { customer: { select: { name: true } } } });
    const unread = await this.unreadCounts(user, [id]);
    return toConversation({ ...c, unreadCount: unread.get(id) ?? 0 });
  }

  async listMessages(user: Principal, id: string, q: ListMessagesQuery) {
    await this.conversationFor(user, id);
    const where: Prisma.SupportMessageWhereInput = { conversationId: id };
    if (q.after) where.createdAt = { gt: new Date(q.after) };
    const rows = await this.prisma.supportMessage.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    // Contrato v2: buscar a conversa entrega (`delivered`) as mensagens do outro lado.
    const other = this.otherSide(user);
    const undelivered = rows.filter((r) => !r.deliveredAt && other.includes(r.authorType)).map((r) => r.id);
    if (undelivered.length) {
      const now = new Date();
      await this.prisma.supportMessage.updateMany({ where: { id: { in: undelivered }, deliveredAt: null }, data: { deliveredAt: now } });
      for (const r of rows) if (undelivered.includes(r.id)) r.deliveredAt = now;
    }
    return toPage(rows, q, toMessage);
  }

  async sendMessage(user: Principal, id: string, dto: MessageCreateDto) {
    const c = await this.conversationFor(user, id);
    if (c.status === 'closed') throw conflict('conflict', 'A conversa está encerrada.');
    const staff = isStaff(user) ? await this.prisma.staffUser.findUnique({ where: { id: user.staffId }, select: { name: true } }) : null;
    const m = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.supportMessage.create({
        data: {
          conversationId: id, authorType: isStaff(user) ? 'staff' : 'customer', authorId: user.userId, authorName: staff?.name,
          body: dto.body, attachmentObjectKeys: dto.attachmentObjectKeys ?? [],
        },
      });
      await tx.supportConversation.update({ where: { id }, data: { lastMessageAt: msg.createdAt } });
      return msg;
    });
    return toMessage(m);
  }
}
