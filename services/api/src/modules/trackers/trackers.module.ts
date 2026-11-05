import { Module } from '@nestjs/common';
import { TrackersController } from './trackers.controller';
import { TrackersService } from './trackers.service';

/** Estoque de rastreadores GT06/J16 e instalação na moto. `REDIS_STORE` e `TRACKER_MODES` vêm de módulos globais. */
@Module({ controllers: [TrackersController], providers: [TrackersService], exports: [TrackersService] })
export class TrackersModule {}
