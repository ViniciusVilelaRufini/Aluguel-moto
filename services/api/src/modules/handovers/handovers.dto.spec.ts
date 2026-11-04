import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HandoverCreateDto } from './handovers.dto';

/** Entrega sem QR (2026-11-04): `reservationId` + `noCodeReason` no lugar do `pickupCode`, os dois juntos. */
const RES_ID = '44444444-4444-4444-8444-444444444444';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const base = { type: 'pickup', checklist: [{ code: 'freios', ok: true }], photoKeys: [], batteryPct: 80 };
const errorsFor = async (body: object) => (await validate(plainToInstance(HandoverCreateDto, body))).map((e) => e.property).sort();

describe('HandoverCreateDto: saída com ou sem QR', () => {
  it('pickup com código continua aceito; sem código e sem reserva → pickupCode obrigatório', async () => {
    expect(await errorsFor({ ...base, pickupCode: 'v1.codigo-qualquer' })).toEqual([]);
    expect(await errorsFor(base)).toEqual(['pickupCode']);
  });

  it('sem QR: reservationId + motivo (10 a 300) + depotId aceito; sem depotId → erro', async () => {
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, reservationId: RES_ID, noCodeReason: 'Celular sem bateria.' })).toEqual([]);
    expect(await errorsFor({ ...base, reservationId: RES_ID, noCodeReason: 'Celular sem bateria.' })).toEqual(['depotId']);
  });

  it('sem QR pela metade ou com motivo fora do tamanho → erro no campo', async () => {
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, reservationId: RES_ID })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, noCodeReason: 'Celular sem bateria.' })).toEqual(['reservationId']);
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, reservationId: RES_ID, noCodeReason: 'curto' })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, reservationId: RES_ID, noCodeReason: 'x'.repeat(301) })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, depotId: DEPOT_ID, reservationId: 'nao-e-uuid', noCodeReason: 'Celular sem bateria.' })).toEqual(['reservationId']);
  });
});
