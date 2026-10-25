import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * Prisma em memória para os testes unitários de pagamentos, seguro e carteira (sem banco).
 * Cobre o subconjunto usado pelos serviços: findUnique/findFirst/findMany/create/update/updateMany/upsert/
 * delete/deleteMany/count/aggregate, filtros `in`/`not`/`gt`/`gte`/`lt`/`lte`/`startsWith`, `OR`/`AND`, chaves compostas
 * e restrições únicas (P2002, como o Postgres). `$transaction` executa em sequência (sem rollback).
 */
type Row = Record<string, any>;

interface ModelSpec {
  id?: string;
  unique: string[][];
  defaults?: () => Row;
  updatedAt?: boolean;
}

const SPECS: Record<string, ModelSpec> = {
  payment: { unique: [['id'], ['idempotencyKey']], defaults: () => ({ refundedCents: 0, rentalId: null, depositId: null, subscriptionId: null, cardLast4: null, failureReason: null, providerPaymentId: null, receiptUrl: null, idempotencyKey: null, debtSettledAt: null, debtSettlement: null, settlesPaymentId: null, pix: null }), updatedAt: true },
  deposit: { unique: [['id'], ['idempotencyKey']], defaults: () => ({ rentalId: null, capturedCents: null, cardId: null, idempotencyKey: null, providerReference: null, pix: null }), updatedAt: true },
  customer: { unique: [['id']], defaults: () => ({ delinquent: false, status: 'active', kycStatus: 'approved', deletedAt: null }), updatedAt: true },
  rental: { unique: [['id']], defaults: () => ({ insurancePolicyId: null, paymentId: null, breakdown: null }), updatedAt: true },
  paymentCard: { unique: [['id']], defaults: () => ({ isDefault: false, deletedAt: null }) },
  paymentProviderRef: { unique: [['id'], ['entityType', 'entityId', 'provider']] },
  processedWebhook: { unique: [['id'], ['provider', 'eventId']], defaults: () => ({ dataId: null }) },
  insurancePolicy: { unique: [['id']], defaults: () => ({ status: 'active', payoutCents: null, providerPolicyId: null, canceledAt: null, issuedAt: new Date() }) },
  insuranceRemittance: { unique: [['id'], ['policyId']], defaults: () => ({ status: 'pending', rentalId: null }) },
  insuranceCoverageConfig: { id: 'coverage', unique: [['coverage']], defaults: () => ({ mandatory: false, items: [], active: true }), updatedAt: true },
  topUp: { unique: [['id']], defaults: () => ({ packageId: null, minutes: null, pix: null, paymentId: null }), updatedAt: true },
  subscription: { unique: [['id']], defaults: () => ({ cardId: null, cancelAtPeriodEnd: false, canceledAt: null }), updatedAt: true },
  walletEntry: { unique: [['id']], defaults: () => ({ minutes: null, rentalId: null, paymentId: null, createdById: null }) },
  invoice: { unique: [['id'], ['paymentId']], defaults: () => ({ issuedAt: new Date() }) },
  paymentReceipt: { id: 'paymentId', unique: [['paymentId']], defaults: () => ({ rentalId: null }) },
  fee: { id: 'code', unique: [['code']], defaults: () => ({ active: true }) },
  minutePackage: { unique: [['id']], defaults: () => ({ active: true }), updatedAt: true },
  pricingPlan: { unique: [['id']], defaults: () => ({ active: true }), updatedAt: true },
  auditLog: { unique: [['id']] },
  settlementProgress: { id: 'paymentId', unique: [['paymentId']], defaults: () => ({ steps: {}, attempts: 0, errorRuns: 0, parkedAt: null, parkedReason: null, finishedAt: null, lastFailure: null, leaseOwner: null, leaseUntil: null, depositId: null }), updatedAt: true },
  paymentRefund: { unique: [['id'], ['idempotencyKey']], defaults: () => ({ attempts: 0, providerRefundId: null, lastError: null, createdById: null }), updatedAt: true },
  depositRelease: { id: 'depositId', unique: [['depositId']], defaults: () => ({ attempts: 0, lastError: null, confirmedAt: null }), updatedAt: true },
  paymentCapture: { id: 'paymentId', unique: [['paymentId']] },
};

