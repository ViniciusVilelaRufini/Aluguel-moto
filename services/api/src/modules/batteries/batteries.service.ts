import { Injectable, Logger } from '@nestjs/common';
import type { Battery, BatteryStatus, Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { hasGroup, type Principal } from '../auth/principal';
import { CHARGED_PCT, toBattery, toBatteryMovement } from './batteries.mapper';
import { depotsLeavingCharged, movement, recordMovements, type MovementInput } from './battery-movements';
import { BatteryStockService } from './battery-stock.service';

export const BATTERY_STATUSES = ['in_vehicle', 'in_van', 'charging', 'charged', 'in_station', 'defective', 'retired'] as const satisfies readonly BatteryStatus[];

/** Ciclo de vida no galpão (docs/decisoes.md, 2026-10-24): de onde cada ação pode partir. */
const DEFECT_FROM: BatteryStatus[] = ['charging', 'charged', 'in_van', 'in_station'];
const RETIRE_FROM: BatteryStatus[] = ['defective', 'charging', 'charged'];
/** Fora de uso: não vão para a van nem para uma moto. */
export const OUT_OF_SERVICE: BatteryStatus[] = ['defective', 'retired'];

const STATUS_LABEL: Record<BatteryStatus, string> = {
  in_vehicle: 'instalada numa moto',
  in_van: 'na van',
  charging: 'carregando',
  charged: 'carregada',
  in_station: 'na estação',
  defective: 'com defeito',
  retired: 'baixada',
};

export interface CreateBatteryInput {
  serial: string;
  status: 'charging' | 'charged';
  depotId: string;
  chargePct?: number;
}

/** Baterias, estoque da van do operador e ciclo de vida no galpão (contrato v2 + 2026-10-24). */
@Injectable()
export class BatteriesService {
  private readonly logger = new Logger('BatteriesService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: BatteryStockService,
  ) {}

  private async vehicleCodes(ids: Array<string | null>): Promise<Map<string, string>> {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map();
    const vs = await this.prisma.vehicle.findMany({ where: { id: { in: list } }, select: { id: true, code: true } });
    return new Map(vs.map((v) => [v.id, v.code]));
  }

  async list(user: Principal, q: { cursor?: string; limit?: number; status?: BatteryStatus; holderId?: string; q?: string; depotId?: string }) {
    const base: Prisma.BatteryWhereInput = {};
    if (q.depotId) base.depotId = q.depotId;
    if (q.holderId) base.holderId = q.holderId === 'me' ? user.userId : q.holderId;
    if (q.q) base.serial = { contains: q.q, mode: 'insensitive' };
    const where: Prisma.BatteryWhereInput = q.status ? { ...base, status: q.status } : base;
    const [rows, groups] = await Promise.all([
      this.prisma.battery.findMany({ where, orderBy: [{ serial: 'asc' }, { id: 'asc' }], ...pageArgs(q) }),
      this.prisma.battery.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);
    const codes = await this.vehicleCodes(rows.map((r) => r.vehicleId));
    const statusCounts = Object.fromEntries(BATTERY_STATUSES.map((s) => [s, 0])) as Record<BatteryStatus, number>;
    for (const g of groups) statusCounts[g.status] = g._count._all;
    return { ...toPage(rows, q, (b) => toBattery(b, b.vehicleId ? codes.get(b.vehicleId) : undefined)), statusCounts };
  }

  /** `campo` só vê a própria van; `admin`/`operacao` podem consultar a de qualquer operador. */
  async vanStock(user: Principal, operatorId?: string) {
    const target = operatorId ?? user.userId;
    if (target !== user.userId && !hasGroup(user, 'admin', 'operacao')) throw forbidden('Você só pode consultar a sua van.');
    const items = await this.prisma.battery.findMany({ where: { holderId: target, status: 'in_van' }, orderBy: [{ chargePct: 'desc' }, { serial: 'asc' }] });
    const charged = items.filter((b) => b.chargePct >= CHARGED_PCT).length;
    return { operatorId: target, total: items.length, chargedCount: charged, depletedCount: items.length - charged, items: items.map((b) => toBattery(b)) };
  }

  /**
   * Põe baterias na van do usuário (série desconhecida é cadastrada com `chargePct` ou 100). Bateria instalada numa moto,
   * com defeito ou baixada → 409. Fix round 1 (M5): sem `chargePct`, a carga conhecida é mantida; bateria carregada
   * retirada de uma estação sai do `availableBatteries` dela. 2026-10-24: sai do galpão (`depotId` nulo); as que ainda
   * estavam `charging` voltam em `loadedChargingSerials`; saída de `charged` confere o estoque mínimo do galpão.
   */
  async load(user: Principal, serials: string[], chargePct?: number) {
    const unique = [...new Set(serials.map((s) => s.trim()))];
    const moves: MovementInput[] = [];
    let chargingSerials: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.battery.findMany({ where: { serial: { in: unique } } });
      const installed = existing.filter((b) => b.status === 'in_vehicle');
      if (installed.length) throw conflict('conflict', `Bateria instalada numa moto: ${installed.map((b) => b.serial).join(', ')}.`);
      const unusable = existing.filter((b) => OUT_OF_SERVICE.includes(b.status));
      if (unusable.length) throw conflict('conflict', `Bateria fora de uso (com defeito ou baixada): ${unusable.map((b) => b.serial).join(', ')}.`);
      for (const b of existing.filter((x) => x.status === 'in_station' && x.stationId && x.chargePct >= CHARGED_PCT)) {
        await tx.swapStation.updateMany({ where: { id: b.stationId!, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
      }
      chargingSerials = existing.filter((b) => b.status === 'charging').map((b) => b.serial);
      const bySerial = new Map(existing.map((b) => [b.serial, b]));
      for (const serial of unique) {
        const saved = await tx.battery.upsert({
          where: { serial },
          create: { serial, chargePct: chargePct ?? 100, status: 'in_van', holderId: user.userId },
          update: { status: 'in_van', holderId: user.userId, stationId: null, vehicleId: null, depotId: null, ...(chargePct !== undefined ? { chargePct } : {}) },
        });
        moves.push(movement(bySerial.get(serial), { status: 'in_van' }, user.userId, null, saved.id));
      }
      await recordMovements(tx, moves);
    });
    await this.checkStock(depotsLeavingCharged(moves));
    const stock: Awaited<ReturnType<BatteriesService['vanStock']>> & { loadedChargingSerials?: string[] } = await this.vanStock(user);
    if (chargingSerials.length) stock.loadedChargingSerials = chargingSerials;
    return stock;
  }

  /**
   * Tira baterias da van do usuário: para uma estação (`in_station`) ou para carregar no galpão (`charging` com
   * `depotId`). Sem `stationId` nem `depotId`: o único galpão ativo; senão 422 `depot-required`.
   */
  async unload(user: Principal, serials: string[], stationId?: string, depotId?: string) {
    const unique = [...new Set(serials.map((s) => s.trim()))];
    if (stationId && !(await this.prisma.swapStation.findUnique({ where: { id: stationId }, select: { id: true } }))) throw notFound('Estação não encontrada.');
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.battery.findMany({ where: { serial: { in: unique } } });
      const missing = unique.filter((s) => !rows.some((r) => r.serial === s));
      if (missing.length) throw notFound(`Bateria não encontrada: ${missing.join(', ')}.`);
      const notMine = rows.filter((r) => r.status !== 'in_van' || r.holderId !== user.userId);
      if (notMine.length) throw conflict('conflict', `Bateria fora da sua van: ${notMine.map((r) => r.serial).join(', ')}.`);
      // Galpão só depois de conferir a van (bateria fora da van → 409 antes do 422 `depot-required`).
      const targetDepot = stationId ? null : await this.resolveUnloadDepot(tx, depotId);
      const status: BatteryStatus = stationId ? 'in_station' : 'charging';
      const moved = await tx.battery.updateMany({
        where: { id: { in: rows.map((r) => r.id) }, status: 'in_van', holderId: user.userId },
        data: { holderId: null, status, stationId: stationId ?? null, depotId: targetDepot },
      });
      if (moved.count !== rows.length) throw conflict('conflict', 'O estoque da van mudou durante a operação. Tente de novo.');
      await recordMovements(tx, rows.map((r) => movement(r, { status, stationId: stationId ?? null, depotId: targetDepot }, user.userId)));
      // Estação recebe as baterias carregadas como disponíveis para troca.
      if (stationId) {
        const charged = rows.filter((r) => r.chargePct >= CHARGED_PCT).length;
        if (charged) await tx.swapStation.update({ where: { id: stationId }, data: { availableBatteries: { increment: charged } } });
      }
    });
    return this.vanStock(user);
  }

  private async resolveUnloadDepot(db: Prisma.TransactionClient, depotId?: string): Promise<string> {
    if (depotId) return (await this.activeDepot(depotId, db)).id;
    const active = await db.depot.findMany({ where: { active: true }, select: { id: true }, take: 2 });
    if (active.length !== 1) throw unprocessable('depot-required', 'Informe o galpão (depotId) onde as baterias vão carregar.');
    return active[0].id;
  }

  private async activeDepot(id: string, db: Prisma.TransactionClient = this.prisma) {
    const d = await db.depot.findUnique({ where: { id }, select: { id: true, active: true } });
    if (!d) throw notFound('Galpão não encontrado.');
    if (!d.active) throw unprocessable('depot-inactive', 'Este galpão está inativo.');
    return d;
  }

  /** Cadastro por número de série, já no galpão (`charging` ou `charged`, carga 100). Série duplicada → 409. */
  async create(user: Principal, dto: CreateBatteryInput) {
    const serial = dto.serial.trim();
    if (await this.prisma.battery.findUnique({ where: { serial } })) throw conflict('conflict', `Bateria já cadastrada: ${serial}.`);
    await this.activeDepot(dto.depotId);
    const chargePct = dto.status === 'charged' ? 100 : (dto.chargePct ?? 0);
    const created = await this.prisma.$transaction(async (tx) => {
      const b = await tx.battery.create({ data: { serial, status: dto.status, depotId: dto.depotId, chargePct } });
      await recordMovements(tx, [movement(null, { status: dto.status, depotId: dto.depotId }, user.userId, null, b.id)]);
      return b;
    }).catch((err: unknown) => {
      if ((err as { code?: string }).code === 'P2002') throw conflict('conflict', `Bateria já cadastrada: ${serial}.`);
      throw err;
    });
    return toBattery(created);
  }

  /**
   * `charging → charged` (carga 100, mesmo galpão). Fix 1 (M1): bateria carregando numa estação de troca (devolvida por QR,
   * com `stationId` e sem galpão) volta a `in_station` e conta de novo em `availableBatteries` (senão a estação a liberaria
   * como "fora do estoque").
   */
  async markCharged(user: Principal, id: string) {
    const b = await this.prisma.battery.findUnique({ where: { id }, select: { stationId: true, depotId: true } });
    if (b?.stationId && !b.depotId) {
      const stationId = b.stationId;
      return this.transition(user, id, ['charging'], 'in_station', { status: 'in_station', chargePct: 100 }, null, async (tx) => {
        await tx.swapStation.update({ where: { id: stationId }, data: { availableBatteries: { increment: 1 } } });
      });
    }
    return this.transition(user, id, ['charging'], 'charged', { status: 'charged', chargePct: 100 });
  }

  /** De `charging|charged|in_van|in_station` → `defective`. Instalada numa moto → 409 (retirar antes). */
  reportDefect(user: Principal, id: string, reason: string) {
    return this.transition(user, id, DEFECT_FROM, 'defective', { status: 'defective' }, reason.trim(), async (tx, b) => {
      // Carregada na estação deixa de contar como disponível para troca.
      if (b.status === 'in_station' && b.stationId && b.chargePct >= CHARGED_PCT) {
        await tx.swapStation.updateMany({ where: { id: b.stationId, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
      }
    });
  }

  /** Baixa definitiva: de `defective|charging|charged` → `retired`. */
  retire(user: Principal, id: string, reason?: string) {
    return this.transition(user, id, RETIRE_FROM, 'retired', { status: 'retired', depotId: null, holderId: null, stationId: null }, reason?.trim() || null);
  }

  /**
   * Transição de um status permitido para `to`, com guarda de corrida (`updateMany` pelo status lido), movimentação na
   * mesma transação e conferência do estoque mínimo depois do commit.
   */
  private async transition(
    user: Principal,
    id: string,
    from: BatteryStatus[],
    to: BatteryStatus,
    data: Prisma.BatteryUncheckedUpdateManyInput,
    reason: string | null = null,
    extra?: (tx: Prisma.TransactionClient, b: Battery) => Promise<void>,
  ) {
    const b = await this.prisma.battery.findUnique({ where: { id } });
    if (!b) throw notFound('Bateria não encontrada.');
    if (!from.includes(b.status)) {
      const hint = b.status === 'in_vehicle' ? ' Retire-a da moto antes.' : '';
      throw conflict('conflict', `Bateria ${STATUS_LABEL[b.status]}: não pode ficar ${STATUS_LABEL[to]}.${hint}`);
    }
    const moves = [movement(b, { status: to }, user.userId, reason)];
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.battery.updateMany({ where: { id, status: b.status }, data });
      if (!changed.count) throw conflict('conflict', 'A bateria mudou de situação durante a operação. Atualize e tente de novo.');
      await extra?.(tx, b);
      await recordMovements(tx, moves);
    });
    await this.checkStock(depotsLeavingCharged(moves));
    const updated = await this.prisma.battery.findUnique({ where: { id } });
    return toBattery(updated ?? b);
  }

  /**
   * Fix 1 (I1): conferência do estoque mínimo depois do commit é best-effort — a operação já foi gravada, então uma falha
   * aqui só é registrada (sem dado pessoal) e não vira 500.
   */
  private async checkStock(depotIds: string[]): Promise<void> {
    if (!depotIds.length) return;
    try {
      await this.stock.check(depotIds);
    } catch (err) {
      this.logger.error({ msg: 'battery_stock_check_failed', depotIds, error: (err as Error).message });
    }
  }

  /** Histórico de movimentação, mais recente primeiro. */
  async movements(id: string, q: { cursor?: string; limit?: number }) {
    if (!(await this.prisma.battery.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Bateria não encontrada.');
    const rows = await this.prisma.batteryMovement.findMany({ where: { batteryId: id }, orderBy: [{ at: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toBatteryMovement);
  }
}
