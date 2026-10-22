/**
 * QA-10: CORS por lista de origens. `CORS_ORIGINS` (separadas por vírgula; ex.: o domínio CloudFront do painel) vale em
 * qualquer ambiente; sem ela, fora de produção só `localhost`/`127.0.0.1` (painel em dev) e, em produção, nenhuma origem.
 * Sem credenciais: o token vai no `Authorization`, nunca em cookie. Os apps móveis não usam CORS.
 */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const list = allowedOrigins();
  if (list.length) return list.includes(origin);
  return process.env.NODE_ENV !== 'production' && LOCAL_ORIGIN.test(origin);
}

type OriginCallback = (err: Error | null, allow?: boolean) => void;

/** Opções para `app.enableCors` e para o Socket.IO (`@WebSocketGateway({ cors })`); a lista é lida a cada requisição. */
export function corsOptions() {
  return {
    origin: (origin: string | undefined, cb: OriginCallback) => cb(null, isAllowedOrigin(origin)),
    credentials: false,
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'Idempotent-Replayed'],
  };
}
