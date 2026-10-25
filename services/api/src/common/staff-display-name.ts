/** Rótulo neutro quando o membro da equipe não tem nome cadastrado (nunca derivado do e-mail). */
export const STAFF_FALLBACK_NAME = 'Equipe Volti';

/**
 * Task 30 (item 38): como o cliente vê um membro da equipe — só o primeiro nome cadastrado; sem nome (cadastro criado
 * no primeiro login, sem nome) ou com algo que pareça e-mail, "Equipe Volti".
 */
export function staffFirstName(name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && !first.includes('@') ? first : STAFF_FALLBACK_NAME;
}
