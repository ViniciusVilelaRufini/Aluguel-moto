import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { LiveStateStore } from '../iot/live-state.store';
import { TRACKER_MODES, type TrackerModeLookup } from '../iot/tracker-mode';
import { assertVehicleFreeForTrackerChange, lockVehicleTrackerChange } from './install-guards';
import type { CreateTrackerDto, ListTrackersQuery } from './trackers.dto';
import {
  imeiLast4, isStockable, STOCKABLE_WHERE, stockThingName, toTrackerDevice, TRACKER_DEVICE_INCLUDE, TRACKER_MODELS, type TrackerDeviceRow,
} from './trackers.mapper';

const IMEI = /^[0-9]{15}$/;

function uniqueTarget(err: unknown): string[] | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return null;
  const target = (err.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : [];
}

/**
 * Moto sem sinal: o último sinal gravado era do rastreador que saiu. Só `lastSeenAt` (o `online` exibido exige `lastSeenAt`
 * recente, `trackerOnline`): zerar o `online` do banco poderia prendê-lo em `false`, porque a presença do IoT (por thingName) não
 * emite "voltou" se o aparelho novo falar antes da vigia marcar o antigo offline. A primeira mensagem do novo regrava
 * `lastSeenAt` (`syncTrackerState` aceita `null`).
 */
const NO_SIGNAL = { lastSeenAt: null } as const;

/** Marca de "acabou de instalar" (I1): a primeira trava reportada solta pelo aparelho novo pede a trava da moto livre. */
export const TRACKER_INSTALLED_PREFIX = 'tracker-installed';
export const TRACKER_INSTALLED_TTL_MS = 10 * 60_000;
export const trackerInstalledKey = (thingName: string) => `${TRACKER_INSTALLED_PREFIX}:${thingName}`;

const NOT_GT06 = 'O rastreador desta moto não é um GT06 do estoque (tem certificado MQTT ou não tem IMEI); troque-o pelo script de provisionamento.';

/**
 * Estoque de rastreadores GT06/J16 e instalação na moto (spec 2026-11-05). Estoque: `thingName = gt06-<IMEI>`, sem moto;
 * instalado: `thingName` da moto e `vehicleId`. Logs e auditoria nunca levam o IMEI inteiro (só os 4 últimos dígitos).
 */
@Injectable()
export class TrackersService {
  private readonly logger = new Logger('TrackersService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(REDIS_STORE) private readonly redis: Pick<RedisStore, 'exists' | 'hgetall' | 'set'>,
    @Inject(TRACKER_MODES) private readonly modes: Pick<TrackerModeLookup, 'invalidate'>,
    @Inject(LiveStateStore) private readonly live: Pick<LiveStateStore, 'setOnline'>,
  ) {}

  /**
   * Depois do commit (I2): a moto fica offline no estado ao vivo até o aparelho novo falar — o início do aluguel recusa com
   * `vehicle-offline` nessa janela (antes da ponte criar o aparelho no Traccar). A primeira mensagem do novo a põe online de novo.
   * Instalar/trocar (I1) também grava a marca `tracker-installed:<thing>` (10 min) para o `TrackerInstallLockReconciler`.
   * Falhas aqui só são registradas: a troca já foi gravada.
   */
  private async afterTrackerChange(thingName: string, vehicleId: string, installed: boolean): Promise<void> {
    await this.live.setOnline(thingName, false).catch((err: Error) => this.logger.error({ msg: 'tracker_change_offline_failed', vehicleId, error: err.message }));
    if (!installed) return;
    await this.redis
      .set(trackerInstalledKey(thingName), String(Date.now()), TRACKER_INSTALLED_TTL_MS)
      .catch((err: Error) => this.logger.error({ msg: 'tracker_installed_mark_failed', vehicleId, error: err.message }));
  }

  async list(q: ListTrackersQuery) {
    const where: Prisma.TrackerWhereInput = { ...STOCKABLE_WHERE, imei: q.q ? { not: null, contains: q.q } : { not: null } };
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    if (q.installed === true && !q.vehicleId) where.vehicleId = { not: null };
    // Estoque e moto ao mesmo tempo: nada combina (o rastreador de uma moto está instalado).
    if (q.installed === false) where.vehicleId = q.vehicleId ? { in: [] } : null;
    const rows = await this.prisma.tracker.findMany({ where, include: TRACKER_DEVICE_INCLUDE, orderBy: { createdAt: 'desc' }, take: 500 });
    const now = Date.now();
    return { items: rows.map((r) => toTrackerDevice(r as TrackerDeviceRow, now)) };
  }

