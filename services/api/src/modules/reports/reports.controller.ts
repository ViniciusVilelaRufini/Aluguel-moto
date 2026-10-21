import { Controller, Get, Query, Res } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { PLAN_CODES, type PlanCode } from '../../common/enums';
import { CurrentUser, hasGroup, Principal, StaffOnly } from '../auth/principal';
import { GroupBy, ReportsService, toCsv } from './reports.service';

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

function send(res: Response, format: string | undefined, name: string, body: unknown, rows: Array<Record<string, unknown>>, columns: string[]) {
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
    return this.reports.dashboard(hasGroup(u, 'admin', 'financeiro'));
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
    return send(res, q.format, 'receita', r, r.rows, ['periodStart', 'planCode', 'rentals', 'grossCents', 'discountCents', 'insuranceCents', 'feesCents', 'netCents']);
  }

  @Get('occupancy')
  @StaffOnly('admin', 'operacao', 'financeiro')
  async occupancy(@Query() q: GroupedQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.occupancy(q.from, q.to, q.groupBy ?? 'day');
    return send(res, q.format, 'ocupacao', r, r.rows, ['periodStart', 'vehiclesTotal', 'vehiclesRented', 'occupancyPct']);
  }

  @Get('revenue-per-vehicle')
  @StaffOnly('admin', 'financeiro')
  async perVehicle(@Query() q: VehicleRevenueQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.revenuePerVehicle(q.from, q.to, q.vehicleId);
    return send(res, q.format, 'receita-por-moto', r, r.rows, ['date', 'vehicleCode', 'vehicleId', 'rentals', 'rentedSeconds', 'revenueCents']);
  }

  @Get('finance')
  @StaffOnly('admin', 'financeiro')
  async finance(@Query() q: RangeQuery, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.finance(q.from, q.to);
    const { revenueByPlan: _plans, ...flat } = r;
    return send(res, q.format, 'financeiro', r, [flat], Object.keys(flat));
  }
}