const OPS = new Set(['in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte', 'equals', 'startsWith', 'contains']);
const isPlainObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v);
const eq = (a: any, b: any) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
const cmp = (a: any, b: any) => (a instanceof Date ? a.getTime() : a) - (b instanceof Date ? b.getTime() : b);

function matchValue(value: any, cond: any): boolean {
  if (isPlainObject(cond) && Object.keys(cond).every((k) => OPS.has(k))) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case 'in': return (arg as any[]).some((x) => eq(value, x));
        case 'notIn': return !(arg as any[]).some((x) => eq(value, x));
        case 'not': return isPlainObject(arg) ? !matchValue(value, arg) : !eq(value, arg);
        case 'equals': return eq(value, arg);
        case 'gt': return value != null && cmp(value, arg) > 0;
        case 'gte': return value != null && cmp(value, arg) >= 0;
        case 'lt': return value != null && cmp(value, arg) < 0;
        case 'lte': return value != null && cmp(value, arg) <= 0;
        case 'startsWith': return typeof value === 'string' && value.startsWith(arg as string);
        case 'contains': return typeof value === 'string' && value.includes(arg as string);
        default: return false;
      }
    });
  }
  if (cond === null) return value === null || value === undefined;
  return eq(value, cond);
}

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, cond]) => {
    if (cond === undefined) return true;
    if (k === 'OR') return (cond as Row[]).some((w) => matches(row, w));
    if (k === 'AND') return (Array.isArray(cond) ? cond : [cond]).every((w: Row) => matches(row, w));
    if (k === 'NOT') return !matches(row, cond);
    // chave composta: provider_eventId: { provider, eventId }
    if (!(k in row) && isPlainObject(cond) && k.includes('_')) return matches(row, cond);
    return matchValue(row[k], cond);
  });
}

function applyData(row: Row, data: Row): Row {
  const out = { ...row };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && 'increment' in v) out[k] = (out[k] ?? 0) + (v.increment as number);
    else if (isPlainObject(v) && 'decrement' in v) out[k] = (out[k] ?? 0) - (v.decrement as number);
    else if (isPlainObject(v) && 'set' in v) out[k] = v.set;
    else out[k] = v;
  }
  return out;
}

