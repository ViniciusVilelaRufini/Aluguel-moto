import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VEHICLE_STATUSES, type PlanCode } from '../../common/enums';
import { badRequest } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';

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

/** CSV com `;`, UTF-8 com BOM, valores em centavos. */
export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [columns.join(';'), ...rows.map((r) => columns.map((c) => esc(r[c])).join(';'))].join('\n') + '\n';
}

/** Relatórios agregados (sem dados pessoais). Datas agrupadas no fuso America/Sao_Paulo. */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private window(fromIso: string, toIso: string, groupBy?: GroupBy) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (!(from < to)) throw badRequest('`from` precisa ser anterior a `to`.', [{ field: 'from', message: 'deve ser anterior a to' }]);
    if (groupBy && (to.getTime() - from.getTime()) / 1000 / GROUP_SECONDS[groupBy] > MAX_PERIODS) {
      throw badRequest('Período longo demais para este agrupamento.', [{ field: 'groupBy', message: 'use um agrupamento maior' }]);
    }
    return { from, to };
  }

  async dashboard(canSeeRevenue: boolean) {
    const [byStatus, activeRentals, openAlerts, revenue] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.rental.count({ where: { status: { in: ['active', 'paused', 'ending'] } } }),
      this.prisma.alert.count({ where: { status: { not: 'resolved' } } }),
      canSeeRevenue
        ? this.prisma.payment.aggregate({ where: { status: { in: ['paid', 'captured', 'partially_refunded'] }, createdAt: { gte: startOfTodaySaoPaulo() } }, _sum: { amountCents: true, refundedCents: true } })
        : null,
    ]);
    const counts = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const row of byStatus) counts[row.status] = row._count._all;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const inUse = counts.rented + counts.paused;
    return {
      generatedAt: new Date().toISOString(),
      occupancyPct: total ? Math.round((inUse / total) * 1000) / 10 : 0,
      activeRentals,
      revenueTodayCents: revenue ? Math.max(0, n(revenue._sum.amountCents) - n(revenue._sum.refundedCents)) : 0,
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
    const [byPlan, depositsHeld, delinquentCustomers, failed, refunds, topUps, premiums, payouts] = await Promise.all([
      this.prisma.rental.groupBy({ by: ['planCode'], where: ended, _count: { _all: true }, _sum: { costCents: true } }),
      this.prisma.deposit.aggregate({ where: { status: 'held' }, _count: { _all: true }, _sum: { amountCents: true } }),
      this.prisma.customer.count({ where: { delinquent: true } }),
      this.prisma.payment.aggregate({ where: { status: 'failed', createdAt: { gte: from, lt: to } }, _sum: { amountCents: true } }),
      this.prisma.payment.aggregate({ where: { refundedCents: { gt: 0 }, updatedAt: { gte: from, lt: to } }, _sum: { refundedCents: true } }),
      this.prisma.payment.aggregate({ where: { kind: 'top_up', status: 'paid', createdAt: { gte: from, lt: to } }, _sum: { amountCents: true } }),
      this.prisma.insurancePolicy.aggregate({ where: { issuedAt: { gte: from, lt: to } }, _sum: { premiumCents: true } }),
      this.prisma.insurancePolicy.aggregate({ where: { issuedAt: { gte: from, lt: to } }, _sum: { payoutCents: true } }),
    ]);
    const revenueByPlan = byPlan.map((r) => ({ planCode: r.planCode, rentals: r._count._all, revenueCents: n(r._sum.costCents) }));
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenueByPlan,
      totalRevenueCents: revenueByPlan.reduce((a, r) => a + r.revenueCents, 0),
      depositsHeldCount: depositsHeld._count._all,
      depositsHeldCents: n(depositsHeld._sum.amountCents),
      delinquentCustomers,
      delinquentAmountCents: n(failed._sum.amountCents),
      refundsCents: n(refunds._sum.refundedCents),
      walletTopUpsCents: n(topUps._sum.amountCents),
      insurancePremiumsCents: n(premiums._sum.premiumCents),
      insurancePayoutsCents: n(payouts._sum.payoutCents),
    };
  }
}
