/**
 * Reset do banco **dev** para a moto de bancada (docs/decisoes.md, 2026-11-03 "Reset do dev para a bancada").
 *
 * Apaga os dados de teste (frota e operação/finanças de teste) e deixa só a moto `--keep` (VLT-0059, o J16 da bancada), com
 * um aluguel **ativo** dela para o cliente `--customer-email`. Contas (Cognito e `Customer`, KYC, cartões/tokens), equipe,
 * galpões, estações, zonas, planos, catálogo e configuração ficam. Lista completa e motivo de cada tabela: `MODEL_POLICY`.
 *
 *   node dist/cli/dev-reset-bench.js --keep VLT-0059 --customer-email <email> --i-understand-this-deletes-test-data --dry-run
 *   node dist/cli/dev-reset-bench.js --keep VLT-0059 --customer-email <email> --i-understand-this-deletes-test-data
 *
 * Travas de segurança: só roda em dev (`assertDevEnvironment`: `VOLTI_ENV=dev`, ou NODE_ENV development/test local, e o
 * gateway de pagamento fake) e só com `--i-understand-this-deletes-test-data` (também no `--dry-run`). Tudo é conferido
 * antes de apagar (moto, cliente elegível como no `POST /rentals`, cartão, plano, trava em andamento no Redis da API); a
 * limpeza e o aluguel novo vão numa transação só. `--dry-run` só conta (nada é gravado).
 *
 * O aluguel nasce com as mesmas linhas que o início normal com o gateway fake deixa (caução de cartão pré-autorizada
 * `fake-pay-<uuid>`, apólice do mock, preço congelado pelo `PricingService.snapshotFrom`, evento `started`, moto `rented`),
 * **sem** comando para a moto: o relé da bancada não muda (o início normal manda `unlock` e espera a confirmação; aqui não).
 *
 * Depois do reset: reinicie a API (caches por processo: thing → moto da telemetria, aluguel por moto, modo do rastreador).
 * Logs JSON em stdout, sem dados pessoais (e-mail mascarado; só ids).
 */
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { type InsuranceCoverage, type PaymentCard, type PlanCode, Prisma, PrismaClient, type PricingPlan } from '@prisma/client';
import { pendingLockKind } from '../common/vehicle-in-use';
import { SEED_PREMIUMS } from '../modules/insurance/insurance.service';
import { LocalGeofenceEngine } from '../modules/iot/geofence/local-geofence-engine';
import { resolveCustomerCard } from '../modules/payments/provider-customers.service';
import { PricingService } from '../modules/pricing/pricing.service';
import type { RedisStore } from '../redis/redis-store';
import { connectProvisioningRedis } from './provision-tracker';

export const SCRIPT = 'dev-reset-bench';
export const CONFIRM_FLAG = 'i-understand-this-deletes-test-data';
/** Caução quando a taxa `deposit` não está ativa (= `DEPOSIT_CENTS` do `RentalBillingService`; o spec confere). */
export const DEFAULT_DEPOSIT_CENTS = 5000;
/** Prazo da transação do reset (o padrão do Prisma, 5 s, é curto para apagar trajetos). */
export const RESET_TX_TIMEOUT_MS = 5 * 60_000;
/** Espera antes da varredura de órfãos: maior que o cache de 5 s do aluguel por moto na API (`iot/adapters.ts`). */
export const ORPHAN_SWEEP_DELAY_MS = 6_000;
export const RENTAL_PLANS = ['minute', 'hour', 'day'] as const;
export const COVERAGES = ['basic', 'full'] as const;

