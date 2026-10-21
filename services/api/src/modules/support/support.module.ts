import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({ imports: [AlertsModule], controllers: [SupportController], providers: [SupportService] })
export class SupportModule {}
