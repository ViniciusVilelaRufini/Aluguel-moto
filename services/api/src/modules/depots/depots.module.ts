import { Module } from '@nestjs/common';
import { DepotsController } from './depots.controller';
import { DepotsService } from './depots.service';

/** Retirada em galpão: galpões, motos do galpão e agenda. `DepotsService.requireActive` é usado pelas reservas (Task 5). */
@Module({ controllers: [DepotsController], providers: [DepotsService], exports: [DepotsService] })
export class DepotsModule {}
