import { loadIotConfig } from './iot-config';

describe('loadIotConfig — fix 1 (I5)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('IOT_MODE=stub em produção recusa subir (estação e rastreador imaginários confirmariam tudo sozinhos)', () => {
    process.env.NODE_ENV = 'production';
    process.env.IOT_MODE = 'stub';
    expect(() => loadIotConfig()).toThrow(/IOT_MODE=stub/);
  });

  it('stub continua valendo fora de produção; local/aws valem em produção', () => {
    process.env.NODE_ENV = 'test';
    process.env.IOT_MODE = 'stub';
    expect(loadIotConfig().iotMode).toBe('stub');
    process.env.NODE_ENV = 'production';
    process.env.IOT_MODE = 'aws';
    expect(loadIotConfig().iotMode).toBe('aws');
  });
});
