/**
 * Caução que não foi paga (Pix expirado ou cancelado no gateway antes do pagamento): `awaiting_pix → failed`.
 * Emitido uma vez, por quem fez a transição; a reserva de galpão presa nessa caução expira (fix round 1 da Task 5).
 */
export const DEPOSIT_FAILED = 'deposit.failed';

export interface DepositFailedEvent {
  depositId: string;
  customerId: string;
}
