import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { VerifiedToken } from '../../ports/auth-verifier.port';
import type { Principal } from './principal';
import { ProblemException } from '../../common/problem';
import { deletedSubMarker } from './deleted-identity';
import { STAFF_DIRECTORY, type StaffDirectory } from '../../ports/staff-directory.port';
import { CUSTOMER_IDENTITY, type CustomerContact, type CustomerIdentityDirectory } from '../../ports/customer-identity.port';

/** Login do staff gravado no máximo a cada 5 min (o staff é resolvido a cada requisição). */
const STAFF_LOGIN_TOUCH_MS = 5 * 60_000;
/** Task 30: domínio do e-mail provisório de quem entrou sem e-mail no token (access token do Cognito). */
export const PLACEHOLDER_EMAIL_DOMAIN = '@sem-email.volti.invalid';
/** Task 30: no máximo uma consulta ao diretório por cliente com e-mail provisório a cada 10 min (por instância). */
const CONTACT_RETRY_MS = 10 * 60_000;

/**
 * Mapeia o token para o cadastro local (cria o cliente no primeiro acesso). Sem cache: uma leitura indexada por requisição,
 * para que exclusão de conta (QA-07) e mudança de grupos do staff (QA-04) valham na requisição seguinte em qualquer instância.
 * Staff: grupos efetivos = cadastro ∩ token — o painel é a fonte, mesmo com o token antigo ainda trazendo o grupo.
 * Cliente excluído: o token (sub) é recusado pelo hash guardado na exclusão, em vez de recriar uma conta.
 */
@Injectable()
export class PrincipalResolver {
  private readonly logger = new Logger('PrincipalResolver');

