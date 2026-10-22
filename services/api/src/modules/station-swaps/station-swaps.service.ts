import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { Prisma, type StationSwap, type StationSwapEndReason, type StationSwapStatus } from '@prisma/client';
import { EV, type StationSwapUpdatedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { STATION_GATEWAY, stationIdFromThing, stationThingName, type StationEvent, type StationGateway } from '../../ports/station-gateway.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { isStaff, type Principal } from '../auth/principal';
import { CHARGED_PCT } from '../batteries/batteries.mapper';
import { PricingService } from '../pricing/pricing.service';
import { verifyStationCode } from './station-code';
import {
  CANCELABLE_SWAP_STATUSES, isStationOpen, nextStepAfter, OPEN_SWAP_STATUSES, SWAP_FEE_CODE, SWAP_FEE_DEFAULT_CENTS, swapFeeCents, vehicleStationary,
  withinSwapRange,
} from './station-swap.rules';
import type { CreateStationSwapDto, ListStationSwapsQuery } from './station-swaps.dto';
import { toStationSwap } from './station-swaps.mapper';

export const STATION_SWAP_CONFIG = Symbol('STATION_SWAP_CONFIG');
export interface StationSwapConfig {
  /** Prazo de cada etapa (padrão 3 min). */
  stepTimeoutMs: number;
  qrSecret: string;
}

/** Depois de um `release_timeout`, por quanto tempo a bateria ainda conta como prometida (a estação pode liberar atrasada). */
export const RELEASE_LATE_WINDOW_MS = 30 * 60 * 1000;
const noBattery = () => unprocessable('station-unavailable', 'Esta estação está sem bateria carregada agora.');
const stationNotFound = () => new ProblemException(404, 'station-not-found', 'QR inválido ou estação não encontrada.');
const TIMEOUT_TARGET: Partial<Record<StationSwapStatus, { status: StationSwapStatus; reason: StationSwapEndReason }>> = {
  opening_slot: { status: 'failed', reason: 'station_timeout' },
  awaiting_return: { status: 'canceled', reason: 'return_timeout' },
  returned: { status: 'failed', reason: 'release_timeout' },
  releasing: { status: 'failed', reason: 'release_timeout' },
};

/**
 * Troca de bateria pelo cliente numa estação (QR). Regras (spec 2026-10-22): aluguel ativo do próprio cliente, moto parada,
 * celular a ≤ 50 m, estação ativa/aberta/com bateria, uma troca aberta por aluguel, 3 min por etapa, nenhuma bateria liberada
 * sem devolução registrada. Taxa congelada na criação e cobrada no fechamento do aluguel (`battery_swap_fee`).
 * Logs só com ids; a posição do celular é usada só na validação (guarda-se a distância).
 */
@Injectable()
export class StationSwapsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('StationSwapsService');
  /** Fila por troca: eventos da mesma troca são processados um de cada vez, na ordem de chegada. */
  private readonly eventChains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    @Inject(STATION_GATEWAY) private readonly station: StationGateway,
    private readonly events: EventEmitter2,
    private readonly alerts: AlertsService,
    @Inject(STATION_SWAP_CONFIG) private readonly cfg: StationSwapConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.station
      .start((thing, ev) => this.onStationEvent(thing, ev))
      .catch((err) => this.logger.error({ msg: 'station_gateway_start_failed', error: (err as Error).message }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.station.stop();
  }

  /** Trava a linha da estação até o fim da transação e devolve as carregadas disponíveis. */
  private async lockStation(tx: Prisma.TransactionClient, stationId: string): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ availableBatteries: number }>>`SELECT "availableBatteries" FROM "SwapStation" WHERE "id" = ${stationId}::uuid FOR UPDATE`;
    return Number(rows?.[0]?.availableBatteries ?? 0);
  }

  /**
   * Carregadas já prometidas pela estação: trocas em andamento e as que falharam por prazo de liberação há pouco (a estação
   * ainda pode liberar a bateria atrasada, `RELEASE_LATE_WINDOW_MS`).
   */
  private promisedWhere(stationId: string, now: Date): Prisma.StationSwapWhereInput {
    return {
      stationId,
      OR: [
        { status: { in: OPEN_SWAP_STATUSES } },
        { status: 'failed', endReason: 'release_timeout', updatedAt: { gt: new Date(now.getTime() - RELEASE_LATE_WINDOW_MS) } },
      ],
    };
  }

  private deadline(from = new Date()): Date {
    return new Date(from.getTime() + this.cfg.stepTimeoutMs);
  }

  private emit(s: Pick<StationSwap, 'id' | 'customerId' | 'status'>): void {
    this.events.emit(EV.STATION_SWAP_UPDATED, { swapId: s.id, customerId: s.customerId, status: s.status } satisfies StationSwapUpdatedEvent);
  }

  // ───────────── cliente ─────────────

  async create(user: Principal, stationId: string, dto: CreateStationSwapDto, idempotencyKey?: string) {
    const customerId = user.customerId!;
    const decoded = verifyStationCode(dto.stationCode, this.cfg.qrSecret);
    if (!decoded || decoded.stationId !== stationId.toLowerCase()) throw stationNotFound();
    const station = await this.prisma.swapStation.findUnique({ where: { id: stationId } });
    if (!station || station.stationCode !== dto.stationCode) throw stationNotFound();

    if (idempotencyKey) {
      const prev = await this.prisma.stationSwap.findUnique({ where: { customerId_idempotencyKey: { customerId, idempotencyKey } } });
      if (prev) return toStationSwap(prev, { staff: false });
    }

    const rental = await this.prisma.rental.findUnique({ where: { id: dto.rentalId }, include: { vehicle: true } });
    if (!rental || rental.customerId !== customerId) throw notFound('Aluguel não encontrado.');
    if (rental.status !== 'active' && rental.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    const open = await this.prisma.stationSwap.findFirst({ where: { rentalId: rental.id, status: { in: OPEN_SWAP_STATUSES } }, select: { id: true } });
    if (open) throw conflict('swap-open', 'Já existe uma troca de bateria em andamento neste aluguel.');

    const now = new Date();
    if (!station.active) throw unprocessable('station-unavailable', 'Esta estação está desativada.');
    if (!isStationOpen(station, now)) throw unprocessable('station-unavailable', 'Esta estação está fechada agora.');
    // Pré-checagem (ordem das mensagens); a decisão vale na transação com a estação travada, abaixo.
    if (station.availableBatteries - (await this.prisma.stationSwap.count({ where: this.promisedWhere(stationId, now) })) <= 0) throw noBattery();

    const range = withinSwapRange({ lat: dto.lat, lng: dto.lng }, station);
    if (!range.ok) throw unprocessable('too-far', 'Chegue mais perto da estação (até 50 m) para trocar a bateria.');

    const thing = rental.vehicle.thingName;
    const live = await this.iot.getLiveState(thing).catch(() => null);
    const knownSpeedKmh = this.iot.knownSpeedKmh ? await this.iot.knownSpeedKmh(thing).catch(() => null) : null;
    if (!vehicleStationary({ rentalStatus: rental.status, live, knownSpeedKmh })) {
      throw unprocessable('vehicle-moving', 'Pare a moto antes de trocar a bateria.');
    }

    const feeCents = swapFeeCents(rental.planCode, await this.pricing.feeAmount(SWAP_FEE_CODE, SWAP_FEE_DEFAULT_CENTS));
    let swap: StationSwap;
    try {
      // Fix 1 (C1): estoque e inserção serializados por estação (SELECT … FOR UPDATE na estação). Duas requisições pela última
      // bateria: a segunda espera o commit da primeira, recontagem já inclui a troca nova → 422.
      swap = await this.prisma.$transaction(async (tx) => {
        const available = await this.lockStation(tx, stationId);
        const promised = await tx.stationSwap.count({ where: this.promisedWhere(stationId, now) });
        if (available - promised <= 0) throw noBattery();
        return tx.stationSwap.create({
          data: {
            stationId, rentalId: rental.id, customerId, vehicleId: rental.vehicleId, status: 'opening_slot', feeCents, distanceM: range.distanceM,
            expiresAt: this.deadline(now), idempotencyKey: idempotencyKey ?? null,
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        if (idempotencyKey) {
          const prev = await this.prisma.stationSwap.findUnique({ where: { customerId_idempotencyKey: { customerId, idempotencyKey } } });
          if (prev) return toStationSwap(prev, { staff: false });
        }
        throw conflict('swap-open', 'Já existe uma troca de bateria em andamento neste aluguel.');
      }
      throw err;
    }
    this.logger.log({ msg: 'station_swap_created', swapId: swap.id, stationId, rentalId: rental.id, feeCents });
    this.emit(swap);
    await this.station
      .send(stationThingName(stationId), { commandId: `${swap.id}:open_slot`, swapId: swap.id, action: 'open_slot', expectedSerial: rental.vehicle.batterySerial ?? undefined })
      .catch((err) => this.logger.error({ msg: 'station_open_slot_failed', swapId: swap.id, stationId, error: (err as Error).message }));
    return toStationSwap(swap, { staff: false });
  }

  private async load(user: Principal, stationId: string, swapId: string): Promise<StationSwap> {
    const swap = await this.prisma.stationSwap.findUnique({ where: { id: swapId } });
    if (!swap || swap.stationId !== stationId) throw notFound('Troca não encontrada.');
    if (!isStaff(user) && swap.customerId !== user.customerId) throw notFound('Troca não encontrada.');
    return swap;
  }

  async get(user: Principal, stationId: string, swapId: string) {
    return toStationSwap(await this.load(user, stationId, swapId), { staff: isStaff(user) });
  }

  /** Só o dono e só antes de devolver a bateria (depois disso a estação precisa liberar a carregada). */
  async cancel(user: Principal, stationId: string, swapId: string) {
    const swap = await this.load(user, stationId, swapId);
    if (swap.status === 'canceled') return toStationSwap(swap, { staff: false });
    if (!CANCELABLE_SWAP_STATUSES.includes(swap.status)) throw unprocessable('swap-not-cancelable', 'A bateria já foi devolvida; aguarde a estação liberar a carregada.');
    const moved = await this.prisma.stationSwap.updateMany({
      where: { id: swap.id, status: { in: CANCELABLE_SWAP_STATUSES } },
      data: { status: 'canceled', endReason: 'canceled_by_customer' },
    });
    const current = (await this.prisma.stationSwap.findUnique({ where: { id: swap.id } }))!;
    if (!moved.count && current.status !== 'canceled') throw unprocessable('swap-not-cancelable', 'A bateria já foi devolvida; aguarde a estação liberar a carregada.');
    if (moved.count) {
      this.logger.log({ msg: 'station_swap_canceled', swapId: swap.id, stationId });
      this.emit(current);
    }
    return toStationSwap(current, { staff: false });
  }

  // ───────────── painel ─────────────

  async list(stationId: string, q: ListStationSwapsQuery) {
    if (!(await this.prisma.swapStation.findUnique({ where: { id: stationId }, select: { id: true } }))) throw new ProblemException(404, 'station-not-found', 'Estação não encontrada.');
    const where: Prisma.StationSwapWhereInput = { stationId, ...(q.status ? { status: q.status } : {}) };
    const rows = await this.prisma.stationSwap.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, (s) => toStationSwap(s, { staff: true }));
  }

  // ───────────── eventos da estação ─────────────

  private async transition(swap: StationSwap, to: StationSwapStatus, data: Prisma.StationSwapUncheckedUpdateManyInput = {}, tx: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    const moved = await tx.stationSwap.updateMany({ where: { id: swap.id, status: swap.status }, data: { status: to, ...data } });
    return moved.count > 0;
  }

  /**
   * Eventos da estação, em ordem por troca. Sem isso, um `slot_closed` que chega enquanto a transação do
   * `battery_returned` ainda não terminou leria `awaiting_return` e o fechamento se perderia (troca presa em `returned`).
   * Com várias instâncias da API (fila `estacoes` no modo aws) a ordem vem da fila FIFO agrupada por estação (pendência de infra).
   */
  onStationEvent(thing: string, ev: StationEvent): Promise<void> {
    const prev = this.eventChains.get(ev.swapId) ?? Promise.resolve();
    const next = prev.then(() => this.handleStationEvent(thing, ev));
    const settled = next.catch(() => undefined);
    this.eventChains.set(ev.swapId, settled);
    void settled.then(() => {
      if (this.eventChains.get(ev.swapId) === settled) this.eventChains.delete(ev.swapId);
    });
    return next;
  }

  private async handleStationEvent(thing: string, ev: StationEvent): Promise<void> {
    const stationId = stationIdFromThing(thing);
    if (!stationId) return;
    const swap = await this.prisma.stationSwap.findUnique({ where: { id: ev.swapId } });
    if (!swap || swap.stationId !== stationId) {
      this.logger.warn({ msg: 'station_event_unknown_swap', stationId, swapId: ev.swapId, type: ev.type });
      return;
    }
    switch (ev.type) {
      case 'slot_opened':
        return this.onSlotOpened(swap, ev);
      case 'battery_returned':
        return this.onBatteryReturned(swap, ev);
      case 'slot_closed':
        return this.onSlotClosed(swap);
      case 'battery_released':
        return this.onBatteryReleased(swap, ev);
    }
  }

  private async onSlotOpened(swap: StationSwap, ev: StationEvent): Promise<void> {
    const next = nextStepAfter(swap.status, 'slot_opened');
    if (!next) return;
    if (await this.transition(swap, next, { slotNumber: ev.slotNumber, expiresAt: this.deadline() })) this.emit({ ...swap, status: next });
  }

  /**
   * Devolução: o estoque é atualizado sempre que a estação recebe a bateria (mesmo com a troca já cancelada — ela está
   * fisicamente lá), uma única vez por troca. A troca só avança se ainda esperava a devolução.
   */
  private async onBatteryReturned(swap: StationSwap, ev: StationEvent): Promise<void> {
    const serial = ev.serial!;
    const pct = ev.pct!;
    const next = nextStepAfter(swap.status, 'battery_returned');
    const advanced = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.stationSwap.updateMany({ where: { id: swap.id, returnedSerial: null }, data: { returnedSerial: serial, returnedPct: pct } });
      if (!claimed.count) return false;
      await tx.battery.upsert({
        where: { serial },
        create: { serial, chargePct: pct, status: 'charging', stationId: swap.stationId },
        update: { status: 'charging', stationId: swap.stationId, vehicleId: null, holderId: null, chargePct: pct },
      });
      return next ? this.transition(swap, next, { expiresAt: this.deadline() }, tx) : false;
    });
    if (advanced && next) {
      this.logger.log({ msg: 'station_swap_returned', swapId: swap.id, stationId: swap.stationId });
      this.emit({ ...swap, status: next });
    }
  }

  private async onSlotClosed(swap: StationSwap): Promise<void> {
    const next = nextStepAfter(swap.status, 'slot_closed');
    if (!next) return;
    if (next === 'canceled') {
      if (await this.transition(swap, 'canceled', { endReason: 'slot_closed_without_return' })) this.emit({ ...swap, status: 'canceled' });
      return;
    }
    // releasing: só depois da devolução registrada (returned).
    if (!(await this.transition(swap, 'releasing', { expiresAt: this.deadline() }))) return;
    this.emit({ ...swap, status: 'releasing' });
    const hint = await this.prisma.battery.findFirst({
      where: { stationId: swap.stationId, status: 'in_station', chargePct: { gte: CHARGED_PCT } },
      orderBy: [{ chargePct: 'desc' }, { cycleCount: 'asc' }],
      select: { serial: true },
    });
    await this.station
      .send(stationThingName(swap.stationId), { commandId: `${swap.id}:release_battery`, swapId: swap.id, action: 'release_battery', serialHint: hint?.serial })
      .catch((err) => this.logger.error({ msg: 'station_release_failed', swapId: swap.id, stationId: swap.stationId, error: (err as Error).message }));
  }

  /**
   * Liberação: completa uma troca em `releasing` (ou que falhou por prazo depois da devolução — o cliente recebeu a bateria).
   * Estoque: a estação perde uma carregada; a liberada entra na moto (+1 ciclo) e vira a bateria da moto.
   */
  private async onBatteryReleased(swap: StationSwap, ev: StationEvent): Promise<void> {
    const lateAfterTimeout = swap.status === 'failed' && swap.endReason === 'release_timeout';
    if (nextStepAfter(swap.status, 'battery_released') !== 'completed' && !lateAfterTimeout) {
      this.logger.warn({ msg: 'station_release_ignored', swapId: swap.id, stationId: swap.stationId, status: swap.status });
      return;
    }
    const serial = ev.serial!;
    const done = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.stationSwap.updateMany({
        where: { id: swap.id, status: swap.status, releasedSerial: null },
        data: { status: 'completed', releasedSerial: serial, completedAt: new Date(), endReason: null },
      });
      if (!moved.count) return false;
      await tx.swapStation.updateMany({ where: { id: swap.stationId, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
      const installed = await tx.battery.upsert({
        where: { serial },
        create: { serial, chargePct: 100, status: 'in_vehicle', vehicleId: swap.vehicleId, cycleCount: 1 },
        update: { status: 'in_vehicle', vehicleId: swap.vehicleId, holderId: null, stationId: null, cycleCount: { increment: 1 } },
      });
      await tx.battery.updateMany({ where: { vehicleId: swap.vehicleId, status: 'in_vehicle', NOT: { id: installed.id } }, data: { vehicleId: null, status: 'charging' } });
      await tx.vehicle.update({ where: { id: swap.vehicleId }, data: { batterySerial: serial, batteryPct: installed.chargePct } });
      return true;
    });
    if (done) {
      this.logger.log({ msg: 'station_swap_completed', swapId: swap.id, stationId: swap.stationId, vehicleId: swap.vehicleId });
      this.emit({ ...swap, status: 'completed' });
    }
  }

  // ───────────── prazos ─────────────

  @Interval('station-swap-timeouts', 15_000)
  async timeoutJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.expireOverdue().catch((err) => this.logger.error({ msg: 'station_swap_timeouts_failed', error: (err as Error).message }));
  }

  /** Etapa vencida: sem resposta da estação → `failed`; cliente não devolveu → `canceled`; estação não liberou → `failed` + alerta. */
  async expireOverdue(now = new Date()): Promise<number> {
    const overdue = await this.prisma.stationSwap.findMany({ where: { status: { in: OPEN_SWAP_STATUSES }, expiresAt: { lt: now } }, take: 100 });
    let n = 0;
    for (const s of overdue) {
      const target = TIMEOUT_TARGET[s.status];
      if (!target) continue;
      const moved = await this.prisma.stationSwap.updateMany({ where: { id: s.id, status: s.status, expiresAt: { lt: now } }, data: { status: target.status, endReason: target.reason } });
      if (!moved.count) continue;
      n++;
      this.logger.warn({ msg: 'station_swap_timeout', swapId: s.id, stationId: s.stationId, from: s.status, to: target.status });
      this.emit({ ...s, status: target.status });
      if (target.reason === 'release_timeout') {
        await this.alerts
          .create(
            { type: 'command_failed', priority: 'high', message: 'Estação não liberou a bateria carregada depois da devolução do cliente.', vehicleId: s.vehicleId, rentalId: s.rentalId },
            { dedupe: false },
          )
          .catch((err) => this.logger.error({ msg: 'station_swap_alert_failed', swapId: s.id, error: (err as Error).message }));
      }
    }
    return n;
  }
}
