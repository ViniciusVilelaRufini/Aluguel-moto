import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { cpfHash } from '../../common/fraud-hash';
import { loadV2Config, V2_CONFIG, type V2Config } from '../../config/v2-config';
import { Prisma, type Customer } from '@prisma/client';
import { ageOn } from '../../adapters/kyc/mock-kyc-provider';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, iso } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { KYC_PROVIDER, type KycProvider } from '../../ports/kyc-provider.port';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PUSH_NOTIFIER, type PushNotifier } from '../../ports/push-notifier.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { KycReviewDto, KycSubmitDto, KycUploadRequestDto } from './kyc.dto';

/** Validade dos links de leitura dos arquivos de KYC (LGPD: curtos; a revisão abre na hora). */
export const KYC_FILE_URL_TTL_SECONDS = 300;

export const toKycStatus = (c: Customer) =>
  compact({ status: c.kycStatus, reason: c.kycReason ?? undefined, submittedAt: iso(c.kycSubmittedAt), reviewedAt: iso(c.kycReviewedAt) });

/** KYC: upload pré-assinado no S3/MinIO, provedor atrás de interface (mock em dev), regra de 18+. */
@Injectable()
export class KycService {
  private readonly logger = new Logger('KycService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(KYC_PROVIDER) private readonly provider: KycProvider,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(PUSH_NOTIFIER) private readonly push: PushNotifier,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Optional() @Inject(V2_CONFIG) private readonly v2?: V2Config,
  ) {}

