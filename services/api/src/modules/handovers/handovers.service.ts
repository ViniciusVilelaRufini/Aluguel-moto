import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Handover, Prisma, Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, HandoverPendingEvent, HandoverUpdatedEvent, ReservationEndedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { IDEMPOTENCY_STALE_MS, IDEMPOTENCY_STORE, type IdempotencyStore } from '../../common/idempotency/idempotency.store';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { distanceM } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { isUniqueViolation } from '../payments/payment-state.service';
import { DEPOT_RETURN_RADIUS_M, depotPosition, RentalEndService } from '../rentals/rental-end.service';
import { RentalStartService } from '../rentals/rental-start.service';
import { PICKUP_CODE_SECRET, verifyPickupCode } from '../reservations/pickup-code';
import { ReservationsService } from '../reservations/reservations.service';
import { SupportService } from '../support/support.service';
import type { HandoverCreateDto, ListHandoversQuery } from './handovers.dto';
import { type ChecklistItem, type HandoverCancelInfo, toHandover } from './handovers.mapper';
import { STAFF_FALLBACK_NAME, staffFirstName } from '../../common/staff-display-name';

/** Links das fotos da entrega: 24 h (contrato). */
const PHOTO_URL_TTL_SECONDS = 24 * 60 * 60;
/**
 * Trava do aceite por entrega (o cancelamento pela operação a respeita). Fica para o início do aluguel no balcão
 * (`counter-checkout`), que usa a mesma trava.
 */
export const ACCEPT_LOCK_SCOPE = 'handover-accept';

type HandoverRow = Handover & { vehicle?: Pick<Vehicle, 'code'> | null };

const handoverNotFound = () => notFound('Entrega não encontrada.');
const alreadyAccepted = () => conflict('conflict', 'Esta entrega já foi aceita pelo cliente; encerre pelo aluguel.');
/** Run-2: a chegada só encerra com a moto (posição viva) no galpão; fora disso, o encerramento forçado do admin. */
const notAtDepot = () =>
  new ProblemException(422, 'vehicle-not-at-depot', 'A moto não está no galpão. Use o encerramento forçado pelo suporte.', undefined, 'Moto fora do galpão');
const notPending = () => new ProblemException(422, 'handover-not-pending', 'Esta entrega não está mais aguardando o seu aceite.', undefined, 'Entrega não está pendente');
/** Decisão 10 (pré-reserva/balcão): o aceite pelo app (beta12) deixou de iniciar o aluguel. */
const counterCheckout = () =>
  new ProblemException(409, 'handover-counter-checkout', 'O aluguel é iniciado pelo atendente no galpão.', undefined, 'Aluguel iniciado no balcão');

export interface CreateResult {
  status: 200 | 201;
  body: ReturnType<typeof toHandover>;
}

/**
 * Entrega formal no galpão (Task 6). Saída (`pickup`): o operador lê o código da reserva e faz o checklist; o aluguel é
 * iniciado pelo atendente no balcão (o aceite pelo app responde `409 handover-counter-checkout`) e o cliente ainda pode
 * apontar um problema. Chegada (`return_depot`): encerra o aluguel pelo fechamento normal
 * com a moto no galpão. Logs só com ids.
 */
@Injectable()
export class HandoversService {
  private readonly logger = new Logger('HandoversService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly starter: RentalStartService,
    private readonly ender: RentalEndService,
    private readonly support: SupportService,
    private readonly events: EventEmitter2,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(PICKUP_CODE_SECRET) private readonly pickupSecret: string,
    @Inject(IDEMPOTENCY_STORE) private readonly locks: IdempotencyStore,
    private readonly audit: AuditService,
    private readonly reservations: ReservationsService,
  ) {
    // A trava do aceite vence em IDEMPOTENCY_STALE_MS; a espera do desbloqueio dentro do start() precisa caber nela.
    if (typeof starter.maxUnlockWaitMs === 'function' && starter.maxUnlockWaitMs() >= IDEMPOTENCY_STALE_MS) {
      this.logger.error({ msg: 'handover_accept_lock_shorter_than_unlock_wait', unlockWaitMs: starter.maxUnlockWaitMs(), lockStaleMs: IDEMPOTENCY_STALE_MS });
    }
  }

  /** `contract`: foto do contrato assinado no balcão (prefixo `contracts/`, mesmo bucket das fotos da entrega). */
  uploadUrl(contentType: string, purpose: 'photo' | 'contract' = 'photo') {
    return presignedUpload(this.storage, this.cfg.buckets.returnPhotos, purpose === 'contract' ? 'contracts' : 'handovers', contentType);
  }

