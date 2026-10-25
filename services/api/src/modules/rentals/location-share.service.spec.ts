import { ProblemException } from '../../common/problem';
import { LocationShareService, sharePageHtml } from './location-share.service';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const NOW = new Date('2026-10-24T12:00:00Z');

function setup(o: { share?: object | null; rental?: object | null; live?: object | null } = {}) {
  const share = o.share === undefined ? { token: TOKEN, rentalId: 'r1', expiresAt: new Date('2026-10-24T12:30:00Z') } : o.share;
  const rental =
    o.rental === undefined
      ? { status: 'active', customer: { locationConsent: true }, vehicle: { thingName: 'moto-1', lat: -23.5, lng: -46.6, lastSeenAt: new Date('2026-10-24T11:59:00Z') } }
      : o.rental;
  const prisma = { locationShare: { findUnique: jest.fn().mockResolvedValue(share) }, rental: { findUnique: jest.fn().mockResolvedValue(rental) } };
  const iot = { getLiveState: jest.fn().mockResolvedValue(o.live ?? null) };
  return { svc: new LocationShareService(prisma as never, iot as never), prisma, iot };
}

async function status(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof ProblemException ? e.getStatus() : 500;
  }
}

describe('LocationShareService (SOS, lacunas T5)', () => {
  it('devolve só posição, horário e validade', async () => {
    const { svc } = setup();
    expect(await svc.get(TOKEN, NOW)).toEqual({ lat: -23.5, lng: -46.6, recordedAt: '2026-10-24T11:59:00.000Z', expiresAt: '2026-10-24T12:30:00.000Z' });
  });

  it('estado ao vivo mais novo que o cadastro → posição ao vivo', async () => {
    const { svc } = setup({ live: { lat: -23.51, lng: -46.61, lastSeenAt: '2026-10-24T11:59:55.000Z' } });
    expect(await svc.get(TOKEN, NOW)).toMatchObject({ lat: -23.51, lng: -46.61, recordedAt: '2026-10-24T11:59:55.000Z' });
  });

  it('estado ao vivo vazio (0,0) ou mais velho → cadastro', async () => {
    expect(await setup({ live: { lat: 0, lng: 0, lastSeenAt: '2026-10-24T11:59:58.000Z' } }).svc.get(TOKEN, NOW)).toMatchObject({ lat: -23.5 });
    expect(await setup({ live: { lat: -1, lng: -1, lastSeenAt: '2026-10-24T11:00:00.000Z' } }).svc.get(TOKEN, NOW)).toMatchObject({ lat: -23.5 });
  });

  it.each([
    ['token malformado', {}, 'x<script>'],
    ['token desconhecido', { share: null }, TOKEN],
    ['link expirado', { share: { token: TOKEN, rentalId: 'r1', expiresAt: new Date('2026-10-24T11:00:00Z') } }, TOKEN],
    ['aluguel encerrado', { rental: { status: 'ended', customer: { locationConsent: true }, vehicle: { thingName: 'm', lat: 1, lng: 1, lastSeenAt: NOW } } }, TOKEN],
    ['consentimento revogado', { rental: { status: 'active', customer: { locationConsent: false }, vehicle: { thingName: 'm', lat: 1, lng: 1, lastSeenAt: NOW } } }, TOKEN],
    ['sem posição conhecida', { rental: { status: 'active', customer: { locationConsent: true }, vehicle: { thingName: 'm', lat: 0, lng: 0, lastSeenAt: null } } }, TOKEN],
  ])('%s → 404', async (_n, o, token) => {
    expect(await status(setup(o).svc.get(token, NOW))).toBe(404);
  });

  it('página: token inválido nunca entra no HTML; nonce no script e no estilo', () => {
    const html = sharePageHtml('"></script><script>alert(1)</script>', 'NONCE123');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('var token = "";');
    expect(html).toContain('<script nonce="NONCE123">');
    expect(html).toContain('<style nonce="NONCE123">');
    expect(sharePageHtml(TOKEN, 'n')).toContain(`var token = "${TOKEN}";`);
  });
});
