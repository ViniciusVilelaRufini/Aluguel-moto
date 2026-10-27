import { MemoryRedisStore, type RedisStore } from '../redis/redis-store';
import { assertNoPendingLock, assertVehicleFreeForProvisioning, connectProvisioningRedis, linkMqttTracker } from './provision-tracker';

function fakes(openRental = false, reservation = false) {
  const calls: string[] = [];
  const tx = {
    vehicle: { update: jest.fn(async () => void calls.push('vehicle.update')) },
    tracker: {
      updateMany: jest.fn(async () => void calls.push('tracker.updateMany')),
      upsert: jest.fn(async () => void calls.push('tracker.upsert')),
    },
    rental: { findFirst: jest.fn().mockResolvedValue(openRental ? { id: 'r-1' } : null) },
    reservation: { findFirst: jest.fn().mockResolvedValue(reservation ? { id: 'res-1' } : null) },
  };
  return { tx, calls };
}
const vehicle = { id: 'veh-1', code: 'VLT-0061', thingName: 'moto-0061' };

describe('linkMqttTracker (provision-tracker.ts, rastreador MQTT speed_control)', () => {
  it('re-provisiona um ex-GT06 como MQTT: controlMode speed_control e protocol null no create e no update', async () => {
    const f = fakes();
    await linkMqttTracker(f.tx as any, { vehicle, thingName: 'moto-0061', imei: '860000000000061', certificateArn: 'arn:cert' });
    expect(f.tx.tracker.upsert).toHaveBeenCalledWith({
      where: { thingName: 'moto-0061' },
      create: { thingName: 'moto-0061', vehicleId: 'veh-1', imei: '860000000000061', certificateArn: 'arn:cert', controlMode: 'speed_control', protocol: null },
      update: { vehicleId: 'veh-1', imei: '860000000000061', certificateArn: 'arn:cert', controlMode: 'speed_control', protocol: null },
    });
  });

  it('desvincula o rastreador antigo da moto ANTES do upsert (Tracker.vehicleId é único)', async () => {
    const f = fakes();
    await linkMqttTracker(f.tx as any, { vehicle: { ...vehicle, thingName: 'moto-0901' }, thingName: 'moto-0061' });
    expect(f.tx.tracker.updateMany).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', NOT: { thingName: 'moto-0061' } }, data: { vehicleId: null } });
    expect(f.calls).toEqual(['vehicle.update', 'tracker.updateMany', 'tracker.upsert']);
    expect(f.tx.vehicle.update).toHaveBeenCalledWith({ where: { id: 'veh-1' }, data: { thingName: 'moto-0061' } });
  });

  it('sem IMEI/certificado: não apaga o que já existe no update (undefined), create grava null', async () => {
    const f = fakes();
    await linkMqttTracker(f.tx as any, { vehicle, thingName: 'moto-0061' });
    const arg = (f.tx.tracker.upsert.mock.calls[0] as any[])[0];
    expect(arg.update).toEqual({ vehicleId: 'veh-1', imei: undefined, certificateArn: undefined, controlMode: 'speed_control', protocol: null });
    expect(arg.create).toMatchObject({ controlMode: 'speed_control', protocol: null });
    expect(f.tx.vehicle.update).not.toHaveBeenCalled();
  });

  it('moto com aluguel aberto → erro em pt-BR e nenhuma escrita', async () => {
    const f = fakes(true);
    await expect(linkMqttTracker(f.tx as any, { vehicle, thingName: 'moto-0061' })).rejects.toThrow(
      'A moto VLT-0061 está com um aluguel aberto; reprovisione o rastreador com a moto fora de aluguel.',
    );
    expect(f.calls).toEqual([]);
  });
});

describe('assertNoOpenRental', () => {
  it('consulta OPEN_RENTAL_STATUSES (active, paused, ending)', async () => {
    const { assertNoOpenRental } = await import('./provision-tracker');
    const rental = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(assertNoOpenRental({ rental } as any, { id: 'veh-1', code: 'VLT-0061' })).resolves.toBeUndefined();
    expect(rental.findFirst).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', status: { in: ['active', 'paused', 'ending'] } }, select: { id: true } });
  });
});

const RESERVATION_MSG = 'A moto VLT-0061 tem uma reserva ativa ou em entrega; reprovisione o rastreador com a moto livre.';

