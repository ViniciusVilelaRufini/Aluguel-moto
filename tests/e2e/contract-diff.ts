/**
 * Diff de contrato (agente 8): rotas implementadas (metadados dos controllers Nest) × `openapi.yaml`
 * × cliente TypeScript gerado (`generated/ts/schema.d.ts`) × cliente Dart gerado (`generated/dart/lib/src/api/*.dart`).
 *
 * Rodar (sem banco, sem API no ar):
 *   pnpm --filter api exec tsx ../../tests/e2e/contract-diff.ts
 * Sai com código 1 se houver qualquer divergência de método+caminho.
 */
import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

process.env.AUTH_MODE = process.env.AUTH_MODE ?? 'dev';

const root = path.resolve(__dirname, '../..');
const contracts = path.join(root, 'packages/contracts');
const norm = (p: string) => p.replace(/\{(\w+)\}/g, ':$1');

function collectModules(mod: any, seen = new Set<any>()): any[] {
  const m = mod?.module ?? mod;
  if (!m || seen.has(m)) return [];
  seen.add(m);
  const imports: any[] = [...(Reflect.getMetadata(MODULE_METADATA.IMPORTS, m) ?? []), ...(mod?.imports ?? [])];
  return [mod, ...imports.flatMap((i) => collectModules(i, seen))];
}

async function implemented(): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require(path.join(root, 'services/api/src/app.module'));
  const out = new Set<string>();
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
        out.add(`${RequestMethod[method]} ${full}`);
      }
    }
  }
  return out;
}

function fromOpenapi(): Set<string> {
  const spec = yaml.load(fs.readFileSync(path.join(contracts, 'openapi.yaml'), 'utf8')) as { paths: Record<string, Record<string, unknown>> };
  const out = new Set<string>();
  for (const [p, item] of Object.entries(spec.paths)) {
    for (const m of Object.keys(item)) if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) out.add(`${m.toUpperCase()} ${norm(p)}`);
  }
  return out;
}

function fromTs(): Set<string> {
  const src = fs.readFileSync(path.join(contracts, 'generated/ts/schema.d.ts'), 'utf8');
  const out = new Set<string>();
  // openapi-typescript: `    "/path": { ... get: operations["x"]; put?: never; ... }`
  const re = /^ {4}"(\/[^"]*)": \{([\s\S]*?)^ {4}\};/gm;
  for (const m of src.matchAll(re)) {
    for (const verb of ['get', 'put', 'post', 'delete', 'patch']) {
      if (new RegExp(`^ {8}${verb}: operations\\[`, 'm').test(m[2])) out.add(`${verb.toUpperCase()} ${norm(m[1])}`);
    }
  }
  return out;
}

function fromDart(): Set<string> {
  const dir = path.join(contracts, 'generated/dart/lib/src/api');
  const out = new Set<string>();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.dart'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /final _path = r'([^']+)'[\s\S]*?method: r'(\w+)'/g;
    for (const m of src.matchAll(re)) out.add(`${m[2].toUpperCase()} ${norm(m[1])}`);
  }
  return out;
}

const minus = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)).sort();

void (async () => {
  const impl = await implemented();
  const spec = fromOpenapi();
  const ts = fromTs();
  const dart = fromDart();
  const report = {
    counts: { implemented: impl.size, openapi: spec.size, ts: ts.size, dart: dart.size },
    implementedNotInSpec: minus(impl, spec),
    specNotImplemented: minus(spec, impl),
    specNotInTs: minus(spec, ts),
    tsNotInSpec: minus(ts, spec),
    specNotInDart: minus(spec, dart),
    dartNotInSpec: minus(dart, spec),
  };
  console.log(JSON.stringify(report, null, 2));
  const bad = Object.entries(report).some(([k, v]) => k !== 'counts' && (v as string[]).length > 0);
  process.exit(bad ? 1 : 0);
})();
