import { Module } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';

/** Auditoria run-4: expurgo diário das tabelas técnicas (idempotência e webhooks processados). */
@Module({ providers: [HousekeepingService] })
export class HousekeepingModule {}
