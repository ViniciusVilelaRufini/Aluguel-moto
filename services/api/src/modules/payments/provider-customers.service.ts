import { Inject, Injectable } from '@nestjs/common';
import type { PaymentCard } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from './payment-state.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider';

/** Cliente e cartões no gateway. Só tokens e ids do gateway são gravados (nunca número, CVV ou validade completa). */
@Injectable()
export class ProviderCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async providerRef(entityType: 'customer' | 'subscription', entityId: string): Promise<string | null> {
    const ref = await this.prisma.paymentProviderRef.findUnique({
      where: { entityType_entityId_provider: { entityType, entityId, provider: this.provider.name } },
    });
    return ref?.providerId ?? null;
  }

  async saveRef(entityType: 'customer' | 'subscription', entityId: string, providerId: string): Promise<void> {
    try {
      await this.prisma.paymentProviderRef.create({ data: { entityType, entityId, provider: this.provider.name, providerId } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  async ensureCustomer(customerId: string): Promise<string> {
    const existing = await this.providerRef('customer', customerId);
    if (existing) return existing;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } });
    if (!customer) throw new Error('Cliente não encontrado.');
    const { providerCustomerId } = await this.provider.createCustomer({ customerId, email: customer.email });
    await this.saveRef('customer', customerId, providerCustomerId);
    return (await this.providerRef('customer', customerId)) ?? providerCustomerId;
  }

  async payerEmail(customerId: string): Promise<string> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } });
    return c?.email ?? '';
  }

  /** Cadastra o token no gateway e grava só bandeira, últimos 4 dígitos, validade e o id do cartão no gateway. */
  async addCard(customerId: string, cardToken: string, setDefault?: boolean): Promise<PaymentCard> {
    const providerCustomerId = await this.ensureCustomer(customerId);
    const card = await this.provider.attachCard({ providerCustomerId, cardToken });
    const count = await this.prisma.paymentCard.count({ where: { customerId, deletedAt: null } });
    const makeDefault = setDefault === true || count === 0;
    return this.prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.paymentCard.updateMany({ where: { customerId }, data: { isDefault: false } });
      return tx.paymentCard.create({
        data: { customerId, providerCardId: card.providerCardId, brand: card.brand, last4: card.last4, expMonth: card.expMonth, expYear: card.expYear, isDefault: makeDefault },
      });
    });
  }

  async card(customerId: string, cardId?: string | null): Promise<PaymentCard | null> {
    return cardId
      ? this.prisma.paymentCard.findFirst({ where: { id: cardId, customerId, deletedAt: null } })
      : this.prisma.paymentCard.findFirst({ where: { customerId, isDefault: true, deletedAt: null } });
  }
}