describe('N4: reserva ativa/em entrega também recusa o provisionamento', () => {
  it('assertVehicleFreeForProvisioning consulta IN_USE_RESERVATION_STATUSES (active, handover)', async () => {
    const rental = { findFirst: jest.fn().mockResolvedValue(null) };
    const reservation = { findFirst: jest.fn().mockResolvedValue({ id: 'res-1' }) };
    await expect(assertVehicleFreeForProvisioning({ rental, reservation } as any, { id: 'veh-1', code: 'VLT-0061' })).rejects.toThrow(RESERVATION_MSG);
    expect(reservation.findFirst).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', status: { in: ['active', 'handover'] } }, select: { id: true } });
    reservation.findFirst.mockResolvedValue(null);
    await expect(assertVehicleFreeForProvisioning({ rental, reservation } as any, { id: 'veh-1', code: 'VLT-0061' })).resolves.toBeUndefined();
  });

  it('linkMqttTracker (dentro da transação) com reserva ativa → erro e nenhuma escrita', async () => {
    const f = fakes(false, true);
    await expect(linkMqttTracker(f.tx as any, { vehicle, thingName: 'moto-0061' })).rejects.toThrow(RESERVATION_MSG);
    expect(f.calls).toEqual([]);
  });
});

describe('N5: trava pendente no Redis da API recusa o provisionamento', () => {
  it.each([
    ['rampa (speed_control)', 'iot:safe-lock:moto-0061'],
    ['trava só relé', 'iot:relay-lock:moto-0061'],
  ])('estado de %s → erro em pt-BR', async (_name, key) => {
    const redis = new MemoryRedisStore();
    await redis.set(key, '{}');
    await expect(assertNoPendingLock(redis, 'moto-0061')).rejects.toThrow('A moto moto-0061 tem uma trava em andamento na API');
  });

  it.each([['iot:safe-lock:index'], ['iot:relay-lock:index']])('só no índice (%s, órfã à espera da varredura) → também recusa', async (index) => {
    const redis = new MemoryRedisStore();
    await redis.hset(index, { 'moto-0061': '{"phase":"locking"}' });
    await expect(assertNoPendingLock(redis, 'moto-0061')).rejects.toThrow('trava em andamento');
  });

  it('sem estado da moto (ou só de outra moto) → segue', async () => {
    const redis = new MemoryRedisStore();
    await redis.set('iot:safe-lock:moto-0062', '{}');
    await redis.hset('iot:relay-lock:index', { 'moto-0062': '{}' });
    await expect(assertNoPendingLock(redis, 'moto-0061')).resolves.toBeUndefined();
  });

  it('erro de leitura do Redis propaga (falha fechada)', async () => {
    const redis = { exists: jest.fn().mockRejectedValue(new Error('down')), hgetall: jest.fn().mockRejectedValue(new Error('down')) } as unknown as RedisStore;
    await expect(assertNoPendingLock(redis, 'moto-0061')).rejects.toThrow('down');
  });
});

describe('N5: connectProvisioningRedis (REDIS_URL, falha fechada)', () => {
  const store = (ping: () => Promise<boolean>) => ({ ping: jest.fn(ping), close: jest.fn(async () => undefined) }) as unknown as RedisStore & { close: jest.Mock };

  it.each([[undefined], [''], ['memory']])('REDIS_URL=%p → erro claro (não há como ver as travas da API)', async (url) => {
    const factory = jest.fn();
    await expect(connectProvisioningRedis({ REDIS_URL: url }, factory)).rejects.toThrow('REDIS_URL');
    expect(factory).not.toHaveBeenCalled();
  });

  it('Redis que não responde PONG → erro e conexão fechada', async () => {
    const s = store(async () => false);
    await expect(connectProvisioningRedis({ REDIS_URL: 'redis://x:6379' }, () => s)).rejects.toThrow('Redis inacessível');
    expect(s.close).toHaveBeenCalled();
  });

  it('Redis que não responde no prazo → erro', async () => {
    const s = store(() => new Promise<boolean>(() => undefined));
    await expect(connectProvisioningRedis({ REDIS_URL: 'redis://x:6379' }, () => s, 20)).rejects.toThrow('Redis inacessível');
    expect(s.close).toHaveBeenCalled();
  });

  it('Redis no ar → devolve o store', async () => {
    const s = store(async () => true);
    await expect(connectProvisioningRedis({ REDIS_URL: 'redis://x:6379' }, () => s)).resolves.toBe(s);
  });
});