const VEHICLE_CODE = /^VLT-\d{4,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ───────────────────────────── ambiente e argumentos ─────────────────────────────

/**
 * Só dev: `VOLTI_ENV`, se definido, tem que ser `dev`; fora de NODE_ENV development/test (o dev single roda com
 * NODE_ENV=production) exige `VOLTI_ENV=dev` e, em production, `ALLOW_FAKE_PAYMENTS=true` (a liberação que só a infra dev
 * tem). O gateway efetivo tem que ser o fake (a caução do aluguel novo é uma pré-autorização do fake). Falha fechada.
 */
export function assertDevEnvironment(env: Record<string, string | undefined>): void {
  const volti = env.VOLTI_ENV?.trim() || undefined;
  const nodeEnv = env.NODE_ENV?.trim() || undefined;
  const localDev = nodeEnv === 'development' || nodeEnv === 'test';
  if (volti !== undefined && volti !== 'dev') throw new Error(`Recusado: VOLTI_ENV=${volti}. Este reset só roda no ambiente dev.`);
  if (!localDev && volti !== 'dev') {
    throw new Error(`Recusado: NODE_ENV=${nodeEnv ?? '(vazio)'} sem VOLTI_ENV=dev. Este reset só roda no ambiente dev.`);
  }
  if (nodeEnv === 'production' && env.ALLOW_FAKE_PAYMENTS?.trim() !== 'true') {
    throw new Error('Recusado: NODE_ENV=production sem ALLOW_FAKE_PAYMENTS=true (só a infra dev tem essa liberação).');
  }
  const provider = env.PAYMENT_PROVIDER?.trim() || (localDev ? 'fake' : undefined);
  if (provider !== 'fake') throw new Error(`Recusado: PAYMENT_PROVIDER=${provider ?? '(vazio)'}. O reset só roda com o gateway fake.`);
}

export interface ResetOptions {
  keepCode: string;
  customerEmail: string;
  dryRun: boolean;
  confirmed: boolean;
  planCode: (typeof RENTAL_PLANS)[number];
  coverage: (typeof COVERAGES)[number];
}

export function parseResetArgs(argv: string[]): ResetOptions {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      keep: { type: 'string' },
      'customer-email': { type: 'string' },
      plan: { type: 'string', default: 'day' },
      coverage: { type: 'string', default: 'basic' },
      'dry-run': { type: 'boolean', default: false },
      [CONFIRM_FLAG]: { type: 'boolean', default: false },
    },
  });
  const keepCode = (values.keep ?? '').trim().toUpperCase();
  if (!VEHICLE_CODE.test(keepCode)) throw new Error('--keep VLT-0000 obrigatório (código da moto de bancada).');
  const customerEmail = (values['customer-email'] ?? '').trim();
  if (!EMAIL.test(customerEmail)) throw new Error('--customer-email obrigatório (e-mail da conta que recebe o aluguel).');
  const planCode = values.plan as ResetOptions['planCode'];
  if (!(RENTAL_PLANS as readonly string[]).includes(planCode)) throw new Error(`--plan inválido (use ${RENTAL_PLANS.join(' | ')}).`);
  const coverage = values.coverage as ResetOptions['coverage'];
  if (!(COVERAGES as readonly string[]).includes(coverage)) throw new Error(`--coverage inválido (use ${COVERAGES.join(' | ')}).`);
  return { keepCode, customerEmail, dryRun: values['dry-run'] === true, confirmed: values[CONFIRM_FLAG] === true, planCode, coverage };
}

/** E-mail em log: primeira e última letra do usuário e o domínio (`v***7@gmail.com`). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const user = email.slice(0, at);
  return `${user[0]}***${user.length > 1 ? user[user.length - 1] : ''}${email.slice(at)}`;
}

// ───────────────────────────── plano da limpeza ─────────────────────────────

export interface ResetContext {
  keepVehicleId: string;
  /** Baterias instaladas nas motos apagadas (as outras ficam). */
  batteryIds: string[];
  /** Conversas de suporte ligadas a um aluguel (todos os aluguéis são apagados). */
  conversationIds: string[];
}

type Where = Record<string, unknown>;

export interface ResetStep {
  model: Prisma.ModelName;
  action: 'delete' | 'update';
  where: (c: ResetContext) => Where;
  data?: Record<string, unknown>;
  note: string;
}

const all = (): Where => ({});
/** Coluna anulável apontando para uma moto que não é a da bancada (NULL fica de fora, como no SQL). */
const otherVehicle = (field: string) => (c: ResetContext): Where => ({ AND: [{ [field]: { not: null } }, { [field]: { not: c.keepVehicleId } }] });
const notNull = (field: string) => (): Where => ({ [field]: { not: null } });
/** Rastreador que não é GT06. `protocol` é anulável: `{ not: 'gt06' }` sozinho deixaria o NULL de fora (como no SQL). */
const NOT_GT06: Where = { controlMode: 'speed_control', OR: [{ protocol: null }, { protocol: { not: 'gt06' } }] };

/**
 * Ordem das escritas (filhos antes dos pais; as FKs do schema são RESTRICT). O spec confere pela DMMF do Prisma que toda
 * relação com FK para um modelo apagado vem antes dele e que todo modelo com `rentalId`/`vehicleId` tem um passo aqui.
 */
