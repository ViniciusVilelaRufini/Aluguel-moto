import {
  CATALOG_EXAMPLES,
  CONTRAN_MAX_POWER_W,
  CONTRAN_MAX_SPEED_KMH,
  MAX_PHOTO_BYTES,
  downloadImage,
  modelForCode,
  seedCatalog,
  sniffImage,
  type FetchLike,
} from '../prisma/seed-catalog';
import { DEPOT_CODES } from '../prisma/seed-depot';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(60)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(60)]);
const HTML = Buffer.from('<!doctype html><html><body>403</body></html>');

async function* chunks(...parts: Buffer[]): AsyncIterable<Uint8Array> {
  for (const p of parts) yield p;
}

function fakeFetch(body: Buffer | Buffer[] | Error, init: { status?: number; contentLength?: number } = {}): FetchLike & jest.Mock {
  return jest.fn(async (url: string) => {
    if (body instanceof Error) throw body;
    const parts = Array.isArray(body) ? body : [body];
    const status = init.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      url,
      headers: { get: (n: string) => (n === 'content-length' && init.contentLength !== undefined ? String(init.contentLength) : null) },
      body: chunks(...parts),
    };
  }) as unknown as FetchLike & jest.Mock;
}

/** Prisma em memória só com `vehicleModel.findUnique/upsert`. */
function memoryPrisma(initial: Record<string, Record<string, unknown>> = {}) {
  const rows = new Map<string, Record<string, unknown>>(Object.entries(initial));
  const vehicleModel = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null),
    upsert: jest.fn(async ({ where, create, update }: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const row = rows.has(where.id) ? { ...rows.get(where.id), ...update } : { ...create };
      rows.set(where.id, row);
      return row;
    }),
  };
  return { prisma: { vehicleModel } as never, rows };
}

function memoryStorage() {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  return {
    objects,
    ensureBuckets: jest.fn(async () => []),
    putObject: jest.fn(async (i: { bucket: string; key: string; body: Buffer; contentType: string }) => {
      objects.set(`${i.bucket}/${i.key}`, { body: i.body, contentType: i.contentType });
    }),
  };
}

describe('catálogo de exemplo (Contran 996/2023)', () => {
  it('três modelos, todos até 1000 W e 32 km/h, e a descrição diz isso', () => {
    expect(CATALOG_EXAMPLES).toHaveLength(3);
    for (const m of CATALOG_EXAMPLES) {
      expect(m.powerW).toBeLessThanOrEqual(CONTRAN_MAX_POWER_W);
      expect(m.speedLimitKmh).toBeLessThanOrEqual(CONTRAN_MAX_SPEED_KMH);
      expect(m.description).toContain(`${m.powerW} W`);
      expect(m.description).toContain(`${m.speedLimitKmh} km/h`);
      expect(m.description).toContain('sem CNH');
      // Fatos-chave primeiro: o cartão do app corta o fim em telas estreitas.
      expect(m.description.startsWith(`${m.speedLimitKmh} km/h · sem CNH · ${m.powerW} W`)).toBe(true);
      expect(m.description.length).toBeLessThanOrEqual(80);
    }
    expect(CONTRAN_MAX_POWER_W).toBe(1000);
    expect(CONTRAN_MAX_SPEED_KMH).toBe(32);
  });

  it('categorias, preços distintos e nomes genéricos da Volti (sem marca de terceiro)', () => {
    expect(CATALOG_EXAMPLES.map((m) => m.categoryLabel)).toEqual(['Urbana com cesto', 'Esportiva compacta', 'Touring com baú']);
    expect(new Set(CATALOG_EXAMPLES.map((m) => m.pricePerMinuteCents)).size).toBe(3);
    for (const m of CATALOG_EXAMPLES) {
      expect(Number.isInteger(m.pricePerMinuteCents)).toBe(true);
      expect(m.name).toMatch(/^Volti /);
      expect(m.slug).toMatch(/^[a-z0-9-]{2,40}$/);
      expect(`${m.name} ${m.categoryLabel} ${m.description}`).not.toMatch(/astur|wehawk|gts|zurbe|ouxi|x13|wx-11|701|citycoco|elemovi/i);
    }
  });

  it('só as fotos 1–4 do usuário, em HTTPS; o Citycoco não entra', () => {
    for (const m of CATALOG_EXAMPLES) {
      expect(m.photoSourceUrl).toMatch(/^https:\/\//);
      expect(m.photoSourceUrl).not.toMatch(/citycoco|made-in-china/i);
    }
  });

  it('as 20 motos do galpão se dividem entre os três modelos', () => {
    expect(DEPOT_CODES).toHaveLength(20);
    const counts = new Map<string, number>();
    for (const c of DEPOT_CODES) counts.set(modelForCode(c).slug, (counts.get(modelForCode(c).slug) ?? 0) + 1);
    expect([...counts.keys()].sort()).toEqual(['sport', 'touring', 'urbana']);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(6);
    // A VLT-0003 dos e2e de cotação segue no modelo de 99 centavos.
    expect(modelForCode('VLT-0003').pricePerMinuteCents).toBe(99);
  });
});

describe('sniffImage', () => {
  it('aceita JPEG, PNG e WebP pela assinatura', () => {
    expect(sniffImage(JPEG)).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
    expect(sniffImage(PNG)).toEqual({ ext: 'png', contentType: 'image/png' });
    expect(sniffImage(WEBP)).toEqual({ ext: 'webp', contentType: 'image/webp' });
  });

  it('recusa HTML, vazio e acima de 5 MB', () => {
    expect(sniffImage(HTML)).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
    expect(sniffImage(Buffer.concat([JPEG, Buffer.alloc(MAX_PHOTO_BYTES)]))).toBeNull();
  });
});

/** DNS falso: todo host resolve para um IP público, exceto os listados. */
const dns = (privateHosts: Record<string, string> = {}) => async (host: string) => [privateHosts[host] ?? '93.184.216.34'];
const NET = { resolveHost: dns() };

/** fetch falso por URL, para seguir redirecionamentos manuais. */
function routeFetch(routes: Record<string, { status: number; location?: string; body?: Buffer }>): FetchLike & jest.Mock {
  return jest.fn(async (url: string) => {
    const r = routes[url];
    if (!r) throw new Error(`rota inesperada ${url}`);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      url,
      headers: { get: (n: string) => (n === 'location' ? (r.location ?? null) : null) },
      body: r.body ? chunks(r.body) : null,
    };
  }) as unknown as FetchLike & jest.Mock;
}

