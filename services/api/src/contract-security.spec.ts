import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';
import { AUTH_META, AuthRequirement, PUBLIC_META } from './modules/auth/principal';

/**
 * Conformidade com o contrato sem banco: para cada operação do `openapi.yaml`, o controller correspondente
 * existe e declara exatamente os esquemas de segurança e os `x-required-groups` do contrato.
 */
type Op = { security?: Array<Record<string, unknown>>; 'x-required-groups'?: string[]; operationId: string };

function collectModules(mod: any, seen = new Set<any>()): any[] {
  const m = mod?.module ?? mod;
  if (!m || seen.has(m)) return [];
  seen.add(m);
  const imports: any[] = [...(Reflect.getMetadata(MODULE_METADATA.IMPORTS, m) ?? []), ...(mod?.imports ?? [])];
  return [mod, ...imports.flatMap((i) => collectModules(i, seen))];
}

function collectRoutes() {
  const routes = new Map<string, { requirement?: AuthRequirement; isPublic: boolean }>();
  for (const mod of collectModules(AppModule)) {
    const m = mod?.module ?? mod;
    const controllers: any[] = [...(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, m) ?? []), ...(mod?.controllers ?? [])];
    for (const ctrl of controllers) {
      const base: string = Reflect.getMetadata(PATH_METADATA, ctrl) ?? '';
      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        const handler = ctrl.prototype[name];
        if (typeof handler !== 'function' || name === 'constructor') continue;
        const sub: string | undefined = Reflect.getMetadata(PATH_METADATA, handler);
        const method: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler);
        if (sub === undefined || method === undefined) continue;
        const full = ('/' + [base, sub].filter((s) => s && s !== '/').join('/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        routes.set(`${RequestMethod[method]} ${full}`, {
          requirement: Reflect.getMetadata(AUTH_META, handler) ?? Reflect.getMetadata(AUTH_META, ctrl),
          isPublic: !!(Reflect.getMetadata(PUBLIC_META, handler) ?? Reflect.getMetadata(PUBLIC_META, ctrl)),
        });
      }
    }
  }
  return routes;
}

