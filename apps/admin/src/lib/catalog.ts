import type { S } from './types';
import { toCents, toReais, validMoney } from './money';
import { formatBRL } from './format';

export type VehicleModel = S<'VehicleModel'>;

/** Tipos aceitos para a foto do modelo (subconjunto de `UploadContentType` que é imagem exibível no app). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'Use uma foto JPG ou PNG';
  if (file.size > MAX_PHOTO_BYTES) return 'A foto pode ter até 5 MB';
  return null;
}

/** Chave devolvida por `POST /vehicle-models/uploads` (contrato: prefixo `catalog/`). */
export function isCatalogKey(key: string): boolean {
  return /^catalog\/[A-Za-z0-9._-]+$/.test(key);
}

/** "Volti Flash Pro" -> "volti-flash-pro" (padrão `^[a-z0-9-]{2,40}$`). */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/**
 * Desbloqueio efetivo do modelo: o próprio (`unlockFeeCents`) ou, ausente, o do plano por minuto.
 */
export function unlockFeeLabel(model: Pick<VehicleModel, 'unlockFeeCents'>, planUnlockCents?: number): { text: string; inherited: boolean } {
  if (model.unlockFeeCents !== undefined && model.unlockFeeCents !== null) return { text: formatBRL(model.unlockFeeCents), inherited: false };
  return { text: planUnlockCents === undefined ? 'Do plano' : `${formatBRL(planUnlockCents)} (do plano)`, inherited: true };
}

export interface ModelDraft {
  name: string;
  slug: string;
  categoryLabel: string;
  description: string;
  price: string;
  inheritUnlock: boolean;
  unlock: string;
  intervalKm: string;
  intervalHours: string;
  sortOrder: string;
  active: boolean;
  photoObjectKey?: string;
}

export function draftFromModel(m?: VehicleModel): ModelDraft {
  if (!m) return { name: '', slug: '', categoryLabel: '', description: '', price: '0,79', inheritUnlock: true, unlock: '', intervalKm: '1000', intervalHours: '100', sortOrder: '0', active: true };
  const own = m.unlockFeeCents !== undefined && m.unlockFeeCents !== null;
  return {
    name: m.name, slug: m.slug, categoryLabel: m.categoryLabel, description: m.description ?? '',
    price: toReais(m.pricePerMinuteCents), inheritUnlock: !own, unlock: own ? toReais(m.unlockFeeCents!) : '',
    intervalKm: String(m.serviceIntervalKm), intervalHours: String(m.serviceIntervalHours), sortOrder: String(m.sortOrder), active: m.active,
    photoObjectKey: m.photoObjectKey,
  };
}

const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;

/** Primeira mensagem de erro do formulário (limites do contrato `VehicleModelInput`), ou `null`. */
export function validateModelDraft(d: ModelDraft, isNew: boolean): string | null {
  if (d.name.trim().length < 2 || d.name.trim().length > 60) return 'O nome precisa ter de 2 a 60 caracteres';
  if (isNew && !/^[a-z0-9-]{2,40}$/.test(d.slug)) return 'O identificador usa só letras minúsculas, números e hífen (2 a 40)';
  if (d.categoryLabel.trim().length < 2 || d.categoryLabel.trim().length > 60) return 'Informe a categoria (2 a 60 caracteres)';
  if (d.description.length > 500) return 'A descrição pode ter até 500 caracteres';
  if (!validMoney(d.price) || toCents(d.price) > 10000) return 'Preço por minuto em reais, até 100,00 (ex.: 0,79)';
  if (!d.inheritUnlock && (!validMoney(d.unlock) || toCents(d.unlock) > 10000)) return 'Desbloqueio em reais, até 100,00 (ex.: 3,00)';
  if (!intIn(d.intervalKm, 1, 100000)) return 'Revisão a cada 1 a 100.000 km';
  if (!intIn(d.intervalHours, 1, 10000)) return 'Revisão a cada 1 a 10.000 horas';
  if (!intIn(d.sortOrder, 0, 1000)) return 'Ordem de 0 a 1000';
  if (d.photoObjectKey && !isCatalogKey(d.photoObjectKey)) return 'Foto inválida. Envie de novo';
  return null;
}

export function modelInputFromDraft(d: ModelDraft): S<'VehicleModelInput'> {
  return {
    name: d.name.trim(), slug: d.slug, categoryLabel: d.categoryLabel.trim(),
    ...(d.description.trim() ? { description: d.description.trim() } : {}),
    pricePerMinuteCents: toCents(d.price),
    ...(d.inheritUnlock ? {} : { unlockFeeCents: toCents(d.unlock) }),
    serviceIntervalKm: Number(d.intervalKm), serviceIntervalHours: Number(d.intervalHours),
    sortOrder: Number(d.sortOrder), active: d.active,
    ...(d.photoObjectKey ? { photoObjectKey: d.photoObjectKey } : {}),
  };
}

/**
 * Só o que mudou. Voltar a usar o desbloqueio do plano manda `inheritPlanUnlockFee: true`
 * (contrato `VehicleModelUpdate`); o slug não é editável.
 */
export function modelPatchFromDraft(m: VehicleModel, d: ModelDraft): S<'VehicleModelUpdate'> {
  const p: S<'VehicleModelUpdate'> = {};
  if (d.name.trim() !== m.name) p.name = d.name.trim();
  if (d.categoryLabel.trim() !== m.categoryLabel) p.categoryLabel = d.categoryLabel.trim();
  if (d.description.trim() !== (m.description ?? '')) p.description = d.description.trim();
  if (toCents(d.price) !== m.pricePerMinuteCents) p.pricePerMinuteCents = toCents(d.price);
  const own = m.unlockFeeCents !== undefined && m.unlockFeeCents !== null;
  if (d.inheritUnlock && own) p.inheritPlanUnlockFee = true;
  if (!d.inheritUnlock && (!own || toCents(d.unlock) !== m.unlockFeeCents)) p.unlockFeeCents = toCents(d.unlock);
  if (Number(d.intervalKm) !== m.serviceIntervalKm) p.serviceIntervalKm = Number(d.intervalKm);
  if (Number(d.intervalHours) !== m.serviceIntervalHours) p.serviceIntervalHours = Number(d.intervalHours);
  if (Number(d.sortOrder) !== m.sortOrder) p.sortOrder = Number(d.sortOrder);
  if (d.active !== m.active) p.active = d.active;
  if (d.photoObjectKey && d.photoObjectKey !== m.photoObjectKey) p.photoObjectKey = d.photoObjectKey;
  return p;
}
