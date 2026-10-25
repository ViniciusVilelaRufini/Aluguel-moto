import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VEHICLE_STATUSES, type PlanCode } from '../../common/enums';
import { badRequest } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { DEBT_KINDS, DelinquencyService } from '../payments/delinquency.service';

export type GroupBy = 'hour' | 'day' | 'week' | 'month';
const TZ = 'America/Sao_Paulo';
const MAX_PERIODS = 2000;
const GROUP_SECONDS: Record<GroupBy, number> = { hour: 3600, day: 86400, week: 7 * 86400, month: 30 * 86400 };

const n = (v: unknown) => Number(v ?? 0);

/**
 * As colunas são `timestamp(3)` sem fuso, gravadas em UTC. `local(col)` converte para o horário de São Paulo;
 * `utcBound(date)` gera o literal UTC sem fuso para comparar com as colunas (independe do TimeZone da sessão).
 */
const local = (col: Prisma.Sql) => Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})`;
const utcBound = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
/** Instante local (São Paulo, sem fuso) → `timestamptz`. */
const fromLocal = (ts: Prisma.Sql) => Prisma.sql`(${ts} AT TIME ZONE ${TZ})`;

/** Início do dia corrente em São Paulo (UTC−3, sem horário de verão desde 2019). */
export function startOfTodaySaoPaulo(now = new Date()): Date {
  const local = new Date(now.getTime() - 3 * 3600 * 1000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + 3 * 3600 * 1000);
}

/** Formato de uma coluna do CSV em pt-BR (QA-16). */
export type CsvFormat = 'text' | 'int' | 'money' | 'date' | 'datetime' | 'pct' | 'plan';
export interface CsvColumn {
  key: string;
  label: string;
  format?: CsvFormat;
}

const PLAN_LABELS: Record<string, string> = { minute: 'Minuto', hour: 'Hora', day: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
const SP_DATE = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const SP_DATETIME = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

/** Centavos → reais com vírgula e sem separador de milhar (`123456` → `1234,56`), para a planilha ler como número. */
export function centsToBrl(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

function formatCell(v: unknown, format: CsvFormat = 'text'): string {
  if (v === undefined || v === null || v === '') return '';
  switch (format) {
    case 'money':
      return centsToBrl(Number(v));
    case 'pct':
      return String(v).replace('.', ',');
    case 'date':
      // `YYYY-MM-DD` (dia já no fuso de São Paulo) ou instante ISO.
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
      return SP_DATE.format(new Date(String(v)));
    case 'datetime':
      return SP_DATETIME.format(new Date(String(v))).replace(',', '');
    case 'plan':
      return PLAN_LABELS[String(v)] ?? String(v);
    default:
      return String(v);
  }
}

/** CSV para planilha em pt-BR: `;`, UTF-8 com BOM, cabeçalhos em português, R$ com vírgula e datas em São Paulo. */
export function toCsv(rows: Array<Record<string, unknown>>, columns: CsvColumn[]): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = columns.map((c) => esc(c.label)).join(';');
  return '\uFEFF' + [header, ...rows.map((r) => columns.map((c) => esc(formatCell(r[c.key], c.format))).join(';'))].join('\n') + '\n';
}

/** Relatórios agregados (sem dados pessoais). Datas agrupadas no fuso America/Sao_Paulo. */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    /** Task 14: inadimplência pelo saldo devedor (valor − caução capturada), sem dívidas já quitadas. */
    @Optional() private readonly delinquency?: DelinquencyService,
  ) {}

  private window(fromIso: string, toIso: string, groupBy?: GroupBy) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (!(from < to)) throw badRequest('`from` precisa ser anterior a `to`.', [{ field: 'from', message: 'deve ser anterior a to' }]);
    if (groupBy && (to.getTime() - from.getTime()) / 1000 / GROUP_SECONDS[groupBy] > MAX_PERIODS) {
      throw badRequest('Período longo demais para este agrupamento.', [{ field: 'groupBy', message: 'use um agrupamento maior' }]);
    }
    return { from, to };
  }

  /** `alertScope`: alertas que o perfil vê (Task 14: operação não conta os financeiros, financeiro só os dele). */
  async dashboard(canSeeRevenue: boolean, alertScope: Prisma.AlertWhereInput | null = null) {
    const today = startOfTodaySaoPaulo();
    const [byStatus, activeRentals, openAlerts, revenue, subscriptions] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.rental.count({ where: { status: { in: ['active', 'paused', 'ending'] } } }),
      this.prisma.alert.count({ where: { status: { not: 'resolved' }, ...(alertScope ?? {}) } }),
      canSeeRevenue
        ? // Mesma definição do Financeiro: aluguéis encerrados + assinaturas pagas hoje (caução e recarga de carteira não entram).
          this.prisma.rental.aggregate({ where: { status: { in: ['ended', 'force_ended'] }, endedAt: { gte: today } }, _sum: { costCents: true } })
        : null,
      canSeeRevenue ? this.subscriptionRevenue(today) : null,
    ]);
    const counts = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const row of byStatus) counts[row.status] = row._count._all;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const inUse = counts.rented + counts.paused;
    return {
      generatedAt: new Date().toISOString(),
      occupancyPct: total ? Math.round((inUse / total) * 1000) / 10 : 0,
      activeRentals,
      revenueTodayCents: revenue ? Math.max(0, n(revenue._sum.costCents)) + n(subscriptions) : 0,
      openAlerts,
      vehiclesByStatus: counts,
    };
  }

  /** Inícios de aluguel em grade de ~100 m (3 casas decimais), sem identificar clientes. */
  async heatmap(fromIso: string, toIso: string) {
    const { from, to } = this.window(fromIso, toIso);
    const rows = await this.prisma.$queryRaw<Array<{ lat: number; lng: number; weight: bigint }>>`
      SELECT round("startLat"::numeric, 3)::float8 AS "lat", round("startLng"::numeric, 3)::float8 AS "lng", count(*) AS "weight"
      FROM "Rental" WHERE "startedAt" >= ${utcBound(from)} AND "startedAt" < ${utcBound(to)} AND "startLat" IS NOT NULL
      GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 5000`;
    return { from: from.toISOString(), to: to.toISOString(), points: rows.map((r) => ({ lat: n(r.lat), lng: n(r.lng), weight: n(r.weight) })) };
  }

  async revenue(fromIso: string, toIso: string, groupBy: GroupBy, planCode?: PlanCode) {
    const { from, to } = this.window(fromIso, toIso, groupBy);
    const planFilter = planCode ? Prisma.sql`AND "planCode" = ${planCode}::"PlanCode"` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT ${fromLocal(Prisma.sql`date_trunc(${groupBy}, ${local(Prisma.sql`"endedAt"`)})`)} AS "periodStart", "planCode",
             count(*) AS "rentals",
             coalesce(sum(("breakdown"->>'subtotalCents')::int), 0) AS "grossCents",
             coalesce(sum(("breakdown"->>'discountCents')::int), 0) AS "discountCents",
             coalesce(sum(("breakdown"->>'insuranceCents')::int), 0) AS "insuranceCents",
             coalesce(sum(("breakdown"->>'feesCents')::int), 0) AS "feesCents",
             coalesce(sum(("breakdown"->>'walletAppliedCents')::int), 0) AS "walletCents",
             coalesce(sum("costCents"), 0) AS "netCents"
      FROM "Rental"
      WHERE "status" IN ('ended', 'force_ended') AND "endedAt" >= ${utcBound(from)} AND "endedAt" < ${utcBound(to)} ${planFilter}
      GROUP BY 1, 2 ORDER BY 1, 2`;
    const mapped = rows.map((r) => ({
      periodStart: (r.periodStart as Date).toISOString(),
      planCode: r.planCode as PlanCode,
      rentals: n(r.rentals),
      grossCents: n(r.grossCents),
      discountCents: n(r.discountCents),
      insuranceCents: n(r.insuranceCents),
      feesCents: n(r.feesCents),
      walletCents: n(r.walletCents),
      netCents: n(r.netCents),
    }));
    return { from: from.toISOString(), to: to.toISOString(), groupBy, rows: mapped, totalNetCents: mapped.reduce((a, r) => a + r.netCents, 0) };
  }

  async occupancy(fromIso: string, toIso: string, groupBy: GroupBy) {
    const { from, to } = this.window(fromIso, toIso, groupBy);
    const step = Prisma.sql`('1 ' || ${groupBy})::interval`;
    const rows = await this.prisma.$queryRaw<Array<{ periodStart: Date; total: bigint; rented: bigint }>>`
      WITH periods AS (
        SELECT gs AS p FROM generate_series(date_trunc(${groupBy}, ${from.toISOString()}::timestamptz AT TIME ZONE ${TZ}), ${to.toISOString()}::timestamptz AT TIME ZONE ${TZ} - interval '1 microsecond', ${step}) gs
      )
      SELECT (p AT TIME ZONE ${TZ}) AS "periodStart",
             (SELECT count(*) FROM "Vehicle") AS "total",
             (SELECT count(DISTINCT r."vehicleId") FROM "Rental" r
                WHERE r."startedAt" < (((p + ${step}) AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC')
                  AND coalesce(r."endedAt", (now() AT TIME ZONE 'UTC')) >= ((p AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC')) AS "rented"
      FROM periods ORDER BY p`;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      rows: rows.map((r) => {
        const total = n(r.total);
        const rented = Math.min(total, n(r.rented));
        return { periodStart: r.periodStart.toISOString(), vehiclesTotal: total, vehiclesRented: rented, occupancyPct: total ? Math.round((rented / total) * 1000) / 10 : 0 };
      }),
    };
  }

  async revenuePerVehicle(fromIso: string, toIso: string, vehicleId?: string) {
    const { from, to } = this.window(fromIso, toIso);
    const vehicleFilter = vehicleId ? Prisma.sql`AND r."vehicleId" = ${vehicleId}::uuid` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT r."vehicleId", v."code" AS "vehicleCode", to_char(${local(Prisma.sql`r."endedAt"`)}, 'YYYY-MM-DD') AS "date",
             count(*) AS "rentals", coalesce(sum(extract(epoch FROM (r."endedAt" - r."startedAt")))::bigint, 0) AS "rentedSeconds",
             coalesce(sum(r."costCents"), 0) AS "revenueCents"
      FROM "Rental" r JOIN "Vehicle" v ON v."id" = r."vehicleId"
      WHERE r."status" IN ('ended', 'force_ended') AND r."endedAt" >= ${utcBound(from)} AND r."endedAt" < ${utcBound(to)} ${vehicleFilter}
      GROUP BY 1, 2, 3 ORDER BY 3, 2`;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      rows: rows.map((r) => ({
        vehicleId: r.vehicleId as string, vehicleCode: r.vehicleCode as string, date: r.date as string,
        rentals: n(r.rentals), rentedSeconds: n(r.rentedSeconds), revenueCents: n(r.revenueCents),
      })),
    };
  }

  async finance(fromIso: string, toIso: string) {
    const { from, to } = this.window(fromIso, toIso);
    const ended = { status: { in: ['ended', 'force_ended'] as Array<'ended' | 'force_ended'> }, endedAt: { gte: from, lt: to } };
    const [byPlan, depositsHeld, delinquentCustomers, failed, refunds, topUps, premiums, payouts, subscriptionRevenueCents] = await Promise.all([
      this.prisma.rental.groupBy({ by: ['planCode'], where: ended, _count: { _all: true }, _sum: { costCents: true } }),
      this.prisma.deposit.aggregate({ where: { status: 'held' }, _count: { _all: true }, _sum: { amountCents: true } }),
      this.prisma.customer.count({ where: { delinquent: true } }),
      // Task 14: só dívida de verdade (aluguel/assinatura `failed` ainda não quitada); caução Pix vencida e recarga recusada não são dívida.
      this.prisma.payment.findMany({ where: { status: 'failed', kind: { in: [...DEBT_KINDS] }, debtSettledAt: null, createdAt: { gte: from, lt: to } } }),
      this.prisma.payment.aggregate({ where: { refundedCents: { gt: 0 }, updatedAt: { gte: from, lt: to } }, _sum: { refundedCents: true } }),
      this.prisma.payment.aggregate({ where: { kind: 'top_up', status: 'paid', createdAt: { gte: from, lt: to } }, _sum: { amountCents: true } }),
      this.prisma.insurancePolicy.aggregate({ where: { issuedAt: { gte: from, lt: to } }, _sum: { premiumCents: true } }),
      this.prisma.insurancePolicy.aggregate({ where: { issuedAt: { gte: from, lt: to } }, _sum: { payoutCents: true } }),
      this.subscriptionRevenue(from, to),
    ]);
    const revenueByPlan = byPlan.map((r) => ({ planCode: r.planCode, rentals: r._count._all, revenueCents: n(r._sum.costCents) }));
    const rentalRevenueCents = revenueByPlan.reduce((a, r) => a + r.revenueCents, 0);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenueByPlan,
      // Task 30 (item 33): receita = aluguéis encerrados + assinaturas pagas. Recargas/pacotes (crédito pré-pago, vira
      // receita no aluguel), caução e estornos ficam de fora do total.
      rentalRevenueCents,
      subscriptionRevenueCents,
      totalRevenueCents: rentalRevenueCents + subscriptionRevenueCents,
      depositsHeldCount: depositsHeld._count._all,
      depositsHeldCents: n(depositsHeld._sum.amountCents),
      delinquentCustomers,
      delinquentAmountCents: await this.outstandingTotal(failed),
      refundsCents: n(refunds._sum.refundedCents),
      walletTopUpsCents: n(topUps._sum.amountCents),
      insurancePremiumsCents: n(premiums._sum.premiumCents),
      insurancePayoutsCents: n(payouts._sum.payoutCents),
    };
  }

  /**
   * Task 30: cobranças de assinatura (inclusive renovações) pagas, criadas no intervalo. Valor bruto: as estornadas depois
   * continuam contando aqui e o estorno aparece em `refundsCents` (como no aluguel).
   */
  private async subscriptionRevenue(from: Date, to?: Date): Promise<number> {
    const agg = await this.prisma.payment.aggregate({
      where: { kind: 'subscription', status: { in: ['paid', 'partially_refunded', 'refunded'] }, createdAt: { gte: from, ...(to ? { lt: to } : {}) } },
      _sum: { amountCents: true },
    });
    return n(agg?._sum?.amountCents);
  }

  /** Saldo devedor somado (valor − caução capturada como garantia); sem o serviço, o valor cheio. */
  private async outstandingTotal(payments: Array<{ id: string; amountCents: number }>): Promise<number> {
    if (!payments?.length) return 0;
    if (!this.delinquency) return payments.reduce((a, p) => a + p.amountCents, 0);
    const map = await this.delinquency.outstandingMap(payments as Parameters<DelinquencyService['outstandingMap']>[0]);
    return [...map.values()].reduce((a, b) => a + b, 0);
  }
}