function uniqueError(model: string, fields: string[]) {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${model}(${fields.join(',')})`, {
    code: 'P2002',
    clientVersion: 'in-memory',
    meta: { target: fields },
  });
}

class Delegate {
  readonly rows: Row[] = [];
  constructor(
    private readonly name: string,
    private readonly spec: ModelSpec,
  ) {}

  private checkUnique(candidate: Row, ignore?: Row) {
    for (const fields of this.spec.unique) {
      if (fields.some((f) => candidate[f] === null || candidate[f] === undefined)) continue;
      const clash = this.rows.find((r) => r !== ignore && fields.every((f) => eq(r[f], candidate[f])));
      if (clash) throw uniqueError(this.name, fields);
    }
  }

  private sort(rows: Row[], orderBy: any): Row[] {
    const list = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    return [...rows].sort((a, b) => {
      for (const o of list) {
        const [k, dir] = Object.entries(o)[0] as [string, 'asc' | 'desc'];
        const c = cmp(a[k], b[k]);
        if (c !== 0 && !Number.isNaN(c)) return dir === 'desc' ? -c : c;
        if (typeof a[k] === 'string' && a[k] !== b[k]) return (dir === 'desc' ? -1 : 1) * String(a[k]).localeCompare(String(b[k]));
      }
      return 0;
    });
  }

  private pick(row: Row | undefined, select?: Row): any {
    if (!row) return null;
    if (!select) return { ...row };
    return Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]]));
  }

  async findUnique(args: { where: Row; select?: Row }) {
    return this.pick(this.rows.find((r) => matches(r, args.where)), args.select);
  }
  async findUniqueOrThrow(args: { where: Row; select?: Row }) {
    const r = await this.findUnique(args);
    if (!r) throw new Error(`${this.name} não encontrado`);
    return r;
  }
  async findFirst(args: { where?: Row; orderBy?: any; select?: Row } = {}) {
    return this.pick(this.sort(this.rows.filter((r) => matches(r, args.where)), args.orderBy)[0], args.select);
  }
  async findMany(args: { where?: Row; orderBy?: any; take?: number; skip?: number; select?: Row } = {}) {
    let rows = this.sort(this.rows.filter((r) => matches(r, args.where)), args.orderBy);
    if (args.skip) rows = rows.slice(args.skip);
    if (args.take !== undefined) rows = rows.slice(0, Math.abs(args.take));
    return rows.map((r) => this.pick(r, args.select));
  }
  async create(args: { data: Row; select?: Row }) {
    const now = new Date();
    const idField = this.spec.id ?? 'id';
    const row: Row = { ...(this.spec.defaults?.() ?? {}), createdAt: now, ...(this.spec.updatedAt ? { updatedAt: now } : {}), ...args.data };
    if (row[idField] === undefined) row[idField] = randomUUID();
    for (const [k, v] of Object.entries(row)) if (v === undefined) row[k] = null;
    this.checkUnique(row);
    this.rows.push(row);
    return this.pick(row, args.select);
  }
  async update(args: { where: Row; data: Row; select?: Row }) {
    const idx = this.rows.findIndex((r) => matches(r, args.where));
    if (idx < 0) throw new Prisma.PrismaClientKnownRequestError(`${this.name} not found`, { code: 'P2025', clientVersion: 'in-memory' });
    const next = applyData(this.rows[idx], { ...args.data, ...(this.spec.updatedAt ? { updatedAt: new Date() } : {}) });
    this.checkUnique(next, this.rows[idx]);
    this.rows[idx] = next;
    return this.pick(next, args.select);
  }
  async updateMany(args: { where?: Row; data: Row }) {
    let count = 0;
    this.rows.forEach((r, i) => {
      if (!matches(r, args.where)) return;
      this.rows[i] = applyData(r, { ...args.data, ...(this.spec.updatedAt ? { updatedAt: new Date() } : {}) });
      count++;
    });
    return { count };
  }
  async upsert(args: { where: Row; create: Row; update: Row }) {
    const existing = this.rows.find((r) => matches(r, args.where));
    return existing ? this.update({ where: args.where, data: args.update }) : this.create({ data: args.create });
  }
  async delete(args: { where: Row }) {
    const idx = this.rows.findIndex((r) => matches(r, args.where));
    if (idx < 0) throw new Error(`${this.name} não encontrado`);
    return this.rows.splice(idx, 1)[0];
  }
  async deleteMany(args: { where?: Row } = {}) {
    const keep = this.rows.filter((r) => !matches(r, args.where));
    const count = this.rows.length - keep.length;
    this.rows.splice(0, this.rows.length, ...keep);
    return { count };
  }
  async count(args: { where?: Row } = {}) {
    return this.rows.filter((r) => matches(r, args.where)).length;
  }
  async aggregate(args: { where?: Row; _sum?: Row; _count?: any; _max?: Row }) {
    const rows = this.rows.filter((r) => matches(r, args.where));
    const out: Row = {};
    if (args._sum) {
      out._sum = Object.fromEntries(Object.keys(args._sum).map((k) => {
        const vals = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
        return [k, vals.length ? vals.reduce((a, b) => a + b, 0) : null];
      }));
    }
    if (args._max) {
      out._max = Object.fromEntries(Object.keys(args._max).map((k) => {
        const vals = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
        return [k, vals.length ? vals.reduce((a, b) => (cmp(a, b) >= 0 ? a : b)) : null];
      }));
    }
    if (args._count) out._count = { _all: rows.length };
    return out;
  }
}

export type InMemoryPrisma = Record<keyof typeof SPECS, Delegate> & {
  $transaction: (arg: any) => Promise<any>;
};

export function createInMemoryPrisma(): InMemoryPrisma {
  const db: Row = {};
  for (const [name, spec] of Object.entries(SPECS)) db[name] = new Delegate(name, spec);
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));
  return db as InMemoryPrisma;
}
