import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      // A API sobe mesmo sem banco (o /health reporta `down`); o Prisma reconecta na próxima consulta.
      this.logger.error({ msg: 'db_connect_failed', error: (err as Error).message });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
