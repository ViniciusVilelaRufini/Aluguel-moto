import { BUDGET_MS, CALL_TIMEOUT_MS, VehicleAddressService, withTimeout } from './vehicle-address.service';

/** Fix round 2 (M6): geocodificador lento não segura a lista nem a ficha além do orçamento. */
describe('VehicleAddressService com geocodificador lento', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const row = (id: string, lat: number) => ({ id, lat, lng: -46.6559, addressLabel: null as string | null });
  const never = () => new Promise<string>(() => undefined);

  it('withTimeout resolve null no prazo e repassa o valor/erro que chega antes', async () => {
    const slow = withTimeout(never(), 100);
    jest.advanceTimersByTime(100);
    await expect(slow).resolves.toBeNull();
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
    await expect(withTimeout(Promise.reject(new Error('x')), 100)).rejects.toThrow('x');
  });

  it('lista: cada consulta lenta é cortada em CALL_TIMEOUT_MS e o total para no orçamento, sem lançar nem gravar', async () => {
    const geocoder = { reverse: jest.fn(never) };
    const prisma: any = { vehicle: { updateMany: jest.fn() } };
    const svc = new VehicleAddressService(prisma, geocoder as any);
    const rows = [row('v1', -23.56), row('v2', -23.57), row('v3', -23.58), row('v4', -23.59)];
    let done = false;
    const p = svc.ensure(rows).then((r) => ((done = true), r));
    for (let elapsed = 0; elapsed < BUDGET_MS && !done; elapsed += 50) await jest.advanceTimersByTimeAsync(50);
    expect(done).toBe(true);
    const out = await p;
    // 800 ms + 700 ms (resto do orçamento de 1500 ms) → só duas consultas; as demais ficam para a próxima leitura.
    expect(geocoder.reverse).toHaveBeenCalledTimes(Math.ceil(BUDGET_MS / CALL_TIMEOUT_MS));
    expect(out.every((r) => r.addressLabel === null)).toBe(true);
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('label (ficha/tarefa): consulta lenta → undefined depois do teto', async () => {
    const svc = new VehicleAddressService({} as any, { reverse: jest.fn(never) } as any);
    let out: string | undefined | null = null;
    const p = svc.label(-23.56, -46.65).then((v) => (out = v));
    await jest.advanceTimersByTimeAsync(CALL_TIMEOUT_MS);
    await p;
    expect(out).toBeUndefined();
  });
});
