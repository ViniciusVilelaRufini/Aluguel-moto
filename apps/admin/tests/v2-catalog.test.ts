import { describe, expect, it } from 'vitest';
import { draftFromModel, isCatalogKey, modelInputFromDraft, modelPatchFromDraft, slugify, unlockFeeLabel, validateModelDraft, validatePhoto, type VehicleModel } from '@/lib/catalog';
import { toCents, toReais, validMoney } from '@/lib/money';
import { formatBRL } from '@/lib/format';

const model: VehicleModel = {
  id: 'm1', name: 'Volti Flash', slug: 'flash', categoryLabel: 'Urbana', pricePerMinuteCents: 79, serviceIntervalKm: 1000, serviceIntervalHours: 100,
  active: true, sortOrder: 0, createdAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z', photoObjectKey: 'catalog/flash.jpg',
};

describe('dinheiro em centavos', () => {
  it('converte reais digitados', () => {
    expect(toCents('0,79')).toBe(79);
    expect(toCents('1.234,50')).toBe(123450);
    expect(toReais(300)).toBe('3,00');
    expect(validMoney('3,5')).toBe(true);
    expect(validMoney('abc')).toBe(false);
  });

  it('ponto sozinho com 1 ou 2 casas é o separador decimal', () => {
    expect(toCents('0.79')).toBe(79);
    expect(toCents('3.5')).toBe(350);
    expect(validMoney('0.79')).toBe(true);
  });

  it('ponto como milhar só no formato 1.234(,56)', () => {
    expect(toCents('1.234,56')).toBe(123456);
    expect(toCents('1.234')).toBe(123400);
    expect(toCents('12.345.678,90')).toBe(1234567890);
    expect(validMoney('1.23.4')).toBe(false);
    expect(validMoney('1,234.56')).toBe(false);
    expect(validMoney('')).toBe(false);
  });
});

describe('catálogo de modelos', () => {
  it('foto: só JPG/PNG até 5 MB e chave com prefixo catalog/', () => {
    expect(validatePhoto({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validatePhoto({ type: 'application/pdf', size: 1000 })).toBe('Use uma foto JPG ou PNG');
    expect(validatePhoto({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).toBe('A foto pode ter até 5 MB');
    expect(isCatalogKey('catalog/3f1c.jpg')).toBe(true);
    expect(isCatalogKey('kyc/3f1c.jpg')).toBe(false);
    expect(isCatalogKey('catalog/../x')).toBe(false);
  });

  it('slug a partir do nome', () => {
    expect(slugify('Volti Flash Pró 2')).toBe('volti-flash-pro-2');
  });

  it('desbloqueio herdado do plano ou próprio', () => {
    expect(unlockFeeLabel(model, 300)).toEqual({ text: `${formatBRL(300)} (do plano)`, inherited: true });
    expect(unlockFeeLabel({ unlockFeeCents: 150 }, 300).inherited).toBe(false);
    expect(unlockFeeLabel({ unlockFeeCents: 150 }, 300).text).toMatch(/1,50/);
  });

  it('cadastro: sem desbloqueio quando herda; com quando próprio', () => {
    const d = { ...draftFromModel(), name: 'Volti Max', slug: 'max', categoryLabel: 'Carga', price: '0,99' };
    expect(validateModelDraft(d, true)).toBeNull();
    const input = modelInputFromDraft(d);
    expect(input).toMatchObject({ name: 'Volti Max', slug: 'max', pricePerMinuteCents: 99, serviceIntervalKm: 1000, serviceIntervalHours: 100, active: true });
    expect('unlockFeeCents' in input).toBe(false);
    expect(modelInputFromDraft({ ...d, inheritUnlock: false, unlock: '2,50' }).unlockFeeCents).toBe(250);
  });

  it('validação com os limites do contrato', () => {
    const d = draftFromModel(model);
    expect(validateModelDraft({ ...d, price: '101,00' }, false)).toMatch(/até 100,00/);
    expect(validateModelDraft({ ...d, slug: 'Com Espaço' }, true)).toMatch(/identificador/);
    expect(validateModelDraft({ ...d, intervalKm: '0' }, false)).toMatch(/km/);
    expect(validateModelDraft({ ...d, inheritUnlock: false, unlock: '' }, false)).toMatch(/Desbloqueio/);
  });

  it('edição manda só o que mudou', () => {
    const d = draftFromModel(model);
    expect(modelPatchFromDraft(model, d)).toEqual({});
    expect(modelPatchFromDraft(model, { ...d, price: '0,89', photoObjectKey: 'catalog/new.png' })).toEqual({ pricePerMinuteCents: 89, photoObjectKey: 'catalog/new.png' });
  });

  it('desbloqueio: definir próprio e voltar a herdar o do plano', () => {
    const own = { ...model, unlockFeeCents: 150 };
    expect(modelPatchFromDraft(model, { ...draftFromModel(model), inheritUnlock: false, unlock: '1,50' })).toEqual({ unlockFeeCents: 150 });
    expect(draftFromModel(own).inheritUnlock).toBe(false);
    expect(modelPatchFromDraft(own, { ...draftFromModel(own), inheritUnlock: true })).toEqual({ inheritPlanUnlockFee: true });
  });
});