export const RESET_STEPS: readonly ResetStep[] = [
  // ── filhos do aluguel ──
  { model: 'RentalStart', action: 'delete', where: all, note: 'marcadores de início de aluguel' },
  { model: 'LocationShare', action: 'delete', where: all, note: 'links de localização dos aluguéis' },
  { model: 'TrackPoint', action: 'delete', where: all, note: 'trajetos (só existem em aluguel)' },
  { model: 'RentalEvent', action: 'delete', where: all, note: 'eventos dos aluguéis' },
  { model: 'StationSwap', action: 'delete', where: all, note: 'trocas de bateria na estação (por aluguel)' },
  { model: 'CouponRedemption', action: 'delete', where: all, note: 'usos de cupom (um por aluguel)' },
  { model: 'Coupon', action: 'update', where: () => ({ redemptions: { gt: 0 } }), data: { redemptions: 0 }, note: 'contador de usos volta a 0 (os usos eram dos aluguéis apagados)' },
  { model: 'Dispute', action: 'delete', where: all, note: 'contestações (por aluguel)' },
  { model: 'Claim', action: 'delete', where: all, note: 'sinistros (por aluguel)' },
  {
    model: 'Incident',
    action: 'delete',
    where: (c) => ({ OR: [{ rentalId: { not: null } }, otherVehicle('vehicleId')(c)] }),
    note: 'ocorrências de aluguel ou de moto apagada (as sem vínculo ficam)',
  },
  { model: 'SupportMessage', action: 'delete', where: (c) => ({ conversationId: { in: c.conversationIds } }), note: 'mensagens das conversas ligadas a aluguel' },
  { model: 'SupportConversation', action: 'delete', where: notNull('rentalId'), note: 'conversas ligadas a aluguel (as sem vínculo ficam)' },
  // ── seguro e dinheiro ──
  { model: 'InsuranceRemittance', action: 'delete', where: all, note: 'repasses de prêmio' },
  { model: 'InsurancePolicy', action: 'delete', where: all, note: 'apólices (por aluguel)' },
  { model: 'PaymentReceipt', action: 'delete', where: all, note: 'recibos' },
  { model: 'Invoice', action: 'delete', where: all, note: 'NFS-e (mock)' },
  { model: 'PaymentCapture', action: 'delete', where: all, note: 'capturas de caução' },
  { model: 'PaymentRefund', action: 'delete', where: all, note: 'estornos' },
  { model: 'SettlementProgress', action: 'delete', where: all, note: 'liquidações' },
  { model: 'DepositRelease', action: 'delete', where: all, note: 'liberações de caução pendentes' },
  { model: 'Referral', action: 'update', where: notNull('refereeWalletEntryId'), data: { refereeWalletEntryId: null }, note: 'indicação perde o vínculo com o lançamento apagado (a indicação fica)' },
  { model: 'Referral', action: 'update', where: notNull('referrerWalletEntryId'), data: { referrerWalletEntryId: null }, note: 'idem, lado de quem indicou' },
  { model: 'WalletEntry', action: 'delete', where: all, note: 'carteira inteira (ledger: saldo = soma; todo crédito veio de pagamento fake) → saldo 0' },
  { model: 'TopUp', action: 'delete', where: all, note: 'recargas (pagamento fake)' },
  { model: 'Payment', action: 'delete', where: all, note: 'pagamentos, cauções, cobranças, recargas, assinaturas' },
  { model: 'Deposit', action: 'delete', where: all, note: 'cauções' },
  { model: 'ProcessedWebhook', action: 'delete', where: all, note: 'deduplicação de webhooks dos pagamentos apagados' },
  { model: 'PaymentProviderRef', action: 'delete', where: () => ({ entityType: 'subscription' }), note: 'assinaturas no gateway (o cliente no gateway fica)' },
  { model: 'Subscription', action: 'delete', where: all, note: 'assinaturas (pagas no gateway fake)' },
  { model: 'Customer', action: 'update', where: () => ({ delinquent: true }), data: { delinquent: false }, note: 'inadimplência vinha de pagamentos de teste apagados' },
  // ── operação ──
  { model: 'Alert', action: 'delete', where: all, note: 'alertas (todos)' },
  { model: 'Inspection', action: 'delete', where: all, note: 'vistorias (das tarefas de campo)' },
  { model: 'BatterySwap', action: 'delete', where: all, note: 'trocas de bateria (das tarefas de campo)' },
  { model: 'FieldTask', action: 'delete', where: all, note: 'tarefas de campo (todas)' },
  { model: 'Handover', action: 'delete', where: all, note: 'entregas do galpão' },
  { model: 'Reservation', action: 'delete', where: all, note: 'reservas' },
  { model: 'Rental', action: 'delete', where: all, note: 'aluguéis (todos)' },
  { model: 'IdempotencyRecord', action: 'delete', where: all, note: 'respostas guardadas por Idempotency-Key (podiam repetir aluguéis apagados)' },
  // ── frota ──
  { model: 'MaintenanceTask', action: 'delete', where: (c) => ({ vehicleId: { not: c.keepVehicleId } }), note: 'manutenções das motos apagadas' },
  { model: 'VehicleCommand', action: 'delete', where: (c) => ({ vehicleId: { not: c.keepVehicleId } }), note: 'comandos das motos apagadas (o histórico da bancada fica)' },
  { model: 'BatteryMovement', action: 'delete', where: (c) => ({ batteryId: { in: c.batteryIds } }), note: 'histórico das baterias apagadas' },
  { model: 'Battery', action: 'delete', where: (c) => ({ id: { in: c.batteryIds } }), note: 'baterias instaladas nas motos apagadas' },
  {
    model: 'Tracker',
    action: 'update',
    where: (c) => ({ ...otherVehicle('vehicleId')(c), OR: [{ controlMode: 'relay_only' }, { protocol: 'gt06' }] }),
    data: { vehicleId: null },
    note: 'rastreador GT06 de moto apagada fica, desvinculado',
  },
  { model: 'Tracker', action: 'delete', where: (c) => ({ AND: [otherVehicle('vehicleId')(c), NOT_GT06] }), note: 'rastreadores (não GT06) das motos apagadas' },
  { model: 'Vehicle', action: 'delete', where: (c) => ({ id: { not: c.keepVehicleId } }), note: 'todas as motos menos a da bancada' },
];

