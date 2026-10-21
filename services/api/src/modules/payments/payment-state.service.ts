import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, type Payment } from '@prisma/client';
import { EV, type PaymentUpdatedEvent } from '../../common/events';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTransition, type PaymentStatus } from './payment-state';

export class ConcurrentPaymentUpdateError extends Error {}

type PaymentData = Omit<Prisma.PaymentUncheckedUpdateManyInput, 'status' | 'id'>;

/**
 * Única forma de mudar `Payment.status`: valida a transição na máquina de estados, grava com update condicional
 * (o status lido precisa continuar o mesmo, então duas transições concorrentes não se sobrepõem) e emite `payment.updated`.
 */
@Injectable()
export class PaymentStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Novo pagamento sempre nasce `pending`. Repetição da mesma `idempotencyKey` → P2002 (tratado por quem chama). */
  create(data: Omit<Prisma.PaymentUncheckedCreateInput, 'status'>): Promise<Payment> {
    return this.prisma.payment.create({ data: { ...data, status: 'pending' } });
  }

  async transition(paymentId: string, to: PaymentStatus, data: PaymentData = {}): Promise<Payment> {
    const current = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!current) throw new Error(`Pagamento ${paymentId} não encontrado.`);
    assertTransition(current.status, to);
    const res = await this.prisma.payment.updateMany({ where: { id: paymentId, status: current.status }, data: { ...data, status: to } });
    if (res.count === 0) throw new ConcurrentPaymentUpdateError(`Atualização concorrente do pagamento ${paymentId} (${current.status} → ${to}).`);
    const updated = (await this.prisma.payment.findUnique({ where: { id: paymentId } }))!;
    const ev: PaymentUpdatedEvent = { paymentId, status: to, ...(updated.rentalId ? { rentalId: updated.rentalId } : {}) };
    this.events.emit(EV.PAYMENT_UPDATED, ev);
    return updated;
  }

  /**
   * Reserva um estorno: valida a transição e grava status + `refundedCents` só se o pagamento ainda estiver como foi lido
   * (status e `refundedCents`). Devolve `false` se outro estorno chegou antes. Use dentro da transação do lançamento.
   */
  async claimRefund(tx: Prisma.TransactionClient, read: Payment, to: PaymentStatus, refundedCents: number): Promise<boolean> {
    assertTransition(read.status, to);
    const res = await tx.payment.updateMany({ where: { id: read.id, status: read.status, refundedCents: read.refundedCents }, data: { status: to, refundedCents } });
    return res.count === 1;
  }

  emitUpdated(p: Payment): void {
    const ev: PaymentUpdatedEvent = { paymentId: p.id, status: p.status, ...(p.rentalId ? { rentalId: p.rentalId } : {}) };
    this.events.emit(EV.PAYMENT_UPDATED, ev);
  }

  /** Atualiza campos sem mudar o status (ex.: id do gateway de um Pix recém-criado). */
  async annotate(paymentId: string, data: PaymentData): Promise<Payment> {
    return this.prisma.payment.update({ where: { id: paymentId }, data });
  }
}

export const isUniqueViolation = (err: unknown): boolean => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
