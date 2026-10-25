import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { BatteriesController } from './batteries.controller';
import { BatteriesService } from './batteries.service';
import { BatteryStockService } from './battery-stock.service';

/** Contrato v2: baterias e estoque da van; 2026-10-24: ciclo de vida no galpão e alerta de estoque mínimo. */
@Module({ imports: [AlertsModule], controllers: [BatteriesController], providers: [BatteriesService, BatteryStockService] })
export class BatteriesModule {}
