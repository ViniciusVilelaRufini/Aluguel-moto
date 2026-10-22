import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { cpfHash } from '../../common/fraud-hash';
import { loadV2Config, V2_CONFIG, type V2Config } from '../../config/v2-config';
import type { Customer } from '@prisma/client';
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
    if (await this.prisma.restrictionEntry.findUnique({ where: { cpf: dto.cpf } })) {
      throw unprocessable('customer-blocked', 'Não foi possível concluir o cadastro. Fale com o suporte.');
    }
    const other = await this.prisma.customer.findFirst({ where: { cpf: dto.cpf, id: { not: customerId } }, select: { id: true } });
    if (other) throw conflict('conflict', 'Este CPF já está cadastrado em outra conta.');

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: dto.fullName,
        cpf: dto.cpf,
        // Fix round 1 (I4): HMAC do CPF para prevenção a fraude (retido após a exclusão LGPD).
        cpfHash: cpfHash(dto.cpf, (this.v2 ?? loadV2Config()).fraudHashSecret),
        birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
        kycStatus: 'pending',
        kycReason: null,
        kycSubmittedAt: new Date(),
        kycReviewedAt: null,
        kycDocumentType: dto.documentType,
        kycDocumentFrontKey: dto.documentFrontObjectKey,
        kycDocumentBackKey: dto.documentBackObjectKey ?? null,
        kycSelfieKey: dto.selfieObjectKey,
      },
    });
    // Decisão assíncrona do provedor.
    setImmediate(() => void this.decide(customerId, dto));
    return toKycStatus(updated);
  }

  private async decide(customerId: string, dto: KycSubmitDto): Promise<void> {
    try {
      const result = await this.provider.verify({ customerId, ...dto });
      await this.prisma.customer.updateMany({
        where: { id: customerId, kycStatus: 'pending' },
        data: { kycStatus: result.decision, kycReason: result.reason ?? null, kycReviewedAt: new Date() },
      });
      await this.push.sendToOwner(customerId, {
        title: result.decision === 'approved' ? 'Cadastro aprovado' : 'Cadastro não aprovado',
        body: result.decision === 'approved' ? 'Tudo certo. Você já pode alugar.' : 'Toque para ver o motivo.',
        data: { kind: 'kyc', status: result.decision },
      });
      this.logger.log({ msg: 'kyc_decided', customerId, decision: result.decision });
    } catch (err) {
      this.logger.error({ msg: 'kyc_provider_failed', customerId, error: (err as Error).message });
    }
  }

  async status(customerId: string) {
    return toKycStatus(await this.customer(customerId));
  }

  async review(actor: Principal, customerId: string, dto: KycReviewDto) {
    await this.customer(customerId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.customer.update({
        where: { id: customerId },
        data: { kycStatus: dto.decision, kycReason: dto.decision === 'rejected' ? dto.reason : null, kycReviewedAt: new Date() },
      });
      await this.audit.record({ actor, action: 'customer.kyc_review', entityType: 'Customer', entityId: customerId, reason: dto.reason, metadata: { decision: dto.decision } }, tx as any);
      return u;
    });
    return toKycStatus(updated);
  }
}
