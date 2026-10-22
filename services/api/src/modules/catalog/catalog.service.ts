import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type SwapStation, type VehicleModel } from '@prisma/client';
import { conflict, notFound } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, distanceM } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { SwapStationsQuery, VehicleModelInputDto, VehicleModelUpdateDto } from './catalog.dto';

const PHOTO_URL_TTL_SECONDS = 24 * 3600;

export function toVehicleModel(m: VehicleModel, opts: { photoUrl?: string; staff: boolean }) {
  return compact({
    id: m.id,
    name: m.name,
    slug: m.slug,
    categoryLabel: m.categoryLabel,
    description: m.description ?? undefined,
    photoUrl: opts.photoUrl,
    photoObjectKey: opts.staff ? (m.photoObjectKey ?? undefined) : undefined,
    pricePerMinuteCents: m.pricePerMinuteCents,
    unlockFeeCents: m.unlockFeeCents ?? undefined,
    serviceIntervalKm: m.serviceIntervalKm,
    serviceIntervalHours: m.serviceIntervalHours,
    active: m.active,
    sortOrder: m.sortOrder,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  });
}

export function toSwapStation(s: SwapStation, distance?: number) {
  return compact({
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    availableBatteries: s.availableBatteries,
    totalSlots: s.totalSlots,
    openingHours: s.openingHours,
    open24h: s.open24h,
    distanceM: distance === undefined ? undefined : Math.round(distance),
  });
}

/** Catálogo de modelos ("Escolha sua moto") e estações de troca de bateria (contrato v2). */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  private async photoUrl(m: VehicleModel): Promise<string | undefined> {
    if (!m.photoObjectKey) return undefined;
    const signed = await this.storage.presignGet({ bucket: this.cfg.buckets.catalog, key: m.photoObjectKey, expiresInSeconds: PHOTO_URL_TTL_SECONDS });
    return signed.url;
  }

  private async map(m: VehicleModel, staff: boolean) {
    return toVehicleModel(m, { staff, photoUrl: await this.photoUrl(m) });
  }

  async list(staff: boolean, includeInactive: boolean) {
    const rows = await this.prisma.vehicleModel.findMany({ where: staff && includeInactive ? {} : { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return { items: await Promise.all(rows.map((m) => this.map(m, staff))) };
  }

  async create(actor: Principal, dto: VehicleModelInputDto) {
    const dup = await this.prisma.vehicleModel.findFirst({ where: { OR: [{ name: dto.name }, { slug: dto.slug }] }, select: { id: true } });
    if (dup) throw conflict('conflict', 'Já existe um modelo com este nome ou slug.');
    const m = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicleModel.create({ data: { ...dto } });
      await this.audit.record({ actor, action: 'vehicle_model.create', entityType: 'VehicleModel', entityId: created.id, metadata: { name: dto.name, pricePerMinuteCents: dto.pricePerMinuteCents } }, tx as any);
      return created;
    });
    return this.map(m, true);
  }

  async update(actor: Principal, id: string, dto: VehicleModelUpdateDto) {
    const current = await this.prisma.vehicleModel.findUnique({ where: { id } });
    if (!current) throw notFound('Modelo não encontrado.');
    if (dto.name && dto.name !== current.name && (await this.prisma.vehicleModel.findUnique({ where: { name: dto.name }, select: { id: true } }))) {
      throw conflict('conflict', 'Já existe um modelo com este nome.');
    }
    const m = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleModel.update({ where: { id }, data: { ...dto } });
      // O nome do modelo também é o `Vehicle.model` exibido nas listas.
      if (dto.name && dto.name !== current.name) await tx.vehicle.updateMany({ where: { vehicleModelId: id }, data: { model: dto.name } });
      await this.audit.record(
        { actor, action: 'vehicle_model.update', entityType: 'VehicleModel', entityId: id, metadata: { ...dto, previousPricePerMinuteCents: current.pricePerMinuteCents } },
        tx as any,
      );
      return updated;
    });
    return this.map(m, true);
  }

  photoUpload(contentType: string) {
    return presignedUpload(this.storage, this.cfg.buckets.catalog, 'catalog', contentType);
  }

  async stations(q: SwapStationsQuery) {
    const rows = await this.prisma.swapStation.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    if (q.lat === undefined || q.lng === undefined) return { items: rows.map((s) => toSwapStation(s)) };
    const radius = q.radiusM ?? 10_000;
    const origin = { lat: q.lat, lng: q.lng };
    const items = rows
      .map((s) => ({ s, d: distanceM(origin, s) }))
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d)
      .map((x) => toSwapStation(x.s, x.d));
    return { items };
  }
}

/** Dados do modelo usados nos mapeadores de moto (`categoryLabel`, `pricePerMinuteCents`). */
export type VehicleModelRef = Pick<VehicleModel, 'id' | 'categoryLabel' | 'pricePerMinuteCents' | 'unlockFeeCents' | 'serviceIntervalKm' | 'serviceIntervalHours'>;
export const VEHICLE_MODEL_SELECT = {
  id: true, categoryLabel: true, pricePerMinuteCents: true, unlockFeeCents: true, serviceIntervalKm: true, serviceIntervalHours: true,
} satisfies Prisma.VehicleModelSelect;
