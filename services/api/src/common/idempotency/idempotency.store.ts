import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
/** Registro "em andamento" mais velho que isto é considerado abandonado (processo caiu). */
export const IDEMPOTENCY_STALE_MS = 60_000;
const STALE_MS = IDEMPOTENCY_STALE_MS;

export type BeginResult =
  | { state: 'new' }
  | { state: 'replay'; statusCode: number; body: unknown }
  | { state: 'mismatch' }
  | { state: 'in_progress' };

export interface IdempotencyStore {
  begin(scope: string, key: string, requestHash: string): Promise<BeginResult>;
  complete(scope: string, key: string, statusCode: number, body: unknown): Promise<void>;
  abort(scope: string, key: string): Promise<void>;
}

@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(private readonly prisma: PrismaService) {}

  async begin(scope: string, key: string, requestHash: string): Promise<BeginResult> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.prisma.idempotencyRecord.create({
          data: { scope, key, requestHash, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) },
        });
        return { state: 'new' };
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
      }
      const rec = await this.prisma.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
      if (!rec) continue;
      const expired = rec.expiresAt.getTime() < Date.now();
      const stale = !rec.completed && Date.now() - rec.createdAt.getTime() > STALE_MS;
      if (expired || stale) {
        await this.prisma.idempotencyRecord.deleteMany({ where: { id: rec.id } });
        continue;
      }
      if (rec.requestHash !== requestHash) return { state: 'mismatch' };
      if (!rec.completed) return { state: 'in_progress' };
      return { state: 'replay', statusCode: rec.statusCode ?? 200, body: rec.response };
    }
    return { state: 'in_progress' };
  }

  async complete(scope: string, key: string, statusCode: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { scope_key: { scope, key } },
      data: { completed: true, statusCode, response: (body ?? Prisma.JsonNull) as Prisma.InputJsonValue },
    });
  }

  async abort(scope: string, key: string): Promise<void> {
    await this.prisma.idempotencyRecord.deleteMany({ where: { scope, key, completed: false } });
  }
}

/** Implementação em memória (testes). */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, { hash: string; completed: boolean; statusCode?: number; body?: unknown }>();

  async begin(scope: string, key: string, requestHash: string): Promise<BeginResult> {
    const id = `${scope}|${key}`;
    const rec = this.records.get(id);
    if (!rec) {
      this.records.set(id, { hash: requestHash, completed: false });
      return { state: 'new' };
    }
    if (rec.hash !== requestHash) return { state: 'mismatch' };
    if (!rec.completed) return { state: 'in_progress' };
    return { state: 'replay', statusCode: rec.statusCode!, body: rec.body };
  }
  async complete(scope: string, key: string, statusCode: number, body: unknown) {
    const rec = this.records.get(`${scope}|${key}`);
    if (rec) Object.assign(rec, { completed: true, statusCode, body: JSON.parse(JSON.stringify(body ?? null)) });
  }
  async abort(scope: string, key: string) {
    const id = `${scope}|${key}`;
    if (!this.records.get(id)?.completed) this.records.delete(id);
  }
}
