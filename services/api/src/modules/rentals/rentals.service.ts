import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Prisma, Rental, Vehicle } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { assertVehicleNotInUse } from '../../common/vehicle-in-use';
import { EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, distanceM } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { isStaff, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import type { PriceBreakdown, PriceSnapshot } from '../pricing/pricing.service';
import type { ListRentalsQuery, LocationShareDto, RatingDto, SwapVehicleDto, WellbeingDto } from './rentals.dto';
import { toRental, toRentalEvent } from './rentals.mapper';
import { receiptLinks } from '../payments/receipts/receipt-links';

export const SWAP_MAX_DISTANCE_M = 200;
type RentalWithVehicle = Rental & { vehicle: Vehicle };

/** Leitura e ações do aluguel em andamento (pausa, retomada, troca, foto, avaliação, SOS, "você está bem?"). */
@Injectable()
export class RentalsService {
  private readonly logger = new Logger('RentalsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CommandsService,
    private readonly alerts: AlertsService,
    private readonly events: EventEmitter2,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Cliente só enxerga os próprios aluguéis (404 para os demais, sem revelar existência). */
  private async loadFor(user: Principal, id: string): Promise<RentalWithVehicle> {
    const r = await this.prisma.rental.findUnique({ where: { id }, include: { vehicle: true } });
    if (!r || (!isStaff(user) && r.customerId !== user.customerId)) throw notFound('Aluguel não encontrado.');
    return r as RentalWithVehicle;
  }

  async list(user: Principal, q: ListRentalsQuery) {
    const where: Prisma.RentalWhereInput = {};
    if (isStaff(user)) {
      if (q.customerId) where.customerId = q.customerId;
      if (q.vehicleId) where.vehicleId = q.vehicleId;
    } else {
      where.customerId = user.customerId;
    }
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.startedAt = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(q.to) } : {}) };
    const rows = await this.prisma.rental.findMany({
      where,
      include: { vehicle: { select: { code: true } } },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(q),
    });
    return toPage(rows, q, (r) => toRental(r));
  }

  async current(customerId: string) {
    const r = await this.prisma.rental.findFirst({
      where: { customerId, status: { in: OPEN_RENTAL_STATUSES } },
      include: { vehicle: { select: { code: true } } },
      orderBy: { startedAt: 'desc' },
    });
    return r ? { rental: toRental(r) } : {};
  }

  async get(user: Principal, id: string) {
    return toRental(await this.loadFor(user, id));
  }

  async events_(user: Principal, id: string) {
    await this.loadFor(user, id);
    const events = await this.prisma.rentalEvent.findMany({ where: { rentalId: id }, orderBy: { at: 'asc' } });
    return { items: events.map(toRentalEvent) };
  }

  async pause(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'active') throw conflict('rental-not-active', 'Só é possível pausar um aluguel em andamento.');
    await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'lock', reason: 'Pausa do aluguel', actor: user, context: { rentalId: id, purpose: 'rental_pause' }, auditAction: 'rental.pause' });
    const moved = await this.prisma.rental.updateMany({ where: { id, status: 'active' }, data: { status: 'paused', pausedAt: new Date() } });
    if (moved.count === 0) throw conflict('rental-not-active', 'Só é possível pausar um aluguel em andamento.');
    await this.prisma.vehicle.updateMany({ where: { id: r.vehicleId, status: 'rented' }, data: { status: 'paused' } });
    await this.prisma.rentalEvent.create({ data: { rentalId: id, type: 'paused', actorType: 'customer', actorId: user.customerId } });
    return this.afterChange(id, r.vehicleId, 'paused');
  }

  async resume(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'paused') throw conflict('rental-not-active', 'Só é possível retomar um aluguel pausado.');
    const cmd = await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'unlock', reason: 'Retomada do aluguel', actor: user, context: { rentalId: id, purpose: 'rental_resume' }, auditAction: 'rental.resume' });
    // Trava da equipe/sistema (cerca, hold, modo roubada): o cliente não desfaz; o aluguel continua pausado.
    if (cmd.statusReason === 'locked_by_staff') throw conflict('vehicle-locked-by-staff', 'A moto foi bloqueada pela equipe. Fale com o suporte.');
    const pausedFor = r.pausedAt ? Math.floor((Date.now() - r.pausedAt.getTime()) / 1000) : 0;
    const moved = await this.prisma.rental.updateMany({
      where: { id, status: 'paused' },
      data: { status: 'active', pausedAt: null, pausedSecondsAcc: r.pausedSecondsAcc + pausedFor },
    });
    if (moved.count === 0) throw conflict('rental-not-active', 'Só é possível retomar um aluguel pausado.');
    await this.prisma.vehicle.updateMany({ where: { id: r.vehicleId, status: 'paused' }, data: { status: 'rented' } });
    await this.prisma.rentalEvent.create({ data: { rentalId: id, type: 'resumed', actorType: 'customer', actorId: user.customerId } });
    return this.afterChange(id, r.vehicleId, 'rented');
  }

  async swap(user: Principal, id: string, dto: SwapVehicleDto) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'active' && r.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    // Revisão final item 2: a trava da equipe/sistema na moto ATUAL (cerca, hold, modo roubada) não se contorna com troca,
    // nem com incidente aberto: o cliente fala com o suporte.
    if (await this.commands.isLockedByStaff(r.vehicle)) throw conflict('vehicle-locked-by-staff', 'A moto foi bloqueada pela equipe. Fale com o suporte.');
    const target = await this.prisma.vehicle.findUnique({ where: { id: dto.newVehicleId }, include: { vehicleModel: { select: { pricePerMinuteCents: true } } } });
    if (!target) throw notFound('Moto não encontrada.');
    if (target.id === r.vehicleId || target.status !== 'free') throw conflict('vehicle-unavailable', 'A nova moto não está disponível.');
    // Mesmas guardas do início do aluguel: sem aluguel/reserva, não fixa de outro plano (item 11) e online.
    await assertVehicleNotInUse(this.prisma, target.id);
    await assertNotFixedForOther(this.prisma, target.id, r.customerId);
    if (target.online === false || (await this.iot.getLiveState(target.thingName).catch(() => null))?.online === false) {
      throw conflict('vehicle-offline', 'A nova moto está sem conexão agora. Escolha outra moto.');
    }
    // Auditoria item adiado 1: o unlock do cliente na moto nova seria recusado (trava da equipe/sistema, hold, modo roubada).
    if (await this.commands.isLockedByStaff(target)) throw conflict('vehicle-unavailable', 'A moto escolhida está bloqueada pela equipe.');
    await this.assertSwapPrice(r, target.vehicleModel?.pricePerMinuteCents ?? null);
    const live = await this.iot.getLiveState(r.vehicle.thingName).catch(() => null);
    const here = live ? { lat: live.lat, lng: live.lng } : { lat: r.vehicle.lat, lng: r.vehicle.lng };
    if (distanceM(here, target) > SWAP_MAX_DISTANCE_M) {
      throw unprocessable('validation-error', `A nova moto precisa estar a até ${SWAP_MAX_DISTANCE_M} m.`);
    }
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({ where: { id: target.id, status: 'free' }, data: { status: r.status === 'paused' ? 'paused' : 'rented' } });
      if (claimed.count === 0) throw conflict('vehicle-unavailable', 'A nova moto não está disponível.');
      // Só troca se o aluguel ainda estiver no MESMO status e na moto lida acima: o status da moto nova e a decisão de
      // destravar dependem de r.status (revisão final item 1 — corrida com pausa/retomada).
      const moved = await tx.rental.updateMany({
        where: { id, status: r.status, vehicleId: r.vehicleId },
        data: { vehicleId: target.id, speedLimitKmh: target.speedLimitKmh },
      });
      if (moved.count !== 1) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
      await tx.vehicle.update({ where: { id: r.vehicleId }, data: { status: 'maintenance' } });
      await tx.rentalEvent.create({
        data: { rentalId: id, type: 'vehicle_swapped', actorType: 'customer', actorId: user.customerId, message: dto.reason, data: compact({ fromVehicleId: r.vehicleId, toVehicleId: target.id, incidentId: dto.incidentId }) },
      });
    });
    await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'lock', reason: `Troca de moto: ${dto.reason}`, actor: user, context: { rentalId: id, purpose: 'rental_swap' }, auditAction: 'rental.swap' });
    if (r.status === 'active') {
      await this.commands.dispatch({ vehicleId: target.id, type: 'unlock', reason: 'Troca de moto', actor: user, context: { rentalId: id, purpose: 'rental_swap' }, auditAction: 'rental.swap' });
    }
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: r.vehicleId, status: 'maintenance', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    return this.afterChange(id, target.id, r.status === 'paused' ? 'paused' : 'rented');
  }

  /**
   * Auditoria item 15: o preço do aluguel fica congelado no snapshot do início, então a troca só vale para moto de
   * mesmo preço por minuto ou mais barata. Plano por minuto compara com o snapshot (moto sem modelo usaria o preço do
   * plano); os demais planos comparam o modelo da moto alvo com o da moto atual.
   */
  private async assertSwapPrice(r: RentalWithVehicle, targetModelPrice: number | null): Promise<void> {
    const snap = r.priceSnapshot as unknown as PriceSnapshot;
    let reference: number | null;
    let targetPrice: number | null = targetModelPrice;
    if (snap.unit === 'minute') {
      reference = snap.unitPriceCents;
      if (targetPrice === null) {
        const plan = await this.prisma.pricingPlan.findFirst({ where: { code: snap.planCode }, select: { unitPriceCents: true } });
        targetPrice = plan?.unitPriceCents ?? Number.POSITIVE_INFINITY;
      }
    } else {
      const current = r.vehicle.vehicleModelId
        ? await this.prisma.vehicleModel.findUnique({ where: { id: r.vehicle.vehicleModelId }, select: { pricePerMinuteCents: true } })
        : null;
      reference = current?.pricePerMinuteCents ?? null;
    }
    if (reference !== null && targetPrice !== null && targetPrice > reference) {
      throw conflict('vehicle-unavailable', 'Só é possível trocar por uma moto de mesmo preço ou mais barata.');
    }
  }

  async returnPhotoUpload(user: Principal, id: string, contentType: string) {
    const r = await this.loadFor(user, id);
    if (!OPEN_RENTAL_STATUSES.includes(r.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    const upload = await presignedUpload(this.storage, this.cfg.buckets.returnPhotos, `returns/${id}`, contentType);
    await this.prisma.rental.update({ where: { id }, data: { returnPhotoUploadKey: upload.objectKey } });
    return upload;
  }

  async track(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    const points = await this.prisma.trackPoint.findMany({ where: { rentalId: id, expiresAt: { gt: new Date() } }, orderBy: { recordedAt: 'asc' } });
    return {
      rentalId: id,
      vehicleId: r.vehicleId,
      points: points.map((p) => ({ lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, recordedAt: p.recordedAt.toISOString() })),
    };
  }

  async receipt(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'ended' && r.status !== 'force_ended') throw conflict('rental-not-active', 'O recibo fica disponível depois do encerramento.');
    const [customer, payment, track] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: r.customerId }, select: { name: true } }),
      r.paymentId ? this.prisma.payment.findUnique({ where: { id: r.paymentId } }) : null,
      this.track(user, id),
    ]);
    const endedAt = r.endedAt ?? r.updatedAt;
    // QA-11: link de 15 min gerado agora a partir da chave do objeto (nada que expire fica gravado).
    const pdfUrl = payment ? (await receiptLinks(this.prisma, this.storage, [payment.id])).get(payment.id) : undefined;
    return compact({
      rentalId: r.id,
      number: `VLT-${endedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${r.id.slice(0, 8).toUpperCase()}`,
      issuedAt: endedAt.toISOString(),
      customerName: customer?.name ?? undefined,
      vehicleCode: r.vehicle.code,
      planCode: r.planCode,
      coverage: r.coverage,
      startedAt: r.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: Math.max(0, Math.floor(((r.endRequestedAt ?? endedAt).getTime() - r.startedAt.getTime()) / 1000)),
      breakdown: (r.breakdown as unknown as PriceBreakdown) ?? { lines: [], subtotalCents: 0, discountCents: 0, insuranceCents: 0, feesCents: 0, totalCents: r.costCents },
      paymentMethod: payment?.method,
      cardLast4: payment?.cardLast4 ?? undefined,
      pdfUrl,
      track: track.points,
    });
  }

  async rate(user: Principal, id: string, dto: RatingDto) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'ended' && r.status !== 'force_ended') throw conflict('rental-not-active', 'Avalie depois do encerramento.');
    await this.prisma.rental.update({ where: { id }, data: { rating: dto.stars, ratingComment: dto.comment ?? null } });
    return toRental(await this.loadFor(user, id));
  }

  async shareLocation(user: Principal, id: string, dto: LocationShareDto) {
    const r = await this.loadFor(user, id);
    if (!OPEN_RENTAL_STATUSES.includes(r.status)) throw conflict('rental-not-active', 'Só é possível compartilhar durante o aluguel.');
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + (dto.durationMinutes ?? 60) * 60 * 1000);
    await this.prisma.locationShare.create({ data: { rentalId: id, token, expiresAt } });
    return { url: `${this.cfg.publicShareBaseUrl.replace(/\/$/, '')}/${token}`, expiresAt: expiresAt.toISOString() };
  }

  async wellbeing(user: Principal, id: string, dto: WellbeingDto): Promise<void> {
    const r = await this.loadFor(user, id);
    await this.prisma.rental.update({ where: { id }, data: { wellbeingCheckDueAt: null } });
    if (!dto.ok) {
      await this.alerts.create(
        { type: 'customer_not_ok', priority: 'critical', message: 'Cliente informou que não está bem após queda.', vehicleId: r.vehicleId, rentalId: id, lat: r.vehicle.lat, lng: r.vehicle.lng },
        { dedupe: false },
      );
    }
  }

  /** Sem resposta ao "você está bem?" em 60 s → alerta `customer_not_ok` (critical). */
  @Interval('wellbeing-timeout', 10_000)
  async wellbeingJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const overdue = await this.prisma.rental.findMany({ where: { wellbeingCheckDueAt: { lt: new Date() } }, include: { vehicle: true }, take: 50 });
    for (const r of overdue) {
      const cleared = await this.prisma.rental.updateMany({ where: { id: r.id, wellbeingCheckDueAt: { not: null } }, data: { wellbeingCheckDueAt: null } });
      if (cleared.count === 0) continue;
      await this.alerts.create(
        { type: 'customer_not_ok', priority: 'critical', message: 'Sem resposta ao "Você está bem?" após queda.', vehicleId: r.vehicleId, rentalId: r.id, lat: r.vehicle.lat, lng: r.vehicle.lng },
        { dedupe: false },
      );
    }
  }

  /** `rental.updated` a cada 30 s com o aluguel ativo/pausado (tempo e custo parcial). */
  @Interval('rental-ticker', 30_000)
  async tickerJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const open = await this.prisma.rental.findMany({ where: { status: { in: ['active', 'paused'] } }, take: 1000 });
    for (const r of open) this.emitRental(r);
  }

  private async afterChange(id: string, vehicleId: string, vehicleStatus: VehicleStatusChangedEvent['status']) {
    const r = await this.prisma.rental.findUnique({ where: { id }, include: { vehicle: true } });
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status: vehicleStatus, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.emitRental(r!);
    return toRental(r!);
  }

  private emitRental(r: Rental): void {
    const mapped = toRental(r);
    const ev: RentalChangedEvent = {
      rentalId: r.id, customerId: r.customerId, vehicleId: r.vehicleId, status: r.status,
      elapsedSeconds: mapped.elapsedSeconds, costCents: mapped.costCents, ts: new Date().toISOString(),
    };
    this.events.emit(EV.RENTAL_CHANGED, ev);
  }
}
