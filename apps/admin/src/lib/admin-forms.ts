import { formatBRL } from './format';
import { parseReais, validMoney, toCents } from './money';
import type { S } from './types';

/** Resultado de validação: `body` pronto para a API ou `error` em português para o formulário. */
export type Built<T> = { ok: true; body: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const REASON_MIN = 3;
export const REASON_MAX = 500;

/** Motivo obrigatório (3 a 500 caracteres) para cancelar entrega e ajustar carteira. */
export function reasonError(reason: string): string | null {
  const t = reason.trim();
  if (t.length < REASON_MIN) return 'Informe o motivo (mínimo de 3 caracteres)';
  if (t.length > REASON_MAX) return 'O motivo pode ter até 500 caracteres';
  return null;
}

/** Só a saída (`pickup`) aguardando o cliente ou em disputa pode ser cancelada (POST /handovers/{id}/cancel). */
export function canCancelHandover(h: Pick<S<'Handover'>, 'type' | 'status'>): boolean {
  return h.type === 'pickup' && (h.status === 'pending_customer' || h.status === 'disputed');
}

export function buildHandoverCancel(reason: string): Built<S<'HandoverCancel'>> {
  const e = reasonError(reason);
  return e ? fail(e) : { ok: true, body: { reason: reason.trim() } };
}

// ---------- Moto ----------

export interface VehicleForm {
  code: string;
  thingName: string;
  vehicleModelId: string;
  model: string;
  qrCode: string;
  batterySerial: string;
  odometerKm: string;
  usageHours: string;
  /** Galpão onde a moto entra (só no cadastro; obrigatório no painel). */
  depotId: string;
}

export const EMPTY_VEHICLE_FORM: VehicleForm = { code: '', thingName: '', vehicleModelId: '', model: '', qrCode: '', batterySerial: '', odometerKm: '', usageHours: '', depotId: '' };

export function vehicleFormFrom(v: S<'Vehicle'>): VehicleForm {
  return {
    code: v.code, thingName: v.thingName ?? '', vehicleModelId: v.vehicleModelId ?? '', model: v.model, qrCode: v.qrCode ?? '',
    batterySerial: v.batterySerial ?? '', odometerKm: v.odometerKm !== undefined ? String(v.odometerKm) : '', usageHours: v.usageHours !== undefined ? String(v.usageHours) : '',
    depotId: v.depotId ?? '',
  };
}

const CODE_RE = /^VLT-\d{4,}$/;
const THING_RE = /^[a-zA-Z0-9:_-]{1,128}$/;

function optionalNumber(v: string, max: number, label: string): { value?: number; error?: string } {
  const t = v.trim().replace(',', '.');
  if (!t) return {};
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) return { error: `${label}: informe um número entre 0 e ${max.toLocaleString('pt-BR')}` };
  return { value: n };
}

function commonErrors(f: VehicleForm): string | null {
  if (!f.vehicleModelId && !f.model.trim()) return 'Escolha o modelo';
  if (f.model.trim().length > 60) return 'O nome do modelo pode ter até 60 caracteres';
  if (!THING_RE.test(f.thingName.trim())) return 'Rastreador (thingName): use letras, números, : _ ou - (até 128)';
  if (f.qrCode.trim().length > 200) return 'O QR pode ter até 200 caracteres';
  return null;
}

/**
 * POST /vehicles: `code`, `model` e `thingName` obrigatórios; o modelo do catálogo define também o nome. No painel o
 * galpão também é obrigatório: a moto nasce `free` nele, disponível para retirada (docs/decisoes.md, 2026-10-25).
 */
export function buildVehicleCreate(f: VehicleForm, modelName?: string): Built<S<'VehicleCreate'>> {
  if (!CODE_RE.test(f.code.trim())) return fail('Código no formato VLT-0001 (4 dígitos ou mais)');
  const e = commonErrors(f);
  if (e) return fail(e);
  if (!f.depotId) return fail('Escolha o galpão onde a moto vai ficar');
  if (f.batterySerial.trim().length > 64) return fail('O número de série pode ter até 64 caracteres');
  return {
    ok: true,
    body: {
      code: f.code.trim(), thingName: f.thingName.trim(), model: (modelName ?? f.model).trim(), depotId: f.depotId,
      ...(f.vehicleModelId ? { vehicleModelId: f.vehicleModelId } : {}),
      ...(f.qrCode.trim() ? { qrCode: f.qrCode.trim() } : {}),
      ...(f.batterySerial.trim() ? { batterySerial: f.batterySerial.trim() } : {}),
    },
  };
}

