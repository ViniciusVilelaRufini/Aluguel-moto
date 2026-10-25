/** Task 30: nome de quem é da equipe no painel — o cadastrado ou, sem nome (criado no primeiro login), o e-mail. */
export function staffLabel(s: { name?: string | null; email: string }): string {
  return s.name?.trim() || s.email;
}
