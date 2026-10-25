import { Controller, Get, Query, Res } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { PLAN_CODES, type PlanCode } from '../../common/enums';
import { CurrentUser, hasGroup, Principal, StaffOnly } from '../auth/principal';
import { alertScope } from '../alerts/alerts.service';
import { type CsvColumn, GroupBy, ReportsService, toCsv } from './reports.service';

class RangeQuery {
  @IsDateString() from: string;
  @IsDateString() to: string;
  @IsOptional() @IsIn(['json', 'csv']) format?: 'json' | 'csv';
}
class GroupedQuery extends RangeQuery {
  @IsOptional() @IsIn(['hour', 'day', 'week', 'month']) groupBy?: GroupBy;
}
class RevenueQuery extends GroupedQuery {
  @IsOptional() @IsIn(PLAN_CODES) planCode?: PlanCode;
}
class VehicleRevenueQuery extends RangeQuery {
  @IsOptional() @IsUUID() vehicleId?: string;
}

/** QA-16: cabeçalhos em português; datas no fuso de São Paulo (com hora só no agrupamento por hora). */
const periodColumn = (groupBy: GroupBy): CsvColumn => ({ key: 'periodStart', label: 'Início do período', format: groupBy === 'hour' ? 'datetime' : 'date' });
const REVENUE_COLUMNS: CsvColumn[] = [
  { key: 'planCode', label: 'Plano', format: 'plan' },
  { key: 'rentals', label: 'Aluguéis', format: 'int' },
  { key: 'grossCents', label: 'Bruto (R$)', format: 'money' },
  { key: 'discountCents', label: 'Descontos (R$)', format: 'money' },
  { key: 'insuranceCents', label: 'Seguro (R$)', format: 'money' },
  { key: 'feesCents', label: 'Taxas (R$)', format: 'money' },
  { key: 'walletCents', label: 'Pago com carteira (R$)', format: 'money' },
  { key: 'netCents', label: 'Líquido (R$)', format: 'money' },
];
const OCCUPANCY_COLUMNS: CsvColumn[] = [
  { key: 'vehiclesTotal', label: 'Motos', format: 'int' },
  { key: 'vehiclesRented', label: 'Motos alugadas', format: 'int' },
  { key: 'occupancyPct', label: 'Ocupação (%)', format: 'pct' },
];
const VEHICLE_REVENUE_COLUMNS: CsvColumn[] = [
  { key: 'date', label: 'Data', format: 'date' },
  { key: 'vehicleCode', label: 'Moto' },
  { key: 'vehicleId', label: 'ID da moto' },
  { key: 'rentals', label: 'Aluguéis', format: 'int' },
  { key: 'rentedSeconds', label: 'Tempo alugado (s)', format: 'int' },
  { key: 'revenueCents', label: 'Receita (R$)', format: 'money' },
];
const FINANCE_COLUMNS: CsvColumn[] = [
  { key: 'from', label: 'De', format: 'datetime' },
  { key: 'to', label: 'Até', format: 'datetime' },
  { key: 'totalRevenueCents', label: 'Receita total (R$)', format: 'money' },
  { key: 'rentalRevenueCents', label: 'Receita de aluguéis (R$)', format: 'money' },
  { key: 'subscriptionRevenueCents', label: 'Receita de assinaturas (R$)', format: 'money' },
  { key: 'depositsHeldCount', label: 'Cauções retidas', format: 'int' },
  { key: 'depositsHeldCents', label: 'Cauções retidas (R$)', format: 'money' },
  { key: 'delinquentCustomers', label: 'Clientes inadimplentes', format: 'int' },
  { key: 'delinquentAmountCents', label: 'Inadimplência (R$)', format: 'money' },
  { key: 'refundsCents', label: 'Estornos (R$)', format: 'money' },
  { key: 'walletTopUpsCents', label: 'Recargas de carteira (R$)', format: 'money' },
  { key: 'insurancePremiumsCents', label: 'Prêmios de seguro (R$)', format: 'money' },
  { key: 'insurancePayoutsCents', label: 'Indenizações de seguro (R$)', format: 'money' },
];

function send(res: Response, format: string | undefined, name: string, body: unknown, rows: Array<Record<string, unknown>>, columns: CsvColumn[]) {
  if (format !== 'csv') return body;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.send(toCsv(rows, columns));
  return undefined;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @StaffOnly('admin', 'operacao', 'financeiro', 'suporte')
  dashboard(@CurrentUser() u: Principal) {
    return this.reports.dashboard(hasGroup(u, 'admin', 'financeiro'), alertScope(u));
  }

  @Get('demand-heatmap')
  @StaffOnly('admin', 'operacao')
  heatmap(@Query() q: RangeQuery) {
    return this.reports.heatmap(q.from, q.to);
  }

  @Get('revenue')
  @StaffOnly('admin', 'financeiro')
  async revenue(@Query() q: RevenueQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.revenue(q.from, q.to, q.groupBy ?? 'day', q.planCode);
    return send(res, q.format, 'receita', r, r.rows, [periodColumn(r.groupBy), ...REVENUE_COLUMNS]);
  }

  @Get('occupancy')
  @StaffOnly('admin', 'operacao', 'financeiro')
  async occupancy(@Query() q: GroupedQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.occupancy(q.from, q.to, q.groupBy ?? 'day');
    return send(res, q.format, 'ocupacao', r, r.rows, [periodColumn(r.groupBy), ...OCCUPANCY_COLUMNS]);
  }

  @Get('revenue-per-vehicle')
  @StaffOnly('admin', 'financeiro')
  async perVehicle(@Query() q: VehicleRevenueQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.revenuePerVehicle(q.from, q.to, q.vehicleId);
    return send(res, q.format, 'receita-por-moto', r, r.rows, VEHICLE_REVENUE_COLUMNS);
  }

  @Get('finance')
  @StaffOnly('admin', 'financeiro')
  async finance(@Query() q: RangeQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.finance(q.from, q.to);
    const { revenueByPlan: _plans, ...flat } = r;
    return send(res, q.format, 'financeiro', r, [flat], FINANCE_COLUMNS);
  }
}