  create(operator: Principal, dto: HandoverCreateDto): Promise<CreateResult> {
    return dto.type === 'pickup' ? this.createPickup(operator, dto) : this.createReturn(operator, dto);
  }

  // ───────────────────────── saída (pickup) ─────────────────────────

  /**
   * Código válido → reserva de galpão `active` (ou `handover` sem saída aberta, depois de uma disputa) com a moto
   * `reserved` → entrega `pending_customer` e reserva `handover`, numa transação. Código adulterado ou vencido → 404.
   */
  async createPickup(operator: Principal, dto: HandoverCreateDto): Promise<CreateResult> {
    const code = verifyPickupCode(dto.pickupCode ?? '', new Date(), this.pickupSecret);
    if (!code) throw notFound('Código de retirada inválido ou vencido.');
    const r = await this.prisma.reservation.findUnique({ where: { id: code.reservationId }, include: { vehicle: true } });
    if (!r || !r.depotId) throw notFound('Código de retirada inválido ou vencido.');
    if (dto.depotId && dto.depotId !== r.depotId) throw unprocessable('validation-error', 'Este código é de uma retirada em outro galpão.');
    if (r.status !== 'active' && r.status !== 'handover') throw conflict('conflict', 'Esta reserva não está mais ativa.');
    if (!r.vehicle || r.vehicle.status !== 'reserved') throw conflict('vehicle-unavailable', 'A moto desta reserva não está separada.');

    let created: HandoverRow;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        if (r.status === 'active') {
          const moved = await tx.reservation.updateMany({ where: { id: r.id, status: 'active' }, data: { status: 'handover' } });
          if (moved.count !== 1) throw conflict('conflict', 'Esta reserva não está mais ativa.');
        }
        return tx.handover.create({
          data: {
            type: 'pickup',
            status: 'pending_customer',
            depotId: r.depotId!,
            reservationId: r.id,
            vehicleId: r.vehicleId,
            operatorId: operator.userId,
            checklist: checklistJson(dto.checklist),
            photoKeys: dto.photoKeys,
            batteryPct: dto.batteryPct,
            batterySerial: dto.batterySerial ?? null,
          },
          include: { vehicle: { select: { code: true } } },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('conflict', 'Já existe uma entrega aberta para esta reserva.');
      throw err;
    }
    this.events.emit(EV.HANDOVER_PENDING, { handoverId: created.id, reservationId: r.id, customerId: r.customerId, depotId: r.depotId } satisfies HandoverPendingEvent);
    this.logger.log({ msg: 'handover_created', handoverId: created.id, type: 'pickup', reservationId: r.id, depotId: r.depotId });
    return { status: 201, body: await this.view(created, undefined, undefined, true) };
  }

  /**
   * Aceite pelo app (apps beta12). O aluguel do galpão agora é iniciado pelo atendente no balcão: o cliente dono recebe
   * `409 handover-counter-checkout` sem nenhuma leitura de caução nem trava; outro cliente (ou entrega que não é de saída)
   * → 404, sem revelar a entrega.
   */
  async accept(customer: Principal, id: string): Promise<never> {
    const h = await this.prisma.handover.findUnique({ where: { id }, include: { reservation: true } });
    if (!h || h.type !== 'pickup' || !h.reservation || h.reservation.customerId !== customer.customerId) throw handoverNotFound();
    throw counterCheckout();
  }

  /** Problema apontado pelo cliente: `disputed`, conversa de suporte aberta; moto `reserved` e reserva `handover`. */
  async dispute(customer: Principal, id: string, reason: string) {
    const h = await this.prisma.handover.findUnique({ where: { id }, include: { reservation: true, vehicle: { select: { code: true } } } });
    if (!h || h.type !== 'pickup' || !h.reservation || h.reservation.customerId !== customer.customerId) throw handoverNotFound();
    if (h.status !== 'pending_customer') throw notPending();
    const moved = await this.prisma.handover.updateMany({
      where: { id, status: 'pending_customer' },
      data: { status: 'disputed', disputeReason: reason.trim(), respondedAt: new Date() },
    });
    if (moved.count !== 1) throw notPending();
    const subject = `Problema na entrega da moto ${h.vehicle?.code ?? ''}`.trim();
    if (!(await this.openDisputeTicket(customer, id, subject, reason.trim()))) {
      // Sem conversa: a disputa fica registrada e a falha marcada na auditoria (o suporte vê pela fila `status=disputed`).
      await this.audit
        .record({ actor: customer, action: 'handover.dispute_ticket_failed', entityType: 'Handover', entityId: id, metadata: { reservationId: h.reservation.id } })
        .catch((err) => this.logger.error({ msg: 'handover_dispute_audit_failed', handoverId: id, error: errorCode(err) }));
    }
    this.emitUpdated({ handoverId: id, status: 'disputed', customerId: h.reservation.customerId, depotId: h.depotId });
    this.logger.log({ msg: 'handover_disputed', handoverId: id });
    const updated = await this.prisma.handover.findUniqueOrThrow({ where: { id }, include: { vehicle: { select: { code: true } } } });
    return this.view(updated);
  }

  // ───────────────────────── chegada (return_depot) ─────────────────────────

  /**
   * Chegada do aluguel no galpão: entrega `accepted` e encerramento pelo fechamento normal (`returnTo: 'depot'`, sem
   * `collect`). A moto fica `free` com o `depotId`, ou `maintenance` se algum item veio `ok: false`. Repetição (fila offline
   * do app do operador) → a entrega existente com 200, terminando o que tiver ficado pela metade.
   *
   * Run-2 (auditoria): antes de qualquer escrita, o galpão precisa existir e estar ativo (404) e a posição **viva** da moto
   * precisa estar a até `DEPOT_RETURN_RADIUS_M` dele; fora disso ou sem posição viva → 422 `vehicle-not-at-depot` sem mudar
   * nada (o escape é o encerramento forçado do admin, com taxa e auditoria). A chegada aceita grava o AuditLog
   * `rental.return_depot` (operador, aluguel, galpão, distância) na mesma transação da entrega. A repetição de uma chegada já
   * registrada não reconfere (a conferência valeu na criação).
   */
  async createReturn(operator: Principal, dto: HandoverCreateDto): Promise<CreateResult> {
    const rentalId = dto.rentalId!;
    const depot = await this.prisma.depot.findUnique({ where: { id: dto.depotId! }, select: { id: true, active: true, lat: true, lng: true } });
    if (!depot || !depot.active) throw notFound('Galpão não encontrado.');

    const existing = await this.openReturn(rentalId);
    if (existing) return { status: 200, body: await this.finishReturn(operator, existing, false) };

    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { id: true, status: true, vehicleId: true } });
    if (!rental) throw notFound('Aluguel não encontrado.');
    if (!OPEN_RENTAL_STATUSES.includes(rental.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    const here = await this.ender.livePosition(rental.vehicleId);
    const distance = here ? Math.round(distanceM(here, depot)) : null;
    if (distance === null || distance > DEPOT_RETURN_RADIUS_M) {
      this.logger.warn({ msg: 'handover_return_not_at_depot', rentalId, depotId: depot.id, distanceM: distance, livePosition: here !== null });
      throw notAtDepot();
    }

    let created: HandoverRow;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.handover.create({
          data: {
            type: 'return_depot',
            status: 'accepted',
            depotId: depot.id,
            rentalId,
            vehicleId: rental.vehicleId,
            operatorId: operator.userId,
            checklist: checklistJson(dto.checklist),
            photoKeys: dto.photoKeys,
            batteryPct: dto.batteryPct,
            batterySerial: dto.batterySerial ?? null,
            respondedAt: new Date(),
          },
          include: { vehicle: { select: { code: true } } },
        });
        await this.audit.record(
          { actor: operator, action: 'rental.return_depot', entityType: 'Rental', entityId: rentalId, metadata: { depotId: depot.id, handoverId: row.id, distanceM: distance } },
          tx,
        );
        return row;
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const raced = await this.openReturn(rentalId);
      if (!raced) throw err;
      return { status: 200, body: await this.finishReturn(operator, raced, false) };
    }
    this.logger.log({ msg: 'handover_created', handoverId: created.id, type: 'return_depot', rentalId, depotId: depot.id });
    return { status: 201, body: await this.finishReturn(operator, created, true) };
  }

