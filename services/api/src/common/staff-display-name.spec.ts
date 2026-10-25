import { STAFF_FALLBACK_NAME, staffFirstName } from './staff-display-name';

describe('staffFirstName (Task 30, item 38)', () => {
  it('primeiro nome cadastrado', () => {
    expect(staffFirstName('Rafael Souza Lima')).toBe('Rafael');
    expect(staffFirstName('  Ana ')).toBe('Ana');
  });

  it('sem nome ou com cara de e-mail → "Equipe Volti"', () => {
    for (const n of [undefined, null, '', '   ', 'ops@volti.com.br']) expect(staffFirstName(n)).toBe(STAFF_FALLBACK_NAME);
    expect(STAFF_FALLBACK_NAME).toBe('Equipe Volti');
    expect(staffFirstName('Equipe Volti')).toBe('Equipe Volti');
  });
});
