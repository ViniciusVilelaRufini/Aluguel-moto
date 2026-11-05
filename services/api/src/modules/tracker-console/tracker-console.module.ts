import { Module } from '@nestjs/common';
import { TrackerConsoleController } from './tracker-console.controller';
import { TrackerConsoleService } from './tracker-console.service';

@Module({ controllers: [TrackerConsoleController], providers: [TrackerConsoleService], exports: [TrackerConsoleService] })
export class TrackerConsoleModule {}
