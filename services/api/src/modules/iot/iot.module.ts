import { Global, Module } from '@nestjs/common';
import { IOT_GATEWAY } from '../../ports/iot-gateway.port';
import { StubIotGateway } from './stub-iot-gateway';

/**
 * Módulo IoT — dono: Task 4 (agente 3). Hoje só registra o `StubIotGateway`.
 * A Task 4 troca o provider por `LocalMqttIotGateway`/`AwsIotGateway` (seleção por `IOT_MODE`) e adiciona
 * o consumo de telemetria e o motor de cercas, emitindo `iot.*` e `geofence.transition`.
 */
@Global()
@Module({
  providers: [StubIotGateway, { provide: IOT_GATEWAY, useExisting: StubIotGateway }],
  exports: [IOT_GATEWAY],
})
export class IotModule {}
