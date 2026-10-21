import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ProblemException, ValidationIssue } from './common/problem';
import { ProblemFilter } from './common/problem.filter';

function flatten(errors: ValidationError[], parent = ''): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const e of errors) {
    const field = parent ? `${parent}.${e.property}` : e.property;
    for (const msg of Object.values(e.constraints ?? {})) out.push({ field, message: msg });
    if (e.children?.length) out.push(...flatten(e.children, field));
  }
  return out;
}

/** Limite de velocidade fora de 0..32 tem slug próprio (`speed-limit-out-of-range`). */
function slugFor(issues: ValidationIssue[]): string {
  const speed = issues.some((i) => /speedLimitKmh$/.test(i.field) && /(must not be greater|must not be less)/.test(i.message));
  return speed ? 'speed-limit-out-of-range' : 'validation-error';
}

export const validationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => {
      const issues = flatten(errors);
      const slug = slugFor(issues);
      const detail = slug === 'speed-limit-out-of-range' ? 'Velocidade máxima absoluta: 32 km/h.' : 'Verifique os campos informados.';
      return new ProblemException(400, slug, detail, issues);
    },
  });

/** Configuração HTTP comum à aplicação e aos testes. */
export function configureApp(app: INestApplication): INestApplication {
  app.use((req: Request & { traceId?: string }, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    req.traceId = typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.traceId);
    next();
  });
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new ProblemFilter());
  app.enableCors({ origin: true, credentials: true, exposedHeaders: ['X-Request-Id', 'Retry-After', 'Idempotent-Replayed'] });
  const http = app.getHttpAdapter().getInstance();
  http.set?.('trust proxy', 1);
  http.disable?.('x-powered-by');
  return app;
}
