import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HandoverCreateDto } from './handovers.dto';

/** Entrega sem QR (2026-11-04): `reservationId` + `noCodeReason` no lugar do `pickupCode`, os dois juntos. */
const RES_ID = '44444444-4444-4444-8444-444444444444';
const base = { type: 'pickup', checklist: [{ code: 'freios', ok: true }], photoKeys: [], batteryPct: 80 };
const errorsFor = async (body: object) => (await validate(plainToInstance(HandoverCreateDto, body))).map((e) => e.property).sort();

describe('HandoverCreateDto: saída com ou sem QR', () => {
  it('pickup com código continua aceito; sem código e sem reserva → pickupCode obrigatório', async () => {
    expect(await errorsFor({ ...base, pickupCode: 'v1.codigo-qualquer' })).toEqual([]);
    expect(await errorsFor(base)).toEqual(['pickupCode']);
  });

  it('sem QR: reservationId + motivo (10 a 300) aceito', async () => {
    expect(await errorsFor({ ...base, reservationId: RES_ID, noCodeReason: 'Celular sem bateria.' })).toEqual([]);
  });

  it('sem QR pela metade ou com motivo fora do tamanho → erro no campo', async () => {
    expect(await errorsFor({ ...base, reservationId: RES_ID })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, noCodeReason: 'Celular sem bateria.' })).toEqual(['reservationId']);
    expect(await errorsFor({ ...base, reservationId: RES_ID, noCodeReason: 'curto' })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, reservationId: RES_ID, noCodeReason: 'x'.repeat(301) })).toEqual(['noCodeReason']);
    expect(await errorsFor({ ...base, reservationId: 'nao-e-uuid', noCodeReason: 'Celular sem bateria.' })).toEqual(['reservationId']);
  });
});
