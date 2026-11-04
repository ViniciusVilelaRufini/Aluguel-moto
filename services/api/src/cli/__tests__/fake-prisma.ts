import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * Prisma em memória para o spec do `dev-reset-bench` (sem banco). Os modelos, os padrões e as FKs vêm da DMMF do Prisma:
 * apagar uma linha referenciada por FK obrigatória sem `onDelete` falha como o RESTRICT do Postgres (P2003); FK opcional
 * vira NULL (SET NULL, padrão do Prisma); `Cascade` apaga junto. Criar com FK obrigatória para linha inexistente também
 * falha. Filtros com a semântica de NULL do SQL (`not`/`in` não casam NULL). `$transaction` desfaz tudo em caso de erro.
 * `writes` registra toda escrita (o dry-run não pode ter nenhuma).
 */
type Row = Record<string, any>;
type Model = (typeof Prisma.dmmf.datamodel.models)[number];

export const MODELS: readonly Model[] = Prisma.dmmf.datamodel.models;
const byName = new Map(MODELS.map((m) => [m.name, m]));
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** FK (lado que guarda a coluna): `from` aponta para `to`. */
export interface Fk {
  from: string;
  field: string;
  columns: readonly string[];
  to: string;
  references: readonly string[];
  required: boolean;
  onDelete: string;
}

export const FKS: readonly Fk[] = MODELS.flatMap((m) =>
  m.fields
    .filter((f) => f.kind === 'object' && (f.relationFromFields?.length ?? 0) > 0)
    .map((f) => ({
      from: m.name,
      field: f.name,
      columns: f.relationFromFields!,
      to: f.type,
      references: f.relationToFields!,
      required: f.isRequired,
      onDelete: (f as { relationOnDelete?: string }).relationOnDelete ?? (f.isRequired ? 'Restrict' : 'SetNull'),
    })),
);

const isObj = (v: unknown): v is Row => !!v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v);
const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
const num = (v: any) => (v instanceof Date ? v.getTime() : v);

function matchScalar(value: any, cond: any): boolean {
  if (cond === null) return value === null || value === undefined;
  if (!isObj(cond)) return value !== null && value !== undefined && same(value, cond);
  const insensitive = cond.mode === 'insensitive';
  const norm = (v: any) => (insensitive && typeof v === 'string' ? v.toLowerCase() : v);
  return Object.entries(cond).every(([op, arg]) => {
    if (op === 'mode') return true;
    const isNull = value === null || value === undefined;
    switch (op) {
      case 'equals':
        return arg === null ? isNull : !isNull && same(norm(value), norm(arg));
      case 'not':
        if (arg === null) return !isNull;
        if (isObj(arg)) return !isNull && !matchScalar(value, arg);
        return !isNull && !same(norm(value), norm(arg));
      case 'in':
        return !isNull && (arg as any[]).some((x) => same(value, x));
      case 'notIn':
        return !isNull && !(arg as any[]).some((x) => same(value, x));
      case 'gt':
        return !isNull && num(value) > num(arg);
      case 'gte':
        return !isNull && num(value) >= num(arg);
      case 'lt':
        return !isNull && num(value) < num(arg);
      case 'lte':
        return !isNull && num(value) <= num(arg);
      default:
        throw new Error(`fake-prisma: operador não suportado: ${op}`);
    }
  });
}

export class FakePrisma {
  readonly data: Record<string, Row[]> = {};
  readonly writes: string[] = [];
  [delegate: string]: any;

  constructor() {
    for (const m of MODELS) {
      this.data[m.name] = [];
      this[lowerFirst(m.name)] = this.delegate(m);
    }
  }

  rows(model: string): Row[] {
    return this.data[model];
  }

  async $transaction<T>(fn: (tx: this) => Promise<T>, _opts?: unknown): Promise<T> {
    const snapshot = structuredClone(this.data);
    try {
      return await fn(this);
    } catch (err) {
      for (const k of Object.keys(snapshot)) this.data[k] = snapshot[k];
      throw err;
    }
  }

