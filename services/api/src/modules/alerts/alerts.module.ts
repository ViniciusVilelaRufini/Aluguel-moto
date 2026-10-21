import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsListeners } from './alerts.listeners';
import { AlertsService } from './alerts.service';

@Module({ controllers: [AlertsController], providers: [AlertsService, AlertsListeners], exports: [AlertsService] })
export class AlertsModule {}
