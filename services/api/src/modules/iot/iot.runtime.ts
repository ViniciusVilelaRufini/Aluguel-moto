import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClusterEventsBridge } from '../../common/cluster-events';
import { EV, RentalChangedEvent, ZoneChangedEvent } from '../../common/events';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { BaseIotGateway } from './base-iot-gateway';
import { IOT_CLOCK, SystemClock, type Clock } from './clock';
import { GEOFENCE_ENGINE, type GeofenceEngine } from './geofence/geofence-engine';
import { GeofenceService, RENTAL_LOOKUP, type RentalLookup } from './geofence/geofence.service';
import { IOT_CONFIG, type IotConfig } from './iot-config';
import { TelemetryService } from './telemetry.service';

/** Intervalo da vigia de inatividade (rastreadores sem notícia → offline). */
const STALE_SWEEP_MS = 30_000;
/** Varredura das rampas do bloqueio seguro e dos prazos de "fora da área" guardados no Redis (timers perdidos num deploy). */
export const SAFE_LOCK_SWEEP_MS = 1_000;
export const OUT_OF_AREA_SWEEP_MS = 15_000;

/**
 * Ciclo de vida do módulo IoT: liga o transporte (MQTT local ou SQS/IoT Data Plane) à ingestão, registra o limite das zonas
 * para o `unlock`, sincroniza as cercas (aws), roda a vigia de inatividade e consome `zone.changed`/`rental.changed`.
 */
@Injectable()
export class IotRuntime implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('IotRuntime');
  private sweep?: NodeJS.Timeout;
  private lockSweep?: NodeJS.Timeout;
  private areaSweep?: NodeJS.Timeout;

  constructor(
    @Inject(IOT_GATEWAY) private readonly gateway: IotGateway,
    @Inject(IOT_CONFIG) private readonly cfg: IotConfig,
    @Inject(IOT_CLOCK) private readonly clock: Clock,
    @Inject(GEOFENCE_ENGINE) private readonly engine: GeofenceEngine,
    @Inject(RENTAL_LOOKUP) private readonly rentals: RentalLookup,
    @Optional() private readonly geofence?: GeofenceService,
    @Optional() private readonly telemetry?: TelemetryService,
    @Optional() private readonly cluster?: ClusterEventsBridge,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!(this.gateway instanceof BaseIotGateway) || !this.telemetry || !this.geofence) {
      this.logger.log({ msg: 'iot_stub_mode' });
      return;
    }
    const geofence = this.geofence;
    this.gateway.setLimitResolver((thingName, position) => geofence.verifiedLimit(thingName, position));
    await this.gateway.transport.start(this.telemetry).catch((err) => this.logger.error({ msg: 'iot_transport_start_failed', error: (err as Error).message }));
    const telemetry = this.telemetry;
    this.sweep = setInterval(() => void telemetry.sweepStale().catch(() => undefined), STALE_SWEEP_MS);
    this.sweep.unref?.();
    // Várias instâncias (lacunas T5): cada uma varre o estado compartilhado; cada moto é processada sob o lock dela no Redis.
    const gateway = this.gateway;
    let sweepingLocks = false;
    const lockHealth = this.health('safe_lock_sweep');
    this.lockSweep = setInterval(() => {
      if (sweepingLocks) return;
      sweepingLocks = true;
      void gateway
        .sweepSafeLock()
        .then(() => lockHealth.ok(), (err) => lockHealth.failed(err as Error))
        .finally(() => (sweepingLocks = false));
    }, SAFE_LOCK_SWEEP_MS);
    this.lockSweep.unref?.();
    const areaHealth = this.health('out_of_area_sweep');
    this.areaSweep = setInterval(() => void geofence.sweepOutOfArea().then(() => areaHealth.ok(), (err) => areaHealth.failed(err as Error)), OUT_OF_AREA_SWEEP_MS);
    this.areaSweep.unref?.();
    if (this.cfg.geofenceMode === 'aws') {
      void this.engine.syncAll().catch((err) => this.logger.error({ msg: 'geofence_sync_all_failed', error: (err as Error).message }));
    }
    this.logger.log({ msg: 'iot_started', iotMode: this.cfg.iotMode, geofenceMode: this.cfg.geofenceMode });
  }

  /** Log só na mudança de estado (falhou / voltou), e não a cada rodada com o Redis fora (revisão M6). */
  private health(name: string): { ok(): void; failed(err: Error): void } {
    let failing = false;
    return {
      ok: () => {
        if (failing) this.logger.log({ msg: `${name}_recovered` });
        failing = false;
      },
      failed: (err) => {
        if (!failing) this.logger.warn({ msg: `${name}_failed`, error: err.message });
        failing = true;
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweep) clearInterval(this.sweep);
    if (this.lockSweep) clearInterval(this.lockSweep);
    if (this.areaSweep) clearInterval(this.areaSweep);
    this.geofence?.stop();
    if (this.gateway instanceof BaseIotGateway) await this.gateway.transport.stop();
    if (this.clock instanceof SystemClock) this.clock.clearAll();
  }

  @OnEvent(EV.ZONE_CHANGED, { async: true, promisify: true })
  async onZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    if (!this.geofence) return;
    // Revisão final item 4: replicado de outra instância → só invalida a memória (a origem já ressincronizou, reavaliou e
    // mandou os comandos, uma vez no cluster).
    if (this.cluster?.isRemote(ev)) {
      await this.geofence.onRemoteZoneChanged(ev).catch((err) => this.logger.error({ msg: 'geofence_remote_invalidate_failed', zoneId: ev.zoneId, error: (err as Error).message }));
      return;
    }
    await this.geofence.onZoneChanged(ev).catch((err) => this.logger.error({ msg: 'geofence_sync_failed', zoneId: ev.zoneId, error: (err as Error).message }));
  }

  /** QA-09: consentimento de localização revogado/concedido → o próximo ponto relê o consentimento (para de gravar na hora). */
  @OnEvent(EV.CUSTOMER_CONSENT_CHANGED)
  onConsentChanged(): void {
    this.rentals.invalidate();
  }

  @OnEvent(EV.RENTAL_CHANGED, { async: true, promisify: true })
  async onRentalChanged(ev: RentalChangedEvent): Promise<void> {
    this.rentals.invalidate(ev.vehicleId);
    if (ev.status === 'ended' || ev.status === 'force_ended') {
      await this.geofence?.onRentalEnded(ev.vehicleId).catch((err) => this.logger.error({ msg: 'out_of_area_disarm_failed', vehicleId: ev.vehicleId, error: (err as Error).message }));
    }
  }
}
