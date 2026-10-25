import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type SwapStation } from '@prisma/client';
import { badRequest, conflict, notFound, unprocessable, type ValidationIssue } from '../../common/problem';
import { stationIdFromThing } from '../../ports/station-gateway.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { signStationCode } from '../station-swaps/station-code';
import { OPEN_SWAP_STATUSES } from '../station-swaps/station-swap.rules';
import type { SwapStationInputDto, SwapStationUpdateDto } from './swap-stations.dto';
import { batteriesOccupying, effectiveThingName, OPEN_24H_TEXT, toSwapStationAdmin, type SwapStationAdminExtras } from './swap-stations.mapper';

export const SWAP_STATION_QR_SECRET = Symbol('SWAP_STATION_QR_SECRET');

type Db = Prisma.TransactionClient | PrismaService;

const thingTaken = () => conflict('thing-name-taken', 'Este armário (thing) já está ligado a outra estação.');
const swapInProgress = () => conflict('station-swap-in-progress', 'Há troca de bateria em andamento nesta estação. Espere terminar e tente de novo.');

/**
 * Horário da estação: texto livre (o mesmo que `isStationOpen` interpreta). Obrigatório sem `open24h`; com `open24h` e
 * sem texto vale "Todos os dias, 24 h". Devolve o texto final ou os erros de validação.
 */
export function resolveOpeningHours(text: string | undefined, open24h: boolean): { value: string } | { issue: ValidationIssue } {
  const t = (text ?? '').trim();
  if (t) return { value: t };
  if (open24h) return { value: OPEN_24H_TEXT };
  return { issue: { field: 'openingHours', message: 'informe o horário de funcionamento (ou marque 24 h)' } };
}

/**
 * Cadastro de estações de troca pelo painel (Task 12 das lacunas): listar com os campos internos, criar e editar/desativar.
 * O QR fixo nasce na criação (mesmo código do script `stations:qr`) e é lido em `GET /swap-stations/{id}/qr`.
 * Logs e AuditLog só com ids e nomes de campos (nunca o código do QR).
 */
@Injectable()
export class SwapStationsService {
  private readonly logger = new Logger('SwapStationsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(SWAP_STATION_QR_SECRET) private readonly qrSecret: string,
  ) {}

  /** Baterias `in_station`, trocas em andamento e galpões ligados, por estação. */
  private async extras(ids: string[], db: Db = this.prisma): Promise<Map<string, SwapStationAdminExtras>> {
    const out = new Map<string, SwapStationAdminExtras>(ids.map((id) => [id, { batteriesInStation: 0, openSwaps: 0, depotIds: [] }]));
    if (ids.length === 0) return out;
    const [batteries, swaps, depots] = await Promise.all([
      db.battery.groupBy({ by: ['stationId'], where: { stationId: { in: ids }, status: 'in_station' }, _count: { _all: true } }),
      db.stationSwap.groupBy({ by: ['stationId'], where: { stationId: { in: ids }, status: { in: OPEN_SWAP_STATUSES } }, _count: { _all: true } }),
      db.depot.findMany({ where: { swapStationId: { in: ids } }, select: { id: true, swapStationId: true }, orderBy: { name: 'asc' } }),
    ]);
    for (const b of batteries) {
      const e = b.stationId ? out.get(b.stationId) : undefined;
      if (e) e.batteriesInStation = b._count._all;
    }
    for (const sw of swaps) {
      const e = out.get(sw.stationId);
      if (e) e.openSwaps = sw._count._all;
    }
    for (const d of depots) {
      const e = d.swapStationId ? out.get(d.swapStationId) : undefined;
      if (e) e.depotIds.push(d.id);
    }
    return out;
  }

  private async view(s: SwapStation, db: Db = this.prisma) {
    return toSwapStationAdmin(s, (await this.extras([s.id], db)).get(s.id)!);
  }

  /** `thing` já é de outra estação (gravada no cadastro, ou a convenção `station-{id}` de uma estação sem `thingName`). */
  private async thingInUse(db: Db, thing: string, exceptId: string): Promise<boolean> {
    const parsed = stationIdFromThing(thing);
    const other = await db.swapStation.findFirst({
      where: { id: { not: exceptId }, OR: [{ thingName: thing }, ...(parsed ? [{ id: parsed, thingName: null }] : [])] },
      select: { id: true },
    });
    return !!other;
  }

