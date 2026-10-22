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

  it('cobre as 182 operações do contrato, sem rotas extras', () => {
    expect(ops).toHaveLength(182);
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

  it('listSwapStations: leitura aberta ao cliente (sem grupo) e a staff só dos grupos do contrato', () => {
    const op = ops.find(([, o]) => o.operationId === 'listSwapStations');
    expect(op).toBeDefined();
    const [key, spec] = op!;
    expect(key).toBe('GET /swap-stations');
    expect((spec.security ?? []).map((s) => Object.keys(s)[0])).toContain('customerAuth');
    const route = routes.get(key)!;
    expect(route.requirement?.pools).toContain('customer');
    // Na raiz /swap-stations o cliente só lê (as estações não são criadas pela API).
    expect(ops.filter(([k]) => k.endsWith(' /swap-stations')).map(([k]) => k)).toEqual(['GET /swap-stations']);
  });

  it('troca de bateria na estação (QR): criar e cancelar só cliente; consultar dono + staff; listar só staff', () => {
    const byId = (id: string) => ops.find(([, o]) => o.operationId === id)!;
    const pools = (key: string) => [...(routes.get(key)?.requirement?.pools ?? [])].sort();
    const groups = (key: string) => [...(routes.get(key)?.requirement?.groups ?? [])].sort();
    expect(ops.filter(([k]) => k.includes(' /swap-stations/')).map(([k]) => k).sort()).toEqual([
      'GET /swap-stations/:id/swaps',
      'GET /swap-stations/:id/swaps/:swapId',
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
  });
});
