import { Injectable } from '@nestjs/common';
import { MAX_SPEED_KMH } from '../../common/enums';
import { CommandOutcome, CommandRequest, InvalidSpeedLimitError, IotGateway, VehicleLiveState } from '../../ports/iot-gateway.port';

interface StubState {
  locked: boolean;
  speedLimitKmh: number;
  stolenMode: boolean;
}

/**
 * Stub da Task 3 (substituído pela Task 4 por `LocalMqttIotGateway`/`AwsIotGateway`): responde `confirmed` na hora
 * e guarda o estado desejado em memória. `getLiveState` devolve `null` (sem telemetria) a menos que um teste defina a posição.
 */
@Injectable()
export class StubIotGateway implements IotGateway {
  private readonly state = new Map<string, StubState>();
  private readonly live = new Map<string, VehicleLiveState>();

  private get(thingName: string): StubState {
    let s = this.state.get(thingName);
    if (!s) {
      s = { locked: true, speedLimitKmh: MAX_SPEED_KMH, stolenMode: false };
      this.state.set(thingName, s);
    }
    return s;
  }

  private ok(req: CommandRequest): CommandOutcome {
    return { commandId: req.commandId, status: 'confirmed' };
  }

  async lock(req: CommandRequest): Promise<CommandOutcome> {
    this.get(req.thingName).locked = true;
    return this.ok(req);
  }

  async unlock(req: CommandRequest): Promise<CommandOutcome> {
    this.get(req.thingName).locked = false;
    return this.ok(req);
  }

  async setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome> {
    if (!Number.isFinite(kmh) || kmh < 0 || kmh > MAX_SPEED_KMH) throw new InvalidSpeedLimitError(`Limite inválido: ${kmh}`);
    this.get(req.thingName).speedLimitKmh = kmh;
    return this.ok(req);
  }

  async setStolenMode(req: CommandRequest, on: boolean): Promise<CommandOutcome> {
    this.get(req.thingName).stolenMode = on;
    return this.ok(req);
  }

  async horn(req: CommandRequest): Promise<CommandOutcome> {
    return this.ok(req);
  }

  async getLiveState(thingName: string): Promise<VehicleLiveState | null> {
    const live = this.live.get(thingName);
    if (!live) return null;
    const s = this.get(thingName);
    return { ...live, locked: s.locked, speedLimitKmh: s.speedLimitKmh, stolenMode: s.stolenMode };
  }

  /** Sem telemetria definida = desconhecida (`null`, em movimento); com `setLiveState`, a velocidade definida. */
  async knownSpeedKmh(thingName: string): Promise<number | null> {
    return this.live.get(thingName)?.speedKmh ?? null;
  }

  /** Apoio a testes/dev: define a posição ao vivo de uma moto. */
  setLiveState(state: VehicleLiveState): void {
    this.live.set(state.thingName, state);
  }

  /** Estado desejado guardado (para inspeção em testes). */
  desired(thingName: string): StubState {
    return { ...this.get(thingName) };
  }
}
