// services/api/src/ports/rental-billing.port.ts
export const RENTAL_BILLING = Symbol('RENTAL_BILLING');

export interface PixCharge { chargeId: string; qrCodeBase64: string; copyPaste: string; expiresAt: string; }

export interface RentalBillingPort {
  holdDeposit(input: { customerId: string; rentalId: string; method: 'card' | 'pix'; idempotencyKey: string; cardId?: string })
    : Promise<{ depositId: string; status: 'held' | 'awaiting_pix' | 'failed'; pix?: PixCharge }>;
  /**
   * `amountCents`: o que falta cobrar (caução/cartão/dívida); `walletCents`: o que a carteira já pagou no fechamento
   * (Task 16). O `Payment` do aluguel registra o bruto (`amountCents + walletCents`) com a divisão em `walletCents`.
   */
  settle(input: { rentalId: string; amountCents: number; idempotencyKey: string; walletCents?: number })
    : Promise<{ paymentId: string; status: 'paid' | 'failed' }>;
  isDelinquent(customerId: string): Promise<boolean>;
}
