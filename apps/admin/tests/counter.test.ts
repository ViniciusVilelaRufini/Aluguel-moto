import { describe, expect, it } from 'vitest';
import { can } from '@/lib/permissions';
import { AUDIT_ACTION_LABEL } from '@/lib/audit-labels';
import { ApiError, problemMessage } from '@/lib/api';
import {
  COUNTER_METHOD_LABEL, COUNTER_PLAN_LABEL, COUNTER_QUANTITY_MAX, checkoutErrorMessage, clampQuantity, reaisToCents, isRentalOpen, isGatewayRefundable,
} from '@/lib/counter';

describe('balcão no painel (Task 13)', () => {
  it('limites e conversão', () => {
    expect(clampQuantity('weekly', 9)).toBe(4);
    expect(clampQuantity('day', 0)).toBe(1);
    expect(reaisToCents('75,50')).toBe(7550);
    expect(reaisToCents('abc')).toBeNull();
    expect(can(['operacao'], 'counter.checkout')).toBe(true);
    expect(can(['suporte'], 'counter.settle')).toBe(false);
  });

  it('limites por plano e quantidade fracionada/NaN', () => {
    expect(COUNTER_QUANTITY_MAX).toEqual({ day: 30, weekly: 4, monthly: 3 });
    expect(clampQuantity('day', 31)).toBe(30);
    expect(clampQuantity('monthly', 5)).toBe(3);
    expect(clampQuantity('weekly', 2.7)).toBe(2);
    expect(clampQuantity('day', Number.NaN)).toBe(1);
  });

  it('reais em centavos inteiros', () => {
    expect(reaisToCents('1.234,56')).toBe(123456);
    expect(reaisToCents('0,1')).toBe(10);
    expect(reaisToCents('60')).toBe(6000);
    expect(reaisToCents('')).toBeNull();
    expect(reaisToCents('-5')).toBeNull();
    expect(reaisToCents('1000000')).toBeNull();
  });

  it('rótulos do balcão em pt-BR', () => {
    expect(COUNTER_METHOD_LABEL).toEqual({ counter_card: 'Maquininha (cartão)', counter_pix: 'Pix no balcão', cash: 'Dinheiro' });
    expect(COUNTER_PLAN_LABEL).toEqual({ day: 'Diária', weekly: 'Semanal', monthly: 'Mensal' });
    expect(AUDIT_ACTION_LABEL['rental.counter_checkout']).toBe('Aluguel iniciado no balcão');
    expect(AUDIT_ACTION_LABEL['payment.counter_settle']).toBe('Acerto no balcão');
    expect(AUDIT_ACTION_LABEL['deposit.counter_refund']).toBe('Caução devolvida no balcão');
  });

  it('permissões: admin e operação; campo, suporte e financeiro não', () => {
    for (const a of ['counter.checkout', 'counter.settle'] as const) {
      expect(can(['admin'], a)).toBe(true);
      expect(can(['operacao'], a)).toBe(true);
      for (const g of ['suporte', 'financeiro', 'campo'] as const) expect(can([g], a)).toBe(false);
    }
  });

  it('erros do checkout com os textos da Task 11', () => {
    expect(checkoutErrorMessage(new ApiError(422, 'x', 'counter-amount-mismatch'))).toBe('O valor mudou. Confira e toque de novo.');
    expect(checkoutErrorMessage(new ApiError(422, 'x', 'location-consent-required'))).toBe('Peça ao cliente para permitir a localização no app');
    expect(checkoutErrorMessage(new ApiError(409, 'Moto sem conexão.', 'vehicle-offline'))).toBe('Moto sem conexão.');
    expect(checkoutErrorMessage(new Error('falhou'))).toBe('falhou');
  });

  it('aluguel aberto aguarda o encerramento', () => {
    expect(isRentalOpen('active')).toBe(true);
    expect(isRentalOpen('paused')).toBe(true);
    expect(isRentalOpen('ending')).toBe(true);
    expect(isRentalOpen('ended')).toBe(false);
    expect(isRentalOpen('force_ended')).toBe(false);
  });
});

describe('mensagens de erro do acerto (fix round 1)', () => {
  it('saldo mudado e chave reutilizada viram texto em pt-BR, sem centavos crus', () => {
    const p = (slug: string) => problemMessage({ type: `https://api.volti.app/problems/${slug}`, detail: 'O valor passa do saldo do débito (6000).' }, 422).message;
    expect(p('counter-amount-mismatch')).toBe('O saldo mudou. Confira e tente de novo.');
    expect(p('idempotency-key-reused')).toBe('Esta operação já foi enviada com outros dados. Confira o saldo e tente de novo.');
  });
});

describe('estorno só para pagamento do gateway (revisão final)', () => {
  it('pagamento do balcão (maquininha, Pix do galpão, dinheiro) não tem estorno no gateway', () => {
    expect(isGatewayRefundable('counter_card')).toBe(false);
    expect(isGatewayRefundable('counter_pix')).toBe(false);
    expect(isGatewayRefundable('cash')).toBe(false);
  });
  it('cartão e Pix do app continuam estornáveis; sem pagamento carregado, não', () => {
    expect(isGatewayRefundable('card')).toBe(true);
    expect(isGatewayRefundable('pix')).toBe(true);
    expect(isGatewayRefundable(undefined)).toBe(false);
  });
});
