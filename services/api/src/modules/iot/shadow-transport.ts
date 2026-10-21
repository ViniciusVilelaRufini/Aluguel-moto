export const SHADOW_TRANSPORT = Symbol('SHADOW_TRANSPORT');

/** Estado desejado do shadow (`packages/contracts/mqtt.md`). Só os campos presentes são alterados. */
export interface DesiredState {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
}

/** Estado reportado pelo rastreador. */
export interface ReportedState {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
  firmware?: string;
  velocidade_kmh?: number;
}

/** Comando momentâneo em `motos/{thingName}/comandos`. */
export interface MomentaryCommand {
  comando_id: string;
  acao: 'buzina';
}

/**
 * Porta interna do módulo IoT: como o servidor fala com o rastreador.
 * Local: Mosquitto + emulação do serviço de shadow. AWS: IoT Data Plane.
 */
export interface ShadowTransport {
  updateDesired(thingName: string, desired: DesiredState): Promise<void>;
  publishCommand(thingName: string, command: MomentaryCommand): Promise<void>;
}

/** Mensagens que chegam dos rastreadores (payload bruto: a validação fica no `TelemetryService`). */
export interface InboundHandler {
  telemetry(thingName: string, raw: unknown): Promise<void>;
  deviceEvent(thingName: string, raw: unknown): Promise<void>;
  reported(thingName: string, reported: ReportedState): Promise<void>;
  presence(thingName: string, online: boolean): Promise<void>;
}

/** Transporte completo (local: Mosquitto; aws: IoT Data Plane + SQS). */
export interface IotTransport extends ShadowTransport {
  start(inbound: InboundHandler): Promise<void>;
  stop(): Promise<void>;
  /** Avisa que há comandos aguardando `reported` (o modo aws consulta o shadow enquanto houver). */
  watch?(thingName: string, active: boolean): void;
}
