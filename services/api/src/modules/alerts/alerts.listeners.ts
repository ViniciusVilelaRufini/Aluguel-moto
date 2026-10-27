import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertPriority, AlertType } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { CommandChangedEvent, EV, GeofenceTransitionEvent, IotConnectivityEvent, IotDeviceEvent, ZoneSpeedExceededEvent } from '../../common/events';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_NEEDS_REVIEW, type PaymentNeedsReviewEvent } from '../payments/payment-review';
import { AlertsService, CreateAlertInput } from './alerts.service';

/** Motivo técnico da revisão → texto pt-BR do alerta (sem dados pessoais). */
export function paymentReviewMessage(reason: string): string {
  if (reason.startsWith('subscription_late_charge')) return 'Cobrança de assinatura encerrada precisa de revisão (estorno não concluído).';
  if (reason.startsWith('refund')) return 'Estorno recusado pelo gateway: revisar o pagamento.';
  if (reason === 'review_timeout') return 'Cobrança em análise no gateway além do prazo: revisar o pagamento.';
  return 'Cobrança do aluguel parada para revisão manual.';
}

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

/** Gera alertas a partir dos eventos internos e da fila `alertas` (SQS/EventBridge em produção). */
@Injectable()
export class AlertsListeners implements OnModuleInit {
  private readonly logger = new Logger('AlertsListeners');

  constructor(
    private readonly alerts: AlertsService,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
  ) {}

  onModuleInit(): void {
    // Alertas vindos de fora do processo (Lambdas, EventBridge) chegam pela fila `alertas`.
    // Eventos de dispositivo NÃO passam por aqui (vão pela fila de telemetria, com a identidade só do tópico →
    // parseDeviceEvent); só alertas já formados, reduzidos aos campos conhecidos e validados (nada do corpo é espalhado no
    // Prisma). O evento cru do rastreador (`{ thingName, tipo }`) é descartado: o `thingName` do corpo não é confiável.
    this.queue.subscribe<unknown>('alertas', (msg) => this.onQueueMessage(msg));
  }

  /** Fila `alertas`: só `CreateAlertInput` válido. Mensagem inválida é descartada com aviso (sem conteúdo no log). */
  async onQueueMessage(msg: unknown): Promise<void> {
    const input = parseCreateAlertInput(msg);
    if (!input) {
      this.logger.warn({ msg: 'alert_message_invalid', keys: isObj(msg) ? Object.keys(msg).slice(0, 10) : typeof msg });
      return;
    }
    await this.alerts.create(input);
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

  /** Pagamento que exige revisão manual (Task 14): alerta `payment_needs_review`, um aberto por pagamento. */
  /** Moto `relay_only` acima do limite da zona por mais de 5 s (spec GT06 §10); a deduplicação de 10 min agrupa repetições. */
  @OnEvent(EV.ZONE_SPEED_EXCEEDED, { async: true, promisify: true })
  async onZoneSpeedExceeded(ev: ZoneSpeedExceededEvent): Promise<void> {
    await this.alerts.create({
      type: 'zone_speed_exceeded',
      priority: ev.speedLimitKmh <= 6 ? 'high' : 'medium',
      message: `Acima do limite da zona (${ev.speedLimitKmh} km/h): o rastreador só relé não reduz a velocidade.`,
      vehicleId: ev.vehicleId,
      rentalId: ev.rentalId,
      ...(await this.position(ev.vehicleId)),
    });
  }

  @OnEvent(PAYMENT_NEEDS_REVIEW, { async: true, promisify: true })
  async onPaymentNeedsReview(ev: PaymentNeedsReviewEvent): Promise<void> {
    try {
      await this.alerts.create({ type: 'payment_needs_review', priority: 'high', message: paymentReviewMessage(ev.reason), paymentId: ev.paymentId, rentalId: ev.rentalId }, { dedupe: false });
    } catch (err) {
      // O pagamento já ficou marcado para revisão (log `payment_needs_manual_review`); a falha do alerta não pode derrubar quem emitiu.
      this.logger.error({ msg: 'payment_review_alert_failed', paymentId: ev.paymentId, error: (err as Error).message });
    }
  }

  @OnEvent(EV.COMMAND_CHANGED, { async: true, promisify: true })
  async onCommandChanged(ev: CommandChangedEvent): Promise<void> {
    if (ev.status !== 'failed') return;
    await this.alerts.create({ type: 'command_failed', priority: ev.type === 'lock' ? 'high' : 'medium', message: `Comando ${ev.type} falhou (${ev.reason ?? 'sem motivo'}).`, vehicleId: ev.vehicleId });
  }
}