/** PATCH /vehicles/{id}: manda só o que mudou em relação à moto atual (o `code` não é editável). */
export function buildVehicleUpdate(f: VehicleForm, current: S<'Vehicle'>, modelName?: string): Built<S<'VehicleUpdate'>> {
  const e = commonErrors(f);
  if (e) return fail(e);
  const odo = optionalNumber(f.odometerKm, 1_000_000, 'Odômetro');
  if (odo.error) return fail(odo.error);
  const hrs = optionalNumber(f.usageHours, 100_000, 'Horas de uso');
  if (hrs.error) return fail(hrs.error);
  const body: S<'VehicleUpdate'> = {};
  const name = (modelName ?? f.model).trim();
  if (f.vehicleModelId && f.vehicleModelId !== current.vehicleModelId) body.vehicleModelId = f.vehicleModelId;
  else if (!f.vehicleModelId && name !== current.model) body.model = name;
  if (f.thingName.trim() !== (current.thingName ?? '')) body.thingName = f.thingName.trim();
  if (f.qrCode.trim() && f.qrCode.trim() !== (current.qrCode ?? '')) body.qrCode = f.qrCode.trim();
  if (odo.value !== undefined && odo.value !== current.odometerKm) body.odometerKm = odo.value;
  if (hrs.value !== undefined && hrs.value !== current.usageHours) body.usageHours = hrs.value;
  if (Object.keys(body).length === 0) return fail('Nada foi alterado');
  return { ok: true, body };
}

// ---------- Preços ----------

export interface PlanForm {
  code: S<'PlanCode'>;
  name: string;
  description: string;
  unit: S<'PlanUnit'>;
  unlock: string;
  unitPrice: string;
  pause: string;
  recurring: boolean;
}

/** Unidade natural de cada código de plano (minute->minute, weekly->week...). */
export const PLAN_UNIT_BY_CODE: Record<S<'PlanCode'>, S<'PlanUnit'>> = { minute: 'minute', hour: 'hour', day: 'day', weekly: 'week', monthly: 'month' };

export const EMPTY_PLAN_FORM: PlanForm = { code: 'day', name: '', description: '', unit: 'day', unlock: '0,00', unitPrice: '', pause: '0,00', recurring: false };

/** Plano ativo que já ocupa o código (o servidor só aceita um ativo por código), se houver. */
export function activePlanForCode<T extends { code: string; active: boolean }>(plans: readonly T[], code: string): T | undefined {
  return plans.find((p) => p.code === code && p.active);
}

/** Primeiro código sem plano ativo (para abrir o diálogo já num código livre); `undefined` se todos estão ocupados. */
export function firstFreePlanCode<C extends string>(plans: readonly { code: string; active: boolean }[], codes: readonly C[]): C | undefined {
  return codes.find((c) => !activePlanForCode(plans, c));
}

const MONEY_ERR = 'Informe os valores em reais, por exemplo 0,79';

/** POST /pricing/plans (só admin). Dinheiro digitado em reais, enviado em centavos. */
export function buildPlanCreate(f: PlanForm): Built<S<'PricingPlanInput'>> {
  const name = f.name.trim();
  if (name.length < 2 || name.length > 60) return fail('O nome do plano tem de 2 a 60 caracteres');
  if (f.description.trim().length > 500) return fail('A descrição pode ter até 500 caracteres');
  for (const v of [f.unlock, f.unitPrice, f.pause]) if (!validMoney(v)) return fail(MONEY_ERR);
  return {
    ok: true,
    body: {
      code: f.code, name, unit: f.unit, recurring: f.recurring, active: true,
      unlockFeeCents: toCents(f.unlock), unitPriceCents: toCents(f.unitPrice), pausePerMinuteCents: toCents(f.pause),
      ...(f.description.trim() ? { description: f.description.trim() } : {}),
    },
  };
}

export interface FeeForm { code: string; name: string; description: string; amount: string }
export const EMPTY_FEE_FORM: FeeForm = { code: '', name: '', description: '', amount: '' };

