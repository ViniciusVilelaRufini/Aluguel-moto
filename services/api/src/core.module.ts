import { Global, Inject, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { CognitoAuthVerifier } from './adapters/auth/cognito-auth-verifier';
import { DevAuthVerifier } from './adapters/auth/dev-auth-verifier';
import { MockKycProvider } from './adapters/kyc/mock-kyc-provider';
import { LogPushNotifier } from './adapters/push/log-push-notifier';
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
import { PrismaService } from './prisma/prisma.service';
import { IoRedisStore, MemoryRedisStore, REDIS_STORE, RedisStore } from './redis/redis-store';

/** Infraestrutura compartilhada: implementação "local" ou "aws" de cada porta escolhida por variável de ambiente. */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    PrismaService,
    AuditService,
    PrincipalResolver,
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
    { provide: PUSH_NOTIFIER, useFactory: () => new LogPushNotifier() },
  ],
  exports: [
    APP_CONFIG,
    PrismaService,
    AuditService,
    PrincipalResolver,
    IDEMPOTENCY_STORE,
    REDIS_STORE,
    AUTH_VERIFIER,
    OBJECT_STORAGE,
    QUEUE_BUS,
    KYC_PROVIDER,
    PUSH_NOTIFIER,
  ],
})
export class CoreModule implements OnModuleDestroy, OnApplicationBootstrap {
  private readonly logger = new Logger('CoreModule');

  constructor(
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
    @Inject(OBJECT_STORAGE) private readonly storage: S3ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

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
    await this.redis.close();
  }
}
