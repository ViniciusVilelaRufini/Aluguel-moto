import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { cpfHash } from '../../common/fraud-hash';
import { loadV2Config, V2_CONFIG, type V2Config } from '../../config/v2-config';
import { SubscriptionsService } from '../payments/subscriptions.service';
import { Cron, Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type CustomerConsentChangedEvent, type LgpdIdentityDeletionFailedEvent, type PrincipalRevokedEvent } from '../../common/events';

/** Tentativas de excluir a identidade no Cognito antes do alerta de revisão manual. */
export const MAX_IDENTITY_DELETION_ATTEMPTS = 10;
import type { Prisma, TrackPoint } from '@prisma/client';
import { compact, iso } from '../../common/util';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { conflict, notFound } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { CUSTOMER_IDENTITY, type CustomerIdentityDirectory } from '../../ports/customer-identity.port';
import { deletedSubMarker } from '../auth/deleted-identity';
import { toConsents, toCustomer } from '../customers/customers.mapper';
import { toPayment, toSubscription, toWalletEntry } from '../payments/payments.mapper';
import { toCustomerCoupon, toReferralReward } from '../referrals/referrals.service';
import { toRental } from '../rentals/rentals.mapper';
import { toClaim, toDispute, toIncident } from '../support/support.mapper';

export interface ConsentsInput {
  termsVersion: string;
  termsAccepted: boolean;
  locationTracking: boolean;
  marketing: boolean;
}

/** LGPD: consentimentos, exportação (só do titular), exclusão/anonimização e expiração de trajetos (90 dias). */
@Injectable()
export class LgpdService {
  private readonly logger = new Logger('LgpdService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    /** Fix round 2 (M10): obrigatório — a exclusão sempre fecha a assinatura (e agenda o cancelamento no gateway). */
    private readonly subscriptions: SubscriptionsService,
    @Optional() @Inject(CUSTOMER_IDENTITY) private readonly identity?: CustomerIdentityDirectory,
    @Optional() private readonly events?: EventEmitter2,
    @Optional() @Inject(V2_CONFIG) private readonly v2?: V2Config,
  ) {}

