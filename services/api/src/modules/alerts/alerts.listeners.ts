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
    this.queue.subscribe<CreateAlertInput>('alertas', async (msg) => {
      await this.alerts.create(msg);
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
