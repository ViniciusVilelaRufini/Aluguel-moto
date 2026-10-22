import { signStationCode, verifyStationCode } from './station-code';

const ID = 'd0000000-0000-4000-8000-000000000001';
const SECRET = 'segredo-de-teste';

describe('QR da estação (código assinado)', () => {
  it('formato vst1.<id>.<hmac>, sem dado pessoal', () => {
    const code = signStationCode(ID, SECRET);
    expect(code).toMatch(/^vst1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{22}$/);
    expect(verifyStationCode(code, SECRET)).toEqual({ stationId: ID });
  });

  it('recusa adulterado, outro segredo, outra estação e lixo', () => {
    const code = signStationCode(ID, SECRET);
    expect(verifyStationCode(code, 'outro-segredo')).toBeNull();
    expect(verifyStationCode(code.replace(ID, 'd0000000-0000-4000-8000-000000000002'), SECRET)).toBeNull();
    expect(verifyStationCode(`${code.slice(0, -1)}${code.endsWith('A') ? 'B' : 'A'}`, SECRET)).toBeNull();
    for (const bad of ['', 'x', 'vst1..', `vst2.${ID}.abc`, `vst1.nao-uuid.${code.split('.')[2]}`, `${code}.extra`]) {
      expect(verifyStationCode(bad, SECRET)).toBeNull();
    }
    expect(verifyStationCode(undefined as unknown as string, SECRET)).toBeNull();
  });
});
