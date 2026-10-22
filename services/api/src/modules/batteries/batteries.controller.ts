import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { BatteriesService } from './batteries.service';

const BATTERY_STATUSES = ['in_vehicle', 'in_van', 'charging', 'in_station', 'retired'] as const;

export class ListBatteriesQuery extends PageQuery {
  @IsOptional()
  @IsIn(BATTERY_STATUSES)
  status?: (typeof BATTERY_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(36)
  holderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
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
    return this.batteries.unload(u, dto.serials, dto.stationId);
  }
}