  private async customer(id: string) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw notFound('Cliente não encontrado.');
    return c;
  }

  async uploads(customerId: string, dto: KycUploadRequestDto) {
    const c = await this.customer(customerId);
    if (c.kycStatus === 'approved' || c.kycStatus === 'pending') throw conflict('conflict', 'Sua verificação já foi enviada.');
    const prefix = `kyc/${customerId}`;
    const bucket = this.cfg.buckets.kyc;
    const [documentFront, documentBack, selfie] = await Promise.all([
      presignedUpload(this.storage, bucket, `${prefix}/document-front`, dto.contentType),
      dto.withBack ? presignedUpload(this.storage, bucket, `${prefix}/document-back`, dto.contentType) : Promise.resolve(undefined),
      presignedUpload(this.storage, bucket, `${prefix}/selfie`, dto.contentType === 'application/pdf' ? 'image/jpeg' : dto.contentType),
    ]);
    return compact({ documentFront, documentBack, selfie });
  }

  async submit(customerId: string, dto: KycSubmitDto) {
    const c = await this.customer(customerId);
    if (c.kycStatus === 'approved' || c.kycStatus === 'pending') throw conflict('conflict', 'Sua verificação já foi enviada.');
    const prefix = `kyc/${customerId}/`;
    const keys = [dto.documentFrontObjectKey, dto.selfieObjectKey, dto.documentBackObjectKey].filter((k): k is string => !!k);
    if (keys.some((k) => !k.startsWith(prefix))) throw unprocessable('validation-error', 'Arquivos de verificação inválidos.');
    if (ageOn(dto.birthDate) < 18) throw unprocessable('kyc-underage', 'É preciso ter 18 anos ou mais para usar a Volti.');
    if (await this.isRestricted(dto.cpf)) {
      throw unprocessable('customer-blocked', 'Não foi possível concluir o cadastro. Fale com o suporte.');
    }
    const other = await this.prisma.customer.findFirst({ where: { cpf: dto.cpf, id: { not: customerId } }, select: { id: true } });
    const cpfTaken = () => conflict('conflict', 'Este CPF já está cadastrado em outra conta.');
    if (other) throw cpfTaken();

    // Auditoria run-4: envio condicional ao estado (dois envios concorrentes → um só vale) e com `kycSubmittedAt` novo,
    // que amarra a decisão assíncrona do provedor a este envio.
    const submittedAt = new Date();
    let res: Prisma.BatchPayload;
    try {
      res = await this.prisma.customer.updateMany({
        where: { id: customerId, kycStatus: { in: ['not_started', 'rejected'] } },
        data: {
          name: dto.fullName,
          cpf: dto.cpf,
          // Fix round 1 (I4): HMAC do CPF para prevenção a fraude (retido após a exclusão LGPD).
          cpfHash: cpfHash(dto.cpf, (this.v2 ?? loadV2Config()).fraudHashSecret),
          birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
          kycStatus: 'pending',
          kycReason: null,
          kycSubmittedAt: submittedAt,
          kycReviewedAt: null,
          kycDocumentType: dto.documentType,
          kycDocumentFrontKey: dto.documentFrontObjectKey,
          kycDocumentBackKey: dto.documentBackObjectKey ?? null,
          kycSelfieKey: dto.selfieObjectKey,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw cpfTaken();
      throw err;
    }
    if (res.count !== 1) throw conflict('conflict', 'Sua verificação já foi enviada.');
    const updated = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    // Decisão assíncrona do provedor.
    setImmediate(() => void this.decide(customerId, dto, submittedAt));
    return toKycStatus(updated);
  }

  private async decide(customerId: string, dto: KycSubmitDto, submittedAt: Date): Promise<void> {
    try {
      let result = await this.provider.verify({ customerId, ...dto });
      // Auditoria run-4: CPF incluído na lista de restrição durante a análise não é aprovado.
      if (result.decision === 'approved' && (await this.isRestricted(dto.cpf))) {
        result = { decision: 'rejected', reason: 'Não foi possível concluir o cadastro. Fale com o suporte.' };
      }
      // Só o envio que pediu a decisão (mesmo `kycSubmittedAt`, ainda `pending`) recebe o resultado.
      const res = await this.prisma.customer.updateMany({
        where: { id: customerId, kycStatus: 'pending', kycSubmittedAt: submittedAt },
        data: { kycStatus: result.decision, kycReason: result.reason ?? null, kycReviewedAt: new Date() },
      });
      if (res.count !== 1) {
        this.logger.log({ msg: 'kyc_decision_stale', customerId });
        return;
      }
      await this.push.sendToOwner(customerId, {
        title: result.decision === 'approved' ? 'Cadastro aprovado' : 'Cadastro não aprovado',
        body: result.decision === 'approved' ? 'Tudo certo. Você já pode alugar.' : 'Toque para ver o motivo.',
        // `type` é o roteamento do app do cliente (push_routing.dart); `kind` fica por compatibilidade.
        data: { type: 'kyc', kind: 'kyc', status: result.decision },
      });
      this.logger.log({ msg: 'kyc_decided', customerId, decision: result.decision });
    } catch (err) {
      this.logger.error({ msg: 'kyc_provider_failed', customerId, error: (err as Error).message });
    }
  }

  private async isRestricted(cpf: string): Promise<boolean> {
    return !!(await this.prisma.restrictionEntry.findUnique({ where: { cpf }, select: { id: true } }));
  }

  /**
   * Arquivos da verificação para a revisão manual (painel de bancada, P2-6): links de leitura pré-assinados curtos, só das chaves
   * do próprio cliente (`kyc/{id}/`). Cada consulta grava AuditLog (quais arquivos, nunca as chaves); nada de chave em log.
   */
  async files(actor: Principal, customerId: string) {
    const c = await this.customer(customerId);
    const prefix = `kyc/${customerId}/`;
    const keys = { documentFront: c.kycDocumentFrontKey, documentBack: c.kycDocumentBackKey, selfie: c.kycSelfieKey } as const;
    const out: Record<string, { url: string; expiresAt: string }> = {};
    for (const [name, key] of Object.entries(keys)) {
      if (!key || !key.startsWith(prefix)) continue;
      const signed = await this.storage.presignGet({ bucket: this.cfg.buckets.kyc, key, expiresInSeconds: KYC_FILE_URL_TTL_SECONDS });
      out[name] = { url: signed.url, expiresAt: signed.expiresAt };
    }
    await this.audit.record({ actor, action: 'customer.kyc_files_view', entityType: 'Customer', entityId: customerId, metadata: { files: Object.keys(out) } });
    return compact({ customerId, documentType: c.kycDocumentType ?? undefined, ...out });
  }

  async status(customerId: string) {
    return toKycStatus(await this.customer(customerId));
  }

  /**
   * Revisão manual. Auditoria run-4: aprovar só quem enviou (`pending`, ou `rejected` reavaliado) com CPF, nascimento e
   * documentos, 18+ e CPF fora da lista de restrição; rejeitar vale para `pending` (e revoga um `approved`). A gravação
   * é condicional ao estado lido (`kycStatus` e `kycSubmittedAt`): um envio ou decisão concorrente → 409.
   */
  async review(actor: Principal, customerId: string, dto: KycReviewDto) {
    const c = await this.customer(customerId);
    const from: Customer['kycStatus'][] = dto.decision === 'approved' ? ['pending', 'rejected'] : ['pending', 'approved'];
    if (!from.includes(c.kycStatus)) throw conflict('conflict', 'A verificação não está em um estado que permita esta decisão.');
    if (dto.decision === 'approved') {
      if (!c.cpf || !c.birthDate || !c.kycDocumentFrontKey || !c.kycSelfieKey) {
        throw unprocessable('validation-error', 'Faltam CPF, data de nascimento ou documentos para aprovar.');
      }
      if (ageOn(c.birthDate.toISOString().slice(0, 10)) < 18) throw unprocessable('kyc-underage', 'É preciso ter 18 anos ou mais para usar a Volti.');
      if (await this.isRestricted(c.cpf)) throw unprocessable('customer-blocked', 'O CPF desta conta está na lista de restrição.');
    }
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.customer.updateMany({
        where: { id: customerId, kycStatus: c.kycStatus, kycSubmittedAt: c.kycSubmittedAt },
        data: { kycStatus: dto.decision, kycReason: dto.decision === 'rejected' ? dto.reason : null, kycReviewedAt: new Date() },
      });
      if (res.count !== 1) throw conflict('conflict', 'A verificação mudou enquanto era revisada. Atualize e tente de novo.');
      await this.audit.record({ actor, action: 'customer.kyc_review', entityType: 'Customer', entityId: customerId, reason: dto.reason, metadata: { decision: dto.decision } }, tx as any);
    });
    return toKycStatus(await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } }));
  }
}