  /** Linha com os padrões da DMMF (id uuid, now(), literais) + `row`. Sem conferir FK (semente dos testes). */
  seed(model: string, row: Row = {}): Row {
    const full = { ...this.defaults(byName.get(model)!), ...row };
    this.data[model].push(full);
    return full;
  }

  private defaults(m: Model): Row {
    const out: Row = {};
    for (const f of m.fields) {
      if (f.kind === 'object') continue;
      const d = f.default as any;
      if (f.isUpdatedAt) out[f.name] = new Date();
      else if (d && typeof d === 'object' && 'name' in d) out[f.name] = String(d.name).startsWith('uuid') ? randomUUID() : d.name === 'now' ? new Date() : null;
      else if (d !== undefined) out[f.name] = Array.isArray(d) ? [...d] : d;
      else out[f.name] = f.isList ? [] : null;
    }
    return out;
  }

  matches(m: Model, row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([k, cond]) => {
      if (cond === undefined) return true;
      if (k === 'OR') return (cond as Row[]).some((w) => this.matches(m, row, w));
      if (k === 'AND') return (Array.isArray(cond) ? cond : [cond]).every((w: Row) => this.matches(m, row, w));
      if (k === 'NOT') return !(Array.isArray(cond) ? cond : [cond]).some((w: Row) => this.matches(m, row, w));
      const field = m.fields.find((f) => f.name === k);
      if (!field) {
        // Chave única composta (ex.: entityType_entityId_provider).
        if (isObj(cond)) return Object.entries(cond).every(([ck, cv]) => matchScalar(row[ck], cv));
        throw new Error(`fake-prisma: campo desconhecido ${m.name}.${k}`);
      }
      if (field.kind === 'object') throw new Error(`fake-prisma: filtro por relação não suportado (${m.name}.${k})`);
      return matchScalar(row[k], cond);
    });
  }

  private project(m: Model, row: Row, args: Row = {}): Row {
    let out: Row = { ...row };
    if (args.select) {
      out = {};
      for (const [k, v] of Object.entries(args.select)) if (v) out[k] = this.relationOrScalar(m, row, k, v);
    }
    if (args.include) for (const [k, v] of Object.entries(args.include)) if (v) out[k] = this.relationOrScalar(m, row, k, v);
    return out;
  }

  private relationOrScalar(m: Model, row: Row, k: string, spec: any): any {
    const field = m.fields.find((f) => f.name === k);
    if (!field || field.kind !== 'object') return row[k];
    const fk = FKS.find((x) => x.from === m.name && x.field === k);
    if (!fk) throw new Error(`fake-prisma: include de relação reversa não suportado (${m.name}.${k})`);
    const target = this.data[fk.to].find((r) => fk.columns.every((c, i) => r[fk.references[i]] === row[c]));
    if (!target) return null;
    return this.project(byName.get(fk.to)!, target, spec === true ? {} : spec);
  }

  private order(rows: Row[], orderBy: any): Row[] {
    if (!orderBy) return rows;
    const keys = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap((o: Row) => Object.entries(o));
    return [...rows].sort((a, b) => {
      for (const [k, dir] of keys) {
        const x = num(a[k]);
        const y = num(b[k]);
        if (x === y) continue;
        return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
      }
      return 0;
    });
  }

  private applyData(row: Row, data: Row): void {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (isObj(v) && 'increment' in v) row[k] = (row[k] ?? 0) + v.increment;
      else row[k] = v;
    }
  }

  private assertFksExist(m: Model, row: Row): void {
    for (const fk of FKS.filter((x) => x.from === m.name)) {
      const vals = fk.columns.map((c) => row[c]);
      if (vals.some((v) => v === null || v === undefined)) {
        if (fk.required) throw new Error(`fake-prisma: ${m.name}.${fk.field} obrigatório`);
        continue;
      }
      if (!this.data[fk.to].some((r) => fk.references.every((c, i) => r[c] === vals[i]))) {
        throw Object.assign(new Error(`P2003: FK ${m.name}.${fk.field} → ${fk.to} inexistente`), { code: 'P2003' });
      }
    }
  }

  private assertUnique(m: Model, row: Row, self?: Row): void {
    const uniques = [...m.fields.filter((f) => f.isUnique || f.isId).map((f) => [f.name]), ...m.uniqueFields];
    for (const cols of uniques) {
      if (cols.some((c) => row[c] === null || row[c] === undefined)) continue;
      if (this.data[m.name].some((r) => r !== self && cols.every((c) => same(r[c], row[c])))) {
        throw Object.assign(new Error(`P2002: ${m.name}.${cols.join('+')} duplicado`), { code: 'P2002' });
      }
    }
  }

  /** Apaga as linhas como o Postgres: RESTRICT falha, SET NULL anula, CASCADE apaga junto. */
  private remove(m: Model, victims: Row[]): void {
    if (victims.length === 0) return;
    for (const fk of FKS.filter((x) => x.to === m.name)) {
      const from = byName.get(fk.from)!;
      const refs = (r: Row) => victims.some((v) => fk.columns.every((c, i) => r[c] !== null && r[c] !== undefined && r[c] === v[fk.references[i]]));
      const dependents = this.data[fk.from].filter((r) => !victims.includes(r) && refs(r));
      if (dependents.length === 0) continue;
      if (fk.onDelete === 'Cascade') this.remove(from, dependents);
      else if (fk.onDelete === 'SetNull') for (const r of dependents) for (const c of fk.columns) r[c] = null;
      else throw Object.assign(new Error(`P2003: ${fk.from}.${fk.field} ainda referencia ${m.name} (${dependents.length})`), { code: 'P2003' });
    }
    this.data[m.name] = this.data[m.name].filter((r) => !victims.includes(r));
  }

  private delegate(m: Model) {
    const list = () => this.data[m.name];
    const find = (args: Row = {}) => this.order(list().filter((r) => this.matches(m, r, args.where)), args.orderBy);
    const write = (op: string) => this.writes.push(`${m.name}.${op}`);
    return {
      findMany: async (args: Row = {}) => find(args).slice(0, args.take ?? Infinity).map((r) => this.project(m, r, args)),
      findFirst: async (args: Row = {}) => {
        const r = find(args)[0];
        return r ? this.project(m, r, args) : null;
      },
      findUnique: async (args: Row) => {
        const r = find(args)[0];
        return r ? this.project(m, r, args) : null;
      },
      count: async (args: Row = {}) => find(args).length,
      create: async (args: Row) => {
        write('create');
        const row = { ...this.defaults(m), ...args.data };
        this.assertFksExist(m, row);
        this.assertUnique(m, row);
        list().push(row);
        return this.project(m, row, args);
      },
      update: async (args: Row) => {
        write('update');
        const row = list().find((r) => this.matches(m, r, args.where));
        if (!row) throw Object.assign(new Error(`P2025: ${m.name} não encontrado`), { code: 'P2025' });
        this.applyData(row, args.data);
        if (m.fields.some((f) => f.isUpdatedAt)) row.updatedAt = new Date();
        this.assertFksExist(m, row);
        this.assertUnique(m, row, row);
        return this.project(m, row, args);
      },
      updateMany: async (args: Row) => {
        write('updateMany');
        const rows = find(args);
        for (const r of rows) {
          this.applyData(r, args.data);
          this.assertFksExist(m, r);
        }
        return { count: rows.length };
      },
      deleteMany: async (args: Row = {}) => {
        write('deleteMany');
        const rows = find(args);
        this.remove(m, rows);
        return { count: rows.length };
      },
      groupBy: async (args: Row) => {
        const groups = new Map<string, Row[]>();
        for (const r of find(args)) {
          const key = JSON.stringify(args.by.map((b: string) => r[b]));
          groups.set(key, [...(groups.get(key) ?? []), r]);
        }
        return [...groups.values()].map((rs) => ({ ...Object.fromEntries(args.by.map((b: string) => [b, rs[0][b]])), _count: { _all: rs.length } }));
      },
      aggregate: async (args: Row) => {
        const rows = find(args);
        const _sum: Row = {};
        for (const k of Object.keys(args._sum ?? {})) _sum[k] = rows.length ? rows.reduce((a, r) => a + (r[k] ?? 0), 0) : null;
        return { _sum };
      },
    };
  }
}
