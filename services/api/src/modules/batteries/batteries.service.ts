import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, forbidden, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { hasGroup, type Principal } from '../auth/principal';
import { CHARGED_PCT, toBattery } from './batteries.mapper';

/** Baterias e estoque da van do operador (contrato v2). */
@Injectable()
export class BatteriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async vehicleCodes(ids: Array<string | null>): Promise<Map<string, string>> {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map();
    const vs = await this.prisma.vehicle.findMany({ where: { id: { in: list } }, select: { id: true, code: true } });
    return new Map(vs.map((v) => [v.id, v.code]));
  }

  async list(user: Principal, q: { cursor?: string; limit?: number; status?: Prisma.BatteryWhereInput['status']; holderId?: string; q?: string }) {
    const where: Prisma.BatteryWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.holderId) where.holderId = q.holderId === 'me' ? user.userId : q.holderId;
    if (q.q) where.serial = { contains: q.q, mode: 'insensitive' };
    const rows = await this.prisma.battery.findMany({ where, orderBy: [{ serial: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    const codes = await this.vehicleCodes(rows.map((r) => r.vehicleId));
    return toPage(rows, q, (b) => toBattery(b, b.vehicleId ? codes.get(b.vehicleId) : undefined));
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
   * Põe baterias na van do usuário (série desconhecida é cadastrada com `chargePct` ou 100). Bateria instalada numa moto → 409.
   * Fix round 1 (M5): sem `chargePct`, a carga conhecida é mantida; bateria carregada retirada de uma estação sai do
   * `availableBatteries` dela.
   */
  async load(user: Principal, serials: string[], chargePct?: number) {
    const unique = [...new Set(serials.map((s) => s.trim()))];
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.battery.findMany({ where: { serial: { in: unique } } });
      const installed = existing.filter((b) => b.status === 'in_vehicle');
      if (installed.length) throw conflict('conflict', `Bateria instalada numa moto: ${installed.map((b) => b.serial).join(', ')}.`);
      for (const b of existing.filter((x) => x.status === 'in_station' && x.stationId && x.chargePct >= CHARGED_PCT)) {
        await tx.swapStation.updateMany({ where: { id: b.stationId!, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
      }
      for (const serial of unique) {
        await tx.battery.upsert({
          where: { serial },
          create: { serial, chargePct: chargePct ?? 100, status: 'in_van', holderId: user.userId },
          update: { status: 'in_van', holderId: user.userId, stationId: null, vehicleId: null, ...(chargePct !== undefined ? { chargePct } : {}) },
        });
      }
    });
    return this.vanStock(user);
  }

  /** Tira baterias da van do usuário: para carga (`charging`) ou para uma estação (`in_station`). */
  async unload(user: Principal, serials: string[], stationId?: string) {
    const unique = [...new Set(serials.map((s) => s.trim()))];
    if (stationId && !(await this.prisma.swapStation.findUnique({ where: { id: stationId }, select: { id: true } }))) throw notFound('Estação não encontrada.');
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.battery.findMany({ where: { serial: { in: unique } } });
      const missing = unique.filter((s) => !rows.some((r) => r.serial === s));
      if (missing.length) throw notFound(`Bateria não encontrada: ${missing.join(', ')}.`);
      const notMine = rows.filter((r) => r.status !== 'in_van' || r.holderId !== user.userId);
      if (notMine.length) throw conflict('conflict', `Bateria fora da sua van: ${notMine.map((r) => r.serial).join(', ')}.`);
      await tx.battery.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { holderId: null, status: stationId ? 'in_station' : 'charging', stationId: stationId ?? null },
      });
      // Estação recebe as baterias carregadas como disponíveis para troca.
      if (stationId) {
        const charged = rows.filter((r) => r.chargePct >= CHARGED_PCT).length;
        if (charged) await tx.swapStation.update({ where: { id: stationId }, data: { availableBatteries: { increment: charged } } });
      }
    });
    return this.vanStock(user);
  }
}