  /** Trava a linha da estação até o fim da transação (mesma ordem da criação de troca: estação primeiro). */
  private async lock(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "SwapStation" WHERE "id" = ${id}::uuid FOR UPDATE`;
  }

  async list() {
    const rows = await this.prisma.swapStation.findMany({ orderBy: { name: 'asc' } });
    const extras = await this.extras(rows.map((s) => s.id));
    return { items: rows.map((s) => toSwapStationAdmin(s, extras.get(s.id)!)) };
  }

  async create(actor: Principal, dto: SwapStationInputDto) {
    const name = dto.name.trim();
    const address = dto.address.trim();
    const open24h = dto.open24h ?? false;
    const hours = resolveOpeningHours(dto.openingHours, open24h);
    const issues: ValidationIssue[] = [];
    if (!name) issues.push({ field: 'name', message: 'informe o nome' });
    if (!address) issues.push({ field: 'address', message: 'informe o endereço' });
    if ('issue' in hours) issues.push(hours.issue);
    if (issues.length || 'issue' in hours) throw badRequest('Verifique os campos informados.', issues);

    const id = randomUUID();
    const thing = dto.thingName ?? null;
    const created = await this.prisma
      .$transaction(async (tx) => {
        if (thing && (await this.thingInUse(tx, thing, id))) throw thingTaken();
        const s = await tx.swapStation.create({
          data: {
            id, name, address, lat: dto.lat, lng: dto.lng, totalSlots: dto.totalSlots, openingHours: hours.value, open24h,
            active: dto.active ?? true, thingName: thing, availableBatteries: 0, stationCode: signStationCode(id, this.qrSecret),
          },
        });
        await this.audit.record({ actor, action: 'swap_station.create', entityType: 'SwapStation', entityId: id, metadata: { name, totalSlots: dto.totalSlots, active: s.active } }, tx as never);
        return s;
      })
      .catch(mapThingUnique);
    this.logger.log({ msg: 'swap_station_created', stationId: id });
    return this.view(created);
  }

  async update(actor: Principal, id: string, dto: SwapStationUpdateDto) {
    const current = await this.prisma.swapStation.findUnique({ where: { id } });
    if (!current) throw notFound('Estação não encontrada.');

    const issues: ValidationIssue[] = [];
    const name = dto.name?.trim();
    const address = dto.address?.trim();
    if (dto.name !== undefined && !name) issues.push({ field: 'name', message: 'informe o nome' });
    if (dto.address !== undefined && !address) issues.push({ field: 'address', message: 'informe o endereço' });
    const open24h = dto.open24h ?? current.open24h;
    let openingHours: string | undefined;
    if (dto.openingHours !== undefined || dto.open24h !== undefined) {
      const hours = resolveOpeningHours(dto.openingHours ?? current.openingHours, open24h);
      if ('issue' in hours) issues.push(hours.issue);
      else if (hours.value !== current.openingHours) openingHours = hours.value;
    }
    if (issues.length) throw badRequest('Verifique os campos informados.', issues);

    // O DTO transformado traz todas as propriedades da classe (as ausentes como `undefined`): só as enviadas contam.
    const fields = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    const currentThing = effectiveThingName(current);
    const nextThing = dto.thingName ?? currentThing;
    const thingChanges = nextThing !== currentThing;
    const deactivating = dto.active === false && current.active;

    const updated = await this.prisma
      .$transaction(async (tx) => {
        // Serializa com a criação de troca (que trava a mesma linha e relê `active`): nenhuma troca nova entra entre a contagem e a gravação.
        await this.lock(tx, id);
        const locked = (await tx.swapStation.findUnique({ where: { id } }))!;
        if (dto.totalSlots !== undefined) {
          const inStation = await tx.battery.count({ where: { stationId: id, status: 'in_station' } });
          const occupying = batteriesOccupying(locked.availableBatteries, inStation);
          if (dto.totalSlots < occupying) {
            throw unprocessable('slots-below-stock', `A estação tem ${occupying} bateria(s); o número de vagas não pode ficar abaixo disso.`);
          }
        }
        if (deactivating || thingChanges) {
          const open = await tx.stationSwap.count({ where: { stationId: id, status: { in: OPEN_SWAP_STATUSES } } });
          if (open > 0) throw swapInProgress();
        }
        if (thingChanges && (await this.thingInUse(tx, nextThing, id))) throw thingTaken();
        const data: Prisma.SwapStationUpdateInput = {
          ...(name !== undefined ? { name } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
          ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
          ...(dto.totalSlots !== undefined ? { totalSlots: dto.totalSlots } : {}),
          ...(dto.open24h !== undefined ? { open24h: dto.open24h } : {}),
          ...(openingHours !== undefined ? { openingHours } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(thingChanges ? { thingName: nextThing } : {}),
        };
        const s = await tx.swapStation.update({ where: { id }, data });
        await this.audit.record(
          { actor, action: 'swap_station.update', entityType: 'SwapStation', entityId: id, metadata: { fields, ...(dto.active !== undefined ? { active: dto.active } : {}) } },
          tx as never,
        );
        return s;
      })
      .catch(mapThingUnique);
    this.logger.log({ msg: 'swap_station_updated', stationId: id, fields });
    return this.view(updated);
  }
}

/** Corrida entre dois cadastros com o mesmo `thingName`: o índice único decide → 409. */
function mapThingUnique(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && JSON.stringify(err.meta?.target ?? '').includes('thingName')) throw thingTaken();
  throw err;
}
