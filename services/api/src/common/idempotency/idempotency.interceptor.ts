import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { from, lastValueFrom, Observable } from 'rxjs';
import { ProblemException } from '../problem';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from './idempotency.store';

export const IDEMPOTENT_META = 'volti:idempotent';

/** Marca a operação com `Idempotency-Key` (obrigatória ou opcional, conforme o contrato). */
export const Idempotent = (opts: { required: boolean }) => SetMetadata(IDEMPOTENT_META, opts);

export function requestHash(method: string, path: string, body: unknown): string {
  return createHash('sha256').update(`${method} ${path}\n${JSON.stringify(body ?? null)}`).digest('hex');
}

/**
 * A mesma chave com o mesmo corpo devolve a mesma resposta (status + corpo) sem repetir o efeito;
 * com corpo diferente → 422 `idempotency-key-reused`; ausente quando obrigatória → 400. Erros não são memorizados.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.get<{ required: boolean } | undefined>(IDEMPOTENT_META, ctx.getHandler());
    if (!opts || ctx.getType() !== 'http') return next.handle();
    return from(this.handle(ctx, next, opts));
  }

  private async handle(ctx: ExecutionContext, next: CallHandler, opts: { required: boolean }): Promise<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const raw = req.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key) {
      if (opts.required) {
        throw new ProblemException(400, 'validation-error', 'Cabeçalho Idempotency-Key obrigatório.', [
          { field: 'Idempotency-Key', message: 'obrigatório' },
        ]);
      }
      return lastValueFrom(next.handle(), { defaultValue: undefined });
    }
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
      throw new ProblemException(400, 'validation-error', 'Idempotency-Key deve ter de 8 a 128 caracteres.', [
        { field: 'Idempotency-Key', message: 'entre 8 e 128 caracteres' },
      ]);
    }
    const actor = req.principal?.userId ?? 'anon';
    const route = `${req.method} ${req.route?.path ?? req.path}`;
    const scope = `${actor}:${route}`;
    const hash = requestHash(req.method, req.path, req.body);

    const begin = await this.store.begin(scope, key, hash);
    if (begin.state === 'mismatch') {
      throw new ProblemException(422, 'idempotency-key-reused', 'Esta Idempotency-Key já foi usada com outro corpo.');
    }
    if (begin.state === 'in_progress') {
      throw new ProblemException(409, 'conflict', 'Requisição com esta Idempotency-Key ainda em processamento.');
    }
    if (begin.state === 'replay') {
      res.status(begin.statusCode);
      res.setHeader('Idempotent-Replayed', 'true');
      return begin.body;
    }
    try {
      const body = await lastValueFrom(next.handle(), { defaultValue: undefined });
      await this.store.complete(scope, key, res.statusCode, body);
      return body;
    } catch (err) {
      await this.store.abort(scope, key).catch(() => undefined);
      throw err;
    }
  }
}
