// services/api/src/ports/kyc-provider.port.ts — provedor de verificação de identidade (spec §5).
export const KYC_PROVIDER = Symbol('KYC_PROVIDER');

export interface KycVerificationInput {
  customerId: string;
  fullName: string;
  cpf: string;
  birthDate: string; // YYYY-MM-DD
  documentType: 'rg' | 'cnh' | 'rne';
  documentFrontObjectKey: string;
  documentBackObjectKey?: string;
  selfieObjectKey: string;
  livenessSessionId?: string;
}

export interface KycDecisionResult {
  decision: 'approved' | 'rejected';
  reason?: string;
}

export interface KycProvider {
  verify(input: KycVerificationInput): Promise<KycDecisionResult>;
}
