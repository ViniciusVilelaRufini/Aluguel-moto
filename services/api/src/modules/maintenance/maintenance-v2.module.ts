import { Global, Module } from '@nestjs/common';
import { CustomerMaintenanceController, VehicleServiceController } from './maintenance-v2.controller';
import { MaintenanceV2Service } from './maintenance-v2.service';

/** Contrato v2: manutenção preventiva por km/horas e agendamento pelo cliente. Global para o `MaintenanceController` registrar revisões. */
@Global()
@Module({ controllers: [VehicleServiceController, CustomerMaintenanceController], providers: [MaintenanceV2Service], exports: [MaintenanceV2Service] })
export class MaintenanceV2Module {}
