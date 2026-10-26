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

export interface ApiCall { method: string; path: string; query: URLSearchParams; body: unknown }

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
    staff: F.makeStaff(),
    audit: F.makeAudit(),
    fieldTasks: F.makeFieldTasks(),
    maintenance: F.makeMaintenance(),
    batteries: F.makeBatteries(),
    conversations: F.makeConversations(),
    restrictions: [] as unknown[],
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
    let body: unknown;
    try { body = req.postDataJSON(); } catch { body = undefined; }
    mock.calls.push({ method, path: url.pathname, query: url.searchParams, body });
    if (opts.latencyMs) await new Promise((r) => setTimeout(r, opts.latencyMs));
    const send = (status: number, json: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(json) });
    if (opts.failPaths?.some((p) => url.pathname.startsWith(p))) return send(500, problem(500, 'Falha simulada'));
    const res = handle(db, method, url.pathname, url.searchParams, body);
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

function handle(db: ReturnType<typeof makeDb>, method: string, path: string, q: URLSearchParams, body: unknown): Res {
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
  if (method === 'GET' && p === '/field-tasks') return ok(page(db.fieldTasks, q));
  if (method === 'POST' && p === '/field-tasks') { const t = { ...db.fieldTasks[0]!, ...b, id: `ft-${db.fieldTasks.length + 1}`, status: 'open', createdAt: now, updatedAt: now }; db.fieldTasks.push(t as never); return ok(t, 201); }
  if (method === 'PATCH' && match(/^\/field-tasks\/[^/]+$/)) { const t = find(db.fieldTasks); if (!t) return notFound(); Object.assign(t, b); return ok(t); }
  if (method === 'GET' && p === '/maintenance/tasks') return ok(page(db.maintenance, q));
  if (method === 'POST' && p === '/maintenance/tasks') { const t = { ...b, id: `mt-${db.maintenance.length + 1}`, status: 'scheduled', source: 'staff', createdAt: now, updatedAt: now }; db.maintenance.push(t as never); return ok(t, 201); }
  if (method === 'PATCH' && match(/^\/maintenance\/tasks\/[^/]+$/)) { const t = find(db.maintenance); if (!t) return notFound(); Object.assign(t, b); return ok(t); }
  if (method === 'GET' && p === '/maintenance/vehicles') {
    return ok(page(db.vehicles.slice(0, 8).map((v, i) => ({ vehicleId: v.id, vehicleCode: v.code, model: v.model, vehicleStatus: v.status, service: { odometerKm: 400 + i * 20, usageHours: 80, kmSinceService: 400 + i * 20, hoursSinceService: 80, serviceIntervalKm: 500, serviceIntervalHours: 100, nextServiceAtKm: 500, nextServiceAtHours: 100, kmUntilService: 100 - i * 20, hoursUntilService: 20, status: i > 4 ? 'overdue' : i > 2 ? 'due_soon' : 'ok' } })), q));
  }
  if (method === 'GET' && p === '/batteries') {
    const st = q.get('status'); const qq = (q.get('q') ?? q.get('serial') ?? '').toLowerCase();
    return ok(page(db.batteries.filter((x) => (!st || x.status === st) && (!qq || x.serial.toLowerCase().includes(qq))), q));
  }
  if (method === 'GET' && p === '/batteries/van-stock') return ok({ operatorId: q.get('operatorId') ?? 'staff-campo', total: 2, chargedCount: 1, depletedCount: 1, items: db.batteries.filter((x) => x.status === 'in_van') });
  if (method === 'POST' && /^\/batteries\/van-stock\/(load|unload)$/.test(p)) return ok({ operatorId: 'staff-campo', total: 0, chargedCount: 0, depletedCount: 0, items: [] });

  // Equipe
  if (method === 'GET' && p === '/staff') return ok(page(db.staff, q));
  if (method === 'POST' && p === '/staff') { const s = { ...b, id: `staff-${db.staff.length + 1}`, active: true, mfaEnabled: false, createdAt: now }; db.staff.push(s as never); return ok(s, 201); }
  if (method === 'PATCH' && match(/^\/staff\/[^/]+$/)) { const s = find(db.staff); if (!s) return notFound(); Object.assign(s, b); return ok(s); }
  if (method === 'GET' && p === '/audit-logs') return ok(page(db.audit, q));
  return undefined;
}