describe('downloadImage (dado não confiável)', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('baixa uma imagem válida com User-Agent, redirect manual e o tipo pelos bytes', async () => {
    const f = fakeFetch(JPEG);
    const img = await downloadImage('https://cdn.example/a.png', f, NET);
    expect(img).toMatchObject({ ext: 'jpg', contentType: 'image/jpeg' });
    expect(img?.body.equals(JPEG)).toBe(true);
    expect(f.mock.calls[0][1].headers['User-Agent']).toBeTruthy();
    expect(f.mock.calls[0][1].redirect).toBe('manual');
  });

  it('recusa HTTP, erro HTTP, HTML e falha de rede', async () => {
    expect(await downloadImage('http://cdn.example/a.jpg', fakeFetch(JPEG), NET)).toBeNull();
    expect(await downloadImage('https://cdn.example/a.jpg', fakeFetch(HTML, { status: 403 }), NET)).toBeNull();
    expect(await downloadImage('https://cdn.example/a.jpg', fakeFetch(HTML), NET)).toBeNull();
    expect(await downloadImage('https://cdn.example/a.jpg', fakeFetch(new Error('ENOTFOUND')), NET)).toBeNull();
  });

  it('segue até 3 redirecionamentos HTTPS (Location relativo também)', async () => {
    const f = routeFetch({
      'https://a.example/1': { status: 301, location: 'https://b.example/2' },
      'https://b.example/2': { status: 302, location: '/3' },
      'https://b.example/3': { status: 307, location: 'https://c.example/4' },
      'https://c.example/4': { status: 200, body: JPEG },
    });
    expect(await downloadImage('https://a.example/1', f, NET)).toMatchObject({ ext: 'jpg' });
    expect(f).toHaveBeenCalledTimes(4);
  });

  it('recusa o 4º redirecionamento, salto para HTTP e Location ausente', async () => {
    const loop = routeFetch({
      'https://a.example/1': { status: 302, location: 'https://a.example/2' },
      'https://a.example/2': { status: 302, location: 'https://a.example/3' },
      'https://a.example/3': { status: 302, location: 'https://a.example/4' },
      'https://a.example/4': { status: 302, location: 'https://a.example/5' },
      'https://a.example/5': { status: 200, body: JPEG },
    });
    expect(await downloadImage('https://a.example/1', loop, NET)).toBeNull();
    expect(loop).toHaveBeenCalledTimes(4);
    const toHttp = routeFetch({ 'https://a.example/1': { status: 301, location: 'http://a.example/img.jpg' }, 'http://a.example/img.jpg': { status: 200, body: JPEG } });
    expect(await downloadImage('https://a.example/1', toHttp, NET)).toBeNull();
    expect(toHttp).toHaveBeenCalledTimes(1);
    expect(await downloadImage('https://a.example/1', routeFetch({ 'https://a.example/1': { status: 302 } }), NET)).toBeNull();
  });

  it('recusa host privado/loopback (literal, por DNS ou no meio do redirecionamento)', async () => {
    for (const url of ['https://localhost/a.jpg', 'https://127.0.0.1/a.jpg', 'https://10.0.0.5/a.jpg', 'https://172.20.1.1/a.jpg', 'https://192.168.0.10/a.jpg', 'https://169.254.169.254/latest', 'https://[::1]/a.jpg', 'https://[fd00::1]/a.jpg', 'https://0.0.0.0/a.jpg']) {
      const f = fakeFetch(JPEG);
      expect(await downloadImage(url, f, NET)).toBeNull();
      expect(f).not.toHaveBeenCalled();
    }
    const f = fakeFetch(JPEG);
    expect(await downloadImage('https://interno.example/a.jpg', f, { resolveHost: dns({ 'interno.example': '10.1.2.3' }) })).toBeNull();
    expect(f).not.toHaveBeenCalled();
    const hop = routeFetch({ 'https://a.example/1': { status: 302, location: 'https://minio.local:9000/x.jpg' }, 'https://minio.local:9000/x.jpg': { status: 200, body: JPEG } });
    expect(await downloadImage('https://a.example/1', hop, { resolveHost: dns({ 'minio.local': '127.0.0.1' }) })).toBeNull();
    expect(hop).toHaveBeenCalledTimes(1);
  });

  it('para no teto de bytes (cabeçalho ou corpo em pedaços)', async () => {
    expect(await downloadImage('https://cdn.example/a.jpg', fakeFetch(JPEG, { contentLength: MAX_PHOTO_BYTES + 1 }), NET)).toBeNull();
    expect(await downloadImage('https://cdn.example/a.jpg', fakeFetch([JPEG, Buffer.alloc(40)]), { ...NET, maxBytes: 80 })).toBeNull();
  });
});