describe('Contrato × controllers (segurança e grupos)', () => {
  process.env.AUTH_MODE = 'dev';
  const spec = yaml.load(fs.readFileSync(path.join(__dirname, '../../../packages/contracts/openapi.yaml'), 'utf8')) as {
    paths: Record<string, Record<string, Op>>;
  };
  const routes = collectRoutes();
  const ops: Array<[string, Op]> = [];
  for (const [p, item] of Object.entries(spec.paths)) {
    for (const [m, op] of Object.entries(item)) {
      if (m === 'parameters') continue;
      ops.push([`${m.toUpperCase()} ${p.replace(/\{(\w+)\}/g, ':$1')}`, op]);
    }
  }

  it('cobre as 196 operações do contrato, sem rotas extras', () => {
    expect(ops).toHaveLength(197);
    const missing = ops.map(([k]) => k).filter((k) => !routes.has(k));
    const extra = [...routes.keys()].filter((k) => !ops.some(([o]) => o === k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(ops.map(([k, op]) => [op.operationId, k, op] as const))('%s (%s): esquemas e grupos iguais ao contrato', (_id, key, op) => {
    const route = routes.get(key)!;
    const schemes = (op.security ?? []).map((s) => Object.keys(s)[0]).sort();
    if (schemes.length === 0) {
      expect(route.isPublic).toBe(true);
      return;
    }
    expect(route.isPublic).toBe(false);
    const pools = (route.requirement?.pools ?? []).map((p) => (p === 'customer' ? 'customerAuth' : 'staffAuth')).sort();
    expect(pools).toEqual(schemes);
    if (schemes.includes('staffAuth')) {
      expect([...(route.requirement?.groups ?? [])].sort()).toEqual([...(op['x-required-groups'] ?? [])].sort());
    }
  });

  it('ciclo de vida das baterias (2026-10-24): rotas novas só de staff, com os grupos do contrato', () => {
    const groups = (key: string) => [...(routes.get(key)?.requirement?.groups ?? [])].sort();
    const pools = (key: string) => [...(routes.get(key)?.requirement?.pools ?? [])];
    const expected: Record<string, string[]> = {
      'POST /batteries': ['admin', 'operacao'],
      'POST /batteries/:id/mark-charged': ['admin', 'campo', 'operacao'],
      'POST /batteries/:id/report-defect': ['admin', 'campo', 'operacao'],
      'POST /batteries/:id/retire': ['admin', 'operacao'],
      'GET /batteries/:id/movements': ['admin', 'campo', 'operacao', 'suporte'],
    };
    for (const [key, g] of Object.entries(expected)) {
      expect(pools(key)).toEqual(['staff']);
      expect(groups(key)).toEqual(g);
    }
  });

  it('listSwapStations: leitura aberta ao cliente (sem grupo) e a staff só dos grupos do contrato', () => {
    const op = ops.find(([, o]) => o.operationId === 'listSwapStations');
    expect(op).toBeDefined();
    const [key, spec] = op!;
    expect(key).toBe('GET /swap-stations');
    expect((spec.security ?? []).map((s) => Object.keys(s)[0])).toContain('customerAuth');
    const route = routes.get(key)!;
    expect(route.requirement?.pools).toContain('customer');
    // Na raiz /swap-stations o cliente só lê; o cadastro (POST, Task 12 das lacunas) é só staff admin/operacao.
    expect(ops.filter(([k]) => k.endsWith(' /swap-stations')).map(([k]) => k).sort()).toEqual(['GET /swap-stations', 'POST /swap-stations']);
  });

  it('cadastro de estações pelo painel (Task 12 das lacunas): só staff admin/operacao, nunca cliente', () => {
    const byId = (id: string) => ops.find(([, o]) => o.operationId === id)!;
    const expected: Record<string, string> = {
      createSwapStation: 'POST /swap-stations',
      listSwapStationRegistry: 'GET /swap-stations/registry',
      updateSwapStation: 'PATCH /swap-stations/:id',
      getSwapStationQr: 'GET /swap-stations/:id/qr',
    };
    for (const [id, key] of Object.entries(expected)) {
      const [k, op] = byId(id);
      expect(k).toBe(key);
      expect((op.security ?? []).map((s) => Object.keys(s)[0])).toEqual(['staffAuth']);
      expect([...(op['x-required-groups'] ?? [])].sort()).toEqual(['admin', 'operacao']);
      expect(routes.get(key)?.requirement?.pools).toEqual(['staff']);
      expect([...(routes.get(key)?.requirement?.groups ?? [])].sort()).toEqual(['admin', 'operacao']);
    }
  });

  it('troca de bateria na estação (QR): criar e cancelar só cliente; consultar dono + staff; listar só staff', () => {
    const byId = (id: string) => ops.find(([, o]) => o.operationId === id)!;
    const pools = (key: string) => [...(routes.get(key)?.requirement?.pools ?? [])].sort();
    const groups = (key: string) => [...(routes.get(key)?.requirement?.groups ?? [])].sort();
    expect(ops.filter(([k]) => k.includes(' /swap-stations/')).map(([k]) => k).sort()).toEqual([
      'GET /swap-stations/:id/qr',
      'GET /swap-stations/:id/swaps',
      'GET /swap-stations/:id/swaps/:swapId',
      'GET /swap-stations/registry',
      'PATCH /swap-stations/:id',
      'POST /swap-stations/:id/swaps',
      'POST /swap-stations/:id/swaps/:swapId/cancel',
    ]);
    const [create] = byId('createStationSwap');
    expect(create).toBe('POST /swap-stations/:id/swaps');
    expect(pools(create)).toEqual(['customer']);
    expect(pools(byId('cancelStationSwap')[0])).toEqual(['customer']);
    const [get] = byId('getStationSwap');
    expect(pools(get)).toEqual(['customer', 'staff']);
    expect(groups(get)).toEqual(['admin', 'operacao', 'suporte']);
    const [list] = byId('listStationSwaps');
    expect(pools(list)).toEqual(['staff']);
    expect(groups(list)).toEqual(['admin', 'operacao', 'suporte']);
    // Idempotency-Key obrigatória na criação.
    const params = ((byId('createStationSwap')[1] as unknown as { parameters?: Array<{ $ref?: string }> }).parameters ?? []).map((p) => p.$ref);
    expect(params).toContain('#/components/parameters/IdempotencyKey');
    // Fix 1 (I6) + Task 12 das lacunas: QR da estação só para staff admin/operacao (impressão no painel), nunca para cliente.
    const [qr] = byId('getSwapStationQr');
    expect(qr).toBe('GET /swap-stations/:id/qr');
    expect(pools(qr)).toEqual(['staff']);
    expect(groups(qr)).toEqual(['admin', 'operacao']);
  });
  it('fechamento sem cartão (Task 16, R2-01): quitação e recibo abertos ao cliente; reserva e quitação com os códigos do contrato', () => {
    const raw = spec as unknown as { paths: Record<string, Record<string, Op & { responses?: Record<string, unknown> }>> };
    const pools = (key: string) => [...(routes.get(key)?.requirement?.pools ?? [])].sort();
    // O cliente paga a própria dívida (Pix/cartão) e lê o próprio recibo; staff só lê o recibo.
    expect(pools('POST /payments/:id/retry')).toEqual(['customer']);
    expect(pools('GET /rentals/:id/receipt')).toEqual(['customer', 'staff']);
    expect(Object.keys(raw.paths['/payments/{id}/retry'].post.responses ?? {})).toEqual(expect.arrayContaining(['201', '402', '409', '503']));
    expect(Object.keys(raw.paths['/reservations'].post.responses ?? {})).toContain('409');
  });
});
