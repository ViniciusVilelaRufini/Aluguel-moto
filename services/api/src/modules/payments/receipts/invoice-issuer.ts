import { randomUUID } from 'node:crypto';

/** Emissão de NFS-e (prefeitura de São Paulo ou agregador). `INVOICE_ISSUER=mock` em dev e testes. */
export const INVOICE_ISSUER = Symbol('INVOICE_ISSUER');

export interface InvoiceRequest {
  paymentId: string;
  amountCents: number;
  /** Discriminação do serviço (sem dados pessoais além do necessário para a nota). */
  serviceDescription: string;
  issuedAt: Date;
}

export interface InvoiceIssuer {
  readonly name: string;
  issue(input: InvoiceRequest): Promise<{ number: string; status: 'issued' | 'pending' }>;
}

export class MockInvoiceIssuer implements InvoiceIssuer {
  readonly name = 'mock';
  readonly issued: InvoiceRequest[] = [];

  async issue(input: InvoiceRequest) {
    this.issued.push(input);
    return { number: `NFSE-MOCK-${randomUUID().slice(0, 8).toUpperCase()}`, status: 'issued' as const };
  }
}
