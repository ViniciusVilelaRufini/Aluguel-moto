import jestOpenAPI from 'jest-openapi';
import { loadSpecAs30 } from '../test/contract/openapi-30';
import { STATION_THING } from './modules/swap-stations/swap-stations.dto';
import { toSwapStationAdmin } from './modules/swap-stations/swap-stations.mapper';

jestOpenAPI(loadSpecAs30() as any);

/** Cadastro de estações pelo painel (Task 12 das lacunas, 2026-10-24): schemas aditivos e mapeador conforme o contrato. */
describe('contrato do cadastro de estações de troca', () => {
  const c = loadSpecAs30() as any;
  const s = c.components.schemas;
  const now = new Date('2026-10-24T15:00:00Z');
  const row = {
    id: 'd0000000-0000-4000-8000-000000000001', name: 'Estação Largo da Batata', address: 'Largo da Batata, 40', lat: -23.5672, lng: -46.693,
    availableBatteries: 9, totalSlots: 12, openingHours: 'Todos os dias, 24 h', open24h: true, active: true, stationCode: 'vst1.x.y', thingName: null,
    createdAt: now, updatedAt: now,
  };

  it('mapeador: thing padrão, thing do cadastro, galpões ligados; nunca o QR', () => {
    const out = toSwapStationAdmin(row, { batteriesInStation: 10, openSwaps: 1, depotIds: ['e0000000-0000-4000-8000-000000000001'] });
    expect(out).toSatisfySchemaInApiSpec('SwapStationAdmin');
    expect(out.thingName).toBe(`station-${row.id}`);
    expect(out).not.toHaveProperty('stationCode');
    const custom = toSwapStationAdmin({ ...row, active: false, thingName: 'station-aaaaaaaa-0000-4000-8000-000000000009' }, { batteriesInStation: 0, openSwaps: 0, depotIds: [] });
    expect(custom).toSatisfySchemaInApiSpec('SwapStationAdmin');
    expect(custom.thingName).toBe('station-aaaaaaaa-0000-4000-8000-000000000009');
    expect({ items: [out, custom] }).toSatisfySchemaInApiSpec('SwapStationAdminList');
  });

  it('o QR nunca sai em SwapStationAdmin; entrada sem availableBatteries (estoque vem das baterias)', () => {
    expect(Object.keys(s.SwapStationAdmin.properties)).not.toContain('stationCode');
    expect(Object.keys(s.SwapStationInput.properties)).not.toContain('availableBatteries');
    expect(Object.keys(s.SwapStationUpdate.properties)).not.toContain('availableBatteries');
    expect(s.SwapStationInput.required).toEqual(['name', 'address', 'lat', 'lng', 'totalSlots']);
    expect(s.SwapStationInput.properties.totalSlots).toMatchObject({ minimum: 1 });
    expect(s.SwapStationUpdate.required ?? []).toEqual([]);
  });

  it('thingName: o mesmo padrão no contrato e no DTO (station-<uuid>)', () => {
    expect(new RegExp(s.SwapStationInput.properties.thingName.pattern).source).toBe(STATION_THING.source);
    expect(s.SwapStationUpdate.properties.thingName.pattern).toBe(s.SwapStationInput.properties.thingName.pattern);
    expect(STATION_THING.test('station-d0000000-0000-4000-8000-000000000001')).toBe(true);
    expect(STATION_THING.test('moto-0001')).toBe(false);
    expect(STATION_THING.test('station-D0000000-0000-4000-8000-000000000001')).toBe(false);
  });

  it('galpão: clearSwapStation (sem null no contrato) só na edição', () => {
    expect(s.DepotUpdate.properties.clearSwapStation).toMatchObject({ type: 'boolean' });
    expect(s.DepotInput.properties).not.toHaveProperty('clearSwapStation');
  });
});