/** POST /pricing/fees (só admin). */
export function buildFeeCreate(f: FeeForm): Built<S<'FeeInput'>> {
  if (!/^[a-z0-9_]{2,60}$/.test(f.code.trim())) return fail('Código com 2 a 60 letras minúsculas, números ou _');
  const name = f.name.trim();
  if (name.length < 2 || name.length > 120) return fail('O nome da taxa tem de 2 a 120 caracteres');
  if (f.description.trim().length > 500) return fail('A descrição pode ter até 500 caracteres');
  if (!validMoney(f.amount)) return fail('Informe o valor em reais, por exemplo 15,00');
  return {
    ok: true,
    body: { code: f.code.trim(), name, amountCents: toCents(f.amount), active: true, ...(f.description.trim() ? { description: f.description.trim() } : {}) },
  };
}

// ---------- Carteira ----------

export type AdjustDirection = 'credit' | 'debit';
export const WALLET_ADJUST_MAX_CENTS = 100_000;

/** Mensagem do toast depois do lançamento: mostra o saldo resultante e avisa se um débito o deixou negativo. */
export function walletAdjustFeedback(entry: { amountCents: number; balanceAfterCents: number }): { message: string; tone: 'success' | 'danger' } {
  const saldo = formatBRL(entry.balanceAfterCents);
  if (entry.balanceAfterCents < 0) return { message: `Ajuste lançado, mas o saldo ficou negativo (${saldo}). Lance um crédito para compensar.`, tone: 'danger' };
  return { message: `Ajuste lançado. Saldo atual: ${saldo}`, tone: 'success' };
}

/**
 * POST /customers/{id}/wallet/adjustments: valor em reais (positivo) + sentido; o contrato aceita de -R$ 1.000 a R$ 1.000,
 * nunca zero. QA-04 (Task 14): com o saldo conhecido (`Customer.walletBalanceCents`), o débito não passa do saldo.
 */
export function buildWalletAdjustment(amount: string, direction: AdjustDirection, reason: string, balanceCents?: number): Built<S<'WalletAdjustmentRequest'>> {
  const reais = parseReais(amount);
  if (reais === null || reais <= 0) return fail('Informe o valor em reais, por exemplo 10,00');
  const cents = toCents(amount);
  if (cents > WALLET_ADJUST_MAX_CENTS) return fail('O ajuste vai até R$ 1.000,00 por lançamento');
  if (direction === 'debit' && balanceCents !== undefined && cents > balanceCents) {
    return fail(balanceCents <= 0 ? `A carteira não tem saldo para débito (saldo: ${formatBRL(balanceCents)}).` : `O débito passa do saldo da carteira. Debite no máximo ${formatBRL(balanceCents)}.`);
  }
  const e = reasonError(reason);
  if (e) return fail(e);
  return { ok: true, body: { amountCents: direction === 'debit' ? -cents : cents, reason: reason.trim() } };
}

// ---------- Inadimplência (Task 14) ----------

/** Linha da ficha: "Inadimplente · R$ 70,00 em aberto" (valor só para quem vê `debtCents`). Em dia → null. */
export function delinquencySummary(c: Pick<S<'Customer'>, 'delinquent' | 'debtCents'>): string | null {
  if (!c.delinquent && !c.debtCents) return null;
  if (c.debtCents && c.debtCents > 0) return `Inadimplente · ${formatBRL(c.debtCents)} em aberto`;
  return 'Inadimplente';
}

/** Linhas do detalhe do pagamento sobre dívida: saldo devedor, quitação e o pagamento que a quitação cobre. */
export function paymentDebtLines(p: Pick<S<'Payment'>, 'outstandingCents' | 'debtSettledAt' | 'debtSettlement' | 'settlesPaymentId'>, fmtDateTime: (iso: string) => string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (p.outstandingCents !== undefined) out.push(['Saldo devedor', formatBRL(p.outstandingCents)]);
  if (p.debtSettledAt) out.push(['Dívida quitada', `${p.debtSettlement === 'manual' ? 'Registrada pelo financeiro' : 'Paga pelo cliente'} em ${fmtDateTime(p.debtSettledAt)}`]);
  if (p.settlesPaymentId) out.push(['Quita o pagamento', p.settlesPaymentId.slice(0, 8)]);
  return out;
}

/** Cliente no detalhe do pagamento (QA-17): nome quando a API manda; senão o início do id. */
export function paymentCustomerLabel(p: Pick<S<'Payment'>, 'customerId' | 'customerName'>): string {
  return p.customerName?.trim() || p.customerId.slice(0, 8);
}
