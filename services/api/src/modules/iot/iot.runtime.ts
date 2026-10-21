import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

/**
 * Ciclo de vida do módulo IoT: liga o transporte (MQTT local ou SQS/IoT Data Plane) à ingestão, registra o limite das zonas
 * para o `unlock`, sincroniza as cercas (aws), roda a vigia de inatividade e consome `zone.changed`/`rental.changed`.
 */
@Injectable()
export class IotRuntime implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('IotRuntime');
  private sweep?: NodeJS.Timeout;

  constructor(
    @Inject(IOT_GATEWAY) private readonly gateway: IotGateway,
    @Inject(IOT_CONFIG) private readonly cfg: IotConfig,
    @Inject(IOT_CLOCK) private readonly clock: Clock,
    @Inject(GEOFENCE_ENGINE) private readonly engine: GeofenceEngine,
    @Inject(RENTAL_LOOKUP) private readonly rentals: RentalLookup,
    @Optional() private readonly geofence?: GeofenceService,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!(this.gateway instanceof BaseIotGateway) || !this.telemetry || !this.geofence) {
      this.logger.log({ msg: 'iot_stub_mode' });
      return;
    }
    const geofence = this.geofence;
    this.gateway.setLimitResolver((thingName) => geofence.effectiveLimit(thingName));
    await this.gateway.transport.start(this.telemetry).catch((err) => this.logger.error({ msg: 'iot_transport_start_failed', error: (err as Error).message }));
    const telemetry = this.telemetry;
    this.sweep = setInterval(() => void telemetry.sweepStale().catch(() => undefined), STALE_SWEEP_MS);
    this.sweep.unref?.();
    if (this.cfg.geofenceMode === 'aws') {
      void this.engine.syncAll().catch((err) => this.logger.error({ msg: 'geofence_sync_all_failed', error: (err as Error).message }));
    }
    this.logger.log({ msg: 'iot_started', iotMode: this.cfg.iotMode, geofenceMode: this.cfg.geofenceMode });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweep) clearInterval(this.sweep);
    this.geofence?.stop();
    if (this.gateway instanceof BaseIotGateway) await this.gateway.transport.stop();
    if (this.clock instanceof SystemClock) this.clock.clearAll();
  }

  @OnEvent(EV.ZONE_CHANGED, { async: true, promisify: true })
  async onZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    if (!this.geofence) return;
    await this.geofence.onZoneChanged(ev).catch((err) => this.logger.error({ msg: 'geofence_sync_failed', zoneId: ev.zoneId, error: (err as Error).message }));
  }

  @OnEvent(EV.RENTAL_CHANGED)
  onRentalChanged(ev: RentalChangedEvent): void {
    this.rentals.invalidate(ev.vehicleId);
  }
}
