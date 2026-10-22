import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Handover, Prisma, Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, HandoverPendingEvent, HandoverUpdatedEvent, ReservationEndedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { IDEMPOTENCY_STALE_MS, IDEMPOTENCY_STORE, type IdempotencyStore } from '../../common/idempotency/idempotency.store';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { isUniqueViolation } from '../payments/payment-state.service';
import { RentalEndService } from '../rentals/rental-end.service';
import { RentalStartService } from '../rentals/rental-start.service';
import { toRental } from '../rentals/rentals.mapper';
import { PICKUP_CODE_SECRET, verifyPickupCode } from '../reservations/pickup-code';
import { ReservationsService } from '../reservations/reservations.service';
import { SupportService } from '../support/support.service';
import type { HandoverCreateDto, ListHandoversQuery } from './handovers.dto';
import { type ChecklistItem, firstName, toHandover } from './handovers.mapper';

/** Links das fotos da entrega: 24 h (contrato). */
const PHOTO_URL_TTL_SECONDS = 24 * 60 * 60;
/** Trava do aceite por entrega (aceites concorrentes com chaves diferentes não disputam a mesma moto). */
const ACCEPT_LOCK_SCOPE = 'handover-accept';

type HandoverRow = Handover & { vehicle?: Pick<Vehicle, 'code'> | null };

const handoverNotFound = () => notFound('Entrega não encontrada.');
const alreadyAccepted = () => conflict('conflict', 'Esta entrega já foi aceita pelo cliente; encerre pelo aluguel.');
/** Recusas reais de pagamento vindas do start() (caução recusada pelo gateway). */
const PAYMENT_REFUSALS = new Set(['payment-failed', 'payment-declined']);
const notPending = () => new ProblemException(422, 'handover-not-pending', 'Esta entrega não está mais aguardando o seu aceite.', undefined, 'Entrega não está pendente');

export interface CreateResult {
  status: 200 | 201;
  body: ReturnType<typeof toHandover>;
}

