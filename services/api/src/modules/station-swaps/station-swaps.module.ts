import { randomUUID } from 'node:crypto';
import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Module } from '@nestjs/common';
import { connect } from 'mqtt';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { STATION_GATEWAY, type StationGateway } from '../../ports/station-gateway.port';
import { AlertsModule } from '../alerts/alerts.module';
import { IOT_CONFIG, type IotConfig } from '../iot/iot-config';
import type { MqttClientLike } from '../iot/local-mqtt.transport';
import { PricingModule } from '../pricing/pricing.module';
import { loadStationQrSecret } from './station-code';
import { AwsStationGateway, MqttStationGateway, StubStationGateway } from './station-gateways';
import { StationSwapsController } from './station-swaps.controller';
import { STATION_SWAP_CONFIG, StationSwapsService, type StationSwapConfig } from './station-swaps.service';
import { SWAP_STEP_TIMEOUT_MS } from './station-swap.rules';

const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const v = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(v) && v > 0 ? v : fallback;
};

/**
 * Troca de bateria na estação via QR. Porta da estação pelo mesmo `IOT_MODE` das motos: `stub` (avança sozinha,
 * `STATION_STUB_STEP_MS`), `local` (Mosquitto + `services/station-sim`) ou `aws` (IoT Data Plane + fila `estacoes`).
 */
@Module({
  imports: [PricingModule, AlertsModule],
  controllers: [StationSwapsController],
  providers: [
    {
      provide: STATION_SWAP_CONFIG,
      useFactory: (): StationSwapConfig => ({ stepTimeoutMs: num('STATION_SWAP_STEP_TIMEOUT_MS', SWAP_STEP_TIMEOUT_MS), qrSecret: loadStationQrSecret() }),
    },
    {
      provide: STATION_GATEWAY,
      inject: [IOT_CONFIG, QUEUE_BUS],
      useFactory: (cfg: IotConfig, queue: QueueBus): StationGateway => {
        if (cfg.iotMode === 'stub') return new StubStationGateway({ stepMs: num('STATION_STUB_STEP_MS', 1_500) });
        if (cfg.iotMode === 'aws') return new AwsStationGateway(new IoTDataPlaneClient({ region: cfg.region, endpoint: cfg.iotEndpoint }), queue);
        return new MqttStationGateway(
          () => connect(cfg.mqttUrl, { clientId: `volti-api-st-${randomUUID().slice(0, 8)}`, clean: true, reconnectPeriod: 2_000, connectTimeout: 5_000 }) as unknown as MqttClientLike,
        );
      },
    },
    StationSwapsService,
  ],
  exports: [StationSwapsService, STATION_GATEWAY],
})
export class StationSwapsModule {}
