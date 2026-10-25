import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { type BatteryChargedStockDecreasedEvent, EV } from '../../common/events';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';

/**
 * Estoque mínimo de baterias carregadas por galpão (`Depot.minChargedBatteries`, nulo ou 0 = sem alerta). Quando uma
 * bateria sai de `charged` e a contagem do galpão fica abaixo do mínimo, abre `battery_stock_low` — um não resolvido por
 * galpão (checagem + índice único parcial `Alert_one_open_stock_low_per_depot` contra corrida).
 */
@Injectable()
export class BatteryStockService {
  private readonly logger = new Logger('BatteryStockService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async check(depotIds: string[]): Promise<void> {
    for (const depotId of new Set(depotIds)) await this.checkDepot(depotId);
  }

  /** Saídas de `charged` fora deste módulo (troca na tarefa de campo, troca na estação). */
  @OnEvent(EV.BATTERY_CHARGED_STOCK_DECREASED)
  async onChargedStockDecreased(ev: BatteryChargedStockDecreasedEvent): Promise<void> {
    try {
      await this.check(ev.depotIds);
    } catch (err) {
      this.logger.error({ msg: 'battery_stock_check_failed', error: (err as Error).message });
    }
  }

  private async checkDepot(depotId: string): Promise<void> {
    const depot = await this.prisma.depot.findUnique({ where: { id: depotId }, select: { id: true, name: true, minChargedBatteries: true } });
    const min = depot?.minChargedBatteries ?? 0;
    if (!depot || min <= 0) return;
    const charged = await this.prisma.battery.count({ where: { depotId, status: 'charged' } });
    if (charged >= min) return;
    const open = await this.prisma.alert.findFirst({ where: { type: 'battery_stock_low', depotId, status: { not: 'resolved' } }, select: { id: true } });
    if (open) return;
    try {
      await this.alerts.create(
        { type: 'battery_stock_low', priority: 'medium', depotId, message: `Poucas baterias carregadas — ${depot.name}: ${charged} (mínimo ${min}).` },
        { dedupe: false },
      );
      this.logger.log({ msg: 'battery_stock_low', depotId, charged, min });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return; // outro processo abriu primeiro
      throw err;
    }
  }
}
