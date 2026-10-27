import { randomUUID } from 'node:crypto';
import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { LocationClient } from '@aws-sdk/client-location';
import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { connect } from 'mqtt';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { CommandsGeofenceCommander, PrismaRentalLookup, PrismaZoneVehiclePositions } from './adapters';
import { AwsIotTransport } from './aws-iot.transport';
import { BaseIotGateway } from './base-iot-gateway';
import { IOT_CLOCK, SystemClock, type Clock } from './clock';
import { AwsLocationGeofenceEngine } from './geofence/aws-location-geofence-engine';
import { GEOFENCE_ENGINE, type GeofenceEngine } from './geofence/geofence-engine';
import { GEOFENCE_COMMANDER, GeofenceService, RENTAL_LOOKUP, type GeofenceCommander, type RentalLookup } from './geofence/geofence.service';
import { LocalGeofenceEngine } from './geofence/local-geofence-engine';
import { AwsIotGateway, LocalMqttIotGateway } from './gateways';
import { IOT_CONFIG, loadIotConfig, type IotConfig } from './iot-config';
import { IotRuntime } from './iot.runtime';
import { LiveStateStore } from './live-state.store';
import { LocalMqttTransport, type MqttClientLike } from './local-mqtt.transport';
import { LocalShadowStore } from './local-shadow';
import { RedisSafeLockStore } from './safe-lock.store';
import { RedisRelayLockStore } from './relay-lock.store';
import { StubIotGateway } from './stub-iot-gateway';
import { TelemetryService } from './telemetry.service';
import { PrismaTrackerModeLookup, TRACKER_MODES, type TrackerModeLookup } from './tracker-mode';
import { ZoneSpeedMonitor } from './geofence/zone-speed-monitor';

/**
 * Módulo IoT (Task 4). Seleção por variável de ambiente:
 * - `IOT_MODE=local` (padrão): `LocalMqttIotGateway` no Mosquitto, com emulação do serviço de shadow;
 * - `IOT_MODE=aws`: `AwsIotGateway` (IoT Data Plane + fila SQS `telemetria`);
 * - `IOT_MODE=stub`: `StubIotGateway` da Task 3 (confirma na hora; usado pelos e2e que não têm rastreador).
 * - `GEOFENCE_MODE=local` (PostGIS) ou `aws` (Amazon Location).
 */
