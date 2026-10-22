import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Handover, Prisma, Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { EV, HandoverPendingEvent, HandoverUpdatedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from '../../common/idempotency/idempotency.store';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { isStaff, type Principal } from '../auth/principal';
import { isUniqueViolation } from '../payments/payment-state.service';
import { RentalEndService } from '../rentals/rental-end.service';
import { RentalStartService } from '../rentals/rental-start.service';
import { toRental } from '../rentals/rentals.mapper';
import { PICKUP_CODE_SECRET, verifyPickupCode } from '../reservations/pickup-code';
import { SupportService } from '../support/support.service';
import type { HandoverCreateDto, ListHandoversQuery } from './handovers.dto';
import { type ChecklistItem, firstName, toHandover } from './handovers.mapper';

/** Links das fotos da entrega: 24 h (contrato). */
const PHOTO_URL_TTL_SECONDS = 24 * 60 * 60;
/** Trava do aceite por entrega (aceites concorrentes com chaves diferentes não disputam a mesma moto). */
const ACCEPT_LOCK_SCOPE = 'handover-accept';

type HandoverRow = Handover & { vehicle?: Pick<Vehicle, 'code'> | null };

const handoverNotFound = () => notFound('Entrega não encontrada.');
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
  ) {}

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
        const declined = err.getStatus() === 402;
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
    try {
      await this.support.createConversation(customer, { subject: `Problema na entrega da moto ${h.vehicle?.code ?? ''}`.trim(), message: reason.trim() });
    } catch (err) {
      this.logger.error({ msg: 'handover_dispute_ticket_failed', handoverId: id, error: (err as Error).message });
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
    const rental = await this.prisma.rental.findUnique({ where: { id: h.rentalId! }, select: { status: true } });
    const wasOpen = !!rental && OPEN_RENTAL_STATUSES.includes(rental.status);
    if (wasOpen) await this.ender.endAtDepot(operator, h.rentalId!);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: h.vehicleId }, select: { depotId: true } });
    if (wasOpen || vehicle?.depotId !== h.depotId) await this.placeAtDepot(h);
    return this.view(h);
  }

  /** Moto no galpão: `free` (ou `maintenance` com item problemático) + `depotId`; recolhimento aberto deixa de valer. */
  private async placeAtDepot(h: HandoverRow): Promise<void> {
    const problem = ((h.checklist ?? []) as unknown as ChecklistItem[]).some((i) => i.ok === false);
    const target = problem ? 'maintenance' : 'free';
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
      await tx.fieldTask.updateMany({ where: { vehicleId: h.vehicleId, type: 'collect', status: { notIn: ['done', 'canceled'] } }, data: { status: 'canceled' } });
      return placed.count > 0;
    });
    if (moved) this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: h.vehicleId, status: target, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.logger.log({ msg: 'handover_vehicle_at_depot', handoverId: h.id, vehicleId: h.vehicleId, depotId: h.depotId, status: target });
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

function checklistJson(items: HandoverCreateDto['checklist']): Prisma.InputJsonValue {
  return items.map((i) => (i.note !== undefined ? { code: i.code, ok: i.ok, note: i.note } : { code: i.code, ok: i.ok }));
}
