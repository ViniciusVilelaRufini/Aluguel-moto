import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DepositReleaseRequestedEvent, EV, PaymentUpdatedEvent } from '../../common/events';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import type { PixCharge, RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';

export const DEPOSIT_CENTS = 5000;
/** PNG 1×1 transparente (placeholder do QR do Pix no stub). */
const QR_PLACEHOLDER = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Stub da Task 3 (substituído pela Task 5 por `RentalBillingService`): aprova tudo.
 * `holdDeposit` → `held` (cartão) ou `awaiting_pix` (Pix, confirmado sozinho após `STUB_PIX_AUTOCONFIRM_SECONDS`);
 * `settle` → `paid`; `isDelinquent` → `false`. Grava `Deposit`/`Payment` para os endpoints de leitura funcionarem.
 */
@Injectable()
export class StubRentalBilling implements RentalBillingPort {
  private readonly logger = new Logger('StubRentalBilling');

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async holdDeposit(input: { customerId: string; rentalId: string; method: 'card' | 'pix'; idempotencyKey: string }) {
    const existing = await this.prisma.deposit.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      return { depositId: existing.id, status: existing.status === 'awaiting_pix' ? ('awaiting_pix' as const) : ('held' as const), pix: (existing.pix as PixCharge | null) ?? undefined };
    }
    const fee = await this.prisma.fee.findUnique({ where: { code: 'deposit' } });
    const amountCents = fee?.active ? fee.amountCents : DEPOSIT_CENTS;
    if (input.method === 'card') {
      const d = await this.prisma.deposit.create({
        data: { customerId: input.customerId, rentalId: input.rentalId, method: 'card', status: 'held', amountCents, idempotencyKey: input.idempotencyKey, providerReference: `stub-auth-${randomUUID()}` },
      });
      return { depositId: d.id, status: 'held' as const };
    }
    const pix: PixCharge = {
      chargeId: `stub-pix-${randomUUID()}`,
      qrCodeBase64: QR_PLACEHOLDER,
      copyPaste: `00020126580014br.gov.bcb.pix0136${randomUUID()}5204000053039865406${(amountCents / 100).toFixed(2)}5802BR5905VOLTI6009SAO PAULO62070503***6304ABCD`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const d = await this.prisma.deposit.create({
      data: {
        customerId: input.customerId, rentalId: input.rentalId, method: 'pix', status: 'awaiting_pix', amountCents,
        idempotencyKey: input.idempotencyKey, pix: pix as unknown as Prisma.InputJsonValue,
      },
    });
    if (this.cfg.stubPixAutoConfirmSeconds > 0) {
      const t = setTimeout(() => void this.confirmPix(d.id), this.cfg.stubPixAutoConfirmSeconds * 1000);
      t.unref?.();
    }
    return { depositId: d.id, status: 'awaiting_pix' as const, pix };
  }

  private async confirmPix(depositId: string): Promise<void> {
    try {
      const upd = await this.prisma.deposit.updateMany({ where: { id: depositId, status: 'awaiting_pix' }, data: { status: 'held' } });
      if (upd.count) this.logger.log({ msg: 'stub_pix_confirmed', depositId });
    } catch (err) {
      this.logger.warn({ msg: 'stub_pix_confirm_failed', depositId, error: (err as Error).message });
    }
  }

  async settle(input: { rentalId: string; amountCents: number; idempotencyKey: string }) {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return { paymentId: existing.id, status: existing.status === 'failed' ? ('failed' as const) : ('paid' as const) };
    const rental = await this.prisma.rental.findUnique({ where: { id: input.rentalId }, select: { customerId: true, depositId: true } });
    if (!rental) throw new Error('Aluguel não encontrado para liquidação.');
    const payment = await this.prisma.payment.create({
      data: {
        customerId: rental.customerId, rentalId: input.rentalId, depositId: rental.depositId, kind: 'rental', method: 'card', status: 'paid',
        amountCents: input.amountCents, idempotencyKey: input.idempotencyKey, cardLast4: '4242', providerPaymentId: `stub-pay-${randomUUID()}`,
      },
    });
    // Captura o valor da caução e libera o restante (simplificado no stub).
    await this.prisma.deposit.updateMany({
      where: { id: rental.depositId, status: 'held' },
      data: { status: input.amountCents > 0 ? 'captured' : 'released', capturedCents: Math.min(input.amountCents, DEPOSIT_CENTS) },
    });
    const ev: PaymentUpdatedEvent = { paymentId: payment.id, rentalId: input.rentalId, status: 'paid' };
    this.events.emit(EV.PAYMENT_UPDATED, ev);
    return { paymentId: payment.id, status: 'paid' as const };
  }

  async isDelinquent(_customerId: string): Promise<boolean> {
    return false;
  }

  /** Caução que não virou aluguel → liberada (decisão #16). */
  @OnEvent(EV.DEPOSIT_RELEASE_REQUESTED, { async: true, promisify: true })
  async onReleaseRequested(ev: DepositReleaseRequestedEvent): Promise<void> {
    const rentalStarted = await this.prisma.rental.findFirst({ where: { depositId: ev.depositId }, select: { id: true } });
    if (rentalStarted) return;
    await this.prisma.deposit.updateMany({ where: { id: ev.depositId, status: { in: ['held', 'awaiting_pix'] } }, data: { status: 'released' } });
  }
}
