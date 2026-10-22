// Segurança, LGPD e regras legais (agente 8), caixa-preta contra a API no ar (AUTH_MODE=dev, IOT_MODE=local + Mosquitto).
// Testes marcados com `todo` documentam achados abertos do docs/relatorio-qa.md: falham hoje sem quebrar a suíte.
//   node --test tests/e2e/security.e2e.mjs
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { API, EmulatedTracker, adminToken, devToken, http, prisma, sleep, until } from './lib/harness.mjs';

let db;
let admin;
const staff = (g) => devToken({ sub: `dev-${g}`, email: `${g}@volti.dev`, groups: [g], pool: 'staff' });
const customer = (tag) => devToken({ sub: `qa-${tag}-${randomUUID().slice(0, 8)}`, email: `${tag}-${Date.now()}@e2e.volti.dev`, pool: 'customer' });

before(async () => {
  db = prisma();
  admin = await adminToken();
});
after(async () => db?.$disconnect());

test('API1 BOLA: cliente não lê nem altera aluguel, pagamento, caução ou apólice de outro cliente', async () => {
  const r = await db.rental.findFirst({ where: { paymentId: { not: null }, insurancePolicyId: { not: null } }, orderBy: { createdAt: 'desc' } });
  assert.ok(r, 'precisa de um aluguel encerrado (rode customer-flow.e2e.mjs antes)');
  const intruder = await customer('intruso');
  for (const p of [`/rentals/${r.id}`, `/rentals/${r.id}/events`, `/rentals/${r.id}/track`, `/rentals/${r.id}/receipt`, `/payments/${r.paymentId}`, `/payments/deposits/${r.depositId}`, `/insurance/policies/${r.insurancePolicyId}`]) {
    assert.equal((await http('GET', p, { token: intruder })).status, 404, p);
  }
  for (const [p, body] of [[`/rentals/${r.id}/pause`, {}], [`/rentals/${r.id}/rating`, { stars: 1 }], [`/rentals/${r.id}/location-share`, {}]]) {
    assert.equal((await http('POST', p, { token: intruder, body })).status, 404, p);
  }
  // Filtros de lista não escapam do titular.
  const list = await http('GET', `/payments?customerId=${r.customerId}`, { token: intruder });
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 0);
});

test('API2/API5 autenticação e permissões por grupo', async () => {
  assert.equal((await http('GET', '/vehicles')).status, 401);
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'dev-admin', aud: 'staff', iss: 'volti-dev', 'cognito:groups': ['admin'], exp: 9999999999 })).toString('base64url')}.`;
  assert.equal((await http('GET', '/vehicles', { token: none })).status, 401, 'alg none');
  const cust = await devToken({ sub: 'dev-cliente-aprovado', email: 'cliente.aprovado@volti.dev', groups: ['admin'], pool: 'customer' });
  assert.equal((await http('GET', '/vehicles', { token: cust })).status, 403, 'cliente com claim de grupo admin');
  const v = await db.vehicle.findUniqueOrThrow({ where: { code: 'VLT-0040' } });
  const cases = [
    ['campo', 'POST', `/vehicles/${v.id}/commands`, { type: 'horn', reason: 'qa teste' }],
    ['suporte', 'POST', `/vehicles/${v.id}/commands`, { type: 'horn', reason: 'qa teste' }],
    ['financeiro', 'POST', `/vehicles/${v.id}/commands`, { type: 'lock', reason: 'qa teste' }],
    ['financeiro', 'GET', `/vehicles/${v.id}/track`],
    ['suporte', 'POST', '/zones', {}],
    ['operacao', 'POST', '/pricing/plans', {}],
    ['campo', 'GET', '/customers'],
    ['financeiro', 'GET', '/audit-logs'],
    ['suporte', 'POST', '/staff', {}],
    ['operacao', 'PATCH', `/staff/${randomUUID()}`, {}],
  ];
  for (const [g, m, p, body] of cases) assert.equal((await http(m, p, { token: await staff(g), body })).status, 403, `${g} ${m} ${p}`);
});

test('API3 mass assignment: PATCH /me ignora kycStatus/status/delinquent', async () => {
  const t = await customer('mass');
  await http('GET', '/me', { token: t });
  const r = await http('PATCH', '/me', { token: t, body: { kycStatus: 'approved', status: 'active', delinquent: false, locationConsent: true, name: 'Mass Assign' } });
  assert.equal(r.status, 200);
  const me = await http('GET', '/me', { token: t });
  assert.notEqual(me.body.customer.kycStatus, 'approved');
  assert.equal(me.body.customer.locationConsent, false);
});

test('API4 rate limiting responde 429 (THROTTLE_LIMIT_PER_MINUTE)', { skip: process.env.E2E_SKIP_RATE === '1' }, async () => {
  const t = await customer('rate');
  await http('GET', '/me', { token: t });
  const statuses = await Promise.all(Array.from({ length: 330 }, () => http('GET', '/insurance/coverages', { token: t }).then((r) => r.status)));
  assert.ok(statuses.includes(429), 'algum 429 depois de 300 req/min');
  assert.ok(statuses.every((s) => s === 200 || s === 429), [...new Set(statuses)].join(','));
});

test('QA-08: primeiro acesso com requisições paralelas não responde 409', async () => {
  const t = await customer('race');
  const statuses = await Promise.all(Array.from({ length: 10 }, () => http('GET', '/me', { token: t }).then((r) => r.status)));
  assert.deepEqual([...new Set(statuses)], [200]);
});

test('API8 webhook do Mercado Pago sem assinatura ou com assinatura inválida → 401', async () => {
  assert.equal((await http('POST', '/webhooks/mercadopago', { body: { type: 'payment', action: 'payment.updated', data: { id: '123' } } })).status, 401);
  const bad = await http('POST', '/webhooks/mercadopago', { headers: { 'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=${'a'.repeat(64)}`, 'x-request-id': 'qa' }, body: { type: 'payment', data: { id: '123' } } });
  assert.equal(bad.status, 401);
});