  private openReturn(rentalId: string) {
    return this.prisma.handover.findFirst({
      where: { rentalId, type: 'return_depot', status: { not: 'canceled' } },
      include: { vehicle: { select: { code: true } } },
    });
  }

  /**
   * Encerra o aluguel (idempotente) e põe a moto no galpão; numa repetição só refaz o que faltou. Fix round 2: emite
   * `handover.updated` (`accepted`) para o cliente e o galpão quando a chegada se completa — na criação, ou numa repetição
   * que ainda encerrou o aluguel ou pôs a moto no galpão (repetição sem trabalho não reemite).
   */
  private async finishReturn(operator: Principal, h: HandoverRow, fresh: boolean) {
    const target = targetStatusOf(h);
    // A moto chega ao galpão: a posição registrada passa a ser a do galpão (como no recolhimento `collect`).
    const position = depotPosition(await this.prisma.depot.findUnique({ where: { id: h.depotId }, select: { lat: true, lng: true } }));
    const rental = await this.prisma.rental.findUnique({ where: { id: h.rentalId! }, select: { status: true, customerId: true } });
    let completed = fresh;
    // O fechamento grava status final + depotId numa transição só (sem janela `free` sem galpão).
    if (rental && OPEN_RENTAL_STATUSES.includes(rental.status)) {
      await this.ender.endAtDepot(operator, h.rentalId!, { depotId: h.depotId, targetStatus: target, ...position });
      completed = true;
    }
    // Recolhimento aberto da moto deixa de valer (ela está no galpão).
    await this.prisma.fieldTask.updateMany({ where: { vehicleId: h.vehicleId, type: 'collect', status: { notIn: ['done', 'canceled'] } }, data: { status: 'canceled' } });
    // Só repetição ou moto offline (sem transição no fechamento) precisam da colocação à parte.
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: h.vehicleId }, select: { depotId: true, status: true } });
    if (vehicle?.depotId !== h.depotId || vehicle.status === 'offline' || vehicle.status === 'awaiting_pickup') {
      await this.placeAtDepot(h, target, position);
      completed = true;
    }
    if (completed) this.emitUpdated({ handoverId: h.id, status: 'accepted', customerId: rental?.customerId, depotId: h.depotId });
    return this.view(h, undefined, undefined, true);
  }

  /** Repetição/offline: `free` (ou `maintenance` com item problemático) + `depotId`, sem passar por `free` sem galpão. */
  private async placeAtDepot(h: HandoverRow, wanted: 'free' | 'maintenance', position: ReturnType<typeof depotPosition> = {}): Promise<void> {
    const busy = await this.prisma.rental.findFirst({ where: { vehicleId: h.vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    if (busy) return;
    // Auditoria: moto com trava da equipe/sistema não volta à frota como `free` (nem ao reconectar).
    const target = await this.ender.depotArrivalStatus(h.vehicleId, wanted);
    const moved = await this.prisma.$transaction(async (tx) => {
      const placed = await tx.vehicle.updateMany({
        where: { id: h.vehicleId, status: { in: ['free', 'awaiting_pickup', 'maintenance'] } },
        data: { status: target, depotId: h.depotId, ...position },
      });
      if (placed.count === 0) {
        // Offline: volta ao status certo quando reconectar.
        await tx.vehicle.updateMany({ where: { id: h.vehicleId, status: 'offline' }, data: { depotId: h.depotId, statusBeforeOffline: target, ...position } });
      }
      return placed.count > 0;
    });
    if (moved) this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: h.vehicleId, status: target, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.logger.log({ msg: 'handover_vehicle_at_depot', handoverId: h.id, vehicleId: h.vehicleId, depotId: h.depotId, status: target });
  }

  // ───────────────────────── cancelamento (operação) ─────────────────────────

  /**
   * `POST /handovers/{id}/cancel`: saída `pending_customer` ou `disputed` → `canceled` (AuditLog, `handover.updated`).
   * Na mesma transação a reserva volta a `active` se ainda estiver no prazo (o `pickupCode` reaparece para uma nova saída);
   * vencida, vira `expired`, a moto volta a `free` no galpão e a caução é liberada. Já aceita ou com aceite em andamento → 409.
   */
  async cancel(actor: Principal, id: string, reason: string) {
    const h = await this.prisma.handover.findUnique({ where: { id }, include: { reservation: true } });
    if (!h) throw handoverNotFound();
    if (h.status === 'accepted') throw alreadyAccepted();
    if (h.type !== 'pickup' || !h.reservation || (h.status !== 'pending_customer' && h.status !== 'disputed')) throw notPending();
    const r = h.reservation;

    const lock = await this.locks.begin(ACCEPT_LOCK_SCOPE, id, 'accept');
    if (lock.state === 'in_progress') throw conflict('conflict', 'O cliente está aceitando esta entrega agora. Tente de novo em instantes.');
    try {
      const now = new Date();
      const outcome = await this.prisma.$transaction(async (tx) => {
        const moved = await tx.handover.updateMany({ where: { id, status: { in: ['pending_customer', 'disputed'] } }, data: { status: 'canceled' } });
        if (moved.count !== 1) {
          const cur = await tx.handover.findUnique({ where: { id }, select: { status: true } });
          throw cur?.status === 'accepted' ? alreadyAccepted() : notPending();
        }
        // Outra saída aberta para a mesma reserva (refeita depois da disputa): a reserva segue com ela.
        const other = await tx.handover.findFirst({
          where: { reservationId: r.id, type: 'pickup', status: { in: ['pending_customer', 'accepted'] }, id: { not: id } },
          select: { id: true },
        });
        let result: 'active' | 'expired' | 'kept' = 'kept';
        if (!other && r.expiresAt.getTime() > now.getTime()) {
          const back = await tx.reservation.updateMany({ where: { id: r.id, status: 'handover' }, data: { status: 'active' } });
          if (back.count) result = 'active';
        } else if (!other) {
          const ended = await tx.reservation.updateMany({ where: { id: r.id, status: 'handover' }, data: { status: 'expired', endedAt: now } });
          if (ended.count) {
            await tx.vehicle.updateMany({ where: { id: r.vehicleId, status: 'reserved' }, data: { status: 'free' } });
            result = 'expired';
          }
        }
        await this.audit.record(
          { actor, action: 'handover.cancel', entityType: 'Handover', entityId: id, reason: reason.trim(), metadata: { reservationId: r.id, reservation: result } },
          tx,
        );
        return result;
      });

      if (outcome === 'active') await this.reservations.trackExpiry(r.id, r.customerId, r.expiresAt);
      if (outcome === 'expired') {
        this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: r.vehicleId, status: 'free', ts: now.toISOString() } satisfies VehicleStatusChangedEvent);
        this.events.emit(EV.RESERVATION_ENDED, {
          reservationId: r.id, customerId: r.customerId, vehicleId: r.vehicleId, depositId: r.depositId ?? undefined, reason: 'expired',
        } satisfies ReservationEndedEvent);
        if (r.depositId) {
          this.events.emit(EV.DEPOSIT_RELEASE_REQUESTED, { depositId: r.depositId, customerId: r.customerId, reason: 'reservation_expired' } satisfies DepositReleaseRequestedEvent);
        }
      }
      this.emitUpdated({ handoverId: id, status: 'canceled', customerId: r.customerId, depotId: h.depotId });
      this.logger.log({ msg: 'handover_canceled', handoverId: id, reservationId: r.id, reservation: outcome });
    } finally {
      await this.locks.abort(ACCEPT_LOCK_SCOPE, id).catch(() => undefined);
    }
    const updated = await this.prisma.handover.findUniqueOrThrow({ where: { id }, include: { vehicle: { select: { code: true } } } });
    return this.view(updated, undefined, await this.cancelInfo([updated]), true);
  }

  /** Conversa de suporte da disputa: uma nova tentativa; o log leva só o nome/código do erro (sem a mensagem). */
  private async openDisputeTicket(customer: Principal, handoverId: string, subject: string, message: string): Promise<boolean> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.support.createConversation(customer, { subject, message });
        return true;
      } catch (err) {
        this.logger.error({ msg: 'handover_dispute_ticket_failed', handoverId, attempt, error: errorCode(err) });
      }
    }
    return false;
  }

  // ───────────────────────── leitura ─────────────────────────

  /** Cliente: só a entrega da própria reserva ou do próprio aluguel (senão 404). Staff: qualquer uma. */
  async get(user: Principal, id: string) {
    const h = await this.prisma.handover.findUnique({ where: { id }, include: { vehicle: { select: { code: true } }, reservation: { select: { customerId: true } } } });
    if (!h) throw handoverNotFound();
    if (!isStaff(user)) {
      let owner = h.reservation?.customerId;
      if (!owner && h.rentalId) owner = (await this.prisma.rental.findUnique({ where: { id: h.rentalId }, select: { customerId: true } }))?.customerId;
      if (!owner || owner !== user.customerId) throw handoverNotFound();
    }
    return this.view(h, undefined, isStaff(user) ? await this.cancelInfo([h]) : undefined, isStaff(user));
  }

  /** QA-23: entregas canceladas → motivo e autor gravados no AuditLog do cancelamento (só staff). */
  private async cancelInfo(rows: HandoverRow[]): Promise<Map<string, HandoverCancelInfo>> {
    const ids = rows.filter((r) => r.status === 'canceled').map((r) => r.id);
    if (!ids.length) return new Map();
    const logs = await this.prisma.auditLog.findMany({ where: { action: 'handover.cancel', entityType: 'Handover', entityId: { in: ids } }, orderBy: { createdAt: 'asc' } });
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
    const staff = actorIds.length ? await this.prisma.staffUser.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(staff.map((s) => [s.id, s.name]));
    return new Map(
      logs.map((l) => [l.entityId, { reason: l.reason ?? undefined, at: l.createdAt.toISOString(), byName: (l.actorId ? names.get(l.actorId) : undefined) ?? l.actorName ?? undefined }]),
    );
  }

  async list(q: ListHandoversQuery) {
    const where: Prisma.HandoverWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.depotId) where.depotId = q.depotId;
    if (q.type) where.type = q.type;
    const rows = await this.prisma.handover.findMany({
      where,
      include: { vehicle: { select: { code: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(q),
    });
    const page = toPage(rows, q, (r) => r);
    const names = await this.operatorNames(page.items.map((r) => r.operatorId));
    const canceled = await this.cancelInfo(page.items);
    return { ...page, items: await Promise.all(page.items.map((r) => this.view(r, names, canceled, true))) };
  }

  private async operatorNames(ids: string[]): Promise<Map<string, string | undefined>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const staff = await this.prisma.staffUser.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(staff.map((s) => [s.id, staffFirstName(s.name)]));
  }

  private async view(h: HandoverRow, names?: Map<string, string | undefined>, canceled?: Map<string, HandoverCancelInfo>, staff = false) {
    // Task 30 (item 38): primeiro nome cadastrado ou "Equipe Volti" (nunca o e-mail).
    const operatorFirstName = (names ? names.get(h.operatorId) : (await this.operatorNames([h.operatorId])).get(h.operatorId)) ?? STAFF_FALLBACK_NAME;
    const photoUrls = await Promise.all(
      h.photoKeys.map(async (key) => (await this.storage.presignGet({ bucket: this.cfg.buckets.returnPhotos, key, expiresInSeconds: PHOTO_URL_TTL_SECONDS })).url),
    );
    return toHandover(h, { operatorFirstName, photoUrls, cancel: canceled?.get(h.id), staff });
  }

  private emitUpdated(ev: HandoverUpdatedEvent): void {
    this.events.emit(EV.HANDOVER_UPDATED, ev);
  }
}

