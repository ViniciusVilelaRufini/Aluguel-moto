import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PricingPlan } from '@prisma/client';
import type { InsuranceCoverage } from '../../common/enums';
import { EV, HandoverUpdatedEvent } from '../../common/events';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from '../../common/idempotency/idempotency.store';
import { badRequest, conflict, notFound, ProblemException } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { InsuranceService } from '../insurance/insurance.service';
import { buildCounterQuote, COUNTER_QUANTITY_MAX, counterPeriodSeconds, counterSnapshot, type CounterPlanCode, type CounterQuote } from '../pricing/counter-pricing';
import { type PlanUnit, PricingService } from '../pricing/pricing.service';
import { RentalStartService } from '../rentals/rental-start.service';
import { toRental } from '../rentals/rentals.mapper';
import type { CounterCheckoutDto } from './counter-checkout.dto';
import { ACCEPT_LOCK_SCOPE, acceptError } from './handovers.service';

const QUANTITY_LABEL: Record<CounterPlanCode, string> = { day: 'diária até 30', weekly: 'semana até 4', monthly: 'mês até 3' };

const handoverNotFound = () => notFound('Entrega não encontrada.');
const notPending = () => new ProblemException(422, 'handover-not-pending', 'Esta entrega não está mais aguardando o seu aceite.', undefined, 'Entrega não está pendente');
const photosRequired = () =>
  new ProblemException(422, 'contract-photos-required', 'Fotografe o contrato assinado (1 a 4 fotos).', undefined, 'Fotos do contrato obrigatórias');
const amountMismatch = () =>
  new ProblemException(422, 'counter-amount-mismatch', 'O valor não confere com o calculado. Atualize o valor e tente de novo.', undefined, 'Valor não confere');
/** Consentimento revogado depois da pré-reserva: o atendente pede ao cliente (o `403` do início vira `422`). */
const consentRequired = () =>
  new ProblemException(422, 'location-consent-required', 'Peça ao cliente para permitir a localização no app.', undefined, 'Consentimento de localização necessário');

/**
 * Balcão do galpão (pré-reserva/balcão): cotação do plano pré-pago e checkout (contrato + pagamento) que inicia o aluguel
 * pelo caminho único `RentalStartService.start()` com `counter`. Logs e auditoria só com ids e valores.
 */
