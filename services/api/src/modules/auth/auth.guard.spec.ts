import request from 'supertest';
import { createHarness, customerToken, Harness, staffToken } from '../../../test/helpers/http-harness';
import { IOT_GATEWAY } from '../../ports/iot-gateway.port';
import { CommandsController } from '../commands/commands.controller';
import { CommandsService } from '../commands/commands.service';
import { PrincipalResolver } from './principal-resolver.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';

describe('AuthGuard (grupos e pools)', () => {
  let h: Harness;
  const commands = { dispatch: jest.fn(), listForVehicle: jest.fn(), get: jest.fn() };

  beforeAll(async () => {
    h = await createHarness({
      controllers: [CommandsController],
      providers: [
        { provide: CommandsService, useValue: commands },
        { provide: IOT_GATEWAY, useValue: {} },
      ],
    });
  });
  afterAll(() => h.app.close());
  beforeEach(() => jest.clearAllMocks());

  const body = { type: 'horn', reason: 'Teste de buzina' };

  it('sem token → 401 problem+json', async () => {
    const res = await request(h.app.getHttpServer()).post(`/vehicles/${VEHICLE_ID}/commands`).send(body);
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/unauthorized');
  });

  it('token inválido → 401', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', 'Bearer abc.def.ghi')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('rota de staff com token de cliente → 403', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send(body);
    expect(res.status).toBe(403);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/forbidden');
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('grupo financeiro não acessa POST /vehicles/{id}/commands → 403', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['financeiro'])}`)
      .send(body);
    expect(res.status).toBe(403);
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('grupos campo e suporte também não enviam comandos (só admin/operacao)', async () => {
    for (const g of ['campo', 'suporte'] as const) {
      const res = await request(h.app.getHttpServer())
        .post(`/vehicles/${VEHICLE_ID}/commands`)
        .set('Authorization', `Bearer ${await staffToken([g])}`)
        .send(body);
      expect(res.status).toBe(403);
    }
  });

  it('operacao envia comando → 202', async () => {
    commands.dispatch.mockResolvedValue({ id: 'x', status: 'confirmed' });
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['operacao'])}`)
      .send(body);
    expect(res.status).toBe(202);
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
  });

  it('suporte lê o histórico de comandos (GET permitido) mas financeiro não', async () => {
    commands.listForVehicle.mockResolvedValue({ items: [] });
    const ok = await request(h.app.getHttpServer())
      .get(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['suporte'])}`);
    expect(ok.status).toBe(200);
    const no = await request(h.app.getHttpServer())
      .get(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['financeiro'])}`);
    expect(no.status).toBe(403);
  });
});

/** QA-04: a autorização vale pelos grupos atuais do cadastro (resolvidos a cada requisição), não só pelos do token. */
describe('AuthGuard (grupos atuais do cadastro, QA-04)', () => {
  let h: Harness;
  const commands = { dispatch: jest.fn(), listForVehicle: jest.fn(), get: jest.fn() };
  const resolver = { resolve: jest.fn() };

  beforeAll(async () => {
    h = await createHarness({
      controllers: [CommandsController],
      providers: [
        { provide: CommandsService, useValue: commands },
        { provide: IOT_GATEWAY, useValue: {} },
        { provide: PrincipalResolver, useValue: resolver },
      ],
    });
  });
  afterAll(() => h.app.close());
  beforeEach(() => jest.clearAllMocks());

  it('token ainda com operacao, mas o grupo foi removido no painel → 403', async () => {
    resolver.resolve.mockResolvedValue({ pool: 'staff', sub: 'staff-teste', email: '', groups: ['suporte'], userId: 's1', staffId: 's1' });
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['operacao'])}`)
      .send({ type: 'horn', reason: 'Teste de buzina' });
    expect(res.status).toBe(403);
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('grupo do token sem grupo exigido continua 403 sem consultar o cadastro', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['financeiro'])}`)
      .send({ type: 'horn', reason: 'Teste de buzina' });
    expect(res.status).toBe(403);
  });
});
