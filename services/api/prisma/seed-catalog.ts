/**
 * Catálogo de exemplo (docs/decisoes.md, 2026-10-22 "Catálogo de exemplo com fotos de terceiros"). Idempotente; chamado
 * por `seed-v2.ts`.
 *
 * Três modelos genéricos da Volti inspirados nos exemplos que o usuário enviou (urbana com cesto, esportiva de 2 lugares,
 * touring com baú). Todos são autopropelidos da Resolução Contran 996/2023: até 1.000 W e até 32 km/h, sem placa e sem
 * CNH (o Citycoco de 1.500–2.500 W ficou de fora). Nada de marca de terceiro no nome.
 *
 * Fotos: pertencem aos fabricantes/lojas e servem SÓ de exemplo em dev. Nunca vão para o git: são baixadas aqui, no seed,
 * direto para o MinIO (`catalog/<slug>.<ext>`). O download é tratado como dado não confiável — só HTTPS, teto de 5 MB,
 * assinatura de JPEG/PNG/WebP conferida nos bytes (o Content-Type do servidor é ignorado) e nada é executado. Sem rede o
 * seed segue: o modelo fica sem foto e o app mostra o ícone.
 */
import type { PrismaClient } from '@prisma/client';

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Teto da Resolução Contran 996/2023 para autopropelidos. */
export const CONTRAN_MAX_POWER_W = 1000;
export const CONTRAN_MAX_SPEED_KMH = 32;

/** Teto do download de cada foto de exemplo. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface CatalogExample {
  id: string;
  name: string;
  slug: string;
  categoryLabel: string;
  description: string;
  pricePerMinuteCents: number;
  /** `null` = desbloqueio do plano. */
  unlockFeeCents: number | null;
  serviceIntervalKm: number;
  serviceIntervalHours: number;
  sortOrder: number;
  /** Ficha técnica (não vai para o banco: o contrato não tem esses campos; está na descrição e nos testes). */
  powerW: number;
  speedLimitKmh: number;
  seats: number;
  /** Foto de exemplo (direitos do fabricante/loja; só dev). */
  photoSourceUrl: string;
}

/**
 * Os ids são os dos modelos placeholder anteriores (Flash/Urban/Cargo), que estes substituem: bancos já semeados só
 * são renomeados, sem órfãos, e o preço por minuto de cada posição (79/89/99) não muda.
 */
export const CATALOG_EXAMPLES: readonly CatalogExample[] = [
  {
    id: id('c0000000', 1),
    name: 'Volti Urbana',
    slug: 'urbana',
    categoryLabel: 'Urbana com cesto',
    description: '1000 W · 48 V · 32 km/h · cesto e garupa · sem CNH',
    pricePerMinuteCents: 79,
    unlockFeeCents: null,
    serviceIntervalKm: 1000,
    serviceIntervalHours: 100,
    sortOrder: 1,
    powerW: 1000,
    speedLimitKmh: 32,
    seats: 2,
    photoSourceUrl: 'https://images.tcdn.com.br/img/img_prod/394779/scooter_eltrica_astur_1000w_48v_20ah_e_plus_1_20260127145906_2236cb757131.jpg',
  },
  {
    id: id('c0000000', 2),
    name: 'Volti Sport',
    slug: 'sport',
    categoryLabel: 'Esportiva compacta',
    description: '1000 W · 32 km/h · 2 lugares · bateria removível · sem CNH',
    pricePerMinuteCents: 89,
    unlockFeeCents: null,
    serviceIntervalKm: 1000,
    serviceIntervalHours: 100,
    sortOrder: 2,
    powerW: 1000,
    speedLimitKmh: 32,
    seats: 2,
    photoSourceUrl: 'https://static.buxabikes.com.br/public/buxabikes/imagens/produtos/scooter-eletrica-autopropelido-sport-701-1000w-32km-h-preta-699f573cec513.jpg',
  },
  {
    id: id('c0000000', 3),
    name: 'Volti Touring',
    slug: 'touring',
    categoryLabel: 'Touring com baú',
    description: '1000 W · 32 km/h · baú traseiro e encosto · sem CNH',
    pricePerMinuteCents: 99,
    unlockFeeCents: null,
    serviceIntervalKm: 800,
    serviceIntervalHours: 80,
    sortOrder: 3,
    powerW: 1000,
    speedLimitKmh: 32,
    seats: 2,
    photoSourceUrl: 'https://down-br.img.susercontent.com/file/br-11134207-81z1k-mhpb2o0utpfm70',
  },
];

/** Chaves das fotos placeholder (PNG de cor sólida) dos seeds antigos: saem quando a foto de exemplo não baixa. */
export const LEGACY_PLACEHOLDER_KEYS: readonly string[] = ['catalog/flash.png', 'catalog/urban.png', 'catalog/cargo.png'];

/** Modelo de cada moto do seed (`VLT-0001` → 1º, `VLT-0002` → 2º …): o lote do galpão (`VLT-0011…0030`) mistura os três. */
export function modelForCode(code: string): CatalogExample {
  const n = Number(/^VLT-(\d+)$/.exec(code)?.[1] ?? 1);
  return CATALOG_EXAMPLES[(Math.max(1, n) - 1) % CATALOG_EXAMPLES.length];
}

