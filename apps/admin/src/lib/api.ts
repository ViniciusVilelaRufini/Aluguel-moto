import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '@volti/contracts';
import { API_BASE_URL } from './config';
import { getToken, setToken } from './token-store';

export class ApiError extends Error {
  status: number;
  slug?: string;
  constructor(status: number, message: string, slug?: string) {
    super(message);
    this.status = status;
    this.slug = slug;
  }
}

const auth: Middleware = {
  onRequest({ request }) {
    const t = getToken();
    if (t) request.headers.set('Authorization', `Bearer ${t}`);
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      setToken(null);
      window.location.assign('/login/');
    }
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: API_BASE_URL });
api.use(auth);

const SLUG_MESSAGES: Record<string, string> = {
  'zone-speed-limit-required': 'Informe o limite de velocidade da zona',
  'zone-speed-limit-invalid': 'Máximo de 20 km/h em zona de velocidade reduzida',
  'speed-limit-out-of-range': 'Máximo de 32 km/h',
  'force-end-outside-zone-requires-admin': 'Só o admin pode encerrar fora da zona de devolução',
  // Contrato v2
  'vehicle-unavailable': 'Moto indisponível: em uso ou fixa de outro assinante',
  'subscription-required': 'O cliente não tem plano semanal ou mensal ativo',
  'maintenance-slot-unavailable': 'Horário de manutenção indisponível',
  'pix-key-invalid': 'Chave Pix inválida',
};

interface ProblemLike {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
}

export function problemMessage(error: unknown, status: number): { message: string; slug?: string } {
  const p = (error ?? {}) as ProblemLike;
  const slug = p.type?.split('/').pop();
  const message = (slug && SLUG_MESSAGES[slug]) || p.detail || p.title || `Erro ${status}`;
  return { message, slug };
}

/** Desembrulha `{ data, error }` do openapi-fetch; lança `ApiError` com a mensagem do problema RFC 7807. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const r = await p;
  if (r.error !== undefined || r.data === undefined) {
    if (r.response.ok) return undefined as T;
    const { message, slug } = problemMessage(r.error, r.response.status);
    throw new ApiError(r.response.status, message, slug);
  }
  return r.data;
}

/** Baixa um CSV (`format=csv`) com o token e abre o download no navegador. */
export async function downloadCsv(path: string, query: Record<string, string>, filename: string): Promise<void> {
  const qs = new URLSearchParams({ ...query, format: 'csv' }).toString();
  const res = await fetch(`${API_BASE_URL}${path}?${qs}`, { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
  if (!res.ok) throw new ApiError(res.status, `Erro ${res.status} ao exportar`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}

/** Relatórios aceitam `format=csv` e por isso o tipo gerado é `T | string`; no JSON é sempre `T`. */
export function asJson<T>(v: T): Exclude<T, string> {
  return v as Exclude<T, string>;
}
