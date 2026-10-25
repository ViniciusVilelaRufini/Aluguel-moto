import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AlertPriority, AlertType } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { CommandChangedEvent, EV, GeofenceTransitionEvent, IotConnectivityEvent, IotDeviceEvent } from '../../common/events';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDeviceEvent } from '../iot/mqtt-contract';
import { AlertsService, CreateAlertInput } from './alerts.service';

const DEVICE_ALERTS: Record<IotDeviceEvent['type'], { type: AlertType; priority: AlertPriority; message: string }> = {
  queda: { type: 'fall_detected', priority: 'high', message: 'Queda detectada.' },
  violacao: { type: 'tamper', priority: 'high', message: 'Violação do rastreador detectada.' },
  bateria_critica: { type: 'battery_critical', priority: 'medium', message: 'Bateria em nível crítico.' },
  movimento_sem_aluguel: { type: 'movement_without_rental', priority: 'high', message: 'Movimento sem aluguel ativo.' },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optUuid = (v: unknown) => v === undefined || (typeof v === 'string' && UUID.test(v));
const optCoord = (v: unknown, max: number) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max);

/** Mensagem da fila `alertas` já no formato `CreateAlertInput` (produtores que não são o rastreador). */
export function parseCreateAlertInput(raw: unknown): CreateAlertInput | null {
  if (!isObj(raw)) return null;
  const { type, priority, message, vehicleId, rentalId, depotId, lat, lng } = raw;
  if (typeof type !== 'string' || !(Object.values(AlertType) as string[]).includes(type)) return null;
  if (typeof priority !== 'string' || !(Object.values(AlertPriority) as string[]).includes(priority)) return null;
  if (typeof message !== 'string' || message.trim() === '' || message.length > 500) return null;
  if (!optUuid(vehicleId) || !optUuid(rentalId) || !optUuid(depotId) || !optCoord(lat, 90) || !optCoord(lng, 180)) return null;
  const out: CreateAlertInput = { type: type as AlertType, priority: priority as AlertPriority, message };
  if (vehicleId !== undefined) out.vehicleId = vehicleId as string;
  if (rentalId !== undefined) out.rentalId = rentalId as string;
  if (depotId !== undefined) out.depotId = depotId as string;
  if (lat !== undefined) out.lat = lat as number;
  if (lng !== undefined) out.lng = lng as number;
  return out;
}

/**
 * Evento cru do rastreador (`motos/+/eventos`, regra IoT `SELECT *, topic(2) AS thingName`): `{ thingName, tipo, timestamp }`.
 * A Task 4 levou essa regra para a fila de telemetria, mas a fila `alertas` tolera os dois formatos (docs/decisoes.md).
 */
export function parseRawDeviceEvent(raw: unknown): { thingName: string; tipo: IotDeviceEvent['type']; timestamp: string } | null {
  if (!isObj(raw)) return null;
  const thingName = typeof raw.thingName === 'string' ? raw.thingName : typeof raw.thing === 'string' ? raw.thing : undefined;
  if (!thingName || thingName.length > 128) return null;
  const ev = parseDeviceEvent(raw);
  return ev ? { thingName, tipo: ev.tipo, timestamp: ev.timestamp } : null;
}

/** Gera alertas a partir dos eventos internos e da fila `alertas` (SQS/EventBridge em produção). */
@Injectable()
export class AlertsListeners implements OnModuleInit {
  private readonly logger = new Logger('AlertsListeners');

