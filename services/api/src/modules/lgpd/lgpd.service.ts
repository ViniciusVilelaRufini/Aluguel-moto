import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { TrackPoint } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { conflict, notFound } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { PrincipalResolver } from '../auth/principal-resolver.service';
import { toConsents, toCustomer } from '../customers/customers.mapper';
import { toPayment, toWalletEntry } from '../payments/payments.mapper';
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
    @Optional() private readonly resolver?: PrincipalResolver,
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
      payments: payments.map(toPayment),
      tracks,
      walletEntries: walletEntries.map(toWalletEntry),
      incidents: incidents.map(toIncident),
      disputes: disputes.map(toDispute),
      claims: claims.map(toClaim),
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

    const kycKeys = [customer.kycDocumentFrontKey, customer.kycDocumentBackKey, customer.kycSelfieKey].filter((k): k is string => !!k);
    const rentals = await this.prisma.rental.findMany({ where: { customerId }, select: { id: true } });
    const rentalIds = rentals.map((r) => r.id);

    await this.prisma.$transaction(async (tx) => {
      if (rentalIds.length) await tx.trackPoint.deleteMany({ where: { rentalId: { in: rentalIds } } });
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
          cognitoSub: `deleted:${customerId}`,
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
    });

    // QA-07: sem isso o token do titular continuava valendo por até 30 s (cache do resolver) sobre o cadastro anonimizado,
    // inclusive para gravar nome/telefone de volta (PATCH /me).
    this.resolver?.invalidate();

    for (const key of kycKeys) {
      try {
        await this.storage.deleteObject({ bucket: this.cfg.buckets.kyc, key });
      } catch (err) {
        this.logger.warn({ msg: 'kyc_object_delete_failed', customerId, error: (err as Error).message });
      }
    }
    this.logger.log({ msg: 'account_anonymized', customerId });
    return { status: 'completed' as const, requestedAt: requestedAt.toISOString(), completedAt: new Date().toISOString() };
  }

  /** Apaga pontos de trajeto expirados (`expiresAt < now`). */
  async purgeExpiredTracks(): Promise<number> {
    const res = await this.prisma.trackPoint.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return res.count;
  }

  /** Job diário (03:30 em São Paulo). */
  @Cron('30 3 * * *', { name: 'purge-expired-tracks', timeZone: 'America/Sao_Paulo' })
  async purgeJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const count = await this.purgeExpiredTracks();
    this.logger.log({ msg: 'expired_tracks_purged', count });
  }
}
