import { REPORTED_LOCK_PRECEDENCE_MS, reportedLockWhere, telemetryLockWhere, telemetryLockWins } from './lock-precedence';

/**
 * Uma regra só para a trava exibida (revisão final do J16): a escrita condicional no banco (`syncTrackerState`, `vehicle.state`)
 * e o overlay do Redis no GET/frota (`withLiveState`) decidem igual — senão o GET mostra "Destravada" enquanto o banco e o WS
 * mostram travada.
 */
const T = Date.parse('2026-11-03T15:00:00.000Z');
type Stored = { lockedAt: Date | null; lockedFromReport: boolean };

/** Avalia o `where` gerado (subconjunto do Prisma: `null`, `{ lt, lte }`, igualdade, `OR`) como o Postgres faria. */
function evalWhere(row: Stored, where: Record<string, any>): boolean {
  return Object.entries(where).every(([k, c]) => {
    if (k === 'OR') return (c as Record<string, any>[]).some((x) => evalWhere(row, x));
    const v = (row as Record<string, any>)[k];
    if (c === null) return v === null;
    if (typeof c === 'object' && !(c instanceof Date)) {
      if (v === null) return false;
      const t = v instanceof Date ? v.getTime() : v;
      if ('lt' in c && !(t < c.lt.getTime())) return false;
      if ('lte' in c && !(t <= c.lte.getTime())) return false;
      return true;
    }
    return v === c;
  });
}

describe('precedência da trava (reported × telemetria)', () => {
  const cases: Array<[string, Stored, number, boolean]> = [
    ['sem origem gravada', { lockedAt: null, lockedFromReport: false }, T, true],
    ['telemetria gravada mais velha', { lockedAt: new Date(T - 1), lockedFromReport: false }, T, true],
    ['telemetria gravada no mesmo instante', { lockedAt: new Date(T), lockedFromReport: false }, T, true],
    ['telemetria gravada mais nova', { lockedAt: new Date(T + 1), lockedFromReport: false }, T, false],
    ['reported há 30 s', { lockedAt: new Date(T - 30_000), lockedFromReport: true }, T, false],
    ['reported há exatamente a precedência', { lockedAt: new Date(T - REPORTED_LOCK_PRECEDENCE_MS), lockedFromReport: true }, T, false],
    ['reported há mais que a precedência', { lockedAt: new Date(T - REPORTED_LOCK_PRECEDENCE_MS - 1), lockedFromReport: true }, T, true],
  ];

  it.each(cases)('telemetria contra %s → %s (função e where do banco iguais)', (_n, stored, at, wins) => {
    expect(telemetryLockWins(stored, at)).toBe(wins);
    expect(evalWhere(stored, telemetryLockWhere(new Date(at)))).toBe(wins);
  });

  it('reported vale se a trava gravada não for mais nova que ele (de qualquer origem)', () => {
    expect(evalWhere({ lockedAt: null, lockedFromReport: false }, reportedLockWhere(new Date(T)))).toBe(true);
    expect(evalWhere({ lockedAt: new Date(T), lockedFromReport: true }, reportedLockWhere(new Date(T)))).toBe(true);
    expect(evalWhere({ lockedAt: new Date(T + 1), lockedFromReport: false }, reportedLockWhere(new Date(T)))).toBe(false);
  });

  it('precedência = 90 s (validade do bit de corte na ponte)', () => {
    expect(REPORTED_LOCK_PRECEDENCE_MS).toBe(90_000);
  });
});
