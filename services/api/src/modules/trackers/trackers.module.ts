import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module';
import { TrackerInstallLockReconciler } from './tracker-install-lock.reconciler';
import { TrackersController } from './trackers.controller';
import { TrackersService } from './trackers.service';

/** Estoque de rastreadores GT06/J16 e instalação na moto. `REDIS_STORE` e `TRACKER_MODES` vêm de módulos globais. */
@Module({ imports: [CommandsModule], controllers: [TrackersController], providers: [TrackersService, TrackerInstallLockReconciler], exports: [TrackersService] })
export class TrackersModule {}