/**
 * Destino de cada tabela (o tipo exige todas: modelo novo no schema não compila sem decidir). `delete`/`update` = há passo
 * em `RESET_STEPS`; `keep` = não é tocada.
 */
export const MODEL_POLICY: Record<Prisma.ModelName, { fate: 'delete' | 'partial' | 'update' | 'keep'; reason: string }> = {
  Customer: { fate: 'update', reason: 'contas ficam; só `delinquent` volta a false (vinha de pagamento de teste)' },
  StaffUser: { fate: 'keep', reason: 'equipe' },
  Device: { fate: 'keep', reason: 'tokens de push das contas' },
  RestrictionEntry: { fate: 'keep', reason: 'lista de restrição de CPF (configuração antifraude)' },
  Vehicle: { fate: 'partial', reason: 'só a moto --keep fica' },
  Tracker: { fate: 'partial', reason: 'o da bancada e os GT06 (desvinculados) ficam; os outros das motos apagadas saem' },
  Battery: { fate: 'partial', reason: 'saem só as instaladas nas motos apagadas; galpão/estação/van/bancada ficam' },
  BatteryMovement: { fate: 'partial', reason: 'histórico das baterias que ficam é mantido' },
  Zone: { fate: 'keep', reason: 'cercas' },
  VehicleCommand: { fate: 'partial', reason: 'o histórico de comandos da bancada fica' },
  TrackPoint: { fate: 'delete', reason: 'trajetos de teste' },
  PricingPlan: { fate: 'keep', reason: 'planos' },
  Coupon: { fate: 'update', reason: 'cupons ficam; contador de usos zerado' },
  CouponRedemption: { fate: 'delete', reason: 'usos ligados aos aluguéis' },
  Fee: { fate: 'keep', reason: 'taxas' },
  Reservation: { fate: 'delete', reason: 'reservas de teste' },
  Rental: { fate: 'delete', reason: 'aluguéis de teste (o da bancada é criado depois)' },
  RentalEvent: { fate: 'delete', reason: 'eventos dos aluguéis' },
  LocationShare: { fate: 'delete', reason: 'links dos aluguéis' },
  PaymentCard: { fate: 'keep', reason: 'cartões (tokens do gateway)' },
  Deposit: { fate: 'delete', reason: 'cauções de teste' },
  Payment: { fate: 'delete', reason: 'pagamentos de teste' },
  ProviderCustomerDeletion: { fate: 'keep', reason: 'exclusão LGPD pendente no gateway (conta)' },
  Subscription: { fate: 'delete', reason: 'assinaturas pagas no gateway fake' },
  MinutePackage: { fate: 'keep', reason: 'pacotes à venda (configuração)' },
  TopUp: { fate: 'delete', reason: 'recargas de teste' },
  WalletEntry: { fate: 'delete', reason: 'ledger da carteira (saldo derivado → 0)' },
  InsuranceCoverageConfig: { fate: 'keep', reason: 'configuração do seguro' },
  InsurancePolicy: { fate: 'delete', reason: 'apólices dos aluguéis' },
  Alert: { fate: 'delete', reason: 'alertas de teste (jobs reabrem os que ainda valerem)' },
  AuditLog: { fate: 'keep', reason: 'trilha de auditoria (só inserção); o reset grava uma linha `dev.reset_bench`' },
  Incident: { fate: 'partial', reason: 'ficam só as sem aluguel e sem moto apagada' },
  Dispute: { fate: 'delete', reason: 'contestações de aluguel' },
  Claim: { fate: 'delete', reason: 'sinistros de aluguel' },
  SupportConversation: { fate: 'partial', reason: 'ficam só as sem aluguel' },
  SupportMessage: { fate: 'partial', reason: 'saem as das conversas apagadas' },
  MaintenanceTask: { fate: 'partial', reason: 'saem as das motos apagadas' },
  FieldTask: { fate: 'delete', reason: 'tarefas de campo de teste' },
  Inspection: { fate: 'delete', reason: 'vistorias das tarefas' },
  BatterySwap: { fate: 'delete', reason: 'trocas das tarefas' },
  IdempotencyRecord: { fate: 'delete', reason: 'cache de respostas (expira sozinho)' },
  ProcessedWebhook: { fate: 'delete', reason: 'deduplicação dos webhooks de teste' },
  PaymentProviderRef: { fate: 'partial', reason: 'sai a referência de assinatura; a do cliente no gateway fica' },
  InsuranceRemittance: { fate: 'delete', reason: 'repasses de teste' },
  PaymentReceipt: { fate: 'delete', reason: 'recibos de teste' },
  Invoice: { fate: 'delete', reason: 'notas de teste' },
  SettlementProgress: { fate: 'delete', reason: 'liquidações de teste' },
  DepositRelease: { fate: 'delete', reason: 'liberações de teste' },
  PaymentCapture: { fate: 'delete', reason: 'capturas de teste' },
  PaymentRefund: { fate: 'delete', reason: 'estornos de teste' },
  RentalStart: { fate: 'delete', reason: 'inícios de aluguel em andamento' },
  CustomerIdentityDeletion: { fate: 'keep', reason: 'exclusão LGPD pendente no Cognito (conta)' },
  VehicleModel: { fate: 'keep', reason: 'catálogo' },
  SwapStation: { fate: 'keep', reason: 'estações de troca' },
  StationSwap: { fate: 'delete', reason: 'trocas de teste' },
  CustomerCoupon: { fate: 'keep', reason: 'cupons salvos na conta' },
  Referral: { fate: 'update', reason: 'indicações ficam; vínculo com o lançamento de carteira apagado é limpo' },
  Depot: { fate: 'keep', reason: 'galpões' },
  Handover: { fate: 'delete', reason: 'entregas de teste' },
};

