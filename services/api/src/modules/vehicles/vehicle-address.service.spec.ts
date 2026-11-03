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

/** Bancada do J16 (2026-11-03): a ficha mostrava o endereço de outro lugar quando a posição nova não tinha endereço. */
describe('VehicleAddressService: endereço sempre da posição atual', () => {
  const moved = () => ({ id: 'v1', lat: -21.14, lng: -48.97, addressLabel: 'R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo', addressLat: -23.56, addressLng: -46.69, addressUpdatedAt: new Date('2026-11-01T12:00:00Z') });

  it('andou e o geocodificador não tem endereço → address limpo na linha e no banco', async () => {
    const prisma: any = { vehicle: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const svc = new VehicleAddressService(prisma, { reverse: jest.fn().mockResolvedValue(null) } as any);
    const [r] = await svc.ensure([moved()]);
    expect(r).toMatchObject({ addressLabel: null, addressUpdatedAt: null });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { addressLabel: null, addressLat: null, addressLng: null, addressUpdatedAt: null } });
  });

  it('já limpo e ainda sem endereço → não grava de novo a cada leitura', async () => {
    const prisma: any = { vehicle: { updateMany: jest.fn() } };
    const svc = new VehicleAddressService(prisma, { reverse: jest.fn().mockResolvedValue(null) } as any);
    const [r] = await svc.ensure([{ ...moved(), addressLabel: null, addressLat: null, addressLng: null, addressUpdatedAt: null }]);
    expect(r.addressLabel).toBeNull();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('erro, consulta lenta ou fora do orçamento → a linha sai sem endereço (o do banco é de outro lugar), sem gravar', async () => {
    jest.useFakeTimers();
    try {
      const prisma: any = { vehicle: { updateMany: jest.fn() } };
      const failing = new VehicleAddressService(prisma, { reverse: jest.fn().mockRejectedValue(new Error('x')) } as any);
      expect((await failing.ensure([moved()]))[0]).toMatchObject({ addressLabel: null, addressUpdatedAt: null });
      const slow = new VehicleAddressService(prisma, { reverse: jest.fn(() => new Promise<string>(() => undefined)) } as any);
      const p = slow.ensure([moved(), moved(), moved()]);
      await jest.advanceTimersByTimeAsync(BUDGET_MS + 100);
      expect((await p).every((r) => r.addressLabel === null && r.addressUpdatedAt === null)).toBe(true);
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('não andou (≤ 50 m) → mantém o endereço sem consultar', async () => {
    const prisma: any = { vehicle: { updateMany: jest.fn() } };
    const geocoder = { reverse: jest.fn() };
    const svc = new VehicleAddressService(prisma, geocoder as any);
    const [r] = await svc.ensure([{ ...moved(), addressLat: -21.14, addressLng: -48.97 }]);
    expect(r.addressLabel).toMatch(/Teodoro/);
    expect(geocoder.reverse).not.toHaveBeenCalled();
  });
});