/**
 * Entrega formal no galpão (Task 6). Saída (`pickup`): o operador lê o código da reserva, faz o checklist e o cliente aceita
 * (o aceite delega ao `RentalStartService.start()` com `fromHandover`: cobrança, caução e destravamento seguem o caminho
 * único do início de aluguel) ou aponta um problema. Chegada (`return_depot`): encerra o aluguel pelo fechamento normal
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

  uploadUrl(contentType: string) {
    return presignedUpload(this.storage, this.cfg.buckets.returnPhotos, 'handovers', contentType);
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
    return { status: 201, body: await this.view(created) };
  }

  /**
   * Aceite do cliente dono (outro cliente → 404). Já aceita → o mesmo aluguel (aceites repetidos convergem, uma cobrança);
   * fora de `pending_customer` → 422. Exige a caução da reserva retida. Pagamento recusado → a entrega continua pendente
   * com `lastError`, a reserva continua `handover` e a moto não destrava (o `start()` só destrava depois da cobrança/caução).
   */
  async accept(customer: Principal, id: string) {
    const h = await this.prisma.handover.findUnique({ where: { id }, include: { reservation: true } });
    if (!h || h.type !== 'pickup' || !h.reservation || h.reservation.customerId !== customer.customerId) throw handoverNotFound();
    if (h.status === 'accepted' && h.rentalId) return this.rentalOf(h.rentalId);
    if (h.status !== 'pending_customer') throw notPending();
    const r = h.reservation;

    const deposit = r.depositId ? await this.prisma.deposit.findUnique({ where: { id: r.depositId } }) : null;
    const releasing = deposit ? await this.prisma.depositRelease.findUnique({ where: { depositId: deposit.id } }) : null;
    if (!deposit || deposit.status !== 'held' || releasing) {
      throw new ProblemException(422, 'deposit-not-held', 'A caução da reserva não está retida. Fale com o suporte.', undefined, 'Caução não retida');
    }

    const lock = await this.locks.begin(ACCEPT_LOCK_SCOPE, id, 'accept');
    if (lock.state === 'in_progress') throw conflict('conflict', 'O aceite desta entrega já está em processamento. Tente de novo em instantes.');
    try {
      const result = await this.starter.start(
        customer,
        {
          vehicleId: h.vehicleId,
          planCode: r.planCode!,
          coverage: r.coverage!,
          depositMethod: r.depositMethod ?? deposit.method,
          cardId: r.cardId ?? undefined,
          couponCode: r.couponCode ?? undefined,
          depositId: deposit.id,
        },
        `handover:${id}`,
        { fromHandover: { reservationId: r.id, handoverId: id } },
      );
      if (result.status !== 201 || !result.body.rental) throw new Error('handover_accept_unexpected_awaiting_deposit');
      this.emitUpdated({ handoverId: id, status: 'accepted', customerId: r.customerId, depotId: h.depotId });
      this.logger.log({ msg: 'handover_accepted', handoverId: id, rentalId: result.body.rental.id });
      return result.body.rental;
    } catch (err) {
      // Outro aceite (outra instância, trava vencida) já concluiu: converge no mesmo aluguel.
      const now = await this.prisma.handover.findUnique({ where: { id } });
      if (now?.status === 'accepted' && now.rentalId) return this.rentalOf(now.rentalId);
      if (err instanceof ProblemException && err.slug !== 'handover-not-pending') {
        // Moto já `rented` por um start() em andamento desta mesma entrega (mesma caução): não é falha do aceite.
        if (await this.startInFlight(h.vehicleId, deposit.id)) throw err;
        // Só recusa de pagamento de verdade vira `payment-declined`; o resto mantém o slug (e o status) do start().
        const declined = PAYMENT_REFUSALS.has(err.slug);
        const lastError = declined ? 'payment-declined' : err.slug;
        await this.prisma.handover.updateMany({ where: { id, status: 'pending_customer' }, data: { lastError } });
        this.emitUpdated({ handoverId: id, status: 'pending_customer', lastError, customerId: r.customerId, depotId: h.depotId });
        this.logger.warn({ msg: 'handover_accept_failed', handoverId: id, lastError });
        if (declined) {
          throw new ProblemException(422, 'payment-declined', 'O pagamento não foi aprovado. Tente outro cartão ou fale com o operador.', undefined, 'Pagamento não aprovado');
        }
      }
      throw err;
    } finally {
      await this.locks.abort(ACCEPT_LOCK_SCOPE, id).catch(() => undefined);
    }
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
   */
  async createReturn(operator: Principal, dto: HandoverCreateDto): Promise<CreateResult> {
    const rentalId = dto.rentalId!;
    const depot = await this.prisma.depot.findUnique({ where: { id: dto.depotId! }, select: { id: true } });
    if (!depot) throw notFound('Galpão não encontrado.');

    const existing = await this.openReturn(rentalId);
    if (existing) return { status: 200, body: await this.finishReturn(operator, existing) };

    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { id: true, status: true, vehicleId: true } });
    if (!rental) throw notFound('Aluguel não encontrado.');
    if (!OPEN_RENTAL_STATUSES.includes(rental.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    let created: HandoverRow;
    try {
      created = await this.prisma.handover.create({
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
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const raced = await this.openReturn(rentalId);
      if (!raced) throw err;
      return { status: 200, body: await this.finishReturn(operator, raced) };
    }
    this.logger.log({ msg: 'handover_created', handoverId: created.id, type: 'return_depot', rentalId, depotId: depot.id });
    return { status: 201, body: await this.finishReturn(operator, created) };
  }

  private openReturn(rentalId: string) {
    return this.prisma.handover.findFirst({
      where: { rentalId, type: 'return_depot', status: { not: 'canceled' } },
      include: { vehicle: { select: { code: true } } },
    });
  }

  /** Encerra o aluguel (idempotente) e põe a moto no galpão; numa repetição só refaz o que faltou. */
  private async finishReturn(operator: Principal, h: HandoverRow) {
    const target = targetStatusOf(h);
    const rental = await this.prisma.rental.findUnique({ where: { id: h.rentalId! }, select: { status: true } });
    // O fechamento grava status final + depotId numa transição só (sem janela `free` sem galpão).
    if (rental && OPEN_RENTAL_STATUSES.includes(rental.status)) await this.ender.endAtDepot(operator, h.rentalId!, { depotId: h.depotId, targetStatus: target });
    // Recolhimento aberto da moto deixa de valer (ela está no galpão).
    await this.prisma.fieldTask.updateMany({ where: { vehicleId: h.vehicleId, type: 'collect', status: { notIn: ['done', 'canceled'] } }, data: { status: 'canceled' } });
    // Só repetição ou moto offline (sem transição no fechamento) precisam da colocação à parte.
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: h.vehicleId }, select: { depotId: true, status: true } });
    if (vehicle?.depotId !== h.depotId || vehicle.status === 'offline' || vehicle.status === 'awaiting_pickup') await this.placeAtDepot(h, target);
    return this.view(h);
  }

  /** Repetição/offline: `free` (ou `maintenance` com item problemático) + `depotId`, sem passar por `free` sem galpão. */
  private async placeAtDepot(h: HandoverRow, target: 'free' | 'maintenance'): Promise<void> {
    const busy = await this.prisma.rental.findFirst({ where: { vehicleId: h.vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    if (busy) return;
    const moved = await this.prisma.$transaction(async (tx) => {
      const placed = await tx.vehicle.updateMany({
        where: { id: h.vehicleId, status: { in: ['free', 'awaiting_pickup', 'maintenance'] } },
        data: { status: target, depotId: h.depotId },
      });
      if (placed.count === 0) {
        // Offline: volta ao status certo quando reconectar.
        await tx.vehicle.updateMany({ where: { id: h.vehicleId, status: 'offline' }, data: { depotId: h.depotId, statusBeforeOffline: target } });
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
    return this.view(updated);
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

  /** start() desta entrega ainda no meio (moto reivindicada com a caução da reserva, marcador `RentalStart` presente). */
  private async startInFlight(vehicleId: string, depositId: string): Promise<boolean> {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
    if (v?.status !== 'rented') return false;
    return !!(await this.prisma.rentalStart.findFirst({ where: { vehicleId, depositId }, select: { rentalId: true } }));
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
    return this.view(h);
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
    return { ...page, items: await Promise.all(page.items.map((r) => this.view(r, names))) };
  }

  private async operatorNames(ids: string[]): Promise<Map<string, string | undefined>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const staff = await this.prisma.staffUser.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(staff.map((s) => [s.id, firstName(s.name)]));
  }

  private async view(h: HandoverRow, names?: Map<string, string | undefined>) {
    const operatorFirstName = names ? names.get(h.operatorId) : (await this.operatorNames([h.operatorId])).get(h.operatorId);
    const photoUrls = await Promise.all(
      h.photoKeys.map(async (key) => (await this.storage.presignGet({ bucket: this.cfg.buckets.returnPhotos, key, expiresInSeconds: PHOTO_URL_TTL_SECONDS })).url),
    );
    return toHandover(h, { operatorFirstName, photoUrls });
  }

  private async rentalOf(rentalId: string) {
    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, include: { vehicle: true } });
    if (!rental) throw handoverNotFound();
    return toRental(rental);
  }

  private emitUpdated(ev: HandoverUpdatedEvent): void {
    this.events.emit(EV.HANDOVER_UPDATED, ev);
  }
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
