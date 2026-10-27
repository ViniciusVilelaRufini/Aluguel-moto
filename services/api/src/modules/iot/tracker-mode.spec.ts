import { FakeClock } from './clock';
import { PrismaTrackerModeLookup } from './tracker-mode';

describe('PrismaTrackerModeLookup', () => {
  it('lê o controlMode do Tracker da moto, guarda por 60 s; sem Tracker = speed_control', async () => {
    const clock = new FakeClock(0);
    const findUnique = jest.fn(async ({ where }: { where: { vehicleId: string } }) => (where.vehicleId === 'v-relay' ? { controlMode: 'relay_only' } : null));
    const modes = new PrismaTrackerModeLookup({ tracker: { findUnique } } as any, clock);
    expect(await modes.byVehicle('v-relay')).toBe('relay_only');
    expect(await modes.byVehicle('v-relay')).toBe('relay_only');
    expect(await modes.byVehicle('v-none')).toBe('speed_control');
    expect(findUnique).toHaveBeenCalledTimes(2);
    await clock.advance(60_000);
    await modes.byVehicle('v-relay');
    expect(findUnique).toHaveBeenCalledTimes(3);
    modes.invalidate('v-relay');
    await modes.byVehicle('v-relay');
    expect(findUnique).toHaveBeenCalledTimes(4);
  });
});