// ───────────────────────────── acesso genérico ao Prisma ─────────────────────────────

interface Delegate {
  count(args: { where: Where }): Promise<number>;
  deleteMany(args: { where: Where }): Promise<{ count: number }>;
  updateMany(args: { where: Where; data: Record<string, unknown> }): Promise<{ count: number }>;
}

export const delegateName = (model: Prisma.ModelName): string => model.charAt(0).toLowerCase() + model.slice(1);
const delegateOf = (db: unknown, model: Prisma.ModelName): Delegate => (db as Record<string, Delegate>)[delegateName(model)];

/** Cliente Prisma (ou transação). Tipado frouxo: os passos são genéricos por modelo. */
export type ResetDb = Prisma.TransactionClient;
export type ResetPrisma = ResetDb & Pick<PrismaClient, '$transaction'>;

// ───────────────────────────── conferências ─────────────────────────────

type VehicleRow = Prisma.VehicleGetPayload<{ include: { vehicleModel: { select: { pricePerMinuteCents: true; unlockFeeCents: true } } } }>;

export interface ResetTargets {
  vehicle: VehicleRow;
  customer: { id: string; delinquent: boolean };
  card: PaymentCard;
  plan: PricingPlan;
  coverage: InsuranceCoverage;
  premiumCents: number;
  depositCents: number;
  warnings: Array<Record<string, unknown>>;
}

/**
 * Moto, cliente, cartão, plano e valores — tudo que o aluguel novo precisa, conferido antes de apagar qualquer coisa
 * (e de novo dentro da transação). Mesmas regras do `POST /rentals` para o cliente (KYC aprovado, conta ativa, CPF fora da
 * lista de restrição, consentimento de localização, termos); a inadimplência é zerada pelo reset (vinha dos pagamentos de
 * teste). Recusa (erro) ou aviso (segue).
 */
export async function loadTargets(db: ResetDb, opts: Pick<ResetOptions, 'keepCode' | 'customerEmail' | 'planCode' | 'coverage'>, env: Record<string, string | undefined>): Promise<ResetTargets> {
  const warnings: Array<Record<string, unknown>> = [];
  const vehicle = await db.vehicle.findUnique({
    where: { code: opts.keepCode },
    include: { vehicleModel: { select: { pricePerMinuteCents: true, unlockFeeCents: true } } },
  });
  if (!vehicle) throw new Error(`Moto ${opts.keepCode} não encontrada.`);
  if (vehicle.stolenMode) throw new Error(`A moto ${opts.keepCode} está em modo roubada; desligue no painel antes do reset.`);
  if (vehicle.status === 'offline' || !vehicle.online) warnings.push({ warning: 'vehicle_offline', status: vehicle.status, online: vehicle.online });
  if (vehicle.status === 'blocked' || vehicle.status === 'maintenance') warnings.push({ warning: 'vehicle_status_overridden', from: vehicle.status, to: 'rented' });
  if (vehicle.lat === 0 && vehicle.lng === 0) warnings.push({ warning: 'vehicle_without_position' });

  const customers = await db.customer.findMany({
    where: { email: { equals: opts.customerEmail, mode: 'insensitive' }, deletedAt: null, status: { not: 'deleted' } },
    select: { id: true, status: true, kycStatus: true, delinquent: true, cpf: true, locationConsent: true, termsAccepted: true, termsVersion: true },
  });
  const masked = maskEmail(opts.customerEmail);
  if (customers.length === 0) throw new Error(`Nenhuma conta de cliente ativa com o e-mail ${masked}.`);
  if (customers.length > 1) throw new Error(`Mais de uma conta de cliente com o e-mail ${masked} (${customers.length}); resolva antes do reset.`);
  const c = customers[0];
  if (c.kycStatus !== 'approved') throw new Error(`O cliente ${masked} não tem KYC aprovado (${c.kycStatus}).`);
  if (c.status !== 'active') throw new Error(`A conta do cliente ${masked} está ${c.status}.`);
  if (c.cpf && (await db.restrictionEntry.findUnique({ where: { cpf: c.cpf }, select: { id: true } }))) {
    throw new Error(`O CPF do cliente ${masked} está na lista de restrição.`);
  }
  // LGPD: trajeto só com consentimento de localização (o app também exige para alugar).
  if (!c.locationConsent) throw new Error(`O cliente ${masked} não autorizou a localização durante o aluguel (consentimento no app).`);
  const termsVersion = env.TERMS_CURRENT_VERSION?.trim();
  if (!c.termsAccepted || (termsVersion && c.termsVersion !== termsVersion)) throw new Error(`O cliente ${masked} não aceitou os termos vigentes.`);
  if (c.delinquent) warnings.push({ warning: 'customer_delinquent_reset' });

  const card = await resolveCustomerCard(db, c.id);
  if (!card) throw new Error(`O cliente ${masked} não tem cartão ativo; cadastre um cartão de teste no app antes do reset.`);

  const plan = await db.pricingPlan.findFirst({ where: { code: opts.planCode as PlanCode, active: true } });
  if (!plan) throw new Error(`Plano ${opts.planCode} indisponível.`);
  // Mesmo prêmio do `InsuranceService.issueForRental` (o mock não muda o valor).
  const cfg = await db.insuranceCoverageConfig.findUnique({ where: { coverage: opts.coverage } });
  if (opts.coverage === 'full' && (!cfg || !cfg.active)) throw new Error('Cobertura full indisponível.');
  const premiumCents = cfg?.premiumCents ?? SEED_PREMIUMS[opts.coverage];
  // Mesmo valor do `RentalBillingService.depositAmount`.
  const fee = await db.fee.findUnique({ where: { code: 'deposit' } });
  const depositCents = fee?.active ? fee.amountCents : DEFAULT_DEPOSIT_CENTS;

  return { vehicle, customer: { id: c.id, delinquent: c.delinquent }, card, plan, coverage: opts.coverage, premiumCents, depositCents, warnings };
}

