import { Module } from '@nestjs/common';
import { SwapStationsController, VehicleModelsController } from './catalog.controller';
import { CatalogService } from './catalog.service';

/** Contrato v2: catálogo de modelos e estações de troca. */
@Module({ controllers: [VehicleModelsController, SwapStationsController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
