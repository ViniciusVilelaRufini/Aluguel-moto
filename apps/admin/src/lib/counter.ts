import { ApiError, api, unwrap } from './api';
import { parseReais } from './money';
import { PAYMENT_METHOD } from './labels';
import type { S } from './types';

/**
 * Balcão do galpão (pré-reserva, spec 2026-11-04): o atendente registra contrato e pagamento e acerta excedente e
 * caução. Nada passa pelo gateway e o painel não digita cartão: só método e referência (NSU / ID do Pix).
 */
export type CounterMethod = S<'CounterPaymentMethod'>;
export type CounterPlan = S<'CounterPlanCode'>;

export const COUNTER_METHODS: CounterMethod[] = ['counter_card', 'counter_pix', 'cash'];
export const COUNTER_METHOD_LABEL: Record<CounterMethod, string> = {
  counter_card: PAYMENT_METHOD.counter_card,
  counter_pix: PAYMENT_METHOD.counter_pix,
  cash: PAYMENT_METHOD.cash,
};

export const COUNTER_PLANS: CounterPlan[] = ['day', 'weekly', 'monthly'];
export const COUNTER_PLAN_LABEL: Record<CounterPlan, string> = { day: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
/** Mesmos limites da API (`COUNTER_QUANTITY_MAX` do PricingService): diária 1–30, semana 1–4, mês 1–3. */
export const COUNTER_QUANTITY_MAX: Record<CounterPlan, number> = { day: 30, weekly: 4, monthly: 3 };

export function clampQuantity(plan: CounterPlan, n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(COUNTER_QUANTITY_MAX[plan], Math.max(1, Math.trunc(n)));
}

/** "75,50" → 7550. Inválido, negativo ou a partir de R$ 1.000.000,00 → `null`. */
export function reaisToCents(text: string): number | null {
  const n = parseReais(text);
  if (n === null || n >= 1_000_000) return null;
  return Math.round(n * 100);
}

/**
 * O pagamento tem estorno pelo gateway (`POST /payments/{id}/refund`)? Pagamento do balcão (maquininha, Pix do galpão,
 * dinheiro) não passou pelo gateway e a API responde 422; sem o pagamento carregado, também não.
 */
export function isGatewayRefundable(method: S<'PaymentMethod'> | undefined): boolean {
  return !!method && !(COUNTER_METHODS as string[]).includes(method);
}

/** Aluguel ainda não encerrado: o acerto espera o fechamento (excedente só existe depois dele). */
export function isRentalOpen(status: S<'RentalStatus'>): boolean {
  return status === 'active' || status === 'paused' || status === 'ending';
}

export const CONTRACT_PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
export type ContractPhotoType = (typeof CONTRACT_PHOTO_TYPES)[number];
export const MAX_CONTRACT_PHOTOS = 4;
const MAX_CONTRACT_PHOTO_BYTES = 10 * 1024 * 1024;

export function validateContractPhoto(file: { type: string; size: number }): string | null {
  if (!(CONTRACT_PHOTO_TYPES as readonly string[]).includes(file.type)) return 'Use uma foto JPG ou PNG';
  if (file.size > MAX_CONTRACT_PHOTO_BYTES) return 'A foto pode ter até 10 MB';
  return null;
}

/**
 * Foto do contrato assinado: URL pré-assinada (`POST /handovers/uploads` com `purpose: contract`), envio direto ao
 * bucket e a `objectKey` (`contracts/...`) para `contractPhotoKeys`. O arquivo não passa pela API.
 */
export async function uploadContractPhoto(file: File): Promise<string> {
  const invalid = validateContractPhoto(file);
  if (invalid) throw new Error(invalid);
  const up = await unwrap(api.POST('/handovers/uploads', { body: { contentType: file.type as ContractPhotoType, purpose: 'contract' } }));
  if (!up.objectKey.startsWith('contracts/')) throw new Error('Resposta de upload inesperada');
  const res = await fetch(up.uploadUrl, { method: up.method, headers: up.headers, body: file });
  if (!res.ok) throw new ApiError(res.status, `Falha ao enviar a foto (${res.status})`);
  return up.objectKey;
}

/** Textos do checkout do balcão (os mesmos do app do operador, Task 11). */
export function checkoutErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.slug === 'counter-amount-mismatch') return 'O valor mudou. Confira e toque de novo.';
    if (e.slug === 'location-consent-required') return 'Peça ao cliente para permitir a localização no app';
  }
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}
