import { describe, expect, it } from 'vitest';
import { HANDOVER_STATUS, HANDOVER_TYPE_LABEL, checklistLabel, checklistSummary, lastErrorLabel, supportHref } from '@/lib/handovers';

describe('entregas', () => {
  it('traduz status e tipo', () => {
    expect(HANDOVER_STATUS.pending_customer).toEqual({ label: 'Aguardando o cliente', tone: 'warning' });
    expect(HANDOVER_STATUS.accepted.label).toBe('Aceita');
    expect(HANDOVER_STATUS.disputed).toEqual({ label: 'Problema apontado', tone: 'danger' });
    expect(HANDOVER_STATUS.canceled.label).toBe('Cancelada');
    expect(HANDOVER_TYPE_LABEL.pickup).toBe('Saída');
    expect(HANDOVER_TYPE_LABEL.return_depot).toBe('Chegada');
  });

  it('nomeia itens do checklist conhecidos e desconhecidos', () => {
    expect(checklistLabel('freios')).toBe('Freios');
    expect(checklistLabel('carenagem')).toBe('Carenagem');
    expect(checklistLabel('farol_traseiro')).toBe('Farol traseiro');
  });

  it('resume o checklist (itens ok e os com problema)', () => {
    const s = checklistSummary([{ code: 'freios', ok: true }, { code: 'pneus', ok: false, note: 'Careca' }, { code: 'luzes', ok: true }]);
    expect(s.ok).toBe(2);
    expect(s.total).toBe(3);
    expect(s.issues.map((i) => i.code)).toEqual(['pneus']);
  });

  it('explica o último erro do aceite', () => {
    expect(lastErrorLabel('payment-declined')).toBe('Pagamento não aprovado');
    expect(lastErrorLabel('gateway-unavailable')).toBe('Pagamento indisponível no momento');
    expect(lastErrorLabel('outro-erro')).toBe('outro-erro');
    expect(lastErrorLabel(undefined)).toBeNull();
  });

  it('"Abrir no suporte" leva ao atendimento só para quem abre Clientes', () => {
    expect(supportHref(['suporte'])).toBe('/customers?tab=support');
    expect(supportHref(['admin'])).toBe('/customers?tab=support');
    expect(supportHref(['operacao'])).toBeNull();
  });
});
