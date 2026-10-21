import { Global, Module } from '@nestjs/common';
import { INSURANCE } from '../../ports/insurance.port';
import { MockInsuranceProvider, INSURANCE_PROVIDER } from './insurance-provider';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';

/** Seguro (Task 5): `InsuranceService` implementa a porta `INSURANCE` sobre o `InsuranceProvider` (`INSURANCE_PROVIDER=mock`). */
@Global()
@Module({
  controllers: [InsuranceController],
  providers: [
    { provide: INSURANCE_PROVIDER, useFactory: () => new MockInsuranceProvider() },
    InsuranceService,
    { provide: INSURANCE, useExisting: InsuranceService },
  ],
  exports: [INSURANCE, InsuranceService],
})
export class InsuranceModule {}