  private async customer(customerId: string) {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) throw notFound('Cliente não encontrado.');
    return c;
  }

  async getConsents(customerId: string) {
    return toConsents(await this.customer(customerId));
  }

  async updateConsents(customerId: string, input: ConsentsInput) {
    const current = await this.customer(customerId);
    const now = new Date();
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        termsVersion: input.termsVersion,
        termsAccepted: input.termsAccepted,
        termsAcceptedAt: input.termsAccepted && (!current.termsAccepted || current.termsVersion !== input.termsVersion) ? now : current.termsAcceptedAt,
        locationConsent: input.locationTracking,
        locationConsentUpdatedAt: input.locationTracking !== current.locationConsent ? now : (current.locationConsentUpdatedAt ?? now),
        marketingConsent: input.marketing,
        consentsUpdatedAt: now,
      },
    });
    if (input.locationTracking !== current.locationConsent) {
      this.events?.emit(EV.CUSTOMER_CONSENT_CHANGED, { customerId, locationTracking: input.locationTracking } satisfies CustomerConsentChangedEvent);
    }
    return toConsents(updated);
  }

  /** Exporta todos os dados pessoais do próprio cliente — toda consulta é filtrada pelo id do titular. */
  async export(customerId: string) {
    const customer = await this.customer(customerId);
    const where = { customerId };
    const [rentals, payments, walletEntries, incidents, disputes, claims] = await Promise.all([
      this.prisma.rental.findMany({ where, include: { vehicle: { select: { code: true } } }, orderBy: { startedAt: 'desc' } }),
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletEntry.findMany({ where, orderBy: { createdAt: 'desc' } }),
      this.prisma.incident.findMany({ where, orderBy: { createdAt: 'desc' } }),
      this.prisma.dispute.findMany({ where, orderBy: { createdAt: 'desc' } }),
      this.prisma.claim.findMany({ where, orderBy: { createdAt: 'desc' } }),
    ]);
    const rentalIds = rentals.map((r) => r.id);
    const points = rentalIds.length
      ? await this.prisma.trackPoint.findMany({ where: { rentalId: { in: rentalIds }, expiresAt: { gt: new Date() } }, orderBy: { recordedAt: 'asc' } })
      : [];
    const byRental = new Map<string, TrackPoint[]>();
    for (const p of points) {
      if (!p.rentalId) continue;
      byRental.set(p.rentalId, [...(byRental.get(p.rentalId) ?? []), p]);
    }
    const tracks = rentals
      .filter((r) => byRental.has(r.id))
      .map((r) => ({
        rentalId: r.id,
        vehicleId: r.vehicleId,
        points: byRental.get(r.id)!.map((p) => ({ lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, recordedAt: p.recordedAt.toISOString() })),
      }));
    return {
      generatedAt: new Date().toISOString(),
      customer: toCustomer(customer, { fullCpf: true }),
      consents: toConsents(customer),
      rentals: rentals.map((r) => toRental(r)),
      payments: payments.map((p) => toPayment(p)),
      tracks,
      walletEntries: walletEntries.map(toWalletEntry),
      incidents: incidents.map(toIncident),
      disputes: disputes.map(toDispute),
      claims: claims.map(toClaim),
      ...(await this.exportV2(customerId, customer.referralCode)),
      ...(await this.exportDepot(customerId, rentalIds)),
    };
  }

  /**
   * Retirada em galpão: reservas de galpão (sem `pickupCode`) e entregas do titular (pelas reservas dele ou pelos aluguéis
   * dele). Fotos só como chaves, nunca links assinados.
   */
  private async exportDepot(customerId: string, rentalIds: string[]) {
    const handoverWhere: Prisma.HandoverWhereInput[] = [{ reservation: { customerId } }];
    if (rentalIds.length) handoverWhere.push({ rentalId: { in: rentalIds } });
    const [reservations, handovers] = await Promise.all([
      this.prisma.reservation.findMany({ where: { customerId, depotId: { not: null } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.handover.findMany({ where: { OR: handoverWhere }, include: { vehicle: { select: { code: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      depotReservations: reservations.map((r) =>
        compact({
          id: r.id, vehicleId: r.vehicleId, status: r.status, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(),
          depotId: r.depotId ?? undefined, pickupMode: r.pickupMode ?? undefined, pickupAt: iso(r.pickupAt), planCode: r.planCode ?? undefined,
          coverage: r.coverage ?? undefined, depositMethod: r.depositMethod ?? undefined,
        }),
      ),
      handovers: handovers.map((h) =>
        compact({
          id: h.id, type: h.type, status: h.status, depotId: h.depotId, reservationId: h.reservationId ?? undefined, rentalId: h.rentalId ?? undefined,
          vehicleId: h.vehicleId, vehicleCode: h.vehicle?.code, operatorId: h.operatorId, checklist: h.checklist, photoKeys: h.photoKeys,
          batteryPct: h.batteryPct, batterySerial: h.batterySerial ?? undefined, disputeReason: h.disputeReason ?? undefined,
          createdAt: h.createdAt.toISOString(), respondedAt: iso(h.respondedAt),
        }),
      ),
    };
  }

  /** Fix round 1 (M10): assinaturas, cupons salvos, indicações feitas e manutenções agendadas. */
  private async exportV2(customerId: string, referralCode: string | null) {
    const now = new Date();
    const [subscriptions, coupons, used, referrals, maintenance] = await Promise.all([
      this.prisma.subscription.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.customerCoupon.findMany({ where: { customerId }, include: { coupon: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.couponRedemption.groupBy({ by: ['couponId'], where: { customerId }, _count: { _all: true } }),
      this.prisma.referral.findMany({ where: { referrerId: customerId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.maintenanceTask.findMany({ where: { customerId, source: 'customer' }, include: { vehicle: { select: { code: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    const usedBy = new Map(used.map((u) => [u.couponId, u._count._all]));
    const names = await this.prisma.customer.findMany({ where: { id: { in: referrals.map((r) => r.refereeId) } }, select: { id: true, name: true } });
    const nameBy = new Map(names.map((n) => [n.id, n.name]));
    const location = (this.v2 ?? loadV2Config()).maintenanceLocation;
    return {
      subscriptions: subscriptions.map((x) => toSubscription(x)),
      coupons: coupons.map((c) => toCustomerCoupon(c, usedBy.get(c.couponId) ?? 0, now)),
      referrals: referrals.map((r) => toReferralReward(r, nameBy.get(r.refereeId))),
      ...(referralCode ? { referralCode } : {}),
      maintenanceRequests: maintenance.map((m) => ({
        id: m.id, vehicleId: m.vehicleId, vehicleCode: m.vehicle?.code ?? '', status: m.status, scheduledFor: (m.scheduledFor ?? m.createdAt).toISOString(),
        location, description: m.description ?? m.title, createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Anonimiza nome, CPF, e-mail e telefone, apaga trajetos e documentos de KYC e mantém pagamentos e notas
   * (obrigação legal). Bloqueado com aluguel em andamento ou débito pendente.
   */
  async deleteAccount(customerId: string) {
    const requestedAt = new Date();
    const customer = await this.customer(customerId);
    const open = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } } });
    const pendingDebts = await this.prisma.payment.count({ where: { customerId, status: { in: ['failed', 'pending'] }, kind: { in: ['rental', 'fee'] } } });
    if (open || customer.delinquent || pendingDebts > 0) {
      throw conflict('account-deletion-blocked', 'Encerre o aluguel e regularize os pagamentos antes de excluir a conta.');
    }

    // M10: fecha a assinatura aberta e libera a moto fixa; o cancelamento no gateway fica pendente e retentável se falhar.
    await this.subscriptions.closeForAccountDeletion(customerId);

    const kycKeys = [customer.kycDocumentFrontKey, customer.kycDocumentBackKey, customer.kycSelfieKey].filter((k): k is string => !!k);
    const rentals = await this.prisma.rental.findMany({ where: { customerId }, select: { id: true, returnPhotoObjectKey: true, returnPhotoUploadKey: true } });
    const rentalIds = rentals.map((r) => r.id);
    // QA-14: a foto de devolução pode identificar o titular (rosto, casa); sai junto com a conta.
    const photoKeys = [...new Set(rentals.flatMap((r) => [r.returnPhotoObjectKey, r.returnPhotoUploadKey]).filter((k): k is string => !!k))];

    await this.prisma.$transaction(async (tx) => {
      if (rentalIds.length) await tx.trackPoint.deleteMany({ where: { rentalId: { in: rentalIds } } });
      // QA-12: a posição de início é localização ligada ao titular.
      await tx.rental.updateMany({ where: { customerId }, data: { startLat: null, startLng: null, returnPhotoObjectKey: null, returnPhotoUploadKey: null } });
      await tx.device.deleteMany({ where: { ownerId: customerId } });
      await tx.customer.update({
        where: { id: customerId },
        data: {
          name: 'Cliente removido',
          email: `anon-${customerId}@removido.volti.invalid`,
          phone: null,
          cpf: null,
          birthDate: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          // Fix round 1 (I4): o HMAC do CPF fica (prevenção a fraude, docs/decisoes.md); o CPF em claro sai.
          cpfHash: customer.cpfHash ?? (customer.cpf ? cpfHash(customer.cpf, (this.v2 ?? loadV2Config()).fraudHashSecret) : null),
          // Contrato v2: chave Pix de estorno e código de indicação são dados pessoais.
          pixRefundKey: null,
          pixRefundKeyType: null,
          referralCode: null,
          // QA-07: só o hash do sub, para recusar o token antigo sem guardar o identificador.
          cognitoSub: customer.cognitoSub.startsWith('deleted:') ? customer.cognitoSub : deletedSubMarker(customer.cognitoSub),
          kycDocumentFrontKey: null,
          kycDocumentBackKey: null,
          kycSelfieKey: null,
          kycReason: null,
          marketingConsent: false,
          locationConsent: false,
          status: 'deleted',
          deletedAt: requestedAt,
        },
      });
      // Fix round 1: a exclusão no Cognito fica registrada na mesma transação; o job refaz se falhar (ou se o processo cair).
      if (!customer.cognitoSub.startsWith('deleted:')) {
        await tx.customerIdentityDeletion.upsert({ where: { customerId }, create: { customerId, sub: customer.cognitoSub }, update: {} });
      }
    });

    // QA-07: a identidade sai do pool de clientes e as sessões são encerradas. Falha só é registrada: o token antigo já é
    // recusado pelo hash do sub (PrincipalResolver, sem cache) e a exclusão no pool pode ser refeita.
    if (!customer.cognitoSub.startsWith('deleted:')) await this.attemptIdentityDeletion({ customerId, sub: customer.cognitoSub, attempts: 0 });

    for (const key of kycKeys) {
      try {
        await this.storage.deleteObject({ bucket: this.cfg.buckets.kyc, key });
      } catch (err) {
        this.logger.warn({ msg: 'kyc_object_delete_failed', customerId, error: (err as Error).message });
      }
    }
    for (const key of photoKeys) {
      try {
        await this.storage.deleteObject({ bucket: this.cfg.buckets.returnPhotos, key });
      } catch (err) {
        this.logger.warn({ msg: 'return_photo_delete_failed', customerId, error: (err as Error).message });
      }
    }
    this.events?.emit(EV.PRINCIPAL_REVOKED, { pool: 'customer', userId: customerId } satisfies PrincipalRevokedEvent);
    this.logger.log({ msg: 'account_anonymized', customerId });
    return { status: 'completed' as const, requestedAt: requestedAt.toISOString(), completedAt: new Date().toISOString() };
  }

  /**
   * Fix round 1 (QA-07): exclui a identidade no pool; sucesso apaga a pendência (e o `sub` guardado), falha conta tentativa.
   * Esgotadas as tentativas → alerta: evento `lgpd.identity-deletion-failed` + log de erro para revisão manual.
   */
  private async attemptIdentityDeletion(row: { customerId: string; sub: string; attempts: number }): Promise<void> {
    if (!this.identity) return;
    try {
      await this.identity.deleteIdentity(row.sub);
      await this.quiet(() => this.prisma.customerIdentityDeletion.delete({ where: { customerId: row.customerId } }));
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      const updated = await this.quiet(() =>
        this.prisma.customerIdentityDeletion.update({ where: { customerId: row.customerId }, data: { attempts: { increment: 1 }, lastError: message } }),
      );
      const attempts = updated?.attempts ?? row.attempts + 1;
      this.logger.warn({ msg: 'customer_identity_delete_failed', customerId: row.customerId, attempts, error: message });
      if (attempts >= MAX_IDENTITY_DELETION_ATTEMPTS) {
        this.logger.error({ msg: 'lgpd_identity_deletion_needs_manual_review', customerId: row.customerId, attempts });
        this.events?.emit(EV.LGPD_IDENTITY_DELETION_FAILED, { customerId: row.customerId, attempts } satisfies LgpdIdentityDeletionFailedEvent);
      }
    }
  }

  private async quiet<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return (await fn()) ?? null;
    } catch {
      return null;
    }
  }

  /** Retentativa das exclusões de identidade pendentes (a cada 5 min). */
  async retryIdentityDeletions(): Promise<void> {
    const pending = await this.prisma.customerIdentityDeletion.findMany({ where: { attempts: { lt: MAX_IDENTITY_DELETION_ATTEMPTS } }, orderBy: { updatedAt: 'asc' }, take: 50 });
    for (const row of pending) await this.attemptIdentityDeletion(row);
  }

  @Interval('lgpd-identity-deletion-retry', 5 * 60_000)
  async identityRetryJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.retryIdentityDeletions().catch((err) => this.logger.error({ msg: 'identity_deletion_retry_failed', error: (err as Error).message }));
  }

  /** Apaga pontos de trajeto expirados (`expiresAt < now`). */
  async purgeExpiredTracks(): Promise<number> {
    const res = await this.prisma.trackPoint.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return res.count;
  }

  /** QA-12: posição de início dos aluguéis segue a retenção dos trajetos (TRACK_RETENTION_DAYS). */
  async purgeExpiredStartLocations(): Promise<number> {
    const cutoff = new Date(Date.now() - this.cfg.trackRetentionDays * 86_400_000);
    const res = await this.prisma.rental.updateMany({ where: { startedAt: { lt: cutoff }, startLat: { not: null } }, data: { startLat: null, startLng: null } });
    return res.count;
  }

  /** Job diário (03:30 em São Paulo). */
  @Cron('30 3 * * *', { name: 'purge-expired-tracks', timeZone: 'America/Sao_Paulo' })
  async purgeJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const count = await this.purgeExpiredTracks();
    const startLocations = await this.purgeExpiredStartLocations();
    this.logger.log({ msg: 'expired_tracks_purged', count, startLocations });
  }
}
