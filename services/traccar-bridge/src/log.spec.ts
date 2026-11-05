import { createLogger, maskImei, maskLogger } from './log';

describe('log', () => {
  it('JSON por linha, com nível e serviço; IMEI mascarado', () => {
    const lines: string[] = [];
    createLogger('traccar-bridge', (l) => void lines.push(l)).warn({ msg: 'x', imei: maskImei('860000000000901') });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: 'warn', service: 'traccar-bridge', msg: 'x', imei: '***********0901' });
    expect(lines[0]).not.toContain('860000000000901');
  });
  it('maskImei mostra só os 4 últimos dígitos; IMEI curto é totalmente mascarado', () => {
    expect(maskImei('860000000000901')).toBe('***********0901');
    expect(maskImei('1234')).toBe('****');
    expect(maskImei('')).toBe('****');
  });
  it('maskLogger mascara IMEI dentro de thingName gt06-<IMEI> e de erros, sem mexer em moto-NNNN', () => {
    const seen: Array<Record<string, unknown>> = [];
    const push = (e: Record<string, unknown>) => void seen.push(e);
    maskLogger({ info: push, warn: push, error: push }).info({ msg: 'x', thingName: 'gt06-869890080273430', other: 'moto-0059', n: 869890080273430 });
    expect(seen[0]).toEqual({ msg: 'x', thingName: 'gt06-***********3430', other: 'moto-0059', n: 869890080273430 });
  });
});
