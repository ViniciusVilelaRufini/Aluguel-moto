import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type IotCommandUpdatedEvent } from '../../common/events';
import { ProblemException } from '../../common/problem';
import { MemoryRedisStore } from '../../redis/redis-store';
import type { AuditActor } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { RentalsService } from '../rentals/rentals.service';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from './shadow-transport';

/**
 * Item adiado 1 da auditoria: destravar pedido por cliente/campo não desfaz trava da equipe, do sistema (cerca, hold) nem
 * modo roubada. Ponta a ponta sem serviços externos: RentalsService → CommandsService → BaseIotGateway real (rampa de
 * bloqueio seguro, LiveStateStore sobre Redis em memória) → transporte falso que registra tudo o que seria publicado.
 */

class FakeTransport implements IotTransport {
  readonly desired: Array<{ thingName: string; desired: DesiredState }> = [];
  autoReport?: (thingName: string, desired: DesiredState) => void;
  async updateDesired(thingName: string, desired: DesiredState) {
    this.desired.push({ thingName, desired });
    this.autoReport?.(thingName, desired);
  }
  async publishCommand(_t: string, _c: MomentaryCommand) {}
  async start() {}
  async stop() {}
}

class TestGateway extends BaseIotGateway {}

const T = 'moto-0001';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const RENTAL_ID = '55555555-5555-4555-8555-555555555555';
const CUSTOMER_ID = '66666666-6666-4666-8666-666666666666';