test('API8 CORS não reflete origem arbitrária com credenciais', async () => {
  const r = await fetch(`${API}/vehicles`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
  assert.notEqual(r.headers.get('access-control-allow-origin'), 'https://evil.example');
});

test('Buckets privados: leitura anônima no MinIO negada', async () => {
  const s3 = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
  for (const b of ['documentos-kyc', 'fotos-devolucao', 'relatorios', 'anexos']) {
    const r = await fetch(`${s3}/${b}/?list-type=2`);
    assert.equal(r.status, 403, b);
  }
});

test('Legal: limite fora de 0..32 é recusado em todos os caminhos da API', async () => {
  const v = await db.vehicle.findUniqueOrThrow({ where: { code: 'VLT-0040' } });
  for (const speedLimitKmh of [33, 40, -1, 32.5, '20']) {
    const r = await http('POST', `/vehicles/${v.id}/commands`, { token: admin, body: { type: 'speed_limit', speedLimitKmh, reason: 'QA: limite inválido' } });
    assert.equal(r.status, 400, String(speedLimitKmh));
  }
  const patched = await http('PATCH', `/vehicles/${v.id}`, { token: admin, body: { speedLimitKmh: 50 } });
  assert.ok(patched.status === 200 || patched.status === 400);
  assert.ok((await db.vehicle.findUniqueOrThrow({ where: { id: v.id } })).speedLimitKmh <= 32);
  const ring = [[[-46.66, -23.55], [-46.659, -23.55], [-46.659, -23.549], [-46.66, -23.549], [-46.66, -23.55]]];
  assert.equal((await http('POST', '/zones', { token: admin, body: { name: 'QA 33', type: 'reduced_speed', speedLimitKmh: 33, geometry: { type: 'Polygon', coordinates: ring } } })).status, 400);
  assert.equal((await http('POST', '/zones', { token: admin, body: { name: 'QA 21', type: 'reduced_speed', speedLimitKmh: 21, geometry: { type: 'Polygon', coordinates: ring } } })).status, 422);
  // Banco: CHECK 0..32.
  await assert.rejects(db.$executeRawUnsafe(`UPDATE "Vehicle" SET "speedLimitKmh" = 40 WHERE id = '${v.id}'`));
});

test('QA-01 Legal: comando manual não sobe o limite acima do da zona em que a moto está', { timeout: 60_000 }, async () => {
  const v = await db.vehicle.findUniqueOrThrow({ where: { code: 'VLT-0057' } });
  const tracker = new EmulatedTracker(v.thingName);
  tracker.pos = { lat: -23.5600, lng: -46.6800 };
  tracker.state.travada = false;
  try {
    await tracker.connect();
    await sleep(1500);
    tracker.moveTo(-23.5633, -46.6849); // calçadão Teodoro Sampaio, 6 km/h
    await until(() => tracker.state.limite_kmh === 6, 10_000, 'limite 6 da zona');
    const r = await http('POST', `/vehicles/${v.id}/commands`, { token: admin, body: { type: 'speed_limit', speedLimitKmh: 32, reason: 'QA: limite manual dentro do calçadão' } });
    assert.equal(r.status, 202);
    assert.equal(r.body.status, 'failed');
    assert.equal(r.body.statusReason ?? r.body.reason, 'invalid_limit');
    await sleep(2000);
    assert.equal(tracker.state.limite_kmh, 6);
  } finally {
    tracker.moveTo(-23.5600, -46.6800);
    await sleep(1500);
    tracker.disconnect();
  }
});

test('QA-03 Legal: editar o limite de uma cerca reaplica às motos que já estão dentro', { timeout: 60_000 }, async () => {
  const c = { lat: -23.5450, lng: -46.6650 };
  const d = 0.0008;
  const geometry = { type: 'Polygon', coordinates: [[[c.lng - d, c.lat - d], [c.lng + d, c.lat - d], [c.lng + d, c.lat + d], [c.lng - d, c.lat + d], [c.lng - d, c.lat - d]]] };
  const z = (await http('POST', '/zones', { token: admin, body: { name: `QA editável ${Date.now()}`, type: 'reduced_speed', speedLimitKmh: 20, geometry } })).body;
  const v = await db.vehicle.findUniqueOrThrow({ where: { code: 'VLT-0057' } });
  const tracker = new EmulatedTracker(v.thingName);
  tracker.pos = { lat: c.lat + 0.01, lng: c.lng };
  tracker.state.travada = false;
  try {
    await tracker.connect();
    await sleep(1500);
    tracker.moveTo(c.lat, c.lng);
    await until(() => tracker.state.limite_kmh === 20, 10_000, 'limite 20');
    await http('PUT', `/zones/${z.id}`, { token: admin, body: { name: z.name, type: 'reduced_speed', speedLimitKmh: 6, geometry, active: true } });
    for (let i = 0; i < 4; i++) {
      tracker.moveTo(c.lat + 0.0001 * i, c.lng);
      await sleep(1500);
    }
    assert.equal(tracker.state.limite_kmh, 6);
  } finally {
    tracker.disconnect();
    await http('DELETE', `/zones/${z.id}`, { token: admin });
  }
});

test('LGPD: consentimento obrigatório para alugar, exportação só do titular, exclusão anonimiza e encerra a sessão', { timeout: 60_000 }, async () => {
  const t = await customer('lgpd');
  const me = await http('GET', '/me', { token: t });
  assert.equal(me.body.customer.locationConsent, false, 'sem consentimento por padrão');
  const consents = await http('GET', '/lgpd/consents', { token: t });
  assert.equal(consents.status, 200);
  assert.equal(consents.body.locationTracking, false);
  const ex = await http('GET', '/lgpd/export', { token: t });
  assert.equal(ex.status, 200);
  assert.equal(ex.body.customer.id, me.body.customer.id);
  for (const k of ['rentals', 'payments', 'tracks', 'walletEntries']) assert.ok(Array.isArray(ex.body[k]), k);
  // Staff não exporta nem exclui dados de cliente pelas rotas do titular.
  assert.equal((await http('GET', '/lgpd/export', { token: admin })).status, 403);
  const del = await http('DELETE', '/lgpd/account', { token: t });
  assert.ok([200, 202].includes(del.status), JSON.stringify(del.body));
  const row = await db.customer.findUniqueOrThrow({ where: { id: me.body.customer.id } });
  assert.equal(row.status, 'deleted');
  assert.equal(row.cpf, null);
  assert.equal(row.phone, null);
  assert.match(row.email, /@removido\.volti\.invalid$/);
  // QA-07 (parte corrigida): o token antigo não escreve mais no cadastro anonimizado.
  await http('PATCH', '/me', { token: t, body: { name: 'Regravado' } });
  assert.equal((await db.customer.findUniqueOrThrow({ where: { id: me.body.customer.id } })).name, 'Cliente removido');
});

test('QA-07 LGPD: depois da exclusão a mesma identidade não volta a usar a plataforma', async () => {
  const t = await customer('lgpd2');
  await http('GET', '/me', { token: t });
  await http('DELETE', '/lgpd/account', { token: t });
  assert.equal((await http('GET', '/me', { token: t })).status, 401);
});
