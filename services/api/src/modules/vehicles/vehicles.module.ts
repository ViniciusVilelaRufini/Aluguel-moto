import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module';
import { UsageTracker } from '../maintenance/usage-tracker.service';
import { VehicleAddressService } from './vehicle-address.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [CommandsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleAddressService, UsageTracker],
  exports: [VehiclesService, VehicleAddressService],
})
export class VehiclesModule {}
