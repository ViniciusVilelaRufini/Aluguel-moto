import { FLEET_SQL } from './fleet-source';

describe('FLEET_SQL', () => {
  it('não simula motos com rastreador só relé (o J16 ou o emulador GT06 publica por elas)', () => {
    expect(FLEET_SQL).toMatch(/LEFT JOIN "Tracker" t ON t\."vehicleId" = v\."id"/);
    expect(FLEET_SQL).toMatch(/WHERE t\."controlMode" IS DISTINCT FROM 'relay_only'/);
  });
});
