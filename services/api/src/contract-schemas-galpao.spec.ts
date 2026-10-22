import { loadSpecAs30 } from '../test/contract/openapi-30';

/** Contrato do galpão (retirada em galpão, 2026-10-22): só acréscimos, compatíveis com os clientes atuais. */
describe('contrato do galpão', () => {
  const c = loadSpecAs30() as any;
  const s = c.components.schemas;

  it('VehicleStatus e ReservationStatus ganham valores novos sem remover os antigos', () => {
    expect(s.VehicleStatus.enum).toEqual(expect.arrayContaining(['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline', 'awaiting_pickup']));
    expect(s.ReservationStatus.enum).toEqual(expect.arrayContaining(['active', 'converted', 'canceled', 'expired', 'handover']));
  });

  it('VehicleStatusCounts (painel) conta todos os status da moto, inclusive awaiting_pickup', () => {
    expect([...s.VehicleStatusCounts.required].sort()).toEqual([...s.VehicleStatus.enum].sort());
    expect(s.VehicleStatusCounts.properties.awaiting_pickup).toMatchObject({ type: 'integer', minimum: 0 });
  });

  it('ReservationCreate continua aceitando só vehicleId (compatível)', () => {
    expect(s.ReservationCreate.required).toEqual(['vehicleId']);
    expect(Object.keys(s.ReservationCreate.properties)).toEqual(
      expect.arrayContaining(['vehicleId', 'depotId', 'pickupMode', 'pickupAt', 'planCode', 'coverage', 'depositMethod', 'cardId', 'couponCode']),
    );
    expect(Object.keys(s.Reservation.properties)).toEqual(expect.arrayContaining(['depotId', 'pickupMode', 'pickupAt', 'planCode', 'coverage', 'depositMethod', 'pickupCode']));
    expect(s.Reservation.required).toEqual(['id', 'vehicleId', 'status', 'createdAt', 'expiresAt']);
  });

  it('accept exige Idempotency-Key e devolve o aluguel', () => {
    const op = c.paths['/handovers/{id}/accept'].post;
    expect(op.parameters.map((p: any) => p.$ref ?? p.name)).toEqual(expect.arrayContaining([expect.stringMatching(/IdempotencyKey$|Idempotency-Key/)]));
    const ok = op.responses['201'] ?? op.responses['200'];
    expect(ok.content['application/json'].schema.$ref).toBe('#/components/schemas/Rental');
  });

  it('Depot tem os prazos padrão documentados', () => {
    const p = s.Depot.properties;
    expect(p.pickupNowWindowMinutes.default).toBe(120);
    expect(p.maxScheduleDays.default).toBe(7);
    expect(p.scheduledGraceMinutes.default).toBe(30);
    expect(s.DepotOpeningHours.properties.weekday).toMatchObject({ minimum: 0, maximum: 6 });
  });

  it('Handover, enums e moto do galpão', () => {
    expect(s.HandoverType.enum).toEqual(['pickup', 'return_depot']);
    expect(s.HandoverStatus.enum).toEqual(['pending_customer', 'accepted', 'disputed', 'canceled']);
    expect(s.HandoverChecklistItem.required).toEqual(['code', 'ok']);
    expect(s.HandoverDispute.required).toEqual(['reason']);
    expect(s.Vehicle.properties.depotId).toBeDefined();
    expect(s.LgpdExport.properties.depotReservations).toBeDefined();
    expect(s.LgpdExport.properties.handovers).toBeDefined();
    for (const name of ['Depot', 'DepotInput', 'DepotUpdate', 'DepotList', 'DepotVehicleList', 'DepotPickupList', 'Handover', 'HandoverCreate']) expect(s[name]).toBeDefined();
  });

  it('rotas e grupos do galpão e da entrega', () => {
    const groups = (path: string, method: string) => c.paths[path][method]['x-required-groups'];
    const schemes = (path: string, method: string) => c.paths[path][method].security.map((x: any) => Object.keys(x)[0]).sort();
    expect(schemes('/depots', 'get')).toEqual(['customerAuth', 'staffAuth']);
    expect(schemes('/depots/{id}', 'get')).toEqual(['customerAuth', 'staffAuth']);
    expect(schemes('/depots/{id}/vehicles', 'get')).toEqual(['customerAuth', 'staffAuth']);
    expect([...groups('/depots', 'post')].sort()).toEqual(['admin', 'operacao']);
    expect([...groups('/depots/{id}', 'patch')].sort()).toEqual(['admin', 'operacao']);
    expect([...groups('/depots/{id}/pickups', 'get')].sort()).toEqual(['admin', 'campo', 'operacao']);
    expect(c.paths['/depots/{id}/pickups'].get.parameters.find((p: any) => p.name === 'date')).toMatchObject({ required: true, schema: { format: 'date' } });
    expect([...groups('/handovers', 'post')].sort()).toEqual(['admin', 'campo', 'operacao']);
    expect([...groups('/handovers', 'get')].sort()).toEqual(['admin', 'campo', 'operacao', 'suporte']);
    expect([...groups('/handovers/uploads', 'post')].sort()).toEqual(['admin', 'campo', 'operacao']);
    expect(schemes('/handovers/{id}', 'get')).toEqual(['customerAuth', 'staffAuth']);
    expect(schemes('/handovers/{id}/accept', 'post')).toEqual(['customerAuth']);
    expect(schemes('/handovers/{id}/dispute', 'post')).toEqual(['customerAuth']);
  });

  it('eventos de tempo real da entrega documentados em x-ws-events', () => {
    expect(c['x-ws-events']['handover.pending'].payload.required).toEqual(['handoverId', 'reservationId']);
    expect(c['x-ws-events']['handover.updated'].payload.required).toEqual(['handoverId', 'status']);
    const status = c['x-ws-events']['handover.updated'].payload.properties.status;
    if (status.$ref) expect(status.$ref).toBe('#/components/schemas/HandoverStatus');
    else expect(status.enum).toEqual(s.HandoverStatus.enum);
  });

  // Fix round 1
  it('accept e dispute respondem 400 (Idempotency-Key ausente/curta, corpo inválido)', () => {
    expect(c.paths['/handovers/{id}/accept'].post.responses['400'].$ref).toBe('#/components/responses/BadRequest');
    expect(c.paths['/handovers/{id}/dispute'].post.responses['400'].$ref).toBe('#/components/responses/BadRequest');
  });

  it('moto do galpão só sai pela entrega: rentals, reserva de rua e nearby documentam a regra', () => {
    const rentals = c.paths['/rentals'].post;
    expect(rentals.description).toMatch(/depotId/);
    expect(rentals.description).toMatch(/vehicle-unavailable/);
    expect(rentals.responses['409']).toBeDefined();
    const reserve = c.paths['/reservations'].post;
    expect(reserve.description).toMatch(/Sem `depotId`[\s\S]*depotId[\s\S]*vehicle-unavailable/);
    const nearby = c.paths['/vehicles/nearby'].get.description;
    expect(nearby).toMatch(/depotId/);
    expect(nearby).toMatch(/awaiting_pickup/);
  });

  it('reserva atual inclui handover; cancelar libera a caução e é 409 reservation-in-handover durante a entrega', () => {
    expect(c.paths['/reservations/current'].get.description).toMatch(/handover/);
    const del = c.paths['/reservations/{id}'].delete;
    expect(del.description).toMatch(/caução/);
    expect(del.description).toMatch(/reservation-in-handover/);
    expect(del.responses['409']).toBeDefined();
    expect(c.info.description).toMatch(/reservation-in-handover/);
  });

  it('agenda de retiradas aceita filtro opcional de status; outro cliente no accept/dispute recebe 404', () => {
    const st = c.paths['/depots/{id}/pickups'].get.parameters.find((p: any) => p.name === 'status');
    expect(st.required ?? false).toBe(false);
    expect(st.schema.$ref).toBe('#/components/schemas/ReservationStatus');
    expect(c.paths['/handovers/{id}/accept'].post.description).toMatch(/outro cliente → `404`/);
    expect(c.paths['/handovers/{id}/dispute'].post.description).toMatch(/outro cliente → `404`/);
    expect(s.Depot.properties).not.toHaveProperty('isOpenNow');
    expect(s.Depot.properties).not.toHaveProperty('slots');
    expect(s.Handover.properties.operatorFirstName.description).toMatch(/primeiro nome/i);
  });
});