export async function buildContext(db: ResetDb, keepVehicleId: string): Promise<ResetContext> {
  const batteries = await db.battery.findMany({ where: { AND: [{ vehicleId: { not: null } }, { vehicleId: { not: keepVehicleId } }] }, select: { id: true } });
  const conversations = await db.supportConversation.findMany({ where: { rentalId: { not: null } }, select: { id: true } });
  return { keepVehicleId, batteryIds: batteries.map((b) => b.id), conversationIds: conversations.map((c) => c.id) };
}

export interface StepResult {
  model: Prisma.ModelName;
  action: 'delete' | 'update';
  count: number;
  note: string;
}

/** Conta (dry-run) ou executa cada passo, na ordem. */
export async function runSteps(db: ResetDb, ctx: ResetContext, dryRun: boolean): Promise<StepResult[]> {
  const out: StepResult[] = [];
  for (const step of RESET_STEPS) {
    const d = delegateOf(db, step.model);
    const where = step.where(ctx);
    let count: number;
    if (dryRun) count = await d.count({ where });
    else if (step.action === 'delete') count = (await d.deleteMany({ where })).count;
    else count = (await d.updateMany({ where, data: step.data ?? {} })).count;
    out.push({ model: step.model, action: step.action, count, note: step.note });
  }
  return out;
}

// ───────────────────────────── aluguel da bancada ─────────────────────────────

const roundCoord = (v: number): number => Math.round(v * 1000) / 1000;

export interface LinkedRental {
  rentalId: string;
  depositId: string;
  paymentId: string;
  policyId: string;
}

/**
 * Cria o aluguel ativo com as linhas que o `RentalStartService.start` deixa com o gateway fake e cartão: pagamento da caução
 * `authorized` (pré-autorização `fake-pay-<uuid>`, que o fake reidrata depois de um reinício da API e aceita capturar no
 * fechamento), caução `held` ligada ao aluguel, apólice `active` do mock, aluguel `active` com o preço congelado e o evento
 * `started`; a moto vira `rented` (offline: `statusBeforeOffline = rented`, como o sistema guarda moto alugada sem sinal).
 * **Nenhum comando** à moto: o início normal manda `unlock` e espera a confirmação — aqui o relé fica como está.
 */
