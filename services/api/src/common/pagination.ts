import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { badRequest } from './problem';

/** `?cursor=&limit=` (contrato: limit 1..100, padrão 20; cursor opaco). */
export class PageQuery {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string): string | undefined {
  if (!cursor) return undefined;
  const id = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw badRequest('Cursor inválido.', [{ field: 'cursor', message: 'cursor inválido' }]);
  return id;
}

/** Argumentos de paginação por cursor do Prisma (busca `limit + 1` para saber se há próxima página). */
export function pageArgs(q: PageQuery): { take: number; skip?: number; cursor?: { id: string } } {
  const limit = q.limit ?? 20;
  const id = decodeCursor(q.cursor);
  return id ? { take: limit + 1, skip: 1, cursor: { id } } : { take: limit + 1 };
}

export function toPage<R extends { id: string }, T>(rows: R[], q: PageQuery, map: (r: R) => T): Page<T> {
  const limit = q.limit ?? 20;
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const page: Page<T> = { items: slice.map(map) };
  if (hasMore) page.nextCursor = encodeCursor(slice[slice.length - 1].id);
  return page;
}
