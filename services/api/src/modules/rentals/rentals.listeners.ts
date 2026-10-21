import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { EV, GeofenceTransitionEvent, IotDeviceEvent, PaymentUpdatedEvent } from '../../common/events';
import { PrismaService } from '../../prisma/prisma.service';

/** Prazo para responder ao "Você está bem?" depois de uma queda. */
export const WELLBEING_TIMEOUT_MS = 60_000;

/** Consumidores dos eventos internos que afetam o aluguel (linha do tempo, "você está bem?"). */
@Injectable()
export class RentalsListeners {
  private readonly logger = new Logger('RentalsListeners');

  constructor(private readonly prisma: PrismaService) {}

  private async openRentalFor(vehicleId: string, rentalId?: string) {
    if (rentalId) return this.prisma.rental.findFirst({ where: { id: rentalId, status: { in: OPEN_RENTAL_STATUSES } } });
    return this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } } });
  }

  /** ENTER/EXIT de cercas → `RentalEvent` (zona, saída/retorno da área de operação) e limite em vigor. */
  @OnEvent(EV.GEOFENCE_TRANSITION, { async: true, promisify: true })
  async onGeofence(ev: GeofenceTransitionEvent): Promise<void> {
    const rental = await this.openRentalFor(ev.vehicleId, ev.rentalId);
    if (!rental) return;
    const type =
      ev.zoneType === 'operation'
        ? ev.transition === 'EXIT' ? 'left_operation_area' : 'returned_operation_area'
        : ev.transition === 'ENTER' ? 'zone_entered' : 'zone_exited';
    await this.prisma.rentalEvent.create({
      data: { rentalId: rental.id, type, actorType: 'system', at: new Date(ev.ts), data: { zoneId: ev.zoneId, zoneType: ev.zoneType, speedLimitKmh: ev.speedLimitKmh ?? null } },
    });
    if (ev.zoneType === 'reduced_speed') {
      await this.prisma.rental.update({ where: { id: rental.id }, data: { speedLimitKmh: ev.transition === 'ENTER' ? (ev.speedLimitKmh ?? null) : null } });
    }
  }

  /** Queda durante o aluguel → evento `fall_detected` e prazo de 60 s para o "Você está bem?". */
  @OnEvent(EV.IOT_DEVICE_EVENT, { async: true, promisify: true })
  async onDeviceEvent(ev: IotDeviceEvent): Promise<void> {
    if (ev.type !== 'queda') return;
    const rental = await this.openRentalFor(ev.vehicleId);
    if (!rental) return;
    await this.prisma.rentalEvent.create({ data: { rentalId: rental.id, type: 'fall_detected', actorType: 'system', at: new Date(ev.ts) } });
    await this.prisma.rental.update({ where: { id: rental.id }, data: { wellbeingCheckDueAt: new Date(Date.now() + WELLBEING_TIMEOUT_MS) } });
  }

  /** `payment.updated` da liquidação do aluguel → vincula o pagamento se ainda não estiver vinculado. */
  @OnEvent(EV.PAYMENT_UPDATED, { async: true, promisify: true })
  async onPaymentUpdated(ev: PaymentUpdatedEvent): Promise<void> {
    if (!ev.rentalId) return;
    await this.prisma.rental.updateMany({ where: { id: ev.rentalId, paymentId: null }, data: { paymentId: ev.paymentId } });
    this.logger.log({ msg: 'rental_payment_updated', rentalId: ev.rentalId, status: ev.status });
  }
}
