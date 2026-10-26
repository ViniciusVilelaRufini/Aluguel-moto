import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlertPriority, AlertType } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { CommandChangedEvent, EV, GeofenceTransitionEvent, IotConnectivityEvent, IotDeviceEvent } from '../../common/events';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService, CreateAlertInput } from './alerts.service';

const DEVICE_ALERTS: Record<IotDeviceEvent['type'], { type: AlertType; priority: AlertPriority; message: string }> = {
  queda: { type: 'fall_detected', priority: 'high', message: 'Queda detectada.' },
  violacao: { type: 'tamper', priority: 'high', message: 'Violação do rastreador detectada.' },
  bateria_critica: { type: 'battery_critical', priority: 'medium', message: 'Bateria em nível crítico.' },
  movimento_sem_aluguel: { type: 'movement_without_rental', priority: 'high', message: 'Movimento sem aluguel ativo.' },
};

const ALERT_TYPES = new Set<string>(['out_of_operation_area', 'forbidden_zone_entered', 'fall_detected', 'tamper', 'battery_critical', 'movement_without_rental', 'vehicle_offline', 'command_failed', 'customer_not_ok', 'incident_reported', 'speed_limiter_noncompliant'] satisfies AlertType[]);
const ALERT_PRIORITIES = new Set<string>(['critical', 'high', 'medium', 'low']);

function parseAlertMessage(m: unknown): CreateAlertInput | null {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const r = m as Record<string, unknown>;
  if (typeof r.type !== 'string' || !ALERT_TYPES.has(r.type)) return null;
  if (typeof r.priority !== 'string' || !ALERT_PRIORITIES.has(r.priority)) return null;
  if (typeof r.message !== 'string' || !r.message || r.message.length > 500) return null;
  const out: CreateAlertInput = { type: r.type as AlertType, priority: r.priority as AlertPriority, message: r.message };
  if (typeof r.vehicleId === 'string') out.vehicleId = r.vehicleId;
  if (typeof r.rentalId === 'string') out.rentalId = r.rentalId;
  if (typeof r.lat === 'number' && Number.isFinite(r.lat)) out.lat = r.lat;
  if (typeof r.lng === 'number' && Number.isFinite(r.lng)) out.lng = r.lng;
  return out;
}

/** Gera alertas a partir dos eventos internos e da fila `alertas` (SQS/EventBridge em produção). */
@Injectable()
export class AlertsListeners implements OnModuleInit {
  constructor(
    private readonly alerts: AlertsService,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
  ) {}

  onModuleInit(): void {
    // Alertas vindos de fora do processo (Lambdas, EventBridge) chegam pela fila `alertas`.
    // Eventos de dispositivo NÃO passam por aqui (vão pela fila de telemetria → parseDeviceEvent); só alertas já formados,
    // reduzidos aos campos conhecidos e validados (nada do corpo é espalhado no Prisma).
    this.queue.subscribe<unknown>('alertas', async (msg) => {
      const input = parseAlertMessage(msg);
      if (input) await this.alerts.create(input);
    });
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
