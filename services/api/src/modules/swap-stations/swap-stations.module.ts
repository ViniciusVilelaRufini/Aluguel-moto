import { Module } from '@nestjs/common';
import { loadStationQrSecret } from '../station-swaps/station-code';
import { SwapStationsAdminController } from './swap-stations.controller';
import { SWAP_STATION_QR_SECRET, SwapStationsService } from './swap-stations.service';

/** Cadastro de estações de troca pelo painel (Task 12 das lacunas, 2026-10-24). */
@Module({
  controllers: [SwapStationsAdminController],
  providers: [{ provide: SWAP_STATION_QR_SECRET, useFactory: loadStationQrSecret }, SwapStationsService],
})
export class SwapStationsModule {}
