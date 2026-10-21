import { Global, Module } from '@nestjs/common';
import { INSURANCE } from '../../ports/insurance.port';
import { InsuranceController } from './insurance.controller';
import { StubInsurance } from './stub-insurance';

/**
 * Módulo de seguro — dono: Task 5 (agente 4). Hoje registra o `StubInsurance` (prêmios do seed).
 * A Task 5 troca o provider por `InsuranceService` (com `InsuranceProvider` mock).
 */
@Global()
@Module({
  controllers: [InsuranceController],
  providers: [StubInsurance, { provide: INSURANCE, useExisting: StubInsurance }],
  exports: [INSURANCE],
})
export class InsuranceModule {}