/**
 * Fix round 2: o contrato do aceite não tem `402`. Um `402` do `start()` que não é recusa de pagamento (ex.:
 * `deposit-not-held` numa corrida com a liberação da caução) vira `422` com o mesmo slug. Exportada para o início do
 * aluguel no balcão (`counter-checkout`), que traduz os erros do `start()` do mesmo jeito.
 */
export function acceptError(err: ProblemException): ProblemException {
  // Task 30 (item 40): o texto do start() de rua ("a caução foi liberada", "escolha outra moto") não vale no aceite:
  // aqui a caução continua retida com a reserva e a entrega continua pendente para um novo aceite.
  if (err.slug === 'vehicle-offline') {
    return new ProblemException(409, 'vehicle-offline', 'Não conseguimos falar com a moto agora. Tente de novo em instantes ou fale com o operador. Nada foi cobrado.', undefined, 'Moto sem conexão');
  }
  if (err.getStatus() !== 402) return err;
  return new ProblemException(422, err.slug, err.detail, err.errors, err.title);
}

/** `free`, ou `maintenance` se algum item do checklist veio `ok: false`. */
function targetStatusOf(h: Pick<Handover, 'checklist'>): 'free' | 'maintenance' {
  return ((h.checklist ?? []) as unknown as ChecklistItem[]).some((i) => i.ok === false) ? 'maintenance' : 'free';
}

/** Só o código/nome do erro para os logs (a mensagem pode carregar dado pessoal). */
function errorCode(err: unknown): string {
  const e = err as { code?: unknown; name?: unknown } | null;
  if (e && typeof e.code === 'string') return e.code;
  return e && typeof e.name === 'string' ? e.name : 'unknown';
}

function checklistJson(items: HandoverCreateDto['checklist']): Prisma.InputJsonValue {
  return items.map((i) => (i.note !== undefined ? { code: i.code, ok: i.ok, note: i.note } : { code: i.code, ok: i.ok }));
}
