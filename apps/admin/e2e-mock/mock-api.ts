/**
 * API mockada para o painel (sem rede, sem Docker). Intercepta TUDO que vai para API_HOST via page.route
 * e responde com fixtures no formato do contrato (packages/contracts/openapi.yaml).
 *
 * - Endpoint sem handler => 404 RFC 7807 + entrada em `mock.unmocked` (a varredura falha por isso).
 * - Tempo real: socket.io (engine.io v4 sobre WebSocket) simulado com page.routeWebSocket.
 *   `socket: 'off'` recusa a conexao (painel mostra "Reconectando").
 * - Tiles do OpenStreetMap sao respondidos com um PNG 1x1 (nenhuma chamada a servicos reais).
 */
import type { Page, Route, WebSocketRoute } from '@playwright/test';
import * as F from './fixtures';

export const API_HOST = 'http://api.mock.local';

export interface MockOptions {
  group?: 'admin' | 'operacao' | 'financeiro' | 'suporte' | 'campo';
  /** 'on' (padrao): conecta e permite `mock.emit`. 'off': recusa a conexao. */
  socket?: 'on' | 'off';
  /** Atraso artificial por resposta (ms) para observar estados de carregamento. */
  latencyMs?: number;
  /** Faz esses prefixos de caminho responderem 500 (para testar estados de erro). */
  failPaths?: string[];
}

export interface ApiCall {
  method: string; path: string; query: URLSearchParams; body: unknown;
  /** Cabeçalhos da requisição, em minúsculas (ex.: `idempotency-key`). */
  headers: Record<string, string>;
}

export interface Mock {
  calls: ApiCall[];
  unmocked: string[];
  /** Emite um evento do servidor para o painel (ex.: 'alert.created'). */
  emit: (event: string, payload: unknown) => void;
  db: ReturnType<typeof makeDb>;
}

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

function makeDb(group: NonNullable<MockOptions['group']>) {
  return {
    me: F.makeStaffMe(group === 'campo' ? 'campo' : group),
    vehicles: F.makeVehicles(),
    zones: F.makeZones(),
    alerts: F.makeAlerts(),
    customers: F.makeCustomers(),
    rentals: F.makeRentals(),
    payments: F.makePayments(),
    plans: F.makePlans(),
    fees: F.makeFees(),
    coupons: F.makeCoupons(),
    coverages: F.makeCoverages(),
    models: F.makeModels(),
    simCards: F.makeSimCards(),
    trackerConsole: F.makeTrackerConsole(),
    staff: F.makeStaff(),
    audit: F.makeAudit(),
    fieldTasks: F.makeFieldTasks(),
    maintenance: F.makeMaintenance(),
    batteries: F.makeBatteries(),
    conversations: F.makeConversations(),
    restrictions: [] as unknown[],
    depots: F.makeDepots(),
    stations: F.makeStationRegistry(),
    handovers: F.makeHandovers(),
    reservations: F.makeReservations(),
    counter: F.makeCounterState(),
    uploadSeq: 1,
    /** A próxima chegada (`return_depot`) responde 422 `vehicle-not-at-depot`. */
    returnNotAtDepot: false,
    collectLockedByStaff: false,
  };
}

/** Pagina por cursor (offset em string), igual ao contrato: `{ items, nextCursor? }`. */
function page<T>(all: T[], q: URLSearchParams) {
  const limit = Math.min(Number(q.get('limit') ?? 20) || 20, 100);
  const start = Number(q.get('cursor') ?? 0) || 0;
  const items = all.slice(start, start + limit);
  const next = start + limit < all.length ? String(start + limit) : undefined;
  return { items, ...(next ? { nextCursor: next } : {}) };
}

const problem = (status: number, title: string, slug = 'error') => ({ type: `https://api.volti.app/problems/${slug}`, title, status, detail: title });