  async create(dto: CreateTrackerDto, actor: Principal) {
    if (!IMEI.test(dto.imei ?? '')) throw badRequest('O IMEI deve ter 15 dígitos.');
    if (!(TRACKER_MODELS as readonly string[]).includes(dto.model)) throw badRequest('Modelo de rastreador não aceito.');
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        if (dto.simCardId) {
          const sim = await tx.simCard.findUnique({ where: { id: dto.simCardId }, select: { id: true, trackerId: true } });
          if (!sim) throw notFound('Chip não encontrado.');
          if (sim.trackerId) throw conflict('conflict', 'Este chip já está em outro rastreador.');
        }
        const created = await tx.tracker.create({
          data: { thingName: stockThingName(dto.imei), imei: dto.imei, controlMode: 'relay_only', protocol: 'gt06', model: dto.model, vehicleId: null },
        });
        if (dto.simCardId) await tx.simCard.update({ where: { id: dto.simCardId }, data: { trackerId: created.id } });
        await this.audit.record({ actor, action: 'tracker.create', entityType: 'Tracker', entityId: created.id, metadata: { imeiLast4: imeiLast4(dto.imei) } }, tx);
        return tx.tracker.findUniqueOrThrow({ where: { id: created.id }, include: TRACKER_DEVICE_INCLUDE });
      });
      this.logger.log({ msg: 'tracker_created', trackerId: row.id, simLinked: !!dto.simCardId });
      return toTrackerDevice(row as TrackerDeviceRow);
    } catch (err) {
      const target = uniqueTarget(err);
      if (target) throw conflict('conflict', target.includes('trackerId') ? 'Este chip já está em outro rastreador.' : 'Já existe um rastreador com este IMEI.');
      throw err;
    }
  }

  /**
   * Instala um rastreador do estoque na moto; com outro já instalado, troca (o antigo volta a `gt06-<IMEI>` ANTES do novo
   * assumir o `thingName` da moto, que é único). O mesmo rastreador já instalado: nada é gravado.
   */
  async install(vehicleId: string, trackerId: string, actor: Principal) {
    let swapped: string | null = null;
    let wrote = false;
    let thingName = '';
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        // Serializa mudanças de rastreador da mesma moto e do mesmo aparelho.
        await lockVehicleTrackerChange(tx, vehicleId);
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`tracker-install:${trackerId}`}))::text`;
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, code: true, thingName: true, lastSeenAt: true } });
        if (!vehicle) throw notFound('Moto não encontrada.');
        thingName = vehicle.thingName;
        const tracker = await tx.tracker.findUnique({ where: { id: trackerId }, include: TRACKER_DEVICE_INCLUDE });
        if (!tracker || !isStockable(tracker)) throw notFound('Rastreador não encontrado.');
        if (tracker.vehicleId === vehicleId) return tracker;
        if (tracker.vehicleId) throw conflict('conflict', `Este rastreador está instalado na ${tracker.vehicle?.code ?? 'outra moto'}. Remova de lá primeiro.`);
        const current = await tx.tracker.findUnique({ where: { vehicleId } });
        if (current && !isStockable(current)) throw conflict('conflict', NOT_GT06);
        await assertVehicleFreeForTrackerChange(tx, this.redis, vehicleId, [vehicle.thingName, tracker.thingName, ...(current ? [current.thingName] : [])]);
        wrote = true;
        if (current) {
          // M3: o último sinal da moto era dele; o estoque o mostra.
          await tx.tracker.update({ where: { id: current.id }, data: { thingName: stockThingName(current.imei), vehicleId: null, lastSeenAt: vehicle.lastSeenAt } });
          await this.audit.record({ actor, action: 'tracker.remove', entityType: 'Tracker', entityId: current.id, metadata: { imeiLast4: imeiLast4(current.imei), vehicleId } }, tx);
          swapped = current.id;
        }
        // O sinal da moto era do aparelho anterior: o novo só aparece online depois de falar.
        await tx.vehicle.update({ where: { id: vehicleId }, data: NO_SIGNAL });
        const installed = await tx.tracker.update({ where: { id: trackerId }, data: { thingName: vehicle.thingName, vehicleId }, include: TRACKER_DEVICE_INCLUDE });
        await this.audit.record({ actor, action: 'tracker.install', entityType: 'Tracker', entityId: trackerId, metadata: { imeiLast4: imeiLast4(tracker.imei), vehicleId } }, tx);
        return installed;
      });
      if (wrote) {
        this.modes.invalidate(vehicleId);
        await this.afterTrackerChange(thingName, vehicleId, true);
        this.logger.log({ msg: 'tracker_installed', trackerId, vehicleId, swappedTrackerId: swapped });
      }
      return toTrackerDevice(row as TrackerDeviceRow);
    } catch (err) {
      if (uniqueTarget(err)) throw conflict('conflict', 'O rastreador ou a moto mudou ao mesmo tempo; atualize e tente de novo.');
      throw err;
    }
  }

  /** Remove o rastreador da moto: volta ao estoque (`gt06-<IMEI>`, sem moto); o chip continua com ele. */
  async remove(vehicleId: string, actor: Principal) {
    let thingName = '';
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await lockVehicleTrackerChange(tx, vehicleId);
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, thingName: true, lastSeenAt: true } });
        if (!vehicle) throw notFound('Moto não encontrada.');
        thingName = vehicle.thingName;
        const current = await tx.tracker.findUnique({ where: { vehicleId } });
        if (!current) throw notFound('Esta moto não tem rastreador.');
        if (!isStockable(current)) throw conflict('conflict', NOT_GT06);
        await assertVehicleFreeForTrackerChange(tx, this.redis, vehicleId, [vehicle.thingName, current.thingName]);
        await tx.vehicle.update({ where: { id: vehicleId }, data: NO_SIGNAL });
        const stocked = await tx.tracker.update({ where: { id: current.id }, data: { thingName: stockThingName(current.imei), vehicleId: null, lastSeenAt: vehicle.lastSeenAt }, include: TRACKER_DEVICE_INCLUDE });
        await this.audit.record({ actor, action: 'tracker.remove', entityType: 'Tracker', entityId: current.id, metadata: { imeiLast4: imeiLast4(current.imei), vehicleId } }, tx);
        return stocked;
      });
      this.modes.invalidate(vehicleId);
      await this.afterTrackerChange(thingName, vehicleId, false);
      this.logger.log({ msg: 'tracker_removed', trackerId: row.id, vehicleId });
      return toTrackerDevice(row as TrackerDeviceRow);
    } catch (err) {
      if (uniqueTarget(err)) throw conflict('conflict', 'O rastreador mudou ao mesmo tempo; atualize e tente de novo.');
      throw err;
    }
  }
}
