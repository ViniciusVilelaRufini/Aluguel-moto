import { isAlive, LIVENESS_INTERVAL_MS, LIVENESS_MAX_AGE_MS, startLiveness } from './liveness';

describe('liveness (B-I3: arquivo de vida só avança com a fila de entrada andando)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('constantes: sonda a cada 30 s, saudável até 120 s', () => {
    expect(LIVENESS_INTERVAL_MS).toBe(30_000);
    expect(LIVENESS_MAX_AGE_MS).toBe(120_000);
  });

  it('toca o arquivo no início e a cada sonda concluída', async () => {
    const touch = jest.fn();
    const stop = startLiveness({ probe: () => Promise.resolve(), touch, intervalMs: 1_000 });
    await jest.advanceTimersByTimeAsync(0);
    expect(touch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(3_000);
    expect(touch).toHaveBeenCalledTimes(4);
    stop();
    await jest.advanceTimersByTimeAsync(3_000);
    expect(touch).toHaveBeenCalledTimes(4);
  });

  it('fila travada: a sonda não conclui → nada de toque e nenhuma sonda nova empilhada', async () => {
    const touch = jest.fn();
    let release!: () => void;
    const probe = jest.fn(() => new Promise<void>((r) => (release = r)));
    const stop = startLiveness({ probe, touch, intervalMs: 1_000 });
    await jest.advanceTimersByTimeAsync(5_000);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(touch).toHaveBeenCalledTimes(1); // só o toque do início
    release(); // fila destravou
    await jest.advanceTimersByTimeAsync(0);
    expect(touch).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(probe).toHaveBeenCalledTimes(2);
    stop();
  });

  it('falha ao gravar o arquivo não derruba o laço', async () => {
    const touch = jest.fn(() => {
      throw new Error('EROFS');
    });
    const onError = jest.fn();
    const stop = startLiveness({ probe: () => Promise.resolve(), touch, intervalMs: 1_000, onError });
    await jest.advanceTimersByTimeAsync(2_000);
    expect(touch).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalled();
    stop();
  });

  it('isAlive: arquivo com idade ≤ máximo; ausente/velho/futuro distante = morto', () => {
    const now = 1_000_000;
    expect(isAlive(now - 1_000, now)).toBe(true);
    expect(isAlive(now - LIVENESS_MAX_AGE_MS, now)).toBe(true);
    expect(isAlive(now - LIVENESS_MAX_AGE_MS - 1, now)).toBe(false);
    expect(isAlive(undefined, now)).toBe(false);
    expect(isAlive(now + 5_000, now)).toBe(true); // pequena diferença de relógio
    expect(isAlive(now + LIVENESS_MAX_AGE_MS + 1, now)).toBe(false);
  });
});
