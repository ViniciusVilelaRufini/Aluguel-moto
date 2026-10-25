import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { BATTERY_STATUSES, BatteriesService } from './batteries.service';

export class ListBatteriesQuery extends PageQuery {
  @IsOptional()
  @IsIn(BATTERY_STATUSES)
  status?: (typeof BATTERY_STATUSES)[number];

  /** Fix round 1 (M5): `me` ou UUID. */
  @IsOptional()
  @Matches(/^(me|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/)
  holderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;

  @IsOptional()
  @IsUUID()
  depotId?: string;
}

const INITIAL_STATUSES = ['charging', 'charged'] as const;

export class BatteryCreateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  serial: string;

  @IsIn(INITIAL_STATUSES)
  status: (typeof INITIAL_STATUSES)[number];

  @IsUUID()
  depotId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  chargePct?: number;
}

export class BatteryDefectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class BatteryRetireDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class VanStockQuery {
  @IsOptional()
  @IsUUID()
  operatorId?: string;
}

export class BatteryTransferDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(64, { each: true })
  serials: string[];

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsUUID()
  depotId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  chargePct?: number;
}

/** Rotas literais `van-stock*` declaradas em controller próprio sob `/batteries`. */
@Controller('batteries')
export class BatteriesController {
  constructor(private readonly batteries: BatteriesService) {}

  @Get()
  @StaffOnly('admin', 'operacao', 'campo')
  list(@Query() q: ListBatteriesQuery, @CurrentUser() u: Principal) {
    return this.batteries.list(u, q);
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: BatteryCreateDto, @CurrentUser() u: Principal) {
    return this.batteries.create(u, dto);
  }

  @Post(':id/mark-charged')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  markCharged(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.batteries.markCharged(u, id);
  }

  @Post(':id/report-defect')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  reportDefect(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BatteryDefectDto, @CurrentUser() u: Principal) {
    return this.batteries.reportDefect(u, id, dto.reason);
  }

  @Post(':id/retire')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao')
  retire(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BatteryRetireDto, @CurrentUser() u: Principal) {
    return this.batteries.retire(u, id, dto?.reason);
  }

  @Get(':id/movements')
  @StaffOnly('admin', 'operacao', 'suporte', 'campo')
  movements(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageQuery) {
    return this.batteries.movements(id, q);
  }

  @Get('van-stock')
  @StaffOnly('admin', 'operacao', 'campo')
  vanStock(@Query() q: VanStockQuery, @CurrentUser() u: Principal) {
    return this.batteries.vanStock(u, q.operatorId);
  }

  @Post('van-stock/load')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  load(@Body() dto: BatteryTransferDto, @CurrentUser() u: Principal) {
    return this.batteries.load(u, dto.serials, dto.chargePct);
  }

  @Post('van-stock/unload')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  unload(@Body() dto: BatteryTransferDto, @CurrentUser() u: Principal) {
    return this.batteries.unload(u, dto.serials, dto.stationId, dto.depotId);
  }
}
