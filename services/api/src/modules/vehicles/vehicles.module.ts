import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({ imports: [CommandsModule], controllers: [VehiclesController], providers: [VehiclesService], exports: [VehiclesService] })
export class VehiclesModule {}