export interface SniffedImage {
  ext: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/** Tipo pela assinatura dos bytes (não pelo Content-Type nem pela extensão da URL). `null` = não é imagem aceita. */
export function sniffImage(buf: Buffer): SniffedImage | null {
  if (buf.length < 12 || buf.length > MAX_PHOTO_BYTES) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', contentType: 'image/png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', contentType: 'image/webp' };
  return null;
}

export type FetchLike = (url: string, init: { headers: Record<string, string>; redirect: 'follow'; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  body: AsyncIterable<Uint8Array> | null;
}>;

export interface DownloadedImage extends SniffedImage {
  body: Buffer;
}

/**
 * Baixa uma foto de exemplo com teto de bytes (cabeçalho e corpo) e confere a assinatura. Qualquer falha devolve `null`
 * com o motivo no log (sem lançar): o seed continua sem a foto.
 */
export async function downloadImage(url: string, fetchImpl: FetchLike, opts: { maxBytes?: number; timeoutMs?: number } = {}): Promise<DownloadedImage | null> {
  const maxBytes = opts.maxBytes ?? MAX_PHOTO_BYTES;
  const skip = (reason: string) => {
    console.warn(JSON.stringify({ msg: 'seed_catalog_photo_skipped', host: safeHost(url), reason }));
    return null;
  };
  if (!url.startsWith('https://')) return skip('not_https');
  try {
    // Alguns CDNs recusam requisição sem User-Agent (403).
    const res = await fetchImpl(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VoltiDevSeed)', Accept: 'image/*' }, redirect: 'follow', signal: AbortSignal.timeout(opts.timeoutMs ?? 15000) });
    if (!res.ok) return skip(`http_${res.status}`);
    if (!res.url.startsWith('https://')) return skip('redirect_not_https');
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes) return skip('too_large');
    if (!res.body) return skip('empty');
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of res.body) {
      total += chunk.byteLength;
      if (total > maxBytes) return skip('too_large');
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const kind = sniffImage(body);
    if (!kind) return skip('not_an_image');
    return { ...kind, body };
  } catch (err) {
    return skip((err as Error).name === 'TimeoutError' ? 'timeout' : 'network');
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid';
  }
}

export interface CatalogPhotoStorage {
  ensureBuckets(buckets: string[]): Promise<unknown>;
  putObject(input: { bucket: string; key: string; body: Buffer; contentType: string }): Promise<void>;
}

export interface SeedCatalogDeps {
  fetchImpl: FetchLike;
  /** `null` = sem MinIO/S3 configurado: modelos sem foto. */
  storage: CatalogPhotoStorage | null;
  bucket: string;
}

type CatalogPrisma = Pick<PrismaClient, 'vehicleModel'>;

/**
 * Upsert dos modelos de exemplo e das fotos. Idempotente: mesmo id, mesma chave `catalog/<slug>.<ext>` (a foto é
 * regravada por cima). Sem foto baixada, a chave existente é mantida — exceto a do placeholder antigo, que sai.
 */
export async function seedCatalog(prisma: CatalogPrisma, deps: SeedCatalogDeps): Promise<{ models: number; photos: number }> {
  let storageReady = false;
  if (deps.storage) {
    try {
      await deps.storage.ensureBuckets([deps.bucket]);
      storageReady = true;
    } catch (err) {
      console.warn(JSON.stringify({ msg: 'seed_catalog_storage_unavailable', error: (err as Error).name }));
    }
  }

  let photos = 0;
  for (const m of CATALOG_EXAMPLES) {
    let photoObjectKey: string | undefined;
    if (storageReady && deps.storage) {
      const img = await downloadImage(m.photoSourceUrl, deps.fetchImpl);
      if (img) {
        const key = `catalog/${m.slug}.${img.ext}`;
        try {
          await deps.storage.putObject({ bucket: deps.bucket, key, body: img.body, contentType: img.contentType });
          photoObjectKey = key;
          photos++;
        } catch (err) {
          console.warn(JSON.stringify({ msg: 'seed_catalog_photo_put_failed', slug: m.slug, error: (err as Error).name }));
        }
      }
    }
    const data = {
      name: m.name,
      slug: m.slug,
      categoryLabel: m.categoryLabel,
      description: m.description,
      pricePerMinuteCents: m.pricePerMinuteCents,
      unlockFeeCents: m.unlockFeeCents,
      serviceIntervalKm: m.serviceIntervalKm,
      serviceIntervalHours: m.serviceIntervalHours,
      sortOrder: m.sortOrder,
      active: true,
    };
    if (!photoObjectKey) {
      const current = await prisma.vehicleModel.findUnique({ where: { id: m.id }, select: { photoObjectKey: true } });
      const stale = current?.photoObjectKey != null && LEGACY_PLACEHOLDER_KEYS.includes(current.photoObjectKey);
      await prisma.vehicleModel.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: { ...data, ...(stale ? { photoObjectKey: null } : {}) } });
    } else {
      await prisma.vehicleModel.upsert({ where: { id: m.id }, create: { id: m.id, ...data, photoObjectKey }, update: { ...data, photoObjectKey } });
    }
  }
  return { models: CATALOG_EXAMPLES.length, photos };
}