export async function createBenchRental(db: ResetDb, t: ResetTargets, now: Date): Promise<LinkedRental> {
  const rentalId = randomUUID();
  const depositId = randomUUID();
  const policyId = randomUUID();
  const customerId = t.customer.id;
  const idempotencyKey = `deposit:${customerId}:${SCRIPT}:${rentalId}`;
  const providerPaymentId = `fake-pay-${randomUUID()}`;

  await db.deposit.create({
    data: {
      id: depositId, rentalId, customerId, method: 'card', status: 'held', amountCents: t.depositCents, cardId: t.card.id,
      idempotencyKey, providerReference: providerPaymentId, createdAt: now,
    },
  });
  const payment = await db.payment.create({
    data: {
      customerId, rentalId, depositId, kind: 'deposit', method: 'card', status: 'authorized', amountCents: t.depositCents,
      providerPaymentId, cardLast4: t.card.last4 || null, idempotencyKey, createdAt: now,
    },
  });
  await db.insurancePolicy.create({
    data: { id: policyId, rentalId, customerId, coverage: t.coverage, premiumCents: t.premiumCents, providerPolicyId: `mock-pol-${randomUUID()}`, issuedAt: now },
  });
  const snapshot = PricingService.snapshotFrom(t.plan, t.premiumCents, t.coverage, null, false, t.vehicle.vehicleModel);
  await db.rental.create({
    data: {
      id: rentalId,
      customerId,
      vehicleId: t.vehicle.id,
      planCode: t.plan.code,
      coverage: t.coverage,
      status: 'active',
      startedAt: now,
      priceSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      couponCode: null,
      depositId,
      insurancePolicyId: policyId,
      startLat: roundCoord(t.vehicle.lat),
      startLng: roundCoord(t.vehicle.lng),
      speedLimitKmh: t.vehicle.speedLimitKmh,
      createdAt: now,
    },
  });
  await db.rentalEvent.create({ data: { rentalId, type: 'started', actorType: 'customer', actorId: customerId, at: now, data: { via: SCRIPT } } });
  await db.vehicle.update({
    where: { id: t.vehicle.id },
    data: t.vehicle.status === 'offline' ? { statusBeforeOffline: 'rented' } : { status: 'rented', statusBeforeOffline: null },
  });
  return { rentalId, depositId, paymentId: payment.id, policyId };
}

// ───────────────────────────── execução ─────────────────────────────

export type Log = (entry: Record<string, unknown>) => void;

export interface ResetDeps {
  prisma: ResetPrisma;
  /** Redis da API (trava em andamento e origem da trava da moto da bancada). */
  redis: Pick<RedisStore, 'exists' | 'hgetall'>;
  /** Zonas ativas que contêm o ponto (PostGIS no CLI; o mesmo motor do `GEOFENCE_MODE=local`). */
  zonesAt: (lat: number, lng: number) => Promise<Array<{ type: string }>>;
  log: Log;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface ResetOutcome {
  dryRun: boolean;
  steps: StepResult[];
  rental?: LinkedRental;
  warnings: Array<Record<string, unknown>>;
}

/** Soma por tabela e ação (para o log e a auditoria). */
export function summarize(steps: StepResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of steps) out[`${s.action}:${s.model}`] = (out[`${s.action}:${s.model}`] ?? 0) + s.count;
  return out;
}

/** Avisos que dependem do Redis e das zonas (fora da transação). Trava em andamento na moto = recusa. */
async function liveChecks(deps: ResetDeps, vehicle: VehicleRow): Promise<Array<Record<string, unknown>>> {
  const warnings: Array<Record<string, unknown>> = [];
  const pending = await pendingLockKind(deps.redis, vehicle.thingName);
  if (pending) throw new Error(`A moto ${vehicle.code} tem uma trava em andamento na API (${pending}); espere terminar antes do reset.`);
  const origin = (await deps.redis.hgetall(`iot:lock-origin:${vehicle.thingName}`)).origin;
  if (origin === 'staff' || origin === 'system') warnings.push({ warning: 'lock_origin_not_customer', origin, effect: 'o cliente não destrava pelo app até a equipe destravar' });
  if (await deps.redis.exists(`iot:held:${vehicle.thingName}`)) warnings.push({ warning: 'speed_hold_active' });
  const zones = await deps.zonesAt(vehicle.lat, vehicle.lng);
  if (!zones.some((z) => z.type === 'operation')) {
    warnings.push({ warning: 'outside_operation_area', effect: 'com aluguel ativo, a API arma a trava fora da área (OUT_OF_AREA_LOCK_MINUTES) e trava o relé' });
  }
  if (zones.some((z) => z.type === 'forbidden')) warnings.push({ warning: 'inside_forbidden_zone' });
  return warnings;
}