  constructor(
    private readonly alerts: AlertsService,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit(): void {
    // Alertas vindos de fora do processo (Lambdas, EventBridge) chegam pela fila `alertas`.
    this.queue.subscribe<unknown>('alertas', (msg) => this.onQueueMessage(msg));
  }

  /**
   * Fila `alertas`: aceita `CreateAlertInput` ou o evento cru do rastreador (normalizado aqui: moto pelo `thingName`, aluguel
   * aberto e posição). Mensagem inválida é descartada com aviso (sem conteúdo no log), não reprocessada para sempre.
   */
  async onQueueMessage(msg: unknown): Promise<void> {
    const input = parseCreateAlertInput(msg);
    if (input) {
      await this.alerts.create(input);
      return;
    }
    const raw = parseRawDeviceEvent(msg);
    if (!raw) {
      this.logger.warn({ msg: 'alert_message_invalid', keys: isObj(msg) ? Object.keys(msg).slice(0, 10) : typeof msg });
      return;
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { thingName: raw.thingName }, select: { id: true } });
    if (!vehicle) {
      this.logger.warn({ msg: 'alert_unknown_thing', thingName: raw.thingName, tipo: raw.tipo });
      return;
    }
    // Mesmo caminho do evento vindo pela telemetria: alerta (aqui), `device.event` no tempo real e o "você está bem?".
    const ev: IotDeviceEvent = { thingName: raw.thingName, vehicleId: vehicle.id, type: raw.tipo, ts: raw.timestamp };
    this.logger.log({ msg: 'device_event_from_alert_queue', thingName: raw.thingName, type: raw.tipo });
    await this.events.emitAsync(EV.IOT_DEVICE_EVENT, ev);
  }

  private async position(vehicleId: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { lat: true, lng: true } });
    return v ? { lat: v.lat, lng: v.lng } : {};
  }

  private async rentalId(vehicleId: string) {
    const r = await this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    return r?.id;
  }

  @OnEvent(EV.IOT_DEVICE_EVENT, { async: true, promisify: true })
  async onDeviceEvent(ev: IotDeviceEvent): Promise<void> {
    const spec = DEVICE_ALERTS[ev.type];
    if (!spec) return;
    await this.alerts.create({ ...spec, vehicleId: ev.vehicleId, rentalId: await this.rentalId(ev.vehicleId), ...(await this.position(ev.vehicleId)) });
  }

  @OnEvent(EV.IOT_CONNECTIVITY, { async: true, promisify: true })
  async onConnectivity(ev: IotConnectivityEvent): Promise<void> {
    if (ev.online) return;
    const rentalId = await this.rentalId(ev.vehicleId);
    await this.alerts.create({
      type: 'vehicle_offline',
      priority: rentalId ? 'high' : 'medium',
      message: rentalId ? 'Moto em aluguel perdeu a conexão.' : 'Moto perdeu a conexão.',
      vehicleId: ev.vehicleId,
      rentalId,
      ...(await this.position(ev.vehicleId)),
    });
  }

  @OnEvent(EV.GEOFENCE_TRANSITION, { async: true, promisify: true })
  async onGeofence(ev: GeofenceTransitionEvent): Promise<void> {
    if (ev.zoneType === 'operation' && ev.transition === 'EXIT') {
      await this.alerts.create({ type: 'out_of_operation_area', priority: 'high', message: 'Moto saiu da área de operação.', vehicleId: ev.vehicleId, rentalId: ev.rentalId, ...(await this.position(ev.vehicleId)) });
    }
    if (ev.zoneType === 'forbidden' && ev.transition === 'ENTER') {
      await this.alerts.create({ type: 'forbidden_zone_entered', priority: 'high', message: 'Moto entrou em zona proibida.', vehicleId: ev.vehicleId, rentalId: ev.rentalId, ...(await this.position(ev.vehicleId)) });
    }
  }

  @OnEvent(EV.COMMAND_CHANGED, { async: true, promisify: true })
  async onCommandChanged(ev: CommandChangedEvent): Promise<void> {
    if (ev.status !== 'failed') return;
    await this.alerts.create({ type: 'command_failed', priority: ev.type === 'lock' ? 'high' : 'medium', message: `Comando ${ev.type} falhou (${ev.reason ?? 'sem motivo'}).`, vehicleId: ev.vehicleId });
  }
}