  /** Última consulta ao diretório por sub (cliente com e-mail provisório), para não chamar o Cognito a cada requisição. */
  private readonly contactTriedAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(STAFF_DIRECTORY) private readonly directory?: StaffDirectory,
    @Optional() @Inject(CUSTOMER_IDENTITY) private readonly customerDirectory?: CustomerIdentityDirectory,
  ) {}

  async resolve(token: VerifiedToken): Promise<Principal> {
    if (token.pool === 'staff') return this.resolveStaff(token);
    const select = { id: true, status: true, email: true, phone: true } as const;
    let customer: { id: string; status: string; email?: string | null; phone?: string | null } | null = await this.prisma.customer.findUnique({ where: { cognitoSub: token.sub }, select });
    if (!customer) {
      if (await this.prisma.customer.findUnique({ where: { cognitoSub: deletedSubMarker(token.sub) }, select: { id: true } })) {
        throw new ProblemException(401, 'unauthorized', 'Conta excluída.');
      }
      customer = await this.upsertCustomer(token);
    } else if (customer.status !== 'deleted' && customer.email?.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
      await this.completeContact(token, customer);
    }
    if (customer.status === 'deleted') throw new ProblemException(401, 'unauthorized', 'Conta excluída.');
    return { pool: 'customer', sub: token.sub, email: token.email, groups: [], userId: customer.id, customerId: customer.id };
  }

  /**
   * Task 30 (item 39): cliente que entrou só com o access token ficou com o e-mail provisório. Completa com o e-mail
   * (e o telefone, se o cadastro ainda não tem) verificados do diretório ou, em token dev, com o e-mail do token.
   */
  private async completeContact(token: VerifiedToken, customer: { id: string; phone?: string | null }): Promise<void> {
    const now = Date.now();
    const last = this.contactTriedAt.get(token.sub);
    if (!token.email && last !== undefined && now - last < CONTACT_RETRY_MS) return;
    const contact: CustomerContact | null = token.email ? { email: token.email } : await this.directoryContact(token.sub);
    if (!contact?.email) return;
    try {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { email: contact.email, ...(contact.phone && !customer.phone ? { phone: contact.phone } : {}) },
      });
      this.contactTriedAt.delete(token.sub);
      this.logger.log({ msg: 'customer_contact_completed', customerId: customer.id });
    } catch (err) {
      this.logger.warn({ msg: 'customer_contact_update_failed', customerId: customer.id, error: (err as { code?: string }).code ?? 'unknown' });
    }
  }

  /** Falha do diretório não impede o login (fica o e-mail provisório e tenta de novo depois). Nada de contato no log. */
  private async directoryContact(sub: string): Promise<CustomerContact | null> {
    if (!this.customerDirectory) return null;
    this.contactTriedAt.set(sub, Date.now());
    try {
      return await this.customerDirectory.contactInfo(sub);
    } catch (err) {
      this.logger.warn({ msg: 'customer_directory_lookup_failed', error: (err as { name?: string }).name ?? 'unknown' });
      return null;
    }
  }

  /**
   * Staff: lido do banco a cada requisição. O token não regrava mais `StaffUser.groups` (antes o `PATCH` era desfeito na
   * requisição seguinte do próprio usuário). Primeiro acesso de um usuário do pool sem cadastro: criado com os grupos do token.
   */
  private async resolveStaff(token: VerifiedToken): Promise<Principal> {
    const select = { id: true, active: true, groups: true, cognitoSub: true, lastLoginAt: true } as const;
    // QA-17: casa pelo sub. O e-mail só liga um cadastro ainda sem sub (criado pelo painel antes do primeiro login) e só
    // existe em tokens dev; o access token do Cognito não traz e-mail, e o `username` nunca é usado como e-mail.
    // M7 (revisão final): sem e-mail no token (Cognito), o e-mail verificado vem do pool pelo sub (AdminGetUser), só
    // quando o sub ainda não tem cadastro — uma vez por usuário, no primeiro login.
    let existing = await this.prisma.staffUser.findUnique({ where: { cognitoSub: token.sub }, select });
    let email = token.email;
    if (!existing) {
      if (!email) email = (await this.directoryEmail(token.sub)) ?? '';
      if (email) existing = await this.prisma.staffUser.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, cognitoSub: null }, select });
    }
    if (!existing) {
      try {
        const created = await this.prisma.staffUser.create({
          data: {
            cognitoSub: token.sub,
            email: email || `${token.sub}@staff.volti.invalid`,
            // Task 30 (item 38): nada derivado do e-mail ou do sub (o cliente veria); o nome é cadastrado no painel.
            name: '',
            groups: token.groups,
            lastLoginAt: new Date(),
          },
          select: { id: true },
        });
        return { pool: 'staff', sub: token.sub, email: token.email, groups: [...token.groups], userId: created.id, staffId: created.id };
      } catch (err) {
        // QA-08 (resto): requisições paralelas no primeiro acesso → relê o cadastro criado pela concorrente.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
        existing = await this.prisma.staffUser.findUnique({ where: { cognitoSub: token.sub }, select });
        if (!existing) throw err;
      }
    }
    if (!existing.active) throw new ProblemException(403, 'forbidden', 'Usuário interno desativado.');
    const now = Date.now();
    if (existing.cognitoSub !== token.sub || !existing.lastLoginAt || now - existing.lastLoginAt.getTime() > STAFF_LOGIN_TOUCH_MS) {
      await this.prisma.staffUser.update({ where: { id: existing.id }, data: { cognitoSub: token.sub, lastLoginAt: new Date(now) } });
    }
    const groups = existing.groups.filter((g) => token.groups.includes(g));
    return { pool: 'staff', sub: token.sub, email: token.email, groups, userId: existing.id, staffId: existing.id };
  }

  /** Falha do diretório não impede o login: o usuário entra como cadastro novo com os grupos do token (como antes). */
  private async directoryEmail(sub: string): Promise<string | null> {
    if (!this.directory) return null;
    try {
      return await this.directory.verifiedEmail(sub);
    } catch (err) {
      this.logger.warn({ msg: 'staff_directory_lookup_failed', error: (err as Error).message });
      return null;
    }
  }

  /**
   * QA-08: primeiro acesso com requisições paralelas (o app abre várias telas juntas) disputava o upsert e respondia 409.
   * O upsert do Prisma não é atômico: em violação de unicidade, relê o cadastro criado pela requisição concorrente.
   */
  private async upsertCustomer(token: VerifiedToken): Promise<{ id: string; status: string }> {
    const where = { cognitoSub: token.sub };
    const select = { id: true, status: true } as const;
    // Task 30 (item 39): sem e-mail no token, o contato verificado vem do diretório; senão, o provisório.
    const contact = token.email ? null : await this.directoryContact(token.sub);
    const email = token.email || contact?.email || `${token.sub}${PLACEHOLDER_EMAIL_DOMAIN}`;
    try {
      return await this.prisma.customer.upsert({
        where,
        create: { cognitoSub: token.sub, email, ...(contact?.phone ? { phone: contact.phone } : {}) },
        update: {},
        select,
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      return this.prisma.customer.findUniqueOrThrow({ where, select });
    }
  }
}
