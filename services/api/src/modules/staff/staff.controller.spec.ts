import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { EV } from '../../common/events';
import { createHarness, Harness, STAFF_ID, staffToken } from '../../../test/helpers/http-harness';
import { STAFF_DIRECTORY } from '../../ports/staff-directory.port';
import { StaffController } from './staff.controller';

const OTHER = '44444444-4444-4444-8444-444444444444';

/** QA-04: mudar grupos/ativo no painel é refletido no diretório (Cognito) além do cadastro. */
describe('StaffController (QA-04)', () => {
  let h: Harness;
  const directory = { updateGroups: jest.fn().mockResolvedValue(undefined), setActive: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    h = await createHarness({ controllers: [StaffController], providers: [{ provide: STAFF_DIRECTORY, useValue: directory }] });
  });
  afterAll(() => h.app.close());
  const revoked = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    h.app.get(EventEmitter2).removeAllListeners(EV.PRINCIPAL_REVOKED);
    h.app.get(EventEmitter2).on(EV.PRINCIPAL_REVOKED, revoked);
  });

  const row = (groups: string[], active = true) => ({
    id: OTHER, cognitoSub: 'sub-op', email: 'op@volti.dev', name: 'Op', groups, active, mfaEnabled: false, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(),
  });

  it('PATCH groups → remove/adiciona no diretório', async () => {
    h.prisma.staffUser.findUnique.mockResolvedValue(row(['operacao']) as any);
    h.prisma.staffUser.update.mockResolvedValue(row(['suporte']) as any);
    const res = await request(h.app.getHttpServer())
      .patch(`/staff/${OTHER}`)
      .set('Authorization', `Bearer ${await staffToken(['admin'])}`)
      .send({ groups: ['suporte'] });
    expect(res.status).toBe(200);
    expect(directory.updateGroups).toHaveBeenCalledWith({ sub: 'sub-op', email: 'op@volti.dev' }, { add: ['suporte'], remove: ['operacao'] });
    expect(directory.setActive).not.toHaveBeenCalled();
    expect(revoked).toHaveBeenCalledWith({ pool: 'staff', userId: OTHER });
  });

  it('PATCH active:false → desativa no diretório', async () => {
    h.prisma.staffUser.findUnique.mockResolvedValue(row(['operacao']) as any);
    h.prisma.staffUser.update.mockResolvedValue(row(['operacao'], false) as any);
    await request(h.app.getHttpServer())
      .patch(`/staff/${OTHER}`)
      .set('Authorization', `Bearer ${await staffToken(['admin'])}`)
      .send({ active: false })
      .expect(200);
    expect(directory.setActive).toHaveBeenCalledWith({ sub: 'sub-op', email: 'op@volti.dev' }, false);
    expect(revoked).toHaveBeenCalledWith({ pool: 'staff', userId: OTHER });
    expect(directory.updateGroups).not.toHaveBeenCalled();
  });

  it('falha do diretório não desfaz a mudança no cadastro (a autorização já vale pelo cadastro)', async () => {
    h.prisma.staffUser.findUnique.mockResolvedValue(row(['operacao']) as any);
    h.prisma.staffUser.update.mockResolvedValue(row(['suporte']) as any);
    directory.updateGroups.mockRejectedValueOnce(new Error('cognito fora'));
    await request(h.app.getHttpServer())
      .patch(`/staff/${OTHER}`)
      .set('Authorization', `Bearer ${await staffToken(['admin'])}`)
      .send({ groups: ['suporte'] })
      .expect(200);
    expect(h.prisma.staffUser.update).toHaveBeenCalled();
    expect(STAFF_ID).toBeDefined();
  });
});
