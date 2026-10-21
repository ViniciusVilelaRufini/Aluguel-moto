import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { PROBLEM_BASE, ProblemException, problemTitle, ValidationIssue } from './problem';

const STATUS_SLUG: Record<number, string> = {
  400: 'validation-error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  405: 'not-found',
  409: 'conflict',
  413: 'validation-error',
  415: 'validation-error',
  422: 'validation-error',
  429: 'rate-limited',
};

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  errors?: ValidationIssue[];
}

/** Converte qualquer exceção em `application/problem+json` (RFC 7807). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { traceId?: string }>();
    const res = ctx.getResponse<Response>();
    const body = toProblem(exception);
    body.instance = req.originalUrl?.split('?')[0];
    if (req.traceId) body.traceId = req.traceId;
    if (body.status >= 500) {
      const err = exception as Error;
      this.logger.error({ msg: 'unhandled_error', traceId: req.traceId, error: err?.name, message: err?.message, stack: err?.stack });
    }
    if (body.status === 429) res.setHeader('Retry-After', '60');
    res.status(body.status).type('application/problem+json').send(JSON.stringify(body));
  }
}

export function toProblem(exception: unknown): ProblemBody {
  if (exception instanceof ProblemException) {
    const body: ProblemBody = {
      type: PROBLEM_BASE + exception.slug,
      title: exception.title,
      status: exception.getStatus(),
      code: exception.slug,
    };
    if (exception.detail) body.detail = exception.detail;
    if (exception.errors?.length) body.errors = exception.errors;
    return body;
  }
  if (exception instanceof ThrottlerException) {
    return make(429, 'rate-limited', 'Limite de requisições atingido. Tente novamente em instantes.');
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const slug = STATUS_SLUG[status] ?? (status >= 500 ? 'internal-error' : 'validation-error');
    const resp = exception.getResponse() as any;
    const detail = typeof resp === 'string' ? resp : Array.isArray(resp?.message) ? resp.message.join('; ') : resp?.message;
    return make(status, slug, status === 404 ? 'Recurso não encontrado.' : detail);
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2025') return make(404, 'not-found', 'Recurso não encontrado.');
    if (exception.code === 'P2002') return make(409, 'conflict', 'Registro duplicado.');
    if (exception.code === 'P2003') return make(404, 'not-found', 'Recurso relacionado não encontrado.');
  }
  if ((exception as any)?.type === 'entity.parse.failed') {
    return make(400, 'validation-error', 'JSON inválido.');
  }
  return make(500, 'internal-error', 'Erro inesperado. Tente novamente.');
}

function make(status: number, slug: string, detail?: string): ProblemBody {
  const body: ProblemBody = { type: PROBLEM_BASE + slug, title: problemTitle(slug), status, code: slug };
  if (detail) body.detail = String(detail);
  return body;
}
