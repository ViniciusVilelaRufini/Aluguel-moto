import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { StaffGroup } from '../../common/enums';
import type { AuthPool } from '../../ports/auth-verifier.port';

/** Usuário autenticado da requisição (cliente ou staff). */
export interface Principal {
  pool: AuthPool;
  sub: string;
  email: string;
  groups: StaffGroup[];
  /** Customer.id ou StaffUser.id. */
  userId: string;
  customerId?: string;
  staffId?: string;
}

export const isAdmin = (p?: Principal) => !!p && p.pool === 'staff' && p.groups.includes('admin');
export const isStaff = (p?: Principal) => !!p && p.pool === 'staff';
export const hasGroup = (p: Principal | undefined, ...groups: StaffGroup[]) =>
  !!p && p.pool === 'staff' && p.groups.some((g) => groups.includes(g));

export const AUTH_META = 'volti:auth';
export const PUBLIC_META = 'volti:public';

export interface AuthRequirement {
  pools: AuthPool[];
  /** Grupos aceitos para tokens de staff (`x-required-groups`). */
  groups: StaffGroup[];
}

/** Só clientes (`customerAuth`). */
export const CustomerOnly = () => SetMetadata(AUTH_META, { pools: ['customer'], groups: [] } satisfies AuthRequirement);
/** Só staff dos grupos indicados (`staffAuth` + `x-required-groups`). */
export const StaffOnly = (...groups: StaffGroup[]) => SetMetadata(AUTH_META, { pools: ['staff'], groups } satisfies AuthRequirement);
/** Cliente ou staff dos grupos indicados. */
export const CustomerOrStaff = (...groups: StaffGroup[]) =>
  SetMetadata(AUTH_META, { pools: ['customer', 'staff'], groups } satisfies AuthRequirement);
/** Sem autenticação. */
export const Public = () => SetMetadata(PUBLIC_META, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): Principal => {
  return ctx.switchToHttp().getRequest().principal;
});
