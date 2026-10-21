import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaClient } from '@prisma/client';
import { EV, IotConnectivityEvent, IotDeviceEvent, IotTelemetryEvent } from '../../common/events';
import type { BaseIotGateway } from './base-iot-gateway';
import type { Clock } from './clock';
import type { PositionInput, RentalLookup } from './geofence/geofence.service';
import { parseDeviceEvent, parseTelemetry } from './mqtt-contract';
import type { InboundHandler, ReportedState } from './shadow-transport';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Relógio do rastreador mais que isto fora do servidor → usa a hora do servidor. */
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

export interface TelemetryOptions {
  trackRetentionDays: number;
}

/**
 * Ingestão das mensagens dos rastreadores (MQTT local ou fila SQS `telemetria` no modo aws):
 * valida contra o contrato, emite `iot.telemetry`/`iot.device-event`/`iot.connectivity`, alimenta a rampa do bloqueio seguro,
 * os comandos aguardando `reported` e o motor de cercas, e grava o trajeto (`TrackPoint`) só durante aluguel (LGPD),
 * com `expiresAt = recordedAt + TRACK_RETENTION_DAYS`. Mensagens de uma mesma moto são processadas em ordem.
 * Logs sem coordenadas (dado pessoal durante o aluguel).
 */
export class TelemetryService implements InboundHandler {
  private readonly logger = new Logger('TelemetryService');
  private readonly vehicleIds = new Map<string, string | null>();
  private readonly chains = new Map<string, Promise<void>>();

  constructor(
    private readonly gateway: BaseIotGateway,
    private readonly geofence: { onPosition(p: PositionInput): Promise<void> },
    private readonly rentals: RentalLookup,
    private readonly prisma: Pick<PrismaClient, 'vehicle' | 'trackPoint'>,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
    private readonly opts: TelemetryOptions,
  ) {}

  /** Serializa o processamento por moto (diff de cercas e rampa dependem da ordem). */
  private serial(thingName: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.chains.get(thingName) ?? Promise.resolve();
    const next = prev.then(fn).catch((err) => this.logger.error({ msg: 'iot_inbound_failed', thingName, error: (err as Error).message }));
    this.chains.set(thingName, next);
    void next.then(() => {
      if (this.chains.get(thingName) === next) this.chains.delete(thingName);
    });
    return next;
  }

  private async vehicleIdOf(thingName: string): Promise<string | null> {
    if (this.vehicleIds.has(thingName)) return this.vehicleIds.get(thingName)!;
    const v = await this.prisma.vehicle.findUnique({ where: { thingName }, select: { id: true } });
    const id = v?.id ?? null;
    // Desconhecido não fica em cache para sempre: uma moto cadastrada depois passa a ser reconhecida.
    if (id) this.vehicleIds.set(thingName, id);
    return id;
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }

  telemetry(thingName: string, raw: unknown): Promise<void> {
    return this.serial(thingName, async () => {
      const msg = parseTelemetry(raw);
      if (!msg) {
        this.logger.warn({ msg: 'telemetry_invalid', thingName });
        return;
      }
      const vehicleId = await this.vehicleIdOf(thingName);
      if (!vehicleId) {
        this.logger.warn({ msg: 'telemetry_unknown_thing', thingName });
        return;
      }
      const now = this.clock.now();
      const deviceTs = Date.parse(msg.timestamp);
      const recordedAt = new Date(Math.abs(deviceTs - now) > MAX_CLOCK_SKEW_MS ? now : deviceTs);
      const ts = recordedAt.toISOString();

      const wasOnline = this.gateway.live.isOnline(thingName);
      await this.gateway.live.applyTelemetry(thingName, msg);
      if (!wasOnline) await this.connectivity(thingName, vehicleId, true);

      const ev: IotTelemetryEvent = {
        thingName,
        vehicleId,
        lat: msg.lat,
        lng: msg.lng,
        speedKmh: msg.velocidade_kmh,
        batteryPct: msg.bateria_pct,
        locked: msg.travada,
        ignition: msg.ignicao,
        signal: msg.sinal,
        ts,
      };
      this.events.emit(EV.IOT_TELEMETRY, ev);
      await this.gateway.onSpeed(thingName, msg.velocidade_kmh);

      const rentalId = await this.rentals.openRentalId(vehicleId);
      if (rentalId) {
        await this.prisma.trackPoint.create({
          data: {
            rentalId,
            vehicleId,
            lat: msg.lat,
            lng: msg.lng,
            speedKmh: msg.velocidade_kmh,
            recordedAt,
            expiresAt: new Date(recordedAt.getTime() + this.opts.trackRetentionDays * DAY_MS),
          },
        });
      }
      await this.geofence.onPosition({ vehicleId, thingName, lat: msg.lat, lng: msg.lng, ts });
    });
  }

  deviceEvent(thingName: string, raw: unknown): Promise<void> {
    return this.serial(thingName, async () => {
      const msg = parseDeviceEvent(raw);
      if (!msg) {
        this.logger.warn({ msg: 'device_event_invalid', thingName });
        return;
      }
      const vehicleId = await this.vehicleIdOf(thingName);
      if (!vehicleId) return;
      const ev: IotDeviceEvent = { thingName, vehicleId, type: msg.tipo, ts: msg.timestamp };
      this.logger.log({ msg: 'device_event', thingName, type: msg.tipo });
      this.events.emit(EV.IOT_DEVICE_EVENT, ev);
    });
  }

  reported(thingName: string, reported: ReportedState): Promise<void> {
    return this.serial(thingName, async () => {
      const vehicleId = await this.vehicleIdOf(thingName);
      const wasOnline = this.gateway.live.isOnline(thingName);
      await this.gateway.onReported(thingName, reported);
      if (!wasOnline && vehicleId) await this.connectivity(thingName, vehicleId, true);
    });
  }

  presence(thingName: string, online: boolean): Promise<void> {
    return this.serial(thingName, async () => {
      const vehicleId = await this.vehicleIdOf(thingName);
      await this.gateway.live.load(thingName);
      const wasOnline = this.gateway.live.isOnline(thingName);
      if (online === wasOnline) {
        if (online) await this.gateway.live.setOnline(thingName, true);
        return;
      }
      if (!online) await this.gateway.live.setOnline(thingName, false);
      if (vehicleId) await this.connectivity(thingName, vehicleId, online);
      else if (online) await this.gateway.onConnectivity(thingName, true);
    });
  }

  /** Vigia de inatividade: sem notícia há mais que o limite → offline. */
  async sweepStale(): Promise<void> {
    for (const thingName of this.gateway.live.stale()) {
      await this.serial(thingName, async () => {
        if (!this.gateway.live.stale().includes(thingName)) return;
        await this.gateway.live.setOnline(thingName, false);
        const vehicleId = await this.vehicleIdOf(thingName);
        if (vehicleId) await this.connectivity(thingName, vehicleId, false);
      });
    }
  }

  private async connectivity(thingName: string, vehicleId: string, online: boolean): Promise<void> {
    await this.gateway.onConnectivity(thingName, online);
    const ev: IotConnectivityEvent = { thingName, vehicleId, online, ts: this.nowIso() };
    this.logger.log({ msg: 'iot_connectivity', thingName, online });
    this.events.emit(EV.IOT_CONNECTIVITY, ev);
  }
}
