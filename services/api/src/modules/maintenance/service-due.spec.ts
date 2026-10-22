import { compareServiceRows, computeServiceInfo, publicServiceInfo } from './service-due';

const base = { odometerKm: 0, usageHours: 0, lastServiceOdometerKm: 0, lastServiceUsageHours: 0, intervalKm: 1000, intervalHours: 100 };

describe('manutenção preventiva por km/horas', () => {
  it('em dia abaixo de 90% dos dois intervalos', () => {
    const s = computeServiceInfo({ ...base, odometerKm: 1500, lastServiceOdometerKm: 1000, usageHours: 40, lastServiceUsageHours: 10 });
    expect(s).toMatchObject({ kmSinceService: 500, hoursSinceService: 30, nextServiceAtKm: 2000, nextServiceAtHours: 110, kmUntilService: 500, hoursUntilService: 70, status: 'ok' });
  });

  it('próxima quando qualquer intervalo chega a 90% (km ou horas)', () => {
    expect(computeServiceInfo({ ...base, odometerKm: 900 }).status).toBe('due_soon');
    expect(computeServiceInfo({ ...base, odometerKm: 899.9 }).status).toBe('ok');
    expect(computeServiceInfo({ ...base, odometerKm: 100, usageHours: 95 }).status).toBe('due_soon');
  });

  it('vencida a partir de 100% de qualquer intervalo, com saldo negativo', () => {
    const s = computeServiceInfo({ ...base, odometerKm: 1210.44, usageHours: 20 });
    expect(s.status).toBe('overdue');
    expect(s.kmUntilService).toBe(-210.4);
    expect(computeServiceInfo({ ...base, usageHours: 100 }).status).toBe('overdue');
  });

  it('odômetro corrigido para baixo não gera km negativo desde a revisão', () => {
    expect(computeServiceInfo({ ...base, odometerKm: 50, lastServiceOdometerKm: 80 }).kmSinceService).toBe(0);
  });

  it('intervalo do modelo vale (ex. Cargo 800 km)', () => {
    expect(computeServiceInfo({ ...base, intervalKm: 800, odometerKm: 760 }).status).toBe('due_soon');
  });

  it('ordem da tabela: vencidas, próximas, em dia; mais urgente primeiro', () => {
    const row = (code: string, km: number) => ({ code, service: computeServiceInfo({ ...base, odometerKm: km }) });
    const rows = [row('VLT-0003', 100), row('VLT-0001', 950), row('VLT-0002', 1300), row('VLT-0004', 1100), row('VLT-0005', 100)];
    expect(rows.sort(compareServiceRows).map((r) => r.code)).toEqual(['VLT-0002', 'VLT-0004', 'VLT-0001', 'VLT-0003', 'VLT-0005']);
  });

  it('versão pública sem o campo interno de ordenação', () => {
    const p = publicServiceInfo(computeServiceInfo({ ...base, lastServiceAt: new Date('2026-10-01T00:00:00Z') }));
    expect(p).not.toHaveProperty('urgency');
    expect(p.lastServiceAt).toBe('2026-10-01T00:00:00.000Z');
    expect(publicServiceInfo(computeServiceInfo(base))).not.toHaveProperty('lastServiceAt');
  });
});
