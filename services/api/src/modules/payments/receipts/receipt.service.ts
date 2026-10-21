import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Payment, Rental } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { OBJECT_STORAGE, type ObjectStorage } from '../../../ports/object-storage.port';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../payment-state.service';
import { INVOICE_ISSUER, type InvoiceIssuer } from './invoice-issuer';

export interface ReceiptOptions {
  /** `S3_BUCKET_REPORTS` (bucket `relatorios`). */
  reportsBucket: string;
}
export const RECEIPT_OPTIONS = Symbol('RECEIPT_OPTIONS');

/** Link do PDF devolvido em `Payment.receiptUrl` (URL assinada; o objeto fica no bucket privado). */
const RECEIPT_LINK_TTL_SECONDS = 7 * 24 * 3600;

interface BreakdownLine {
  label?: string;
  description?: string;
  amountCents: number;
}
interface Breakdown {
  lines?: BreakdownLine[];
  subtotalCents?: number;
  discountCents?: number;
  insuranceCents?: number;
  feesCents?: number;
  totalCents?: number;
}

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const spDate = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(d);

/**
 * Recibo do pagamento em PDF (pdfkit) gravado no bucket de relatórios via `ObjectStorage`
 * (`recibos/<aaaa>/<mm>/<rentalId|paymentId>.pdf`) e NFS-e emitida pelo `InvoiceIssuer`. Idempotente por pagamento.
 * O PDF não leva CPF, e-mail nem trajeto (dados pessoais ficam no app, atrás de autenticação).
 */
@Injectable()
export class ReceiptService {
  private readonly logger = new Logger('ReceiptService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(INVOICE_ISSUER) private readonly invoices: InvoiceIssuer,
    @Inject(RECEIPT_OPTIONS) private readonly opts: ReceiptOptions,
  ) {}

  async issueForPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;
    const rental = payment.rentalId ? await this.prisma.rental.findUnique({ where: { id: payment.rentalId } }) : null;
    await this.ensurePdf(payment, rental);
    await this.ensureInvoice(payment);
  }

  private async ensurePdf(payment: Payment, rental: Rental | null): Promise<void> {
    if (await this.prisma.paymentReceipt.findUnique({ where: { paymentId: payment.id } })) return;
    const issuedAt = rental?.endedAt ?? payment.createdAt;
    const key = `recibos/${issuedAt.getUTCFullYear()}/${String(issuedAt.getUTCMonth() + 1).padStart(2, '0')}/${rental?.id ?? payment.id}.pdf`;
    const body = await this.render(payment, rental, issuedAt);
    await this.storage.putObject({ bucket: this.opts.reportsBucket, key, body, contentType: 'application/pdf' });
    try {
      await this.prisma.paymentReceipt.create({ data: { paymentId: payment.id, rentalId: rental?.id ?? null, bucket: this.opts.reportsBucket, objectKey: key } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
    const link = await this.storage.presignGet({ bucket: this.opts.reportsBucket, key, expiresInSeconds: RECEIPT_LINK_TTL_SECONDS });
    await this.prisma.payment.update({ where: { id: payment.id }, data: { receiptUrl: link.url } });
    this.logger.log({ msg: 'receipt_stored', paymentId: payment.id });
  }

  private async ensureInvoice(payment: Payment): Promise<void> {
    if (payment.amountCents <= 0) return;
    if (await this.prisma.invoice.findUnique({ where: { paymentId: payment.id } })) return;
    const res = await this.invoices.issue({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      serviceDescription: payment.kind === 'rental' ? 'Locação de equipamento autopropelido (Volti)' : 'Serviços Volti',
      issuedAt: new Date(),
    });
    try {
      await this.prisma.invoice.create({ data: { paymentId: payment.id, issuer: this.invoices.name, number: res.number, status: res.status, amountCents: payment.amountCents } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  private render(payment: Payment, rental: Rental | null, issuedAt: Date): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Recibo Volti', Author: 'Volti' } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const number = `VLT-${issuedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${(rental?.id ?? payment.id).slice(0, 8).toUpperCase()}`;
      doc.fontSize(20).text('Volti', { continued: false });
      doc.moveDown(0.5).fontSize(14).text('Recibo de pagamento');
      doc.moveDown().fontSize(10);
      doc.text(`Número: ${number}`);
      doc.text(`Emitido em: ${spDate(issuedAt)} (horário de Brasília)`);
      if (rental) {
        doc.text(`Plano: ${rental.planCode} · Seguro: ${rental.coverage}`);
        doc.text(`Início: ${spDate(rental.startedAt)} · Fim: ${spDate(rental.endedAt ?? issuedAt)}`);
      }
      doc.moveDown();
      const b = (rental?.breakdown as Breakdown | null) ?? null;
      for (const line of b?.lines ?? []) doc.text(`${line.label ?? line.description ?? ''}: ${brl(line.amountCents)}`);
      if (b?.discountCents) doc.text(`Desconto: -${brl(b.discountCents)}`);
      if (b?.insuranceCents) doc.text(`Seguro: ${brl(b.insuranceCents)}`);
      if (b?.feesCents) doc.text(`Taxas: ${brl(b.feesCents)}`);
      doc.moveDown().fontSize(12).text(`Total: ${brl(payment.amountCents)}`);
      doc.fontSize(10).text(`Forma de pagamento: ${payment.method}${payment.cardLast4 ? ` (final ${payment.cardLast4})` : ''}`);
      doc.moveDown().fontSize(8).text('O seguro é emitido por seguradora parceira registrada na SUSEP; a Volti atua como intermediária.');
      doc.end();
    });
  }
}
