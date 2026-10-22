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
import { AuditService } from '../audit/audit.service';
import { signStationCode, verifyStationCode } from './station-code';
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
/** Fim de troca depois do qual uma devolução ainda vale (fix 1, I2): cancelada pelo cliente ou por prazo antes da devolução. */
const LATE_RETURN_REASONS: StationSwapEndReason[] = ['canceled_by_customer', 'return_timeout', 'station_timeout'];
const TERMINAL_SWAP_STATUSES: StationSwapStatus[] = ['completed', 'canceled', 'failed'];
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
    private readonly audit: AuditService,
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
   * Trava a linha do aluguel até o fim da transação e devolve o status atual (fix 2, M-3/I-1). Ordem dos locks em toda a
   * API: estação e depois aluguel (o encerramento só trava o aluguel), sem ciclo.
   */
  private async lockRental(tx: Prisma.TransactionClient, rentalId: string): Promise<string | null> {
    const rows = await tx.$queryRaw<Array<{ status: string }>>`SELECT "status"::text AS "status" FROM "Rental" WHERE "id" = ${rentalId}::uuid FOR UPDATE`;
    return rows?.[0]?.status ?? null;
  }

  /** Outra troca aberta no aluguel (fora `exceptId`). Lido depois do lock do aluguel. */
  private async otherOpenSwap(tx: Prisma.TransactionClient, rentalId: string, exceptId?: string): Promise<boolean> {
    const open = await tx.stationSwap.findFirst({
      where: { rentalId, status: { in: OPEN_SWAP_STATUSES }, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    return !!open;
  }

  /**
   * Carregadas já prometidas pela estação: trocas em andamento e as que falharam por prazo de liberação há pouco (a estação
   * ainda pode liberar a bateria atrasada, `RELEASE_LATE_WINDOW_MS`).
   *
   * Fix 2 (I-2): a janela de 30 min fica. Um `release_battery` para uma troca cuja devolução foi recebida continua válido
   * mesmo depois de um `abort_swap` (contrato MQTT), e a estação pode liberar atrasada depois do `release_timeout`; enquanto
   * isso a carregada tem de contar como prometida, senão outra troca a ofereceria de novo.
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
        // Fix 2 (M-3): aluguel travado (mesma linha que o encerramento trava) e relido: encerramento e criação se serializam.
        const status = await this.lockRental(tx, rental.id);
        if (status !== 'active' && status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
        if (await this.otherOpenSwap(tx, rental.id)) throw conflict('swap-open', 'Já existe uma troca de bateria em andamento neste aluguel.');
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
    await this.load(user, stationId, swapId);
    // Fix 1 (I2): na mesma fila dos eventos e do prazo desta troca (CAS no status).
    return this.enqueue(swapId, async () => {
      const swap = (await this.prisma.stationSwap.findUnique({ where: { id: swapId } }))!;
      if (swap.status === 'canceled') return toStationSwap(swap, { staff: false });
      if (!CANCELABLE_SWAP_STATUSES.includes(swap.status)) throw unprocessable('swap-not-cancelable', 'A bateria já foi devolvida; aguarde a estação liberar a carregada.');
      const moved = await this.transition(swap, 'canceled', { endReason: 'canceled_by_customer' });
      const current = (await this.prisma.stationSwap.findUnique({ where: { id: swap.id } }))!;
      if (!moved && current.status !== 'canceled') throw unprocessable('swap-not-cancelable', 'A bateria já foi devolvida; aguarde a estação liberar a carregada.');
      if (moved) {
        this.logger.log({ msg: 'station_swap_canceled', swapId: swap.id, stationId });
        this.emit(current);
        await this.sendAbort(current);
      }
      return toStationSwap(current, { staff: false });
    });
  }

  /**
   * Fix 2 (M-2): o staff encerrou o aluguel (forçado ou chegada no galpão). Troca sem devolução → `canceled/rental_force_ended`
   * + `abort_swap`; troca com a devolução registrada (`returned`/`releasing`) segue até a estação liberar (a moto não recebe
   * a bateria nova, ver `onBatteryReleased`). Cada troca pela fila dela.
   */
  async closeForRentalEnd(rentalId: string): Promise<void> {
    const open = await this.prisma.stationSwap.findMany({ where: { rentalId, status: { in: OPEN_SWAP_STATUSES } }, select: { id: true } });
    for (const o of open) {
      await this.enqueue(o.id, async () => {
        const swap = await this.prisma.stationSwap.findUnique({ where: { id: o.id } });
        if (!swap || !CANCELABLE_SWAP_STATUSES.includes(swap.status)) return;
        if (!(await this.transition(swap, 'canceled', { endReason: 'rental_force_ended' }))) return;
        this.logger.log({ msg: 'station_swap_closed_by_rental_end', swapId: swap.id, stationId: swap.stationId, rentalId });
        this.emit({ ...swap, status: 'canceled' });
        await this.sendAbort(swap);
      });
    }
  }

  // ───────────── painel ─────────────

  /**
   * Fix 1 (I6): conteúdo do QR da estação para o admin imprimir (`GET /swap-stations/{id}/qr`). Estação ainda sem código →
   * emite agora com o segredo atual. AuditLog sem o código.
   */
  async qr(actor: Principal, stationId: string): Promise<{ stationId: string; stationCode: string }> {
    const station = await this.prisma.swapStation.findUnique({ where: { id: stationId }, select: { id: true, stationCode: true } });
    if (!station) throw new ProblemException(404, 'station-not-found', 'Estação não encontrada.');
    let code = station.stationCode;
    const issued = !code;
    if (!code) {
      code = signStationCode(station.id, this.cfg.qrSecret);
      await this.prisma.swapStation.update({ where: { id: station.id }, data: { stationCode: code } });
    }
    await this.audit.record({ actor, action: 'swap_station.qr_read', entityType: 'SwapStation', entityId: station.id, metadata: { issued } });
    return { stationId: station.id, stationCode: code };
  }

  async list(stationId: string, q: ListStationSwapsQuery) {
    if (!(await this.prisma.swapStation.findUnique({ where: { id: stationId }, select: { id: true } }))) throw new ProblemException(404, 'station-not-found', 'Estação não encontrada.');
    const where: Prisma.StationSwapWhereInput = { stationId, ...(q.status ? { status: q.status } : {}) };
    const rows = await this.prisma.stationSwap.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, (s) => toStationSwap(s, { staff: true }));
  }

  // ───────────── fila por troca ─────────────

  private async transition(swap: StationSwap, to: StationSwapStatus, data: Prisma.StationSwapUncheckedUpdateManyInput = {}, tx: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    const moved = await tx.stationSwap.updateMany({ where: { id: swap.id, status: swap.status }, data: { status: to, ...data } });
    return moved.count > 0;
  }

  /**
   * Tudo o que muda uma troca (eventos da estação, cancelamento, prazo) passa por aqui, um de cada vez e em ordem por troca.
   * Sem isso, um `slot_closed` que chega enquanto a transação do `battery_returned` ainda não terminou leria `awaiting_return`
   * e o fechamento se perderia. Com várias instâncias da API (modo aws) a ordem vem da fila FIFO agrupada por estação.
   */
  private enqueue<T>(swapId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.eventChains.get(swapId) ?? Promise.resolve();
    const next = prev.then(fn);
    const settled = next.then(() => undefined, () => undefined);
    this.eventChains.set(swapId, settled);
    void settled.then(() => {
      if (this.eventChains.get(swapId) === settled) this.eventChains.delete(swapId);
    });
    return next;
  }

  onStationEvent(thing: string, ev: StationEvent): Promise<void> {
    return this.enqueue(ev.swapId, () => this.handleStationEvent(thing, ev));
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

  // ───────────── comandos para a estação ─────────────

  private async sendRelease(swap: StationSwap): Promise<void> {
    const hint = await this.prisma.battery.findFirst({
      where: { stationId: swap.stationId, status: 'in_station', chargePct: { gte: CHARGED_PCT } },
      orderBy: [{ chargePct: 'desc' }, { cycleCount: 'asc' }],
      select: { serial: true },
    });
    await this.station
      .send(stationThingName(swap.stationId), { commandId: `${swap.id}:release_battery`, swapId: swap.id, action: 'release_battery', serialHint: hint?.serial })
      .catch((err) => this.logger.error({ msg: 'station_release_failed', swapId: swap.id, stationId: swap.stationId, error: (err as Error).message }));
  }

  /** Fix 1 (I2): cancelamento ou prazo vencido → a estação fecha a vaga (se aberta) e confirma com `slot_closed`. */
  private async sendAbort(swap: StationSwap): Promise<void> {
    await this.station
      .send(stationThingName(swap.stationId), { commandId: `${swap.id}:abort_swap`, swapId: swap.id, action: 'abort_swap', slotNumber: swap.slotNumber ?? undefined })
      .catch((err) => this.logger.error({ msg: 'station_abort_failed', swapId: swap.id, stationId: swap.stationId, error: (err as Error).message }));
  }

  /** Alerta para a operação, só com ids (nunca série, posição ou dado do cliente na mensagem). */
  private async alert(swap: StationSwap, message: string, msg: string): Promise<void> {
    this.logger.warn({ msg, swapId: swap.id, stationId: swap.stationId, vehicleId: swap.vehicleId });
    await this.alerts
      .create({ type: 'command_failed', priority: 'high', message, vehicleId: swap.vehicleId, rentalId: swap.rentalId }, { dedupe: false })
      .catch((err) => this.logger.error({ msg: 'station_swap_alert_failed', swapId: swap.id, error: (err as Error).message }));
  }

  // ───────────── eventos da estação ─────────────

  private async onSlotOpened(swap: StationSwap, ev: StationEvent): Promise<void> {
    const next = nextStepAfter(swap.status, 'slot_opened');
    if (!next) return;
    if (await this.transition(swap, next, { slotNumber: ev.slotNumber, expiresAt: this.deadline() })) this.emit({ ...swap, status: next });
  }

  /**
   * Devolução. Fix 1 (M1): bateria registrada em outra moto nunca é desvinculada (troca `failed/serial_mismatch` + alerta);
   * série diferente da registrada nesta moto → alerta e segue. Fix 1 (I2): devolução atrasada numa troca cancelada pelo
   * cliente ou vencida vale como devolução (a estação libera uma carregada, se houver).
   */
  private async onBatteryReturned(swap: StationSwap, ev: StationEvent): Promise<void> {
    const serial = ev.serial!;
    const pct = ev.pct!;
    if (swap.returnedSerial) return; // devolução já registrada nesta troca
    const record = await this.prisma.battery.findUnique({ where: { serial } });
    if (record && record.status === 'in_vehicle' && record.vehicleId && record.vehicleId !== swap.vehicleId) {
      if (await this.transition(swap, 'failed', { endReason: 'serial_mismatch' })) this.emit({ ...swap, status: 'failed' });
      await this.alert(swap, 'Troca na estação: a bateria devolvida consta instalada em outra moto. Conferir a estação.', 'station_return_serial_conflict');
      return;
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: swap.vehicleId }, select: { batterySerial: true } });
    if (vehicle?.batterySerial && vehicle.batterySerial !== serial) {
      await this.alert(swap, 'Troca na estação: a bateria devolvida não é a registrada na moto.', 'station_return_serial_mismatch');
    }

    const late = (swap.status === 'canceled' || swap.status === 'failed') && !!swap.endReason && LATE_RETURN_REASONS.includes(swap.endReason);
    if (late) return this.onLateReturn(swap, serial, pct);

    const next = nextStepAfter(swap.status, 'battery_returned');
    let recorded = false;
    const advanced = await this.prisma.$transaction(async (tx) => {
      if (!(await this.recordReturn(tx, swap, serial, pct))) return false;
      recorded = true;
      return next ? this.transition(swap, next, { expiresAt: this.deadline() }, tx) : false;
    });
    // Fix 2 (M-4): troca encerrada por outro motivo (fora de LATE_RETURN_REASONS): a bateria está na estação, a troca não
    // volta; a operação precisa saber (cliente pode ter ficado sem bateria).
    if (recorded && !next && TERMINAL_SWAP_STATUSES.includes(swap.status)) {
      await this.alert(swap, 'Troca na estação: bateria devolvida numa troca já encerrada. Conferir a estação e o cliente.', 'station_return_on_closed_swap');
    }
    if (advanced && next) {
      this.logger.log({ msg: 'station_swap_returned', swapId: swap.id, stationId: swap.stationId });
      this.emit({ ...swap, status: next });
    }
  }

  /** Registra a devolvida uma única vez por troca e põe a bateria carregando na estação. */
  private async recordReturn(tx: Prisma.TransactionClient, swap: StationSwap, serial: string, pct: number): Promise<boolean> {
    const claimed = await tx.stationSwap.updateMany({ where: { id: swap.id, returnedSerial: null }, data: { returnedSerial: serial, returnedPct: pct } });
    if (!claimed.count) return false;
    await tx.battery.upsert({
      where: { serial },
      create: { serial, chargePct: pct, status: 'charging', stationId: swap.stationId },
      update: { status: 'charging', stationId: swap.stationId, vehicleId: null, holderId: null, chargePct: pct },
    });
    return true;
  }

  /**
   * Devolução depois do cancelamento/prazo: é uma devolução registrada (sem comando para a moto), então a troca volta e vai
   * direto a `releasing` com a estação travada (mesma conta da criação). Sem carregada → `failed/no_battery_after_return` +
   * alerta para a operação levar uma bateria.
   */
  private async onLateReturn(swap: StationSwap, serial: string, pct: number): Promise<void> {
    type Outcome = 'releasing' | 'no_battery' | 'after_close' | null;
    let outcome: Outcome;
    try {
      outcome = await this.prisma.$transaction(async (tx): Promise<Outcome> => {
        if (!(await this.recordReturn(tx, swap, serial, pct))) return null;
        const available = await this.lockStation(tx, swap.stationId);
        // Fix 2 (I-1): só volta a liberar com o aluguel ainda em andamento e sem outra troca aberta (sob o lock do aluguel:
        // nunca bate no índice único `StationSwap_one_open_per_rental`).
        const status = await this.lockRental(tx, swap.rentalId);
        if ((status !== 'active' && status !== 'paused') || (await this.otherOpenSwap(tx, swap.rentalId, swap.id))) {
          return (await this.transition(swap, 'failed', { endReason: 'return_after_close' }, tx)) ? 'after_close' : null;
        }
        const promised = await tx.stationSwap.count({ where: { ...this.promisedWhere(swap.stationId, new Date()), id: { not: swap.id } } });
        if (available - promised > 0) {
          return (await this.transition(swap, 'releasing', { endReason: null, expiresAt: this.deadline() }, tx)) ? 'releasing' : null;
        }
        return (await this.transition(swap, 'failed', { endReason: 'no_battery_after_return' }, tx)) ? 'no_battery' : null;
      });
    } catch (err) {
      // Defesa: um P2002 aqui viraria mensagem envenenada no grupo FIFO da estação. A devolução é registrada como
      // `return_after_close` numa transação nova (a anterior foi desfeita) e o evento termina sem erro.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      outcome = await this.prisma.$transaction(async (tx): Promise<Outcome> => {
        await this.recordReturn(tx, swap, serial, pct);
        return (await this.transition(swap, 'failed', { endReason: 'return_after_close' }, tx)) ? 'after_close' : null;
      });
    }
    if (outcome === 'after_close') {
      this.emit({ ...swap, status: 'failed' });
      await this.alert(swap, 'Troca na estação: bateria devolvida depois do fim do aluguel ou com outra troca aberta. Conferir a estação e o cliente.', 'station_return_after_close');
    } else if (outcome === 'releasing') {
      this.logger.log({ msg: 'station_swap_late_return', swapId: swap.id, stationId: swap.stationId });
      this.emit({ ...swap, status: 'releasing' });
      await this.sendRelease(swap);
    } else if (outcome === 'no_battery') {
      this.emit({ ...swap, status: 'failed' });
      await this.alert(swap, 'Troca na estação: bateria devolvida depois do prazo e sem carregada para liberar. Levar uma bateria ao cliente.', 'station_late_return_no_battery');
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
    await this.sendRelease(swap);
  }

  /**
   * Liberação: completa uma troca em `releasing` (ou que falhou por prazo depois da devolução — o cliente recebeu a bateria).
   * Estoque: a estação perde uma carregada; a liberada entra na moto (+1 ciclo) e vira a bateria da moto.
   * Fix 1 (M1): liberada registrada em outra moto → `failed/serial_mismatch`, nada é mexido; fora desta estação → alerta.
   */
  private async onBatteryReleased(swap: StationSwap, ev: StationEvent): Promise<void> {
    const lateAfterTimeout = swap.status === 'failed' && swap.endReason === 'release_timeout';
    if (nextStepAfter(swap.status, 'battery_released') !== 'completed' && !lateAfterTimeout) {
      this.logger.warn({ msg: 'station_release_ignored', swapId: swap.id, stationId: swap.stationId, status: swap.status });
      return;
    }
    const serial = ev.serial!;
    const record = await this.prisma.battery.findUnique({ where: { serial } });
    if (record && record.status === 'in_vehicle' && record.vehicleId && record.vehicleId !== swap.vehicleId) {
      const moved = await this.prisma.stationSwap.updateMany({ where: { id: swap.id, status: swap.status, releasedSerial: null }, data: { status: 'failed', endReason: 'serial_mismatch' } });
      if (moved.count) this.emit({ ...swap, status: 'failed' });
      await this.alert(swap, 'Troca na estação: a bateria liberada consta instalada em outra moto. Conferir a estação e a moto.', 'station_release_serial_conflict');
      return;
    }
    if (!record || record.status !== 'in_station' || record.stationId !== swap.stationId) {
      await this.alert(swap, 'Troca na estação: a bateria liberada não constava no estoque desta estação.', 'station_release_serial_mismatch');
    }
    let rentalClosed = false;
    const done = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.stationSwap.updateMany({
        where: { id: swap.id, status: swap.status, releasedSerial: null },
        data: { status: 'completed', releasedSerial: serial, completedAt: new Date(), endReason: null },
      });
      if (!moved.count) return false;
      await tx.swapStation.updateMany({ where: { id: swap.stationId, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
      // Fix 2 (M-2): aluguel já encerrado (forçado pelo staff) → a bateria liberada saiu da estação, mas a moto (com a
      // operação) não a recebe: `Vehicle.batterySerial` e o registro da bateria ficam como estão; alerta para conferir.
      const rentalStatus = await this.lockRental(tx, swap.rentalId);
      if (rentalStatus !== 'active' && rentalStatus !== 'paused') {
        rentalClosed = true;
        return true;
      }
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
      if (rentalClosed) {
        await this.alert(swap, 'Troca na estação: bateria liberada depois do encerramento do aluguel. A moto não foi atualizada; conferir com o cliente.', 'station_release_after_rental_end');
      }
    }
  }

  // ───────────── prazos ─────────────

  @Interval('station-swap-timeouts', 15_000)
  async timeoutJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.expireOverdue().catch((err) => this.logger.error({ msg: 'station_swap_timeouts_failed', error: (err as Error).message }));
  }

  /**
   * Etapa vencida: sem resposta da estação → `failed`; cliente não devolveu → `canceled`; estação não liberou → `failed` +
   * alerta. Fix 1 (I2): cada troca entra na fila dela (relê e faz CAS no status e no prazo) e a estação recebe `abort_swap`.
   */
  async expireOverdue(now = new Date()): Promise<number> {
    const overdue = await this.prisma.stationSwap.findMany({ where: { status: { in: OPEN_SWAP_STATUSES }, expiresAt: { lt: now } }, take: 100, select: { id: true } });
    const results = await Promise.all(overdue.map((o) => this.enqueue(o.id, () => this.expireOne(o.id, now))));
    return results.filter(Boolean).length;
  }

  private async expireOne(swapId: string, now: Date): Promise<boolean> {
    const s = await this.prisma.stationSwap.findUnique({ where: { id: swapId } });
    if (!s || !(s.expiresAt < now)) return false;
    const target = TIMEOUT_TARGET[s.status];
    if (!target) return false;
    const moved = await this.prisma.stationSwap.updateMany({ where: { id: s.id, status: s.status, expiresAt: { lt: now } }, data: { status: target.status, endReason: target.reason } });
    if (!moved.count) return false;
    this.logger.warn({ msg: 'station_swap_timeout', swapId: s.id, stationId: s.stationId, from: s.status, to: target.status });
    this.emit({ ...s, status: target.status });
    await this.sendAbort(s);
    if (target.reason === 'release_timeout') await this.alert(s, 'Estação não liberou a bateria carregada depois da devolução do cliente.', 'station_release_timeout');
    return true;
  }
}
