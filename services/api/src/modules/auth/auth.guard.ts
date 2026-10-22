import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemException } from '../../common/problem';
import { AUTH_VERIFIER, type AuthVerifier } from '../../ports/auth-verifier.port';
import { AUTH_META, AuthRequirement, PUBLIC_META } from './principal';
import { PrincipalResolver } from './principal-resolver.service';

export function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Guard global. Seguro por padrão: rota sem `@Public()` e sem requisito de auth é negada.
 * Token ausente/inválido → 401; pool ou grupo errado → 403 (`x-required-groups`).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_VERIFIER) private readonly verifier: AuthVerifier,
    private readonly resolver: PrincipalResolver,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_META, targets)) return true;
    const req = this.reflector.getAllAndOverride<AuthRequirement>(AUTH_META, targets);
    if (!req) throw new ProblemException(403, 'forbidden', 'Rota sem política de acesso.');

    const request = ctx.switchToHttp().getRequest();
    const token = bearerToken(request.headers?.authorization);
    if (!token) throw new ProblemException(401, 'unauthorized', 'Envie o token no cabeçalho Authorization.');
    let verified;
    try {
      verified = await this.verifier.verify(token);
    } catch {
      throw new ProblemException(401, 'unauthorized', 'Token inválido ou expirado.');
    }
    if (!req.pools.includes(verified.pool)) {
      throw new ProblemException(403, 'forbidden', 'Este recurso não está disponível para o seu tipo de conta.');
    }
    // Pré-filtro barato pelo token; a decisão vale pelos grupos atuais do cadastro (QA-04: grupo removido no painel).
    const denied = () => new ProblemException(403, 'forbidden', 'Seu grupo não tem acesso a este recurso.');
    if (verified.pool === 'staff' && !verified.groups.some((g) => req.groups.includes(g))) throw denied();
    const principal = await this.resolver.resolve(verified);
    if (principal.pool === 'staff' && !principal.groups.some((g) => req.groups.includes(g))) throw denied();
    request.principal = principal;
    return true;
  }
}
