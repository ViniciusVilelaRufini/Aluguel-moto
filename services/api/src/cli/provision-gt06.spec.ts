import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRedisStore } from '../redis/redis-store';
import { maskImei, provisionGt06, traccarAdminApi, type TraccarAdminApi } from './provision-gt06';

const IMEI = '860000000000901';

function fakes(
  opts: { device?: { id: number } | null; imeiOwner?: string | null; existingVehicleId?: string | null; openRental?: boolean; reservation?: boolean; openRentalInTx?: boolean } = {},
) {
  const tx = {
    vehicle: { update: jest.fn() },
    tracker: { upsert: jest.fn(), updateMany: jest.fn() },
    rental: { findFirst: jest.fn().mockResolvedValue(opts.openRental || opts.openRentalInTx ? { id: 'r-1' } : null) },
    reservation: { findFirst: jest.fn().mockResolvedValue(opts.reservation ? { id: 'res-1' } : null) },
  };
  const prisma = {
    vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 'veh-1', thingName: 'moto-0901' }), findFirst: jest.fn().mockResolvedValue(null) },
    tracker: {
      findFirst: jest.fn().mockResolvedValue(opts.imeiOwner ? { thingName: opts.imeiOwner } : null),
      findUnique: jest.fn().mockResolvedValue(opts.existingVehicleId === undefined ? null : { vehicleId: opts.existingVehicleId }),
    },
    rental: { findFirst: jest.fn().mockResolvedValue(opts.openRental ? { id: 'r-1' } : null) },
    reservation: { findFirst: jest.fn().mockResolvedValue(opts.reservation ? { id: 'res-1' } : null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const traccar: jest.Mocked<TraccarAdminApi> = {
    findDevice: jest.fn().mockResolvedValue(opts.device ?? null),
    createDevice: jest.fn().mockResolvedValue({ id: 7 }),
    findUser: jest.fn().mockResolvedValue({ id: 3 }),
    linkDevice: jest.fn().mockResolvedValue(undefined),
  };
  const logs: Array<Record<string, unknown>> = [];
  const redis = new MemoryRedisStore();
  return { tx, prisma, traccar, logs, redis, deps: { prisma: prisma as any, traccar, redis, log: (e: Record<string, unknown>) => void logs.push(e) } };
}
const input = { vehicleCode: 'VLT-0901', thingName: 'moto-0901', imei: IMEI, bridgeEmail: 'bridge@volti.local' };

describe('provisionGt06 (spec GT06 §4)', () => {
  it('maskImei mostra só os 4 últimos dígitos', () => {
    expect(maskImei(IMEI)).toBe('***********0901');
    expect(maskImei('12')).toBe('****');
  });

  it('novo: cria o dispositivo no Traccar (uniqueId = IMEI, nome = thingName), vincula à ponte e grava Tracker relay_only/gt06 sem certificado', async () => {
    const f = fakes();
    expect(await provisionGt06(f.deps, input)).toEqual({ deviceId: 7, created: true });
    expect(f.traccar.createDevice).toHaveBeenCalledWith('moto-0901', IMEI);
    expect(f.traccar.linkDevice).toHaveBeenCalledWith(3, 7);
    expect(f.tx.tracker.upsert).toHaveBeenCalledWith({
      where: { thingName: 'moto-0901' },
      create: { thingName: 'moto-0901', vehicleId: 'veh-1', imei: IMEI, controlMode: 'relay_only', protocol: 'gt06' },
      update: { vehicleId: 'veh-1', imei: IMEI, controlMode: 'relay_only', protocol: 'gt06', certificateArn: null },
    });
    expect(f.tx.tracker.updateMany).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', NOT: { thingName: 'moto-0901' } }, data: { vehicleId: null } });
  });

  it('idempotente: dispositivo já existe → não cria outro', async () => {
    const f = fakes({ device: { id: 5 } });
    expect(await provisionGt06(f.deps, input)).toEqual({ deviceId: 5, created: false });
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.tx.tracker.upsert).toHaveBeenCalled();
  });

  it('IMEI de outro rastreador → erro (IMEI mascarado) sem tocar em Traccar nem banco', async () => {
    const f = fakes({ imeiOwner: 'moto-0002' });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('IMEI ***********0901 já vinculado a moto-0002.');
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, imei: '86000' }, '--imei deve ter 15 dígitos'],
    [{ ...input, thingName: 'moto-x' }, '--thing moto-0000 obrigatório'],
    [{ ...input, vehicleCode: 'X-1' }, '--vehicle VLT-0000 obrigatório'],
  ])('entrada inválida %#', async (bad, msg) => {
    const f = fakes();
    await expect(provisionGt06(f.deps, bad)).rejects.toThrow(msg);
  });

  it('dry-run: só planeja; logs nunca trazem o IMEI completo', async () => {
    const f = fakes();
    expect(await provisionGt06(f.deps, { ...input, dryRun: true })).toEqual({ deviceId: null, created: false });
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(f.logs)).not.toContain(IMEI);
    expect(f.logs[0]).toMatchObject({ msg: 'plan', protocol: 'gt06', thingName: 'moto-0901', imei: '***********0901', traccarDevice: 'create', dryRun: true });
  });
});

