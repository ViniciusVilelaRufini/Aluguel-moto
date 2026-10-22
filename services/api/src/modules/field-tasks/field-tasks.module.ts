import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { FieldTasksController } from './field-tasks.controller';
import { FieldTasksService } from './field-tasks.service';
import { MaintenanceController } from './maintenance.controller';

@Module({ imports: [AlertsModule, VehiclesModule], controllers: [FieldTasksController, MaintenanceController], providers: [FieldTasksService] })
export class FieldTasksModule {}
