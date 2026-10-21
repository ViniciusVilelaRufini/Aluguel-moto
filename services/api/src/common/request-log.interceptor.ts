import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Uma linha JSON por requisição: rota (padrão, sem ids), status e duração. Sem dados pessoais. */
@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const started = Date.now();
    const log = (status: number) =>
      this.logger.log({ msg: 'request', method: req.method, route: req.route?.path ?? 'unknown', status, durationMs: Date.now() - started, traceId: req.traceId, pool: req.principal?.pool });
    return next.handle().pipe(
      tap({
        next: () => log(res.statusCode),
        error: (err: { getStatus?: () => number }) => log(typeof err?.getStatus === 'function' ? err.getStatus() : 500),
      }),
    );
  }
}
