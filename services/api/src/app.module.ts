import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { RequestLogInterceptor } from './common/request-log.interceptor';
import { CoreModule } from './core.module';
import { RedisThrottlerStorage } from './common/redis-throttler-storage';
import { REDIS_STORE, type RedisStore } from './redis/redis-store';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditController } from './modules/audit/audit.controller';
import { AuthGuard } from './modules/auth/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CommandsModule } from './modules/commands/commands.module';
import { CustomersController } from './modules/customers/customers.controller';
import { FieldTasksModule } from './modules/field-tasks/field-tasks.module';
import { HealthController } from './modules/health/health.controller';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { IotModule } from './modules/iot/iot.module';
import { KycController } from './modules/kyc/kyc.controller';
import { KycService } from './modules/kyc/kyc.service';
import { LgpdController } from './modules/lgpd/lgpd.controller';
import { LgpdService } from './modules/lgpd/lgpd.service';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { StaffController } from './modules/staff/staff.controller';
import { SupportModule } from './modules/support/support.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ZonesModule } from './modules/zones/zones.module';

/**
 * Módulo raiz. Arquivo compartilhado (spec §6): Tasks 4 e 5 só acrescentam imports.
 * Guards globais: rate limiting (throttler) → autenticação/grupos (seguro por padrão).
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
    ScheduleModule.forRoot(),
    // QA-18: contagem no Redis, compartilhada entre as tasks (REDIS_STORE vem do CoreModule global).
    ThrottlerModule.forRootAsync({
      inject: [REDIS_STORE],
      useFactory: (redis: RedisStore) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT_PER_MINUTE ?? 300) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    CoreModule,
    // Portas das Tasks 4 e 5 (stubs da Task 3).
    IotModule,
    PaymentsModule,
    InsuranceModule,
    WalletModule,
    // Domínio.
    AuthModule.register(),
    CommandsModule,
    VehiclesModule,
    ZonesModule,
    PricingModule,
    ReservationsModule,
    RentalsModule,
    AlertsModule,
    RealtimeModule,
    SupportModule,
    FieldTasksModule,
    ReportsModule,
  ],
  controllers: [HealthController, KycController, CustomersController, StaffController, AuditController, LgpdController],
  providers: [
    KycService,
    LgpdService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
