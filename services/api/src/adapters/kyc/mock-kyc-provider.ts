import type { KycDecisionResult, KycProvider, KycVerificationInput } from '../../ports/kyc-provider.port';

/** Idade em anos completos numa data de referência (UTC). */
export function ageOn(birthDate: string, ref: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = ref.getUTCFullYear() - y;
  const beforeBirthday = ref.getUTCMonth() + 1 < m || (ref.getUTCMonth() + 1 === m && ref.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** `KYC_PROVIDER=mock` (spec §5): aprova se 18+; CPF terminado em `00` reprova. */
export class MockKycProvider implements KycProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async verify(input: KycVerificationInput): Promise<KycDecisionResult> {
    if (input.cpf.endsWith('00')) return { decision: 'rejected', reason: 'Documento não confere com o CPF informado.' };
    if (ageOn(input.birthDate, this.now()) < 18) return { decision: 'rejected', reason: 'É preciso ter 18 anos ou mais.' };
    return { decision: 'approved' };
  }
}