describe('seedCatalog', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('sobe as fotos em catalog/<slug>.<ext> e grava photoObjectKey; rodar de novo dá o mesmo estado', async () => {
    const { prisma, rows } = memoryPrisma();
    const storage = memoryStorage();
    const deps = { fetchImpl: fakeFetch(JPEG), storage, bucket: 'catalogo', ...NET };

    expect(await seedCatalog(prisma, deps)).toEqual({ models: 3, photos: 3 });
    const first = JSON.stringify([...rows.entries()]);
    expect([...storage.objects.keys()].sort()).toEqual(['catalogo/catalog/sport.jpg', 'catalogo/catalog/touring.jpg', 'catalogo/catalog/urbana.jpg']);
    for (const m of CATALOG_EXAMPLES) expect(rows.get(m.id)).toMatchObject({ slug: m.slug, photoObjectKey: `catalog/${m.slug}.jpg`, description: m.description, pricePerMinuteCents: m.pricePerMinuteCents });

    await seedCatalog(prisma, deps);
    expect(JSON.stringify([...rows.entries()])).toBe(first);
    expect(rows.size).toBe(3);
    expect(storage.objects.size).toBe(3);
  });

  it('offline: semeia os modelos sem foto e não lança', async () => {
    const { prisma, rows } = memoryPrisma();
    const storage = memoryStorage();
    expect(await seedCatalog(prisma, { fetchImpl: fakeFetch(new Error('offline')), storage, bucket: 'catalogo', ...NET })).toEqual({ models: 3, photos: 0 });
    expect(rows.size).toBe(3);
    for (const row of rows.values()) expect(row.photoObjectKey).toBeUndefined();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('sem MinIO: semeia sem foto e nem tenta baixar', async () => {
    const { prisma, rows } = memoryPrisma();
    const storage = { ensureBuckets: jest.fn(async () => { throw new Error('ECONNREFUSED'); }), putObject: jest.fn() };
    const f = fakeFetch(JPEG);
    expect(await seedCatalog(prisma, { fetchImpl: f, storage, bucket: 'catalogo', ...NET })).toEqual({ models: 3, photos: 0 });
    expect(f).not.toHaveBeenCalled();
    expect(rows.size).toBe(3);
  });

  it('banco antigo: renomeia o placeholder; sem foto nova, tira o PNG sólido e mantém foto de verdade', async () => {
    const [urbana, sport] = CATALOG_EXAMPLES;
    const { prisma, rows } = memoryPrisma({
      [urbana.id]: { id: urbana.id, name: 'Volti Flash', slug: 'flash', photoObjectKey: 'catalog/flash.png' },
      [sport.id]: { id: sport.id, name: 'Volti Urban', slug: 'urban', photoObjectKey: 'catalog/3f1c.jpg' },
    });
    await seedCatalog(prisma, { fetchImpl: fakeFetch(new Error('offline')), storage: memoryStorage(), bucket: 'catalogo', ...NET });
    expect(rows.get(urbana.id)).toMatchObject({ name: 'Volti Urbana', slug: 'urbana', photoObjectKey: null });
    expect(rows.get(sport.id)).toMatchObject({ name: 'Volti Sport', slug: 'sport', photoObjectKey: 'catalog/3f1c.jpg' });
  });
});
