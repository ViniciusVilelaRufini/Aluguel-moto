import { Global, Inject, Logger, Module, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoAuthVerifier } from './adapters/auth/cognito-auth-verifier';
import { CognitoStaffDirectory } from './adapters/identity/cognito-staff-directory';
import { LocalStaffDirectory } from './adapters/identity/local-staff-directory';
import { CognitoCustomerIdentityDirectory } from './adapters/identity/cognito-customer-identity';
import { LocalCustomerIdentityDirectory } from './adapters/identity/local-customer-identity';
import { CUSTOMER_IDENTITY, type CustomerIdentityDirectory } from './ports/customer-identity.port';
import { DevAuthVerifier } from './adapters/auth/dev-auth-verifier';
import { MockKycProvider } from './adapters/kyc/mock-kyc-provider';
import { createPushNotifier } from './adapters/push/fcm-push-notifier';
import { InProcessQueueBus } from './adapters/queue/in-process-queue-bus';
import { SqsQueueBus } from './adapters/queue/sqs-queue-bus';
import { S3ObjectStorage } from './adapters/storage/s3-object-storage';
import { IDEMPOTENCY_STORE, PrismaIdempotencyStore } from './common/idempotency/idempotency.store';
import { APP_CONFIG, AppConfig, loadConfig } from './config/env';
import { AuditService } from './modules/audit/audit.service';
import { PrincipalResolver } from './modules/auth/principal-resolver.service';
import { AUTH_VERIFIER } from './ports/auth-verifier.port';
import { KYC_PROVIDER } from './ports/kyc-provider.port';
import { OBJECT_STORAGE } from './ports/object-storage.port';
import { PUSH_NOTIFIER } from './ports/push-notifier.port';
import { QUEUE_BUS } from './ports/queue-bus.port';
import { STAFF_DIRECTORY, type StaffDirectory } from './ports/staff-directory.port';
import { PrismaService } from './prisma/prisma.service';
import { AwsLocationReverseGeocoder } from './adapters/geocoding/aws-location-reverse-geocoder';
import { CachedReverseGeocoder } from './adapters/geocoding/cached-reverse-geocoder';
import { LocalReverseGeocoder } from './adapters/geocoding/local-reverse-geocoder';
import { loadV2Config, V2_CONFIG, type V2Config } from './config/v2-config';
import { REVERSE_GEOCODER } from './ports/reverse-geocoder.port';
import { ClusterEventsBridge } from './common/cluster-events';
import { IoRedisStore, MemoryRedisStore, REDIS_STORE, RedisStore } from './redis/redis-store';
import { JobLock, registerJobLock } from './common/job-lock';

/** Infraestrutura compartilhada: implementação "local" ou "aws" de cada porta escolhida por variável de ambiente. */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    { provide: V2_CONFIG, useFactory: loadV2Config },
    {
      // Contrato v2: endereço da moto (local = ruas de São Paulo em memória; aws = Amazon Location), com cache no Redis.
      provide: REVERSE_GEOCODER,
      inject: [V2_CONFIG, REDIS_STORE],
      useFactory: (v2: V2Config, redis: RedisStore) => {
        if (v2.geocoderMode === 'aws' && !v2.placeIndexName) throw new Error('GEOCODER_MODE=aws exige LOCATION_PLACE_INDEX.');
        const inner = v2.geocoderMode === 'aws' ? AwsLocationReverseGeocoder.create(v2.awsRegion, v2.placeIndexName!) : new LocalReverseGeocoder();
        return new CachedReverseGeocoder(inner, redis);
      },
    },
    PrismaService,
    AuditService,
    PrincipalResolver,
    ClusterEventsBridge,
    { provide: IDEMPOTENCY_STORE, useClass: PrismaIdempotencyStore },
    {
      provide: REDIS_STORE,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig): RedisStore => (cfg.redisUrl === 'memory' ? new MemoryRedisStore() : new IoRedisStore(cfg.redisUrl)),
    },
    {
      provide: AUTH_VERIFIER,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => (cfg.authMode === 'cognito' ? new CognitoAuthVerifier(cfg) : new DevAuthVerifier(cfg.devJwtSecret)),
    },
    { provide: OBJECT_STORAGE, inject: [APP_CONFIG], useFactory: (cfg: AppConfig) => new S3ObjectStorage(cfg) },
    {
      provide: QUEUE_BUS,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => (cfg.queueMode === 'sqs' ? new SqsQueueBus(cfg) : new InProcessQueueBus()),
    },
    { provide: KYC_PROVIDER, useFactory: () => new MockKycProvider() },
    {
      // PUSH_MODE=fcm: Firebase Cloud Messaging (credencial validada no loadConfig); log: só registra (dev).
      provide: PUSH_NOTIFIER,
      inject: [APP_CONFIG, PrismaService],
      useFactory: (cfg: AppConfig, prisma: PrismaService) => createPushNotifier(cfg, prisma),
    },
    {
      provide: CUSTOMER_IDENTITY,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig): CustomerIdentityDirectory =>
        cfg.authMode === 'cognito' && cfg.cognito.customerPoolId
          ? new CognitoCustomerIdentityDirectory(new CognitoIdentityProviderClient({ region: cfg.cognito.region }), cfg.cognito.customerPoolId)
          : new LocalCustomerIdentityDirectory(),
    },
    {
      provide: STAFF_DIRECTORY,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig): StaffDirectory =>
        cfg.authMode === 'cognito' && cfg.cognito.staffPoolId
          ? new CognitoStaffDirectory(new CognitoIdentityProviderClient({ region: cfg.cognito.region }), cfg.cognito.staffPoolId)
          : new LocalStaffDirectory(),
    },
  ],
  exports: [
    APP_CONFIG,
    V2_CONFIG,
    REVERSE_GEOCODER,
    PrismaService,
    AuditService,
    PrincipalResolver,
    ClusterEventsBridge,
    IDEMPOTENCY_STORE,
    REDIS_STORE,
    AUTH_VERIFIER,
    OBJECT_STORAGE,
    QUEUE_BUS,
    KYC_PROVIDER,
    PUSH_NOTIFIER,
    STAFF_DIRECTORY,
    CUSTOMER_IDENTITY,
  ],
})
export class CoreModule implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
  private readonly logger = new Logger('CoreModule');

  constructor(
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
    @Inject(OBJECT_STORAGE) private readonly storage: S3ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Lacunas T5: cada rodada dos jobs `@Interval`/`@Cron` (`@ExclusiveJob`) roda numa instância só, pelo Redis compartilhado. */
  onModuleInit(): void {
    registerJobLock(new JobLock(this.redis));
  }

  /** Dev local: garante os buckets do MinIO (documentos-kyc, fotos-devolucao, relatorios, anexos). */
  async onApplicationBootstrap(): Promise<void> {
    if (this.cfg.storageMode !== 'local' || process.env.ENSURE_BUCKETS === 'false') return;
    try {
      const created = await this.storage.ensureBuckets(Object.values(this.cfg.buckets));
      this.logger.log({ msg: 'buckets_ready', created });
    } catch (err) {
      this.logger.warn({ msg: 'buckets_ensure_failed', error: (err as Error).message });
    }
  }

  async onModuleDestroy(): Promise<void> {
    registerJobLock(undefined);
    await this.redis.close();
  }
}
