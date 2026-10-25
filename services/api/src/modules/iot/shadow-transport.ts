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

/**
 * Origem de um `reported`:
 * - publicado pelo rastreador agora (MQTT local): `fromPoll` ausente → conta como sinal de vida e amostra de velocidade de agora;
 * - lido pelo servidor (`GetThingShadow`, modo aws): `fromPoll: true` → nunca marca online; cada campo vale pelo horário da
 *   metadata do shadow (`timestamps`, ms), e a velocidade só é usada se for mais nova que a última amostra e fresca.
 */
export interface ReportedMeta {
  fromPoll?: boolean;
  timestamps?: Partial<Record<keyof ReportedState, number>>;
}

/** Mensagens que chegam dos rastreadores (payload bruto: a validação fica no `TelemetryService`). */
export interface InboundHandler {
  telemetry(thingName: string, raw: unknown): Promise<void>;
  deviceEvent(thingName: string, raw: unknown): Promise<void>;
  reported(thingName: string, reported: ReportedState, meta?: ReportedMeta): Promise<void>;
  /** `at`: horário do evento de presença (ms), quando conhecido — presença atrasada (fila sem ordem) é descartada. */
  presence(thingName: string, online: boolean, at?: number): Promise<void>;
}

/** Transporte completo (local: Mosquitto; aws: IoT Data Plane + SQS). */
export interface IotTransport extends ShadowTransport {
  start(inbound: InboundHandler): Promise<void>;
  stop(): Promise<void>;
  /** Avisa que há comandos aguardando `reported` (o modo aws consulta o shadow enquanto houver). */
  watch?(thingName: string, active: boolean): void;
  /** Documento do shadow (desired/reported) direto da fonte — teto do limite quando o Redis não responde. */
  readShadow?(thingName: string): Promise<{ desired: DesiredState; reported: ReportedState } | null>;
}