describe('provisionGt06: troca de rastreador e dono do thingName', () => {
  it('troca de rastreador: desvincula o antigo ANTES do upsert (Tracker.vehicleId é único)', async () => {
    const f = fakes();
    await provisionGt06(f.deps, input);
    expect(f.tx.tracker.updateMany.mock.invocationCallOrder[0]).toBeLessThan(f.tx.tracker.upsert.mock.invocationCallOrder[0]);
  });

  it('thingName já ligado a OUTRA moto → erro antes de qualquer escrita', async () => {
    const f = fakes({ existingVehicleId: 'veh-2' });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('thingName moto-0901 já está ligado a outra moto.');
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('thingName existente solto ou na mesma moto é aceito', async () => {
    for (const existingVehicleId of [null, 'veh-1']) {
      const f = fakes({ existingVehicleId });
      await expect(provisionGt06(f.deps, input)).resolves.toMatchObject({ created: true });
    }
  });
});

describe('provisionGt06: aluguel aberto (onda final de correções)', () => {
  it('moto com aluguel aberto → erro em pt-BR antes de Traccar e banco (nem dry-run)', async () => {
    for (const dryRun of [false, true]) {
      const f = fakes({ openRental: true });
      await expect(provisionGt06(f.deps, { ...input, dryRun })).rejects.toThrow('A moto VLT-0901 está com um aluguel aberto; reprovisione o rastreador com a moto fora de aluguel.');
      expect(f.prisma.rental.findFirst).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', status: { in: ['active', 'paused', 'ending'] } }, select: { id: true } });
      expect(f.traccar.findDevice).not.toHaveBeenCalled();
      expect(f.traccar.createDevice).not.toHaveBeenCalled();
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    }
  });
});

describe('provisionGt06: N4 (reserva e aluguel dentro da transação) e N5 (trava pendente no Redis)', () => {
  it('reserva ativa/em entrega → erro em pt-BR antes de Traccar e banco (nem dry-run)', async () => {
    for (const dryRun of [false, true]) {
      const f = fakes({ reservation: true });
      await expect(provisionGt06(f.deps, { ...input, dryRun })).rejects.toThrow('A moto VLT-0901 tem uma reserva ativa ou em entrega; reprovisione o rastreador com a moto livre.');
      expect(f.prisma.reservation.findFirst).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', status: { in: ['active', 'handover'] } }, select: { id: true } });
      expect(f.traccar.findDevice).not.toHaveBeenCalled();
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    }
  });

  it('aluguel aberto entre a checagem e a transação → reconferido dentro dela, nenhuma escrita no banco', async () => {
    const f = fakes({ openRentalInTx: true });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('A moto VLT-0901 está com um aluguel aberto');
    expect(f.tx.rental.findFirst).toHaveBeenCalled();
    expect(f.tx.vehicle.update).not.toHaveBeenCalled();
    expect(f.tx.tracker.updateMany).not.toHaveBeenCalled();
    expect(f.tx.tracker.upsert).not.toHaveBeenCalled();
  });

  it('reserva criada entre a checagem e a transação → reconferida dentro dela', async () => {
    const f = fakes();
    f.tx.reservation.findFirst.mockResolvedValue({ id: 'res-1' });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('reserva ativa ou em entrega');
    expect(f.tx.tracker.upsert).not.toHaveBeenCalled();
  });

  it.each([['iot:safe-lock:moto-0901'], ['iot:relay-lock:moto-0901']])('estado de trava em %s → recusa antes de Traccar e banco (nem dry-run)', async (key) => {
    for (const dryRun of [false, true]) {
      const f = fakes();
      await f.redis.set(key, '{}');
      await expect(provisionGt06(f.deps, { ...input, dryRun })).rejects.toThrow('A moto moto-0901 tem uma trava em andamento na API');
      expect(f.traccar.findDevice).not.toHaveBeenCalled();
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    }
  });

  it('trava que surge durante o Traccar (rampa começou) → reconferida antes da transação', async () => {
    const f = fakes();
    f.traccar.createDevice.mockImplementation(async () => {
      await f.redis.hset('iot:safe-lock:index', { 'moto-0901': '{}' });
      return { id: 7 };
    });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('trava em andamento');
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('traccarAdminApi.linkDevice 400', () => {
  it('400 é tratado como vínculo já existente e gera aviso só com o status', async () => {
    const logs: Array<Record<string, unknown>> = [];
    const fetchImpl = (async () => new Response('dup', { status: 400 })) as unknown as typeof fetch;
    const api = traccarAdminApi('http://t', 'a', 'b', fetchImpl, (e) => void logs.push(e));
    await expect(api.linkDevice(3, 9)).resolves.toBeUndefined();
    expect(logs).toEqual([{ level: 'warn', msg: 'traccar_link_http_400', status: 400 }]);
  });
});

describe('traccarAdminApi', () => {
  it('Basic auth e caminhos da API REST do Traccar', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/api/users')) return new Response(JSON.stringify([{ id: 3, email: 'Bridge@volti.local' }]), { status: 200 });
      if (url.includes('/api/devices?')) return new Response('[]', { status: 200 });
      if (url.endsWith('/api/devices')) return new Response(JSON.stringify({ id: 9 }), { status: 200 });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const api = traccarAdminApi('http://traccar:8082', 'admin@volti.local', 'segredo', fetchImpl);
    expect(await api.findDevice(IMEI)).toBeNull();
    expect(await api.createDevice('moto-0901', IMEI)).toEqual({ id: 9 });
    expect(await api.findUser('bridge@volti.local')).toEqual({ id: 3, email: 'Bridge@volti.local' });
    await api.linkDevice(3, 9);
    expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
      `GET http://traccar:8082/api/devices?uniqueId=${IMEI}`,
      'POST http://traccar:8082/api/devices',
      'GET http://traccar:8082/api/users',
      'POST http://traccar:8082/api/permissions',
    ]);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('admin@volti.local:segredo').toString('base64')}`);
    expect(calls[1].init.body).toBe(JSON.stringify({ name: 'moto-0901', uniqueId: IMEI }));
  });
});

describe('CHECK Tracker_relay_only_imei (migração 20261027100000_tracker_control_mode)', () => {
  const sql = readFileSync(join(__dirname, '../../prisma/migrations/20261027100000_tracker_control_mode/migration.sql'), 'utf8');

  it('documenta a regra: relay_only exige IMEI não nulo', () => {
    expect(sql).toContain(`CONSTRAINT "Tracker_relay_only_imei" CHECK ("controlMode" <> 'relay_only' OR "imei" IS NOT NULL)`);
    expect(sql).toContain('CREATE UNIQUE INDEX "Tracker_imei_key" ON "Tracker"("imei")');
  });

  it('provisionGt06 sempre grava relay_only com IMEI de 15 dígitos (satisfaz o CHECK) ou rejeita antes de escrever', async () => {
    const ok = fakes();
    await provisionGt06(ok.deps, input);
    const arg = ok.tx.tracker.upsert.mock.calls[0][0];
    for (const data of [arg.create, arg.update]) {
      expect(data.controlMode).toBe('relay_only');
      expect(data.imei).toMatch(/^\d{15}$/);
    }
    for (const imei of ['', '8600000000009', '86000000000090a', '8600000000009011', ' 860000000000901']) {
      const f = fakes();
      await expect(provisionGt06(f.deps, { ...input, imei })).rejects.toThrow('--imei deve ter 15 dígitos');
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
      expect(f.traccar.createDevice).not.toHaveBeenCalled();
    }
  });
});
