import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { JsonLogger } from './common/json-logger';
import { loadConfig } from './config/env';
import { useRedisSocketAdapter } from './modules/realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger(), bufferLogs: true });
  configureApp(app);
  // Várias tasks no ECS: eventos de tempo real atravessam as instâncias pelo Redis (lacunas T5).
  const ioAdapter = await useRedisSocketAdapter(app, cfg.redisUrl);
  app.enableShutdownHooks();
  await app.listen(cfg.port, '0.0.0.0');
  new JsonLogger().log({ msg: 'api_started', port: cfg.port, authMode: cfg.authMode, storageMode: cfg.storageMode, queueMode: cfg.queueMode, socketIoAdapter: ioAdapter ? 'redis' : 'memory' }, 'bootstrap');
}

void bootstrap();
