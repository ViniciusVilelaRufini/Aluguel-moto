import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

/** Prefixo do thingName de rastreador GT06 em estoque (`gt06-<IMEI>`). */
export const STOCK_THING_PREFIX = 'gt06-';
/** Intervalo mínimo entre duas gravações de `Tracker.lastSeenAt` do mesmo rastreador. */
const STOCK_HEARTBEAT_MIN_INTERVAL_MS = 15_000;
/** Teto de thingNames lembrados (o mapa é podado ao chegar aqui). */
const STOCK_HEARTBEAT_MAP_MAX = 5000;

export function isStockThingName(thingName: string): boolean {
  return thingName.startsWith(STOCK_THING_PREFIX);
}

/**
 * Último sinal do rastreador em estoque (sem moto): grava só `Tracker.lastSeenAt`, no máximo a cada 15 s por rastreador.
 * Sem nenhum outro efeito (trava, cerca, trajeto, estado ao vivo). O thingName contém o IMEI: nunca vai para o log.
 */
export class StockTrackerHeartbeat {
  private readonly logger = new Logger('StockTrackerHeartbeat');
  private readonly writtenAt = new Map<string, number>();

  constructor(private readonly prisma: Pick<PrismaClient, 'tracker'>) {}

  async touch(thingName: string, at: number): Promise<void> {
    if (!isStockThingName(thingName)) return;
    const last = this.writtenAt.get(thingName);
    if (last !== undefined && at - last < STOCK_HEARTBEAT_MIN_INTERVAL_MS) return;
    if (this.writtenAt.size >= STOCK_HEARTBEAT_MAP_MAX) {
      for (const [k, t] of this.writtenAt) if (at - t >= STOCK_HEARTBEAT_MIN_INTERVAL_MS) this.writtenAt.delete(k);
      for (const k of this.writtenAt.keys()) {
        if (this.writtenAt.size < STOCK_HEARTBEAT_MAP_MAX) break;
        this.writtenAt.delete(k);
      }
    }
    this.writtenAt.set(thingName, at);
    try {
      await this.prisma.tracker.updateMany({ where: { thingName, vehicleId: null }, data: { lastSeenAt: new Date(at) } });
    } catch (err) {
      // Falhou: libera a marca para a próxima mensagem tentar de novo.
      this.writtenAt.delete(thingName);
      this.logger.error({ msg: 'stock_heartbeat_failed', error: (err as Error).message.slice(0, 120) });
    }
  }
}
