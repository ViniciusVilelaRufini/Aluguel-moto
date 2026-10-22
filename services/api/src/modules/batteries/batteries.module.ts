import { Module } from '@nestjs/common';
import { BatteriesController } from './batteries.controller';
import { BatteriesService } from './batteries.service';

/** Contrato v2: baterias e estoque da van. */
@Module({ controllers: [BatteriesController], providers: [BatteriesService] })
export class BatteriesModule {}