@Injectable()
export class CounterCheckoutService {
  private readonly logger = new Logger('CounterCheckoutService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly insurance: InsuranceService,
    private readonly starter: RentalStartService,
    @Inject(IDEMPOTENCY_STORE) private readonly locks: IdempotencyStore,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  /** `getHandoverCounterQuote`: plano × quantidade + seguro único; só entrega `pickup` (senão 404). */
  async quote(handoverId: string, q: { planCode: CounterPlanCode; coverage: InsuranceCoverage; quantity: number }): Promise<CounterQuote> {
    const h = await this.prisma.handover.findUnique({ where: { id: handoverId }, select: { id: true, type: true } });
    if (!h || h.type !== 'pickup') throw handoverNotFound();
    return (await this.computeQuote(q)).quote;
  }

  /**
   * `counterCheckoutHandover`: entrega de saída `pending_customer` → aluguel iniciado com o pré-pago e a caução do balcão.
   * Já `accepted` com aluguel → o mesmo aluguel (convergência); checkout da mesma entrega em andamento → `409 conflict`.
   * `opts.test`: atalho do app de teste (sem fotos do contrato).
   */
  async checkout(actor: Principal, handoverId: string, dto: CounterCheckoutDto, opts: { test?: boolean } = {}): Promise<ReturnType<typeof toRental>> {
    const h = await this.prisma.handover.findUnique({ where: { id: handoverId }, include: { reservation: true } });
    if (!h || h.type !== 'pickup' || !h.reservation) throw handoverNotFound();
    if (h.status === 'accepted' && h.rentalId) return this.rentalOf(h.rentalId);
    if (h.status !== 'pending_customer') throw notPending();
    const r = h.reservation;
    const contractPhotoKeys = dto.contractPhotoKeys ?? [];
    if (!opts.test && contractPhotoKeys.length === 0) throw photosRequired();

    const quantity = dto.quantity ?? 1;
    const { quote, plan } = await this.computeQuote({ planCode: dto.planCode, coverage: dto.coverage, quantity });
    if (dto.payment.amountCents !== quote.totalCents) throw amountMismatch();
    // C7: sem caução → caução de balcão de valor 0 com o método do pagamento.
    const deposit = dto.deposit ?? { method: dto.payment.method, amountCents: 0 };

    const lock = await this.locks.begin(ACCEPT_LOCK_SCOPE, handoverId, 'accept');
    if (lock.state === 'in_progress') throw conflict('conflict', 'O checkout desta entrega já está em processamento. Tente de novo em instantes.');
    try {
      const result = await this.starter.start(
        actor,
        // `depositMethod` é ignorado no ramo `counter` (a caução é a do balcão).
        { vehicleId: h.vehicleId, planCode: dto.planCode, coverage: dto.coverage, depositMethod: 'card' },
        `counter:${handoverId}`,
        {
          fromHandover: { reservationId: r.id, handoverId },
          counter: {
            customerId: r.customerId,
            operatorId: actor.userId,
            snapshot: counterSnapshot(plan, quote),
            periodSeconds: counterPeriodSeconds(plan.unit as PlanUnit, quantity),
            payment: dto.payment,
            deposit,
            contractPhotoKeys,
          },
        },
      );
      const rental = result.body.rental;
      if (result.status !== 201 || !rental) throw new Error('counter_checkout_unexpected_awaiting_deposit');
      await this.audit
        .record({
          actor,
          action: 'rental.counter_checkout',
          entityType: 'Rental',
          entityId: rental.id,
          metadata: {
            handoverId, rentalId: rental.id, planCode: dto.planCode, quantity, paymentMethod: dto.payment.method, amountCents: dto.payment.amountCents,
            depositCents: deposit.amountCents,
          },
        })
        .catch((err) => this.logger.error({ msg: 'counter_checkout_audit_failed', handoverId, rentalId: rental.id, error: (err as Error).message }));
      this.emitUpdated({ handoverId, status: 'accepted', customerId: r.customerId, depotId: h.depotId });
      if (rental.insurancePolicyId) {
        await this.insurance
          .registerRemittance(rental.insurancePolicyId)
          .catch((err) => this.logger.error({ msg: 'insurance_remittance_failed', rentalId: rental.id, error: (err as Error).message }));
      }
      this.logger.log({ msg: 'handover_counter_checkout', handoverId, rentalId: rental.id, planCode: dto.planCode, quantity, test: !!opts.test });
      return rental;
    } catch (err) {
      // Outro checkout (outra instância, trava vencida) já concluiu: converge no mesmo aluguel.
      const now = await this.prisma.handover.findUnique({ where: { id: handoverId } });
      if (now?.status === 'accepted' && now.rentalId) return this.rentalOf(now.rentalId);
      // Perdeu a corrida para um cancelamento ou disputa → sem lastError e sem evento obsoleto.
      if (now && now.status !== 'pending_customer') throw notPending();
      if (err instanceof ProblemException && err.slug !== 'handover-not-pending') {
        // Moto já `rented` por um início desta mesma entrega ainda no meio: não é falha do checkout.
        if (await this.startInFlight(h.vehicleId, r.customerId)) throw this.counterError(err);
        const lastError = err.slug;
        const marked = await this.prisma.handover.updateMany({ where: { id: handoverId, status: 'pending_customer' }, data: { lastError } });
        if (marked.count !== 1) throw notPending();
        this.emitUpdated({ handoverId, status: 'pending_customer', lastError, customerId: r.customerId, depotId: h.depotId });
        this.logger.warn({ msg: 'handover_counter_checkout_failed', handoverId, lastError });
        throw this.counterError(err);
      }
      throw err;
    } finally {
      await this.locks.abort(ACCEPT_LOCK_SCOPE, handoverId).catch(() => undefined);
    }
  }

  private async computeQuote(q: { planCode: CounterPlanCode; coverage: InsuranceCoverage; quantity: number }): Promise<{ quote: CounterQuote; plan: PricingPlan }> {
    const max = COUNTER_QUANTITY_MAX[q.planCode];
    if (q.quantity > max) {
      throw badRequest(`Quantidade acima do limite do plano (${QUANTITY_LABEL[q.planCode]}).`, [{ field: 'quantity', message: `máximo ${max}` }]);
    }
    const [plan, dayPlan, premium] = await Promise.all([
      this.pricing.activePlan(q.planCode),
      this.pricing.activePlan('day'),
      this.insurance.quote({ coverage: q.coverage, planCode: q.planCode }),
    ]);
    return { plan, quote: buildCounterQuote({ plan, dayPlan, premiumCents: premium.premiumCents, coverage: q.coverage, quantity: q.quantity }) };
  }

  /** Erros do `start()` no balcão: consentimento → `422` com o texto do atendente; o resto como no aceite. */
  private counterError(err: ProblemException): ProblemException {
    if (err.slug === 'location-consent-required') return consentRequired();
    return acceptError(err);
  }

  /** Início desta entrega ainda no meio: moto `rented` com marcador `RentalStart` do mesmo cliente. */
  private async startInFlight(vehicleId: string, customerId: string): Promise<boolean> {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
    if (v?.status !== 'rented') return false;
    return !!(await this.prisma.rentalStart.findFirst({ where: { vehicleId, customerId }, select: { rentalId: true } }));
  }

  private async rentalOf(rentalId: string) {
    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, include: { vehicle: true } });
    if (!rental) throw handoverNotFound();
    return toRental(rental);
  }

  private emitUpdated(ev: HandoverUpdatedEvent): void {
    this.events.emit(EV.HANDOVER_UPDATED, ev);
  }
}
