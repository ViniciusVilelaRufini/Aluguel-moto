import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EV, type IotReportedEvent } from '../../common/events';
import { engineCommandInFlight } from '../../common/vehicle-in-use';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { CommandsService } from '../commands/commands.service';
import { pendingLockOn, vehicleInUseReason } from './install-guards';
import { trackerInstalledKey } from './trackers.service';

/** Propósito da trava pedida depois da instalação: é "estacionar" (sem origem), a moto continua alugável. */
export const TRACKER_INSTALL_LOCK_PURPOSE = 'tracker_install';

/**
 * I1 (segurança): o J16 novo chega com o relé fechado (moto destravada) e nada o reconciliava — uma moto livre ficava usável.
 * Depois de instalar/trocar, `TrackersService` grava `tracker-installed:<thing>` (10 min). No primeiro `reported` com a trava
 * vindo do aparelho depois da instalação, a marca é consumida (uma vez só, entre instâncias: `delIfEquals`):
 * - `travada: false` com a moto livre (sem aluguel aberto, sem reserva em uso, sem lock/unlock nem trava em andamento) → pede o
 *   lock normal pelo `CommandsService` (ator sistema). O lock só-relé tem a mesma guarda de parada de qualquer lock: só corta
 *   com a moto parada de forma confirmada (< 3 km/h), nunca em movimento.
 * - moto em uso, comando em andamento ou `travada: true` → só limpa a marca.
 * O rastreador que voltou ao estoque não é tocado (o thingName dele é `gt06-<IMEI>`, sem marca).
 */
@Injectable()
export class TrackerInstallLockReconciler {
  private readonly logger = new Logger('TrackerInstallLockReconciler');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_STORE) private readonly redis: Pick<RedisStore, 'get' | 'delIfEquals' | 'exists' | 'hgetall'>,
    @Inject(CommandsService) private readonly commands: Pick<CommandsService, 'dispatch'>,
  ) {}

  @OnEvent(EV.IOT_REPORTED, { async: true, promisify: true })
  async onReported(ev: IotReportedEvent): Promise<void> {
    if (typeof ev.locked !== 'boolean') return;
    try {
      await this.reconcile(ev, ev.locked);
    } catch (err) {
      this.logger.error({ msg: 'tracker_install_lock_failed', vehicleId: ev.vehicleId, error: (err as Error).message });
    }
  }

  private async reconcile(ev: IotReportedEvent, locked: boolean): Promise<void> {
    const key = trackerInstalledKey(ev.thingName);
    const mark = await this.redis.get(key);
    if (mark === null) return;
    // Reported anterior à instalação (shadow do aparelho antigo relido pelo polling) não diz nada do novo.
    const reportedAt = Date.parse(ev.ts);
    if (!Number.isFinite(reportedAt) || reportedAt < Number(mark)) return;
    if (!(await this.redis.delIfEquals(key, mark))) return;
    if (locked) {
      this.logger.log({ msg: 'tracker_install_already_locked', vehicleId: ev.vehicleId });
      return;
    }
    const inUse = await vehicleInUseReason(this.prisma, ev.vehicleId);
    if (inUse || (await engineCommandInFlight(this.prisma, ev.vehicleId)) || (await pendingLockOn(this.redis, [ev.thingName]))) {
      this.logger.log({ msg: 'tracker_install_lock_skipped', vehicleId: ev.vehicleId, reason: inUse ?? 'command_in_flight' });
      return;
    }
    const cmd = await this.commands.dispatch({
      vehicleId: ev.vehicleId,
      type: 'lock',
      reason: 'Rastreador instalado com a trava solta: travar a moto livre',
      actor: { system: true, name: 'instalacao-rastreador' },
      context: { purpose: TRACKER_INSTALL_LOCK_PURPOSE },
      auditAction: 'tracker.install_lock',
    });
    this.logger.log({ msg: 'tracker_install_lock_requested', vehicleId: ev.vehicleId, commandId: cmd.id, status: cmd.status });
  }
}
