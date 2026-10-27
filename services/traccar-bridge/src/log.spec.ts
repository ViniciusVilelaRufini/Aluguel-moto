import { createLogger, maskImei } from './log';

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
});
