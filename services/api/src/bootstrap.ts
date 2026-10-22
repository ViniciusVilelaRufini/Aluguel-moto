import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ProblemException, ValidationIssue } from './common/problem';
import { ProblemFilter } from './common/problem.filter';
import { corsOptions } from './common/cors';
import helmet from 'helmet';

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

/** `TRUST_PROXY`: número de saltos (ex.: 1 = ALB), `true`/`false` ou lista do Express (`loopback`…); ausente = desligado. */
export function trustProxySetting(raw: string | undefined): boolean | number | string {
  if (raw === undefined || raw.trim() === '' || raw === 'false') return false;
  if (raw === 'true') return true;
  return /^[0-9]+$/.test(raw.trim()) ? Number(raw) : raw.trim();
}

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
  app.enableCors(corsOptions());
  // QA-18: HSTS, nosniff, frame-ancestors 'none' etc. A API só serve JSON: CSP mínima.
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  const http = app.getHttpAdapter().getInstance();
  // QA-18: só confia no X-Forwarded-For com proxy declarado (TRUST_PROXY=1 atrás do ALB); senão um cabeçalho forjado
  // trocaria o IP usado pelo rate limit.
  http.set?.('trust proxy', trustProxySetting(process.env.TRUST_PROXY));
  http.disable?.('x-powered-by');
  return app;
}