export async function runDevReset(deps: ResetDeps, opts: ResetOptions, env: Record<string, string | undefined>): Promise<ResetOutcome> {
  assertDevEnvironment(env);
  if (!opts.confirmed) throw new Error(`Recusado: passe --${CONFIRM_FLAG} (apaga os dados de teste do banco dev).`);
  const now = deps.now ?? (() => new Date());
  const { log } = deps;
  const customer = maskEmail(opts.customerEmail);

  const t = await loadTargets(deps.prisma, opts, env);
  const warnings = [...t.warnings, ...(await liveChecks(deps, t.vehicle))];
  const ctx = await buildContext(deps.prisma, t.vehicle.id);
  const openCommands = await deps.prisma.vehicleCommand.count({ where: { vehicleId: t.vehicle.id, status: { in: ['pending', 'in_progress'] } } });
  if (openCommands > 0) warnings.push({ warning: 'bench_commands_open', count: openCommands, effect: 'comandos pendentes da bancada ficam (não são apagados nem reenviados pelo reset)' });
  const certTrackers = await deps.prisma.tracker.count({ where: { AND: [otherVehicle('vehicleId')(ctx), NOT_GT06, { certificateArn: { not: null } }] } });
  if (certTrackers > 0) warnings.push({ warning: 'trackers_with_certificate_deleted', count: certTrackers, effect: 'certificados no IoT Core (modo aws) ficam órfãos; revogue à mão' });
  for (const w of warnings) log({ level: 'warn', msg: 'reset_warning', ...w });

  const base = { keep: opts.keepCode, vehicleId: t.vehicle.id, customer, customerId: t.customer.id, plan: opts.planCode, coverage: opts.coverage };
  if (opts.dryRun) {
    const steps = await runSteps(deps.prisma, ctx, true);
    for (const s of steps) log({ msg: 'dry_run_step', model: s.model, action: s.action, count: s.count, note: s.note });
    log({ msg: 'dry_run_done', ...base, totals: summarize(steps), createsRental: true, vehicleStatusFrom: t.vehicle.status, warnings: warnings.length, writes: 0 });
    return { dryRun: true, steps, warnings };
  }

  log({ msg: 'reset_started', ...base });
  const result = await deps.prisma.$transaction(
    async (tx) => {
      // Reconferido dentro da transação (algo pode ter mudado desde a checagem).
      const tt = await loadTargets(tx, opts, env);
      if (tt.vehicle.id !== t.vehicle.id || tt.customer.id !== t.customer.id) throw new Error('Moto ou cliente mudou durante o reset; rode de novo.');
      const txCtx = await buildContext(tx, tt.vehicle.id);
      const steps = await runSteps(tx, txCtx, false);
      const rental = await createBenchRental(tx, tt, now());
      await tx.auditLog.create({
        data: {
          actorType: 'system',
          actorName: SCRIPT,
          action: 'dev.reset_bench',
          entityType: 'Rental',
          entityId: rental.rentalId,
          reason: 'Reset do banco dev: só a moto de bancada, com aluguel ativo da conta indicada (dados de teste apagados).',
          metadata: { keepVehicleId: tt.vehicle.id, customerId: tt.customer.id, plan: opts.planCode, totals: summarize(steps) },
        },
      });
      return { steps, rental };
    },
    { timeout: RESET_TX_TIMEOUT_MS, maxWait: 10_000 },
  );
  for (const s of result.steps) log({ msg: 'reset_step', model: s.model, action: s.action, count: s.count, note: s.note });
  log({ msg: 'rental_created', rentalId: result.rental.rentalId, vehicleId: t.vehicle.id, customerId: t.customer.id, depositId: result.rental.depositId, status: 'active', vehicleStatus: t.vehicle.status === 'offline' ? 'offline (statusBeforeOffline=rented)' : 'rented', commandsSent: 0 });

  // A API em execução pode ter gravado trajeto/alerta do aluguel/moto apagados entre o commit e a expiração dos caches dela.
  await (deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(ORPHAN_SWEEP_DELAY_MS);
  const orphans = await sweepOrphans(deps.prisma, { vehicleId: t.vehicle.id, rentalId: result.rental.rentalId });
  log({ msg: 'reset_done', ...base, rentalId: result.rental.rentalId, totals: summarize(result.steps), orphansSwept: orphans, next: 'reinicie a API (docker compose ... restart api)' });
  return { dryRun: false, steps: result.steps, rental: result.rental, warnings };
}

/** Trajetos e alertas sem FK que ainda apontam para moto/aluguel apagados (gravados pela API logo depois do commit). */
export async function sweepOrphans(db: ResetDb, keep: { vehicleId: string; rentalId: string }): Promise<{ trackPoints: number; alerts: number }> {
  const trackPoints = await db.trackPoint.deleteMany({
    where: { OR: [{ vehicleId: { not: keep.vehicleId } }, { AND: [{ rentalId: { not: null } }, { rentalId: { not: keep.rentalId } }] }] },
  });
  const alerts = await db.alert.deleteMany({
    where: {
      OR: [
        { AND: [{ vehicleId: { not: null } }, { vehicleId: { not: keep.vehicleId } }] },
        { AND: [{ rentalId: { not: null } }, { rentalId: { not: keep.rentalId } }] },
      ],
    },
  });
  return { trackPoints: trackPoints.count, alerts: alerts.count };
}

function stdoutLog(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), script: SCRIPT, ...entry })}\n`);
}

export async function main(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const opts = parseResetArgs(argv);
  // Antes de abrir qualquer conexão.
  assertDevEnvironment(env);
  if (!opts.confirmed) throw new Error(`Recusado: passe --${CONFIRM_FLAG} (apaga os dados de teste do banco dev).`);
  const redis = await connectProvisioningRedis(env).catch((err: Error) => {
    throw new Error(`Reset recusado: ${err.message}`);
  });
  const prisma = new PrismaClient();
  const zones = new LocalGeofenceEngine(prisma);
  try {
    await runDevReset({ prisma, redis, zonesAt: (lat, lng) => zones.containing(lat, lng), log: stdoutLog }, opts, env);
  } finally {
    await prisma.$disconnect();
    await redis.close().catch(() => undefined);
  }
}

if (require.main === module) {
  main().catch((err) => {
    stdoutLog({ level: 'error', msg: 'reset_failed', error: (err as Error).message });
    process.exit(1);
  });
}
