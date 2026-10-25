// services/api/src/ports/staff-directory.port.ts — usuários do pool interno (Cognito) a partir do painel (QA-04).
import type { StaffGroup } from '../common/enums';

export const STAFF_DIRECTORY = Symbol('STAFF_DIRECTORY');

/** Usuário interno como o diretório o conhece: `sub` (username do pool, que entra por e-mail) ou, sem ele, o e-mail. */
export interface StaffIdentity {
  sub: string | null;
  email: string;
}

/**
 * Espelha no pool interno as mudanças feitas no painel. A API autoriza pelos grupos do cadastro (∩ token), então uma
 * remoção vale na hora mesmo que o diretório falhe; aqui o pool é mantido coerente e as sessões antigas são encerradas.
 * local: no-op. aws: AdminAddUserToGroup / AdminRemoveUserFromGroup / AdminDisableUser / AdminEnableUser + AdminUserGlobalSignOut.
 */
export interface StaffDirectory {
  updateGroups(user: StaffIdentity, change: { add: StaffGroup[]; remove: StaffGroup[] }): Promise<void>;
  setActive(user: StaffIdentity, active: boolean): Promise<void>;
  /**
   * M7 (revisão final): e-mail **verificado** do usuário do pool pelo `sub` (o access token do Cognito não traz e-mail).
   * Usado só no primeiro login, para ligar o convite feito pelo painel (`POST /staff`, cadastro sem `sub`) ao usuário real.
   * local: null (o token dev já traz e-mail). aws: AdminGetUser (Username = sub).
   */
  verifiedEmail(sub: string): Promise<string | null>;
}
