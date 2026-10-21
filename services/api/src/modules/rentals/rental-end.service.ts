import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Prisma, Rental, Vehicle } from '@prisma/client';
import { CommandChangedEvent, EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isAdmin, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { FeeCharge, PriceSnapshot, PricingService } from '../pricing/pricing.service';
import { ZonesService } from '../zones/zones.service';
import { rentalTimes, toRental } from './rentals.mapper';

export const FORCE_END_FEE_CODE = 'force_end_outside_return_zone';
export const FORCE_END_FEE_DEFAULT_CENTS = 1500;
/** Intervalo mínimo entre tentativas de travamento de um aluguel em `ending`. */
export const END_RETRY_INTERVAL_MS = 30_000;
const SYSTEM = { system: true as const, name: 'encerramento' };

type RentalWithVehicle = Rental & { vehicle: Vehicle };

/**
 * Encerramento: só em zona `return`, com a foto emitida, e com o rastreador confirmando "parada e travada".
 * Sem confirmação → `ending` (202) e retentativa. Liquidação única por aluguel (chave `rental-settlement:<id>`).
 */
@Injectable()
export class RentalEndService {
  private readonly logger = new Logger('RentalEndService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(RENTAL_BILLING) private readonly billing: RentalBillingPort,
    private readonly commands: CommandsService,
    private readonly zones: ZonesService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  private async load(rentalId: string): Promise<RentalWithVehicle> {
    const r = await this.prisma.rental.findUnique({ where: { id: rentalId }, include: { vehicle: true } });
    if (!r) throw notFound('Aluguel não encontrado.');
    return r as RentalWithVehicle;
  }

  /** Posição atual: estado ao vivo do rastreador ou a última posição gravada. */
  private async positionOf(vehicle: Vehicle): Promise<{ lat: number; lng: number }> {
    try {
      const live = await this.iot.getLiveState(vehicle.thingName);
      if (live) return { lat: live.lat, lng: live.lng };
    } catch (err) {
      this.logger.warn({ msg: 'live_state_failed', vehicleId: vehicle.id, error: (err as Error).message });
    }
    return { lat: vehicle.lat, lng: vehicle.lng };
  }

  async end(customerId: string, rentalId: string, dto: { returnPhotoObjectKey: string }) {
    const rental = await this.load(rentalId);
    if (rental.customerId !== customerId) throw notFound('Aluguel não encontrado.');
    if (rental.status === 'ending') return { status: 202 as const, rental: toRental(rental) };
    if (rental.status !== 'active' && rental.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    if (!rental.returnPhotoUploadKey || dto.returnPhotoObjectKey !== rental.returnPhotoUploadKey) {
      throw unprocessable('return-photo-missing', 'Envie a foto da moto estacionada antes de encerrar.');
    }
    const zone = await this.zones.findContaining(await this.positionOf(rental.vehicle), 'return');
    if (!zone) throw unprocessable('rental-outside-return-zone', 'Estacione numa zona de devolução para encerrar.');

    const now = new Date();
    const closedPause = rental.status === 'paused' && rental.pausedAt ? Math.floor((now.getTime() - rental.pausedAt.getTime()) / 1000) : 0;
    const moved = await this.prisma.rental.updateMany({
      where: { id: rentalId, status: { in: ['active', 'paused'] } },
      data: {
        status: 'ending',
        endRequestedAt: now,
        pausedAt: null,
        pausedSecondsAcc: rental.pausedSecondsAcc + closedPause,
        endZoneId: zone.id,
        returnPhotoObjectKey: dto.returnPhotoObjectKey,
        endLastAttemptAt: now,
        endAttempts: { increment: 1 },
      },
    });
    if (moved.count === 0) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    await this.prisma.rentalEvent.create({ data: { rentalId, type: 'ending', actorType: 'customer', actorId: customerId, data: { zoneId: zone.id } } });

    const confirmed = await this.requestLock(rentalId, rental.vehicleId, 'rental_end');
    if (confirmed) return { status: 200 as const, rental: await this.finalize(rentalId, 'ended') };
    const current = await this.load(rentalId);
    this.emitRental(current);
    return { status: 202 as const, rental: toRental(current) };
  }

  async forceEnd(actor: Principal, rentalId: string, reason: string) {
    if (!reason || reason.trim().length < 3) throw badRequest('Informe o motivo do encerramento forçado.', [{ field: 'reason', message: 'obrigatório' }]);
    const rental = await this.load(rentalId);
    if (!['active', 'paused', 'ending'].includes(rental.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    const zone = await this.zones.findContaining(await this.positionOf(rental.vehicle), 'return');
    if (!zone && !isAdmin(actor)) {
      throw forbidden('Fora da zona de devolução, só admin pode encerrar à força.', 'force-end-outside-zone-requires-admin');
    }
    const fees: FeeCharge[] = zone
      ? []
      : [{ code: FORCE_END_FEE_CODE, description: 'Encerramento fora da zona de devolução', amountCents: await this.pricing.feeAmount(FORCE_END_FEE_CODE, FORCE_END_FEE_DEFAULT_CENTS) }];

    const now = new Date();
    const closedPause = rental.status === 'paused' && rental.pausedAt ? Math.floor((now.getTime() - rental.pausedAt.getTime()) / 1000) : 0;
    await this.prisma.rental.updateMany({
      where: { id: rentalId, status: { in: ['active', 'paused', 'ending'] } },
      data: {
        endRequestedAt: rental.endRequestedAt ?? now,
        pausedAt: null,
        pausedSecondsAcc: rental.pausedSecondsAcc + closedPause,
        forceEndReason: reason.trim(),
        forcedEndById: actor.userId,
        endZoneId: zone?.id ?? null,
      },
    });
    await this.audit.record({ actor, action: 'rental.force_end', entityType: 'Rental', entityId: rentalId, reason: reason.trim(), metadata: { outsideReturnZone: !zone } });
    // Bloqueio seguro (rampa até parar) — o encerramento não espera a confirmação.
    await this.requestLock(rentalId, rental.vehicleId, 'rental_force_end').catch(() => false);
    return this.finalize(rentalId, 'force_ended', { fees, actor });
  }

  /** Pede o travamento (bloqueio seguro). `true` se o rastreador confirmou na hora. */
  private async requestLock(rentalId: string, vehicleId: string, purpose: 'rental_end' | 'rental_force_end'): Promise<boolean> {
    try {
      const cmd = await this.commands.dispatch({
        vehicleId,
        type: 'lock',
        reason: purpose === 'rental_end' ? 'Encerramento do aluguel' : 'Encerramento forçado do aluguel',
        actor: SYSTEM,
        context: { rentalId, purpose },
        auditAction: 'rental.lock',
      });
      return cmd.status === 'confirmed';
    } catch (err) {
      this.logger.error({ msg: 'rental_lock_request_failed', rentalId, error: (err as Error).message });
      return false;
    }
  }

  /**
   * Fecha o aluguel e liquida **uma única vez**: a transição de status é condicional (`updateMany` com status em andamento),
   * então chamadas repetidas/concorrentes só liquidam na primeira.
   */
  async finalize(rentalId: string, kind: 'ended' | 'force_ended', opts: { fees?: FeeCharge[]; actor?: Principal } = {}) {
    const rental = await this.load(rentalId);
    if (rental.status === 'ended' || rental.status === 'force_ended') return toRental(rental);

    const now = new Date();
    const timing = rentalTimes({ ...rental, endRequestedAt: rental.endRequestedAt ?? now });
    const breakdown = this.pricing.calculate({
      snapshot: rental.priceSnapshot as unknown as PriceSnapshot,
      elapsedSeconds: timing.elapsedSeconds,
      pausedSeconds: timing.pausedSeconds,
      fees: opts.fees,
    });
    const claimed = await this.prisma.rental.updateMany({
      where: { id: rentalId, status: { in: ['active', 'paused', 'ending'] } },
      data: {
        status: kind,
        endedAt: now,
        endRequestedAt: rental.endRequestedAt ?? now,
        pausedAt: null,
        pausedSecondsAcc: timing.pausedSeconds,
        costCents: breakdown.totalCents,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) return toRental(await this.load(rentalId));

    await this.prisma.vehicle.updateMany({ where: { id: rental.vehicleId, status: { in: ['rented', 'paused'] } }, data: { status: 'free' } });
    await this.prisma.rentalEvent.create({
      data: {
        rentalId,
        type: kind,
        actorType: opts.actor ? 'staff' : kind === 'ended' ? 'customer' : 'system',
        actorId: opts.actor?.userId ?? (kind === 'ended' ? rental.customerId : null),
        data: { costCents: breakdown.totalCents },
      },
    });

    try {
      const settlement = await this.billing.settle({ rentalId, amountCents: breakdown.totalCents, idempotencyKey: `rental-settlement:${rentalId}` });
      await this.prisma.rental.update({ where: { id: rentalId }, data: { paymentId: settlement.paymentId } });
    } catch (err) {
      // A cobrança é reprocessada pela Task 5 (inadimplência); o aluguel continua encerrado.
      this.logger.error({ msg: 'rental_settlement_failed', rentalId, error: (err as Error).message });
    }

    const final = await this.load(rentalId);
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: rental.vehicleId, status: 'free', ts: now.toISOString() } satisfies VehicleStatusChangedEvent);
    this.emitRental(final);
    this.logger.log({ msg: 'rental_finalized', rentalId, status: kind, costCents: breakdown.totalCents });
    return toRental(final);
  }

  /** Confirmação tardia do travamento (via `iot.command-updated` → `command.changed`). */
  @OnEvent(EV.COMMAND_CHANGED, { async: true, promisify: true })
  async onCommandChanged(ev: CommandChangedEvent): Promise<void> {
    const purpose = ev.payload?.purpose;
    const rentalId = ev.payload?.rentalId as string | undefined;
    if (ev.type !== 'lock' || purpose !== 'rental_end' || !rentalId || ev.status !== 'confirmed') return;
    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { status: true } });
    if (rental?.status !== 'ending') return;
    await this.finalize(rentalId, 'ended').catch((err) => this.logger.error({ msg: 'rental_finalize_failed', rentalId, error: (err as Error).message }));
  }

  /** Retentativa periódica dos aluguéis em `ending` (moto ainda andando, offline, timeout). */
  @Interval('rental-end-retry', 15_000)
  async retryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryEnding().catch((err) => this.logger.error({ msg: 'rental_end_retry_failed', error: (err as Error).message }));
  }

  async retryEnding(): Promise<void> {
    const cutoff = new Date(Date.now() - END_RETRY_INTERVAL_MS);
    const pending = await this.prisma.rental.findMany({
      where: { status: 'ending', OR: [{ endLastAttemptAt: null }, { endLastAttemptAt: { lt: cutoff } }] },
      take: 100,
    });
    for (const r of pending) {
      await this.prisma.rental.updateMany({
        where: { id: r.id, status: 'ending' },
        data: { endLastAttemptAt: new Date(), endAttempts: { increment: 1 } },
      });
      const confirmed = await this.requestLock(r.id, r.vehicleId, 'rental_end');
      if (confirmed) await this.finalize(r.id, 'ended');
      else this.logger.warn({ msg: 'rental_end_lock_pending', rentalId: r.id, attempts: r.endAttempts + 1 });
    }
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