@Global()
@Module({
  providers: [
    { provide: IOT_CONFIG, useFactory: loadIotConfig },
    { provide: IOT_CLOCK, useFactory: () => new SystemClock() },
    StubIotGateway,
    {
      provide: LiveStateStore,
      inject: [REDIS_STORE, IOT_CLOCK, IOT_CONFIG],
      useFactory: (redis: RedisStore, clock: Clock, cfg: IotConfig) => new LiveStateStore(redis, clock, cfg.offlineAfterMs, cfg.reconnectGraceMs),
    },
    {
      provide: IOT_GATEWAY,
      inject: [IOT_CONFIG, IOT_CLOCK, LiveStateStore, EventEmitter2, REDIS_STORE, QUEUE_BUS, StubIotGateway],
      useFactory: (cfg: IotConfig, clock: Clock, live: LiveStateStore, events: EventEmitter2, redis: RedisStore, queue: QueueBus, stub: StubIotGateway): IotGateway => {
        // Rampas do bloqueio seguro no Redis: telemetria processada por qualquer instância avança a rampa e um deploy não a perde.
        const opts = { confirmWaitMs: cfg.confirmWaitMs, commandTimeoutMs: cfg.commandTimeoutMs, safeLockStore: new RedisSafeLockStore(redis), relayLockStore: new RedisRelayLockStore(redis) };
        if (cfg.iotMode === 'stub') return stub;
        if (cfg.iotMode === 'aws') {
          const client = new IoTDataPlaneClient({ region: cfg.region, endpoint: cfg.iotEndpoint });
          return new AwsIotGateway(new AwsIotTransport(client, queue, { pollMs: cfg.shadowPollMs }), live, clock, events, opts);
        }
        const mqttConnect = (): MqttClientLike =>
          connect(cfg.mqttUrl, { clientId: `volti-api-${randomUUID().slice(0, 8)}`, clean: true, reconnectPeriod: 2_000, connectTimeout: 5_000 }) as unknown as MqttClientLike;
        return new LocalMqttIotGateway(new LocalMqttTransport(mqttConnect, new LocalShadowStore(redis)), live, clock, events, opts);
      },
    },
    {
      provide: GEOFENCE_ENGINE,
      inject: [IOT_CONFIG, PrismaService],
      useFactory: (cfg: IotConfig, prisma: PrismaService): GeofenceEngine => {
        const local = new LocalGeofenceEngine(prisma);
        if (cfg.geofenceMode !== 'aws') return local;
        return new AwsLocationGeofenceEngine(prisma, new LocationClient({ region: cfg.region }), { trackerName: cfg.trackerName, collectionName: cfg.geofenceCollection }, local);
      },
    },
    { provide: RENTAL_LOOKUP, inject: [PrismaService, IOT_CLOCK], useFactory: (prisma: PrismaService, clock: Clock) => new PrismaRentalLookup(prisma, clock) },
    { provide: GEOFENCE_COMMANDER, inject: [ModuleRef], useFactory: (moduleRef: ModuleRef) => new CommandsGeofenceCommander(moduleRef) },
    { provide: TRACKER_MODES, inject: [PrismaService, IOT_CLOCK], useFactory: (prisma: PrismaService, clock: Clock) => new PrismaTrackerModeLookup(prisma, clock) },
    {
      provide: GeofenceService,
      inject: [GEOFENCE_ENGINE, GEOFENCE_COMMANDER, RENTAL_LOOKUP, EventEmitter2, IOT_CLOCK, REDIS_STORE, IOT_CONFIG, PrismaService, LiveStateStore, TRACKER_MODES],
      useFactory: (
        engine: GeofenceEngine,
        commander: GeofenceCommander,
        rentals: RentalLookup,
        events: EventEmitter2,
        clock: Clock,
        redis: RedisStore,
        cfg: IotConfig,
        prisma: PrismaService,
        live: LiveStateStore,
        modes: TrackerModeLookup,
      ) => new GeofenceService(engine, commander, rentals, events, clock, redis, { outOfAreaLockMinutes: cfg.outOfAreaLockMinutes }, new PrismaZoneVehiclePositions(prisma), live, modes),
    },
    {
      provide: ZoneSpeedMonitor,
      inject: [TRACKER_MODES, GeofenceService, REDIS_STORE, EventEmitter2, RENTAL_LOOKUP],
      useFactory: (modes: TrackerModeLookup, geofence: GeofenceService, redis: RedisStore, events: EventEmitter2, rentals: RentalLookup) => new ZoneSpeedMonitor(modes, geofence, redis, events, rentals),
    },
    {
      provide: TelemetryService,
      inject: [IOT_GATEWAY, GeofenceService, RENTAL_LOOKUP, PrismaService, EventEmitter2, IOT_CLOCK, APP_CONFIG, IOT_CONFIG, ZoneSpeedMonitor],
      useFactory: (gw: IotGateway, geofence: GeofenceService, rentals: RentalLookup, prisma: PrismaService, events: EventEmitter2, clock: Clock, app: AppConfig, cfg: IotConfig, zoneSpeed: ZoneSpeedMonitor) =>
        gw instanceof BaseIotGateway ? new TelemetryService(gw, geofence, rentals, prisma, events, clock, { trackRetentionDays: app.trackRetentionDays, reconnectGapMs: cfg.reconnectGapMs, queueLagMs: cfg.queueLagMs }, zoneSpeed) : null,
    },
    IotRuntime,
  ],
  exports: [IOT_GATEWAY, IOT_CONFIG],
})
export class IotModule {}
