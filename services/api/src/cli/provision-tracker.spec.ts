import { linkMqttTracker } from './provision-tracker';

function fakes(openRental = false) {
  const calls: string[] = [];
  const tx = {
    vehicle: { update: jest.fn(async () => void calls.push('vehicle.update')) },
    tracker: {
      updateMany: jest.fn(async () => void calls.push('tracker.updateMany')),
      upsert: jest.fn(async () => void calls.push('tracker.upsert')),
    },
    rental: { findFirst: jest.fn().mockResolvedValue(openRental ? { id: 'r-1' } : null) },
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