export async function installMockApi(page_: Page, opts: MockOptions = {}): Promise<Mock> {
  const group = opts.group ?? 'admin';
  const db = makeDb(group);
  const mock: Mock = { calls: [], unmocked: [], emit: () => {}, db };

  // Tiles e qualquer outro host externo: nunca sai da maquina.
  await page_.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX }));

  await page_.route(`${API_HOST}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.startsWith('/socket.io')) return route.fulfill({ status: 404, headers: CORS });
    // Links pré-assinados dos arquivos do KYC (GET /customers/{id}/kyc-files): imagem 1x1.
    if (method === 'GET' && url.pathname.startsWith('/files/')) return route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PNG_1PX });
    let body: unknown;
    try { body = req.postDataJSON(); } catch { body = undefined; }
    mock.calls.push({ method, path: url.pathname, query: url.searchParams, body, headers: req.headers() });
    if (opts.latencyMs) await new Promise((r) => setTimeout(r, opts.latencyMs));
    const send = (status: number, json: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(json) });
    if (opts.failPaths?.some((p) => url.pathname.startsWith(p))) return send(500, problem(500, 'Falha simulada'));
    const res = handle(db, method, url.pathname, url.searchParams, body, req.headers()['idempotency-key']);
    if (res === undefined) {
      mock.unmocked.push(`${method} ${url.pathname}`);
      return send(404, problem(404, `Sem mock para ${method} ${url.pathname}`, 'not-mocked'));
    }
    return send(res.status ?? 200, res.json);
  });

  // Tempo real: engine.io v4 minimo.
  let sockets: WebSocketRoute[] = [];
  await page_.routeWebSocket(/\/socket\.io\//, (ws) => {
    if (opts.socket === 'off') { ws.close({ code: 1006, reason: 'mock-off' }); return; }
    sockets.push(ws);
    ws.send('0' + JSON.stringify({ sid: 'mock-sid', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage((m) => {
      const s = String(m);
      if (s.startsWith('40')) { const ns = s.slice(2).startsWith('/') ? s.slice(2).split(',')[0] + ',' : ''; ws.send('40' + ns + JSON.stringify({ sid: 'mock-ns' })); } // conecta o namespace /realtime
      else if (s === '2') ws.send('3');
    });
    ws.onClose(() => { sockets = sockets.filter((x) => x !== ws); });
  });
  mock.emit = (event, payload) => sockets.forEach((ws) => ws.send('42/realtime,' + JSON.stringify([event, payload])));
  return mock;
}

type Res = { status?: number; json: unknown } | undefined;
const ok = (json: unknown, status = 200): Res => ({ status, json });

function handle(db: ReturnType<typeof makeDb>, method: string, path: string, q: URLSearchParams, body: unknown, idemKey?: string): Res {
  const p = path.replace(/\/$/, '');
  const seg = p.split('/').filter(Boolean);
  // /pricing/plans/{id}, /insurance/coverages/{c}, /maintenance/tasks/{id} e /support/{recurso}/{id} levam o id no 3o segmento
  const id = ['pricing', 'insurance', 'maintenance'].includes(seg[0] ?? '') || seg[0] === 'support' ? seg[2] : seg[1];
  const b = (body ?? {}) as Record<string, unknown>;
  const match = (re: RegExp) => re.test(p);
  const find = <T extends { id: string }>(list: T[], key = id) => list.find((x) => x.id === key);
  const notFound = (): Res => ({ status: 404, json: problem(404, 'Não encontrado', 'not-found') });
  const now = new Date('2026-10-26T15:00:00.000Z').toISOString();

  if (method === 'POST' && p === '/dev/token') return ok({ accessToken: `mock.${b.sub as string}.token`, tokenType: 'Bearer', expiresIn: 3600 });
  if (method === 'GET' && p === '/me') return ok(db.me);

  // Frota
  if (method === 'GET' && p === '/vehicles') {
    const qq = (q.get('q') ?? '').toLowerCase();
    const st = q.get('status');
    return ok(page(db.vehicles.filter((v) => (!st || v.status === st) && (!qq || v.code.toLowerCase().includes(qq))), q));
  }
  if (method === 'GET' && match(/^\/vehicles\/by-code\/[^/]+$/)) { const v = db.vehicles.find((x) => x.code === seg[2]); return v ? ok(v) : notFound(); }
  if (method === 'GET' && match(/^\/vehicles\/[^/]+$/)) { const v = find(db.vehicles); return v ? ok(v) : notFound(); }
  if (method === 'GET' && match(/^\/vehicles\/[^/]+\/track$/)) {
    const v = find(db.vehicles);
    if (!v) return notFound();
    return ok({ vehicleId: v.id, points: Array.from({ length: 12 }, (_, i) => ({ lat: v.lat + i * 0.0003, lng: v.lng + i * 0.0002, speedKmh: 14 + (i % 5), recordedAt: new Date(Date.parse(now) - (12 - i) * 60_000).toISOString() })) });
  }
  if (method === 'GET' && match(/^\/vehicles\/[^/]+\/commands$/)) return ok({ items: [] });
  if (method === 'POST' && match(/^\/vehicles\/[^/]+\/commands$/)) {
    return ok({ id: 'cmd-1', vehicleId: id, type: b.type, status: 'pending', reason: b.reason, speedLimitKmh: b.speedLimitKmh, on: b.on, requestedByName: 'Ana QA', requestedByType: 'staff', createdAt: now, updatedAt: now }, 202);
  }
  if (method === 'GET' && match(/^\/commands\/[^/]+$/)) return ok({ id, vehicleId: 'veh-001', type: 'lock', status: 'confirmed', reason: 'teste', createdAt: now, updatedAt: now, confirmedAt: now });
  // Chips (SIM) e console do rastreador
  if (method === 'GET' && p === '/sim-cards') {
    const qq = (q.get('q') ?? '').toLowerCase();
    const unlinked = q.get('unlinked') === 'true';
    const st = q.get('status');
    return ok({ items: db.simCards.filter((s) => (!unlinked || !s.vehicleId) && (!st || s.status === st) && (!qq || s.iccid.includes(qq) || (s.msisdn ?? '').includes(qq))) });
  }
  if (method === 'POST' && p === '/sim-cards') {
    if (db.simCards.some((s) => s.iccid === b.iccid)) return { status: 409, json: problem(409, 'ICCID já cadastrado', 'conflict') };
    const veh = db.vehicles.find((x) => x.id === b.vehicleId);
    const s = { msisdn: null, apn: null, status: 'active', notes: null, vehicleId: null, vehicleCode: null, ...b, id: `sim-${db.simCards.length + 1}`, createdAt: now, updatedAt: now, ...(veh ? { vehicleId: veh.id, vehicleCode: veh.code } : {}) };
    db.simCards.push(s as never);
    if (veh) (veh as { simCard?: unknown }).simCard = { id: s.id, iccid: s.iccid, msisdn: s.msisdn, carrier: s.carrier, apn: s.apn, status: s.status };
    return ok(s, 201);
  }
  if (method === 'PATCH' && match(/^\/sim-cards\/[^/]+$/)) {
    const s = find(db.simCards); if (!s) return notFound();
    const { vehicleId, ...rest } = b;
    Object.assign(s, rest, { updatedAt: now });
    if ('vehicleId' in b) {
      db.vehicles.forEach((x) => { if (x.id === s.vehicleId) (x as { simCard?: unknown }).simCard = null; });
      const veh = vehicleId ? db.vehicles.find((x) => x.id === vehicleId) : undefined;
      Object.assign(s, { vehicleId: veh?.id ?? null, vehicleCode: veh?.code ?? null });
      if (veh) (veh as { simCard?: unknown }).simCard = { id: s.id, iccid: s.iccid, msisdn: s.msisdn, carrier: s.carrier, apn: s.apn, status: s.status };
    }
    return ok(s);
  }
  if (method === 'GET' && match(/^\/vehicles\/[^/]+\/tracker-console$/)) {
    const limit = Number(q.get('limit') ?? 20);
    return ok({ items: db.trackerConsole.filter((c) => c.vehicleId === id).slice(0, limit) });
  }
  if (method === 'POST' && match(/^\/vehicles\/[^/]+\/tracker-console$/)) {
    const text = String(b.text ?? '');
    if (!/^[A-Za-z0-9,.\-_:]{1,99}#$/.test(text)) return { status: 400, json: problem(400, 'Texto inválido', 'validation') };
    const risk = !text.includes(',') && !/^RESET/i.test(text) ? 'read' : /^(RESET|APN,|SERVER,)/i.test(text) ? 'connection' : 'change';
    if (risk !== 'read' && b.confirm !== true) return { status: 400, json: problem(400, 'Confirme o comando', 'validation') };
    if (db.trackerConsole.some((c) => c.vehicleId === id && c.status === 'pending')) return { status: 409, json: problem(409, 'Já há um comando aguardando resposta', 'conflict') };
    const isStatus = /^STATUS#$/i.test(text);
    const cmd = {
      id: `console-${db.trackerConsole.length + 1}`, vehicleId: id!, text, risk, status: 'answered', failReason: null,
      response: isStatus ? 'BAT:4.05V,EXT:12.10V,GPRS:ON,CSQ:21' : 'OK',
      statusReport: isStatus ? { batteryVolts: 4.05, externalVolts: 12.1, gprsOnline: true, acc: false, gpsOn: true, relay: false, sleep: false, csq: 21 } : null,
      requestedById: 'staff-1', createdAt: now, respondedAt: now,
    };
    db.trackerConsole.unshift(cmd as never);
    return ok(cmd, 202);
  }
  if (method === 'GET' && p === '/vehicle-models') return ok({ items: db.models });
  if (method === 'POST' && p === '/vehicle-models') { const m = { ...db.models[0]!, ...b, id: `model-${db.models.length + 1}`, createdAt: now, updatedAt: now }; db.models.push(m as never); return ok(m, 201); }
  if (method === 'PATCH' && match(/^\/vehicle-models\/[^/]+$/)) { const m = find(db.models); if (!m) return notFound(); Object.assign(m, b); return ok(m); }
  if (method === 'POST' && p === '/vehicle-models/uploads') return ok({ uploadUrl: 'http://api.mock.local/upload', method: 'PUT', headers: {}, objectKey: 'catalog/x.png', expiresAt: now }, 201);
  if (method === 'GET' && p === '/swap-stations') return ok({ items: [{ id: 'st-1', name: 'Estação Paulista', address: 'Av. Paulista, 900', lat: -23.56, lng: -46.65, availableBatteries: 3, totalSlots: 8, openingHours: '24h', open24h: true }] });

  // Zonas
  if (method === 'GET' && p === '/zones') return ok({ items: db.zones });
  if (method === 'POST' && p === '/zones') { const z = { ...b, id: `zone-${db.zones.length + 1}`, active: true, createdAt: now, updatedAt: now }; db.zones.push(z as never); return ok(z, 201); }
  if (method === 'PUT' && match(/^\/zones\/[^/]+$/)) { const z = find(db.zones); if (!z) return notFound(); Object.assign(z, b); return ok(z); }
  if (method === 'DELETE' && match(/^\/zones\/[^/]+$/)) { db.zones = db.zones.filter((z) => z.id !== id); return { status: 204, json: null }; }

  // Alertas
  if (method === 'GET' && p === '/alerts') {
    const st = q.get('status');
    return ok(page(db.alerts.filter((a) => !st || a.status === st), q));
  }
  if (method === 'POST' && match(/^\/alerts\/[^/]+\/assign$/)) { const a = find(db.alerts); if (!a) return notFound(); Object.assign(a, { status: 'assigned', assigneeId: b.assigneeId, assigneeName: 'Pessoa', assignedAt: now }); return ok(a); }
  if (method === 'POST' && match(/^\/alerts\/[^/]+\/resolve$/)) { const a = find(db.alerts); if (!a) return notFound(); Object.assign(a, { status: 'resolved', resolution: b.resolution, resolvedAt: now }); return ok(a); }

  // Clientes e suporte
  if (method === 'GET' && p === '/customers') {
    const qq = (q.get('q') ?? '').toLowerCase();
    const ks = q.get('kycStatus');
    const st = q.get('status');
    return ok(page(db.customers.filter((c) => (!qq || (c.name ?? '').toLowerCase().includes(qq) || c.email.includes(qq)) && (!ks || c.kycStatus === ks) && (!st || c.status === st)), q));
  }
  if (method === 'GET' && match(/^\/customers\/[^/]+$/)) { const c = find(db.customers); return c ? ok(c) : notFound(); }
  if (method === 'GET' && match(/^\/customers\/[^/]+\/kyc-files$/)) {
    const c = find(db.customers); if (!c) return notFound();
    const exp = new Date(Date.parse(now) + 300_000).toISOString();
    return ok(c.kycStatus === 'not_started' ? { customerId: c.id } : { customerId: c.id, documentType: 'cnh', documentFront: { url: `http://api.mock.local/files/kyc/${c.id}/document-front`, expiresAt: exp }, selfie: { url: `http://api.mock.local/files/kyc/${c.id}/selfie`, expiresAt: exp } });
  }
  if (method === 'POST' && match(/^\/customers\/[^/]+\/(block|unblock|kyc-review)$/)) {
    const c = find(db.customers); if (!c) return notFound();
    if (seg[2] === 'block') Object.assign(c, { status: 'blocked', blockedReason: b.reason });
    if (seg[2] === 'unblock') Object.assign(c, { status: 'active', blockedReason: undefined });
    if (seg[2] === 'kyc-review') c.kycStatus = (b.decision as never) ?? 'approved';
    return ok(c);
  }
  if (method === 'GET' && p === '/customer-restrictions') return ok(page(db.restrictions, q));
  if (method === 'POST' && p === '/customer-restrictions') { const r = { id: `rs-${db.restrictions.length + 1}`, cpf: b.cpf, reason: b.reason, createdAt: now }; db.restrictions.push(r); return ok(r, 201); }
  if (method === 'DELETE' && match(/^\/customer-restrictions\/[^/]+$/)) { db.restrictions = (db.restrictions as { id: string }[]).filter((r) => r.id !== id); return { status: 204, json: null }; }
  if (method === 'GET' && p === '/support/disputes') return ok({ items: [{ id: 'dsp-1', customerId: 'cus-001', rentalId: 'rent-001', status: 'open', reason: 'Cobrança indevida', createdAt: now, updatedAt: now }] });
  if (method === 'POST' && match(/^\/support\/disputes\/[^/]+\/resolve$/)) return ok({ id, customerId: 'cus-001', rentalId: 'rent-001', status: b.decision === 'accepted' ? 'accepted' : 'rejected', reason: 'Cobrança indevida', createdAt: now, updatedAt: now });
  if (method === 'GET' && p === '/support/claims') return ok({ items: [] });
  if (method === 'PATCH' && match(/^\/support\/claims\/[^/]+$/)) return ok({});
  if (method === 'GET' && p === '/support/incidents') return ok({ items: [] });
  if (method === 'PATCH' && match(/^\/support\/incidents\/[^/]+$/)) return ok({});
  if (method === 'GET' && p === '/support/conversations') return ok(page(db.conversations.filter((c) => !q.get('customerId') || c.customerId === q.get('customerId')), q));
  if (method === 'PATCH' && match(/^\/support\/conversations\/[^/]+$/)) { const c = find(db.conversations); if (!c) return notFound(); Object.assign(c, b); return ok(c); }
  if (method === 'POST' && match(/^\/support\/conversations\/[^/]+\/read$/)) return { status: 204, json: null };
  if (method === 'GET' && match(/^\/support\/conversations\/[^/]+\/messages$/)) {
    return ok({ items: [{ id: 'msg-1', conversationId: id, authorType: 'customer', authorName: 'Cliente Teste 01', body: 'Minha moto não destrava.', createdAt: now }] });
  }
  if (method === 'POST' && match(/^\/support\/conversations\/[^/]+\/messages$/)) return ok({ id: 'msg-2', conversationId: id, authorType: 'staff', authorName: 'Ana QA', body: b.body, createdAt: now }, 201);

  // Aluguéis e pagamentos
  if (method === 'GET' && p === '/rentals') {
    const cid = q.get('customerId'); const vid = q.get('vehicleId'); const st = q.get('status');
    return ok(page(db.rentals.filter((r) => (!cid || r.customerId === cid) && (!vid || r.vehicleId === vid) && (!st || r.status === st)), q));
  }
  if (method === 'GET' && match(/^\/rentals\/[^/]+$/)) { const r = find(db.rentals); return r ? ok(r) : notFound(); }
  if (method === 'GET' && match(/^\/rentals\/[^/]+\/events$/)) return ok({ items: [{ id: 'ev-1', rentalId: id, type: 'started', at: now, actorType: 'customer', message: 'Aluguel iniciado' }] });
  if (method === 'POST' && match(/^\/rentals\/[^/]+\/force-end$/)) { const r = find(db.rentals); if (!r) return notFound(); r.status = 'force_ended'; return ok(r); }
  if (method === 'GET' && p === '/payments') {
    const cid = q.get('customerId');
    return ok(page(db.payments.filter((x) => !cid || x.customerId === cid), q));
  }
  if (method === 'GET' && match(/^\/payments\/[^/]+$/)) { const x = find(db.payments); return x ? ok(x) : notFound(); }
  if (method === 'POST' && match(/^\/payments\/[^/]+\/refund$/)) { const x = find(db.payments); if (!x) return notFound(); x.status = 'refunded'; x.refundedCents += (b as { amountCents?: number }).amountCents ?? x.amountCents - x.refundedCents; return ok(x); }
  if (method === 'PUT' && match(/^\/payments\/subscriptions\/[^/]+\/vehicle$/)) return ok({});

  // Preços
  if (method === 'GET' && p === '/pricing/plans') return ok({ items: db.plans });
  if (method === 'PUT' && match(/^\/pricing\/plans\/[^/]+$/)) { const x = find(db.plans); if (!x) return notFound(); Object.assign(x, b); return ok(x); }
  if (method === 'GET' && p === '/pricing/fees') return ok({ items: db.fees });
  if (method === 'PUT' && match(/^\/pricing\/fees\/[^/]+$/)) { const x = find(db.fees); if (!x) return notFound(); Object.assign(x, b); return ok(x); }
  if (method === 'GET' && p === '/pricing/coupons') return ok(page(db.coupons, q));
  if (method === 'POST' && p === '/pricing/coupons') { const c = { ...b, id: `cp-${db.coupons.length + 1}`, redemptions: 0, active: true, createdAt: now, updatedAt: now }; db.coupons.push(c as never); return ok(c, 201); }
  if (method === 'PUT' && match(/^\/pricing\/coupons\/[^/]+$/)) { const x = find(db.coupons); if (!x) return notFound(); Object.assign(x, b); return ok(x); }
  if (method === 'GET' && p === '/insurance/coverages') return ok({ items: db.coverages });
  if (method === 'PUT' && match(/^\/insurance\/coverages\/[^/]+$/)) { const x = db.coverages.find((c) => c.coverage === id); if (!x) return notFound(); Object.assign(x, b); return ok(x); }

  // Relatórios
  if (method === 'GET' && p === '/reports/dashboard') return ok(F.makeDashboard());
  if (method === 'GET' && p === '/reports/finance') return ok(F.makeFinanceReport());
  if (method === 'GET' && p === '/reports/revenue') {
    const rows = Array.from({ length: 14 }, (_, i) => ({ periodStart: new Date(Date.parse(now) - (14 - i) * 86_400_000).toISOString(), rentals: 10 + i, grossCents: 50000 + i * 1000, discountCents: 1000, insuranceCents: 2000, feesCents: 500, refundsCents: 0, netCents: 45000 + i * 1000 }));
    return ok({ from: rows[0]!.periodStart, to: now, groupBy: q.get('groupBy') ?? 'day', rows, totalNetCents: rows.reduce((s, r) => s + r.netCents, 0) });
  }
  if (method === 'GET' && p === '/reports/occupancy') {
    const rows = Array.from({ length: 14 }, (_, i) => ({ periodStart: new Date(Date.parse(now) - (14 - i) * 86_400_000).toISOString(), vehiclesTotal: 24, vehiclesRented: 4 + (i % 8), occupancyPct: 15 + (i % 8) * 4 }));
    return ok({ from: rows[0]!.periodStart, to: now, groupBy: q.get('groupBy') ?? 'day', rows });
  }
  if (method === 'GET' && p === '/reports/revenue-per-vehicle') {
    return ok({ from: now, to: now, rows: db.vehicles.slice(0, 6).map((v) => ({ vehicleId: v.id, vehicleCode: v.code, date: now, rentals: 3, rentedSeconds: 5400, revenueCents: 7500 })) });
  }
  if (method === 'GET' && p === '/reports/demand-heatmap') return ok({ from: now, to: now, points: db.vehicles.map((v) => ({ lat: v.lat, lng: v.lng, weight: 1 + (v.batteryPct % 5) })) });

  // Operação
  if (method === 'GET' && p === '/field-tasks') {
    // `completedSince` não filtra aqui: as datas das fixtures são fixas (2026-10-26) e o painel pede "últimos 7 dias" do relógio real.
    const st = q.get('status'); const active = q.get('active') === 'true';
    const open = ['open', 'assigned', 'in_progress'];
    const vid = q.get('vehicleId'); const ty = q.get('type');
    return ok(page(db.fieldTasks.filter((t) => (st ? t.status === st : !active || open.includes(t.status)) && (!vid || t.vehicleId === vid) && (!ty || t.type === ty)), q));
  }
  if (method === 'POST' && p === '/field-tasks') { const t = { ...db.fieldTasks[0]!, ...b, id: `ft-${db.fieldTasks.length + 1}`, status: 'open', createdAt: now, updatedAt: now }; db.fieldTasks.push(t as never); return ok(t, 201); }
  // Recolhimento (2026-11-04): iniciar passa a tarefa sem responsável ao usuário; concluir `collect` com `depotId` devolve a moto
  // ao galpão como livre (sem galpão, 422; tarefa `open`, 409). `db.collectLockedByStaff` imita a moto travada pela equipe (409).
  if (method === 'POST' && match(/^\/field-tasks\/[^/]+\/start$/)) {
    const t = find(db.fieldTasks); if (!t) return notFound();
    if (t.status !== 'open' && t.status !== 'assigned') return { status: 409, json: problem(409, 'A tarefa não pode ser iniciada neste estado.', 'conflict') };
    Object.assign(t, { status: 'in_progress', assigneeId: t.assigneeId ?? db.me.id, startedAt: now });
    return ok(t);
  }
  if (method === 'POST' && match(/^\/field-tasks\/[^/]+\/complete$/)) {
    const t = find(db.fieldTasks); if (!t) return notFound();
    if (t.status === 'open' || t.status === 'canceled') return { status: 409, json: problem(409, 'A tarefa não pode ser concluída neste estado.', 'conflict') };
    const v = db.vehicles.find((x) => x.id === t.vehicleId);
    if (t.type === 'collect' && v?.status === 'awaiting_pickup') {
      if (!b.depotId) return { status: 422, json: problem(422, 'Informe o galpão onde a moto chegou.', 'validation-error') };
      const depot = db.depots.find((d) => d.id === b.depotId);
      if (!depot) return notFound();
      if (!depot.active) return { status: 422, json: problem(422, 'Este galpão está desativado; escolha outro galpão.', 'depot-inactive') };
      if (db.collectLockedByStaff) return { status: 409, json: problem(409, 'A moto está bloqueada pela equipe; libere-a antes de devolver à frota.', 'vehicle-unavailable') };
      Object.assign(v, { status: 'free', depotId: depot.id, lat: depot.lat, lng: depot.lng });
    }
    Object.assign(t, { status: 'done', completionNotes: b.notes, completedAt: now });
    return ok(t);
  }
  if (method === 'PATCH' && match(/^\/field-tasks\/[^/]+$/)) { const t = find(db.fieldTasks); if (!t) return notFound(); Object.assign(t, b); return ok(t); }
  if (method === 'GET' && p === '/maintenance/tasks') return ok(page(db.maintenance, q));
  if (method === 'POST' && p === '/maintenance/tasks') { const t = { ...b, id: `mt-${db.maintenance.length + 1}`, status: 'scheduled', source: 'staff', createdAt: now, updatedAt: now }; db.maintenance.push(t as never); return ok(t, 201); }
  if (method === 'PATCH' && match(/^\/maintenance\/tasks\/[^/]+$/)) { const t = find(db.maintenance); if (!t) return notFound(); Object.assign(t, b); return ok(t); }
  if (method === 'GET' && p === '/maintenance/vehicles') {
    return ok(page(db.vehicles.slice(0, 8).map((v, i) => ({ vehicleId: v.id, vehicleCode: v.code, model: v.model, vehicleStatus: v.status, service: { odometerKm: 400 + i * 20, usageHours: 80, kmSinceService: 400 + i * 20, hoursSinceService: 80, serviceIntervalKm: 500, serviceIntervalHours: 100, nextServiceAtKm: 500, nextServiceAtHours: 100, kmUntilService: 100 - i * 20, hoursUntilService: 20, status: i > 4 ? 'overdue' : i > 2 ? 'due_soon' : 'ok' } })), q));
  }
  if (method === 'GET' && p === '/batteries') {
    const st = q.get('status'); const qq = (q.get('q') ?? q.get('serial') ?? '').toLowerCase();
    // BatteryPage: `statusCounts` conta todas as baterias que passam em q/depotId/holderId (sem o filtro de status nem a paginação).
    const base = db.batteries.filter((x) => !qq || x.serial.toLowerCase().includes(qq));
    const statusCounts = { in_vehicle: 0, in_van: 0, charging: 0, charged: 0, in_station: 0, defective: 0, retired: 0 };
    for (const x of base) statusCounts[x.status] += 1;
    return ok({ ...page(base.filter((x) => !st || x.status === st), q), statusCounts });
  }
  if (method === 'GET' && p === '/batteries/van-stock') return ok({ operatorId: q.get('operatorId') ?? 'staff-campo', total: 2, chargedCount: 1, depletedCount: 1, items: db.batteries.filter((x) => x.status === 'in_van') });
  if (method === 'POST' && /^\/batteries\/van-stock\/(load|unload)$/.test(p)) return ok({ operatorId: 'staff-campo', total: 0, chargedCount: 0, depletedCount: 0, items: [] });

  // Galpões, estações e entregas (formatos do contrato: DepotList, DepotVehicleList, DepotPickupList, SwapStationAdminList, StationSwapPage, HandoverPage)
  if (method === 'GET' && p === '/depots') return ok({ items: db.depots.filter((d) => d.active || q.get('includeInactive') === 'true') });
  if (method === 'POST' && p === '/depots') { const d = { ...db.depots[0]!, ...b, id: `dep-${db.depots.length + 1}`, availableVehicleCount: 0, createdAt: now, updatedAt: now }; db.depots.push(d as never); return ok(d, 201); }
  if (method === 'GET' && match(/^\/depots\/[^/]+$/)) { const d = find(db.depots); return d ? ok(d) : notFound(); }
  if (method === 'PATCH' && match(/^\/depots\/[^/]+$/)) { const d = find(db.depots); if (!d) return notFound(); Object.assign(d, b, { updatedAt: now }); return ok(d); }
  if (method === 'GET' && match(/^\/depots\/[^/]+\/vehicles$/)) { if (!find(db.depots)) return notFound(); return ok({ items: db.vehicles.filter((v) => (v.depotId ?? 'dep-1') === id) }); }
  if (method === 'GET' && match(/^\/depots\/[^/]+\/pickups$/)) {
    if (!find(db.depots)) return notFound();
    const st = q.get('status');
    return ok({ date: q.get('date') ?? now.slice(0, 10), items: db.reservations.filter((r) => r.depotId === id && (!st || r.status === st)) });
  }
  if (method === 'GET' && p === '/swap-stations/registry') return ok({ items: db.stations });
  if (method === 'GET' && match(/^\/swap-stations\/[^/]+\/swaps$/)) { if (!find(db.stations)) return notFound(); return ok({ items: [] }); }
  if (method === 'GET' && p === '/handovers') {
    const st = q.get('status'); const dep = q.get('depotId'); const ty = q.get('type');
    return ok(page(db.handovers.filter((h) => (!st || h.status === st) && (!dep || h.depotId === dep) && (!ty || h.type === ty)), q));
  }
  // Balcão (pré-reserva 2026-11-04): upload do contrato, cotação, contrato e pagamento, saldo e acerto.
  if (method === 'POST' && p === '/handovers/uploads') {
    const key = `${b.purpose === 'contract' ? 'contracts' : 'handovers'}/up-${db.uploadSeq++}.${b.contentType === 'image/png' ? 'png' : 'jpg'}`;
    return ok({ uploadUrl: `${API_HOST}/uploads/${key}`, method: 'PUT', headers: { 'Content-Type': String(b.contentType) }, objectKey: key, expiresAt: now }, 201);
  }
  if (method === 'PUT' && p.startsWith('/uploads/')) return ok({});
  // Entrega de saída pelo painel (2026-11-04): QR (`v1.<reservationId>.…`) ou, só admin, reservationId + noCodeReason.
  if (method === 'POST' && p === '/handovers' && b.type === 'pickup') {
    const noCode = b.reservationId !== undefined || b.noCodeReason !== undefined;
    if (noCode && b.pickupCode !== undefined) return { status: 400, json: problem(400, 'Envie o código do QR ou a reserva com o motivo, não os dois.', 'validation-error') };
    if (noCode && !b.depotId) return { status: 400, json: problem(400, 'Informe o galpão da entrega sem QR.', 'validation-error') };
    if (noCode && !db.me.groups.includes('admin')) return { status: 403, json: problem(403, 'Só o admin pode entregar a moto sem o QR do cliente.', 'pickup-without-code-requires-admin') };
    const resId = noCode ? String(b.reservationId) : String(b.pickupCode ?? '').split('.')[1];
    const r = db.reservations.find((x) => x.id === resId && (!b.depotId || x.depotId === b.depotId));
    if (!r) return notFound();
    if (r.status !== 'active') return { status: 409, json: problem(409, 'Esta reserva não está mais ativa.', 'conflict') };
    const h = {
      id: `ho-${db.handovers.length + 1}`, type: 'pickup', depotId: r.depotId!, reservationId: r.id, vehicleId: r.vehicleId, vehicleCode: r.vehicle?.code,
      operatorId: db.me.id, operatorFirstName: 'Equipe Volti', checklist: b.checklist, photoKeys: b.photoKeys, batteryPct: b.batteryPct, status: 'pending_customer', createdAt: now,
    };
    db.handovers.push(h as never);
    Object.assign(r, { status: 'handover', handoverId: h.id });
    return ok(h, 201);
  }
  // Chegada no galpão pelo painel (2026-11-04): como a API, encerra o aluguel e põe a moto no galpão (ou em manutenção
  // com algum item `ok: false`); `db.returnNotAtDepot` imita a moto a mais de 150 m (422 `vehicle-not-at-depot`).
  if (method === 'POST' && p === '/handovers' && b.type === 'return_depot') {
    if (!b.rentalId || !b.depotId) return { status: 400, json: problem(400, 'Informe o aluguel e o galpão.', 'validation-error') };
    const depot = db.depots.find((d) => d.id === b.depotId && d.active);
    if (!depot) return notFound();
    const r = db.rentals.find((x) => x.id === b.rentalId);
    const v = db.vehicles.find((x) => x.currentRentalId === b.rentalId);
    if (!r || !v) return notFound();
    if (db.returnNotAtDepot) return { status: 422, json: problem(422, 'A moto não está no galpão. Use o encerramento forçado pelo suporte.', 'vehicle-not-at-depot') };
    const issue = (b.checklist as { ok: boolean }[]).some((i) => !i.ok);
    const h = {
      id: `ho-${db.handovers.length + 1}`, type: 'return_depot', depotId: depot.id, rentalId: r.id, vehicleId: v.id, vehicleCode: v.code,
      operatorId: db.me.id, operatorFirstName: 'Equipe Volti', checklist: b.checklist, photoKeys: b.photoKeys, batteryPct: b.batteryPct, status: 'accepted', createdAt: now, respondedAt: now,
    };
    db.handovers.unshift(h as never);
    Object.assign(r, { status: 'ended', endedAt: now });
    Object.assign(v, { status: issue ? 'maintenance' : 'free', currentRentalId: undefined, depotId: depot.id });
    db.counter.rentalStatus = 'ended';
    return ok(h, 201);
  }
  if (method === 'GET' && match(/^\/handovers\/[^/]+\/counter-quote$/)) {
    if (!find(db.handovers)) return notFound();
    return ok(F.makeCounterQuote((q.get('planCode') ?? 'day') as never, (q.get('coverage') ?? 'basic') as never, Number(q.get('quantity') ?? 1)));
  }
  if (method === 'POST' && match(/^\/handovers\/[^/]+\/counter-checkout$/)) {
    const h = find(db.handovers); if (!h) return notFound();
    const c = db.counter;
    if (c.checkoutError) return { status: c.checkoutError.status, json: problem(c.checkoutError.status, c.checkoutError.title, c.checkoutError.slug) };
    const mismatch = (): Res => ({ status: 422, json: problem(422, 'O valor não confere com o calculado. Atualize o valor e tente de novo.', 'counter-amount-mismatch') });
    if (c.mismatchOnce) { c.mismatchOnce = false; return mismatch(); }
    const quote = F.makeCounterQuote(b.planCode as never, b.coverage as never, Number(b.quantity ?? 1));
    if ((b.payment as { amountCents: number }).amountCents !== quote.totalCents) return mismatch();
    const rental = { ...db.rentals[0]!, id: `rent-counter-${h.id}`, vehicleId: h.vehicleId, vehicleCode: h.vehicleCode, planCode: b.planCode, coverage: b.coverage, status: 'active', startedAt: now, createdAt: now, updatedAt: now };
    Object.assign(h, { status: 'accepted', rentalId: rental.id, respondedAt: now });
    const r = db.reservations.find((x) => x.handoverId === h.id);
    if (r) r.status = 'converted';
    db.rentals.unshift(rental as never);
    return ok(rental, 201);
  }
  if (method === 'GET' && match(/^\/rentals\/[^/]+\/counter-balance$/)) {
    if (!find(db.rentals)) return notFound();
    const c = db.counter;
    const debts = c.debts.filter((d) => d.outstandingCents > 0);
    return ok({ rentalId: id, customerId: 'cus-002', customerFirstName: 'Carla', rentalStatus: c.rentalStatus, debtTotalCents: debts.reduce((s, d) => s + d.outstandingCents, 0), debts, deposits: c.deposits.filter((d) => d.availableCents > 0) });
  }
  // Acerto: como a API, a mesma Idempotency-Key devolve o resultado já registrado (erros não são memorizados).
  const replay = idemKey && (method === 'POST') ? db.counter.idempotent.get(idemKey) : undefined;
  if (replay && /\/counter-(settle|refund)$/.test(p)) return replay;
  const remember = (res: Res): Res => {
    if (idemKey && res) db.counter.idempotent.set(idemKey, res);
    if (db.counter.failAfterApplyOnce) { db.counter.failAfterApplyOnce = false; return { status: 500, json: problem(500, 'Falha simulada depois do registro') }; }
    return res;
  };
  if (method === 'POST' && match(/^\/payments\/deposits\/[^/]+\/counter-refund$/)) {
    const d = db.counter.deposits.find((x) => x.depositId === seg[2]); if (!d) return notFound();
    const amount = Number(b.amountCents);
    if (amount > d.availableCents) return { status: 422, json: problem(422, `O valor passa do disponível da caução (${d.availableCents}).`, 'counter-amount-mismatch') };
    d.refundedCents += amount; d.availableCents -= amount;
    if (d.availableCents === 0) d.status = d.capturedCents > 0 ? 'captured' : 'released';
    return remember(ok({ id: d.depositId, customerId: 'cus-002', rentalId: d.rentalId, method: d.method, status: d.status, amountCents: d.amountCents, capturedCents: d.capturedCents, refundedCents: d.refundedCents, createdAt: now }));
  }
  if (method === 'POST' && match(/^\/payments\/[^/]+\/counter-settle$/)) {
    const debt = db.counter.debts.find((x) => x.paymentId === id); if (!debt) return notFound();
    if (db.counter.settledByOtherOnce) { db.counter.settledByOtherOnce = false; debt.outstandingCents = 0; debt.status = 'paid'; return { status: 409, json: problem(409, 'Este débito não pode mais ser pago.', 'debt-not-payable') }; }
    const amount = Number(b.amountCents);
    if (amount > debt.outstandingCents) return { status: 422, json: problem(422, `O valor passa do saldo do débito (${debt.outstandingCents}).`, 'counter-amount-mismatch') };
    if (b.fromDepositId) {
      const d = db.counter.deposits.find((x) => x.depositId === b.fromDepositId);
      if (!d || amount > d.availableCents) return { status: 422, json: problem(422, 'O valor passa do disponível da caução.', 'counter-amount-mismatch') };
      d.capturedCents += amount; d.availableCents -= amount;
    }
    debt.outstandingCents -= amount;
    if (debt.outstandingCents === 0) debt.status = 'paid';
    return remember(ok({ id: debt.paymentId, customerId: 'cus-002', rentalId: debt.rentalId, kind: debt.kind, status: debt.status, method: debt.method, amountCents: 6000, refundedCents: 0, outstandingCents: debt.outstandingCents, createdAt: debt.createdAt }));
  }
  if (method === 'GET' && match(/^\/handovers\/[^/]+$/)) { const h = find(db.handovers); return h ? ok(h) : notFound(); }
  if (method === 'GET' && match(/^\/batteries\/[^/]+\/movements$/)) return ok({ items: [] });
  if (method === 'GET' && p === '/payments/deposits') return ok(page([], q));

  // Equipe
  if (method === 'GET' && p === '/staff') return ok(page(db.staff, q));
  if (method === 'POST' && p === '/staff') { const s = { ...b, id: `staff-${db.staff.length + 1}`, active: true, mfaEnabled: false, createdAt: now }; db.staff.push(s as never); return ok(s, 201); }
  if (method === 'PATCH' && match(/^\/staff\/[^/]+$/)) { const s = find(db.staff); if (!s) return notFound(); Object.assign(s, b); return ok(s); }
  if (method === 'GET' && p === '/audit-logs') return ok(page(db.audit, q));
  return undefined;
}