const customer: Principal = { pool: 'customer', sub: 'c', email: 'cli@ex.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID };
const admin: Principal = { pool: 'staff', sub: 'a', email: 'adm@volti.com.br', groups: ['admin'], userId: 'staff-adm', staffId: 'staff-adm' };
const field: Principal = { pool: 'staff', sub: 'f', email: 'campo@volti.com.br', groups: ['campo'], userId: 'staff-campo', staffId: 'staff-campo' };
const GEOFENCE: AuditActor = { system: true, name: 'geofence' };

const telemetry = (speed: number, ts: number) => ({ lat: -23.56, lng: -46.69, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(ts).toISOString() });

async function setup(opts: { speed?: number; stolenMode?: boolean } = {}) {
  const clock = new FakeClock(Date.parse('2026-10-26T15:00:00Z'));
  const transport = new FakeTransport();
  const events = new EventEmitter2();
  const redis = new MemoryRedisStore();
  const live = new LiveStateStore(redis, clock);
  const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  gw.setLimitResolver(async () => 32);
  // Moto online com velocidade conhecida (depois da graça pós-conexão de 10 s).
  await live.applyTelemetry(T, telemetry(opts.speed ?? 0, clock.now()));
  await clock.advance(10_000);
  await live.applyTelemetry(T, telemetry(opts.speed ?? 0, clock.now()));
  // Rastreador obediente: reporta o que foi pedido.
  transport.autoReport = (t, d) => {
    const r: Record<string, unknown> = {};
    if (d.travada !== undefined) r.travada = d.travada;
    if (d.limite_kmh !== undefined) r.limite_kmh = d.limite_kmh;
    void gw.onReported(t, r);
  };

  // Banco falso mínimo (moto, comandos, aluguel).
  const vehicle = { id: VEHICLE_ID, code: 'VLT-0001', thingName: T, status: 'rented', stolenMode: !!opts.stolenMode, lat: -23.56, lng: -46.69 };
  const commands = new Map<string, any>();
  let seq = 0;
  const rental: any = { id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active', pausedAt: null, pausedSecondsAcc: 0, startedAt: new Date(clock.now()), vehicle };
  const prisma: any = {
    vehicle: {
      findUnique: jest.fn(async () => vehicle),
      update: jest.fn(async () => vehicle),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    vehicleCommand: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `cmd-${++seq}`, statusReason: null, requestedByName: null, confirmedAt: null, createdAt: new Date(), updatedAt: new Date(), ...data };
        commands.set(row.id, row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const row = commands.get(where.id);
        if (!row || !where.status.in.includes(row.status)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      findUnique: jest.fn(async ({ where }: any) => commands.get(where.id) ?? null),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => commands.get(where.id)),
    },
    rental: {
      findUnique: jest.fn(async () => ({ ...rental })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (rental.status !== where.status) return { count: 0 };
        Object.assign(rental, data);
        return { count: 1 };
      }),
    },
    rentalEvent: { create: jest.fn(async () => ({})) },
    staffUser: { findMany: jest.fn(async () => []) },
    customer: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const audit: any = { record: jest.fn(async () => undefined) };
  const svc = new CommandsService(prisma, audit, gw, events);
  events.on(EV.IOT_COMMAND_UPDATED, (ev: IotCommandUpdatedEvent) => void svc.onIotCommandUpdated(ev));
  const rentals = new RentalsService(prisma, svc, {} as any, events, {} as any, gw, {} as any);
  // A apresentação do aluguel (preço, eventos) não importa aqui.
  jest.spyOn(rentals as any, 'afterChange').mockImplementation(async () => ({ ...rental }));

  /** Roda a ação avançando o relógio falso (espera de confirmação de 3 s). */
  const run = async <R>(fn: () => Promise<R>): Promise<R> => {
    const p = fn();
    p.catch(() => undefined);
    await clock.advance(3_000);
    return p;
  };
  const unlocksPublished = () => transport.desired.filter((d) => d.desired.travada === false);
  return { clock, transport, live, gw, svc, rentals, rental, run, unlocksPublished };
}

async function expectLockedByStaff(p: Promise<unknown>) {
  const err = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ProblemException);
  expect((err as ProblemException).getStatus()).toBe(409);
  expect((err as ProblemException).getResponse()).toEqual(
    expect.objectContaining({ detail: 'A moto foi bloqueada pela equipe. Fale com o suporte.' }),
  );
}

describe('Destravar respeita a autoridade de quem travou (auditoria, item adiado 1)', () => {
  it('(a) cerca trava (system) → cliente pausa e retoma → 409, aluguel continua paused e nenhum travada:false publicado', async () => {
    const s = await setup();
    const geo = await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Fora da área de operação', actor: GEOFENCE, context: { rentalId: RENTAL_ID, purpose: 'out_of_area' } }));
    expect(geo.status).toBe('confirmed');
    expect(await s.live.getLockOrigin(T)).toBe('system');

    await s.run(() => s.rentals.pause(customer, RENTAL_ID));
    expect(s.rental.status).toBe('paused');
    expect(await s.live.getLockOrigin(T)).toBe('system'); // a pausa do cliente não rebaixa a origem

    await expectLockedByStaff(s.run(() => s.rentals.resume(customer, RENTAL_ID)));
    expect(s.rental.status).toBe('paused');
    expect(s.unlocksPublished()).toEqual([]);
  });

  it('(b) admin trava → service-unlock por operador só de campo → recusado (locked_by_staff), nada publicado', async () => {
    const s = await setup();
    await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio administrativo', actor: admin }));
    expect(await s.live.getLockOrigin(T)).toBe('staff');
    const before = s.transport.desired.length;

    const res = await s.run(() =>
      s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'unlock', reason: 'Troca de bateria', actor: field, context: { purpose: 'service_unlock' }, auditAction: 'vehicle.service_unlock' }),
    );
    expect(res).toEqual(expect.objectContaining({ status: 'failed', statusReason: 'locked_by_staff' }));
    expect(s.transport.desired.length).toBe(before);
    expect(await s.live.getLockOrigin(T)).toBe('staff');
  });

  it('(c) pausa com a moto em movimento que não para (did_not_stop → hold em 0) → retomada recusada, limite segue em 0', async () => {
    const s = await setup({ speed: 25 });
    await s.run(() => s.rentals.pause(customer, RENTAL_ID));
    await s.clock.advance(120_000); // rampa sem parar → did_not_stop, limite segurado em 0
    expect(await s.live.isHeld(T)).toBe(true);
    const before = s.transport.desired.length;

    await expectLockedByStaff(s.run(() => s.rentals.resume(customer, RENTAL_ID)));
    expect(s.rental.status).toBe('paused');
    expect(s.transport.desired.length).toBe(before);
    expect(s.unlocksPublished()).toEqual([]);
    expect(await s.live.isHeld(T)).toBe(true);
  });

  it('(c2) recusa durante a rampa de um bloqueio da equipe não interrompe a rampa (nada publicado, limite não sobe)', async () => {
    const s = await setup({ speed: 25 });
    await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio administrativo', actor: admin }));
    expect(s.gw.safeLock.isActive(T)).toBe(true);
    const before = s.transport.desired.length;
    const res = await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'unlock', reason: 'Retomada', actor: customer }));
    expect(res.statusReason).toBe('locked_by_staff');
    expect(s.gw.safeLock.isActive(T)).toBe(true);
    expect(s.transport.desired.slice(before).some((d) => d.desired.travada === false || (d.desired.limite_kmh ?? 0) > 15)).toBe(false);
  });

  it('(d) cliente pausa → cliente retoma → permitido (travada:false publicado, aluguel active, origem limpa)', async () => {
    const s = await setup();
    await s.run(() => s.rentals.pause(customer, RENTAL_ID));
    expect(await s.live.getLockOrigin(T)).toBe('customer');

    await s.run(() => s.rentals.resume(customer, RENTAL_ID));
    expect(s.rental.status).toBe('active');
    expect(s.unlocksPublished()).toHaveLength(1);
    expect(await s.live.getLockOrigin(T)).toBeNull();
  });

  it('(e) admin desfaz a trava do sistema → permitido; depois o cliente pausa e retoma normalmente', async () => {
    const s = await setup();
    await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Fora da área de operação', actor: GEOFENCE, context: { purpose: 'out_of_area' } }));
    const res = await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'unlock', reason: 'Cliente orientado pelo suporte', actor: admin }));
    expect(res.status).toBe('confirmed');
    expect(await s.live.getLockOrigin(T)).toBeNull();
    expect(s.unlocksPublished()).toHaveLength(1);

    await s.run(() => s.rentals.pause(customer, RENTAL_ID));
    await s.run(() => s.rentals.resume(customer, RENTAL_ID));
    expect(s.rental.status).toBe('active');
    expect(s.unlocksPublished()).toHaveLength(2);
  });

  it('admin desfaz o hold (did_not_stop) → permitido e solta o limite', async () => {
    const s = await setup({ speed: 25 });
    await s.run(() => s.rentals.pause(customer, RENTAL_ID));
    await s.clock.advance(120_000);
    const res = await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'unlock', reason: 'Moto parada, conferida pela equipe', actor: admin }));
    expect(res.status).toBe('confirmed');
    expect(await s.live.isHeld(T)).toBe(false);
  });

  it('modo roubada no cadastro → retomada do cliente recusada sem chamar o gateway', async () => {
    const s = await setup({ stolenMode: true });
    const unlock = jest.spyOn(s.gw, 'unlock');
    s.rental.status = 'paused';
    await expectLockedByStaff(s.run(() => s.rentals.resume(customer, RENTAL_ID)));
    expect(unlock).not.toHaveBeenCalled();
    expect(s.unlocksPublished()).toEqual([]);
  });

  it('encerramento do aluguel (trava de sistema "estacionar") não impede o próximo cliente de destravar', async () => {
    const s = await setup();
    await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Encerramento do aluguel', actor: { system: true, name: 'encerramento' }, context: { purpose: 'rental_end' } }));
    expect(await s.live.getLockOrigin(T)).toBeNull();
    const res = await s.run(() => s.svc.dispatch({ vehicleId: VEHICLE_ID, type: 'unlock', reason: 'Início do aluguel', actor: customer, context: { purpose: 'rental_start' } }));
    expect(res.status).toBe('confirmed');
  });

  it('gateway sem autoridade no pedido: unlock tratado como cliente (recusado) e lock como sistema', async () => {
    const s = await setup();
    await s.run(() => s.gw.lock({ commandId: 'x1', thingName: T }));
    expect(await s.live.getLockOrigin(T)).toBe('system');
    expect(await s.gw.unlock({ commandId: 'x2', thingName: T })).toEqual({ commandId: 'x2', status: 'failed', reason: 'locked_by_staff' });
    expect(s.unlocksPublished()).toEqual([]);
  });

  it('verificação compartilhada (CommandsService.isLockedByStaff): origem staff/system, hold ou modo roubada = bloqueada', async () => {
    const s = await setup();
    const v = { id: VEHICLE_ID, thingName: T, stolenMode: false };
    expect(await s.svc.isLockedByStaff(v)).toBe(false);
    await s.live.setLockOrigin(T, 'customer');
    expect(await s.svc.isLockedByStaff(v)).toBe(false);
    await s.live.setLockOrigin(T, 'system');
    expect(await s.svc.isLockedByStaff(v)).toBe(true);
    await s.live.setLockOrigin(T, null);
    await s.live.setHeld(T, true);
    expect(await s.svc.isLockedByStaff(v)).toBe(true);
    await s.live.setHeld(T, false);
    expect(await s.svc.isLockedByStaff({ ...v, stolenMode: true })).toBe(true);
    expect(s.unlocksPublished()).toEqual([]);
  });

  it('erro do Redis ao ler a origem → unlock de cliente recusado (falha fechada)', async () => {
    const s = await setup();
    const redisErr = new MemoryRedisStore();
    jest.spyOn(redisErr, 'hgetall').mockRejectedValue(new Error('redis down'));
    const failing = new LiveStateStore(redisErr, s.clock);
    expect(await failing.getLockOrigin(T)).toBe('system');
    void s;
  });
});
