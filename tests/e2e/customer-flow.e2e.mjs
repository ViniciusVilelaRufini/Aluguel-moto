// e2e do cliente (agente 8), caixa-preta contra a API no ar com IOT_MODE=local e o Mosquitto:
// cadastro → KYC → reserva → caução → desbloqueio → corrida com troca de zona → saída da área → retorno → encerramento → recibo.
//
// Pré-requisitos: API no ar (E2E_API_URL, padrão http://localhost:$PORT do services/api/.env), migrate + seed,
// IOT_MODE=local e GEOFENCE_MODE=local, MQTT_URL do services/api/.env. Usa a moto VLT-0058 (fora do simulador de 50 motos).
//   node --test tests/e2e/customer-flow.e2e.mjs
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { EmulatedTracker, adminToken, devToken, http, prisma, realtime, sleep, until } from './lib/harness.mjs';

const CODE = process.env.E2E_CUSTOMER_VEHICLE ?? 'VLT-0058';
const THING = `moto-${CODE.slice(4)}`;

// Pontos (zonas do seed): devolução Fradique Coutinho, calçadão Teodoro Sampaio (6 km/h), dentro da área, fora da área.
const P = {
  returnZone: { lat: -23.5661, lng: -46.6845 },
  calcadao: { lat: -23.5633, lng: -46.6849 },
  insideArea: { lat: -23.5600, lng: -46.6800 },
  outsideArea: { lat: -23.5600, lng: -46.6300 },
};

let db;
let tracker;
let rt;
let vehicle;
const cpf = String(Date.now()).slice(-9).padStart(9, '1') + '42'; // nunca termina em 00 (mock reprova)
const sub = `e2e-cliente-${randomUUID().slice(0, 8)}`;
let token;

before(async () => {
  db = prisma();
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { code: CODE } });
  // Moto livre, travada, na zona de devolução; nenhum aluguel aberto nela.
  await db.rental.updateMany({ where: { vehicleId: vehicle.id, status: { in: ['active', 'paused', 'ending'] } }, data: { status: 'ended', endedAt: new Date() } });
  await db.reservation.updateMany({ where: { vehicleId: vehicle.id, status: 'active' }, data: { status: 'canceled' } });
  await db.vehicle.update({ where: { id: vehicle.id }, data: { status: 'free', lat: P.returnZone.lat, lng: P.returnZone.lng, locked: true } });
  tracker = new EmulatedTracker(THING);
  tracker.pos = { ...P.returnZone };
  await tracker.connect();
  await sleep(1500);
});

after(async () => {
  rt?.socket.close();
  tracker?.disconnect();
  await db?.$disconnect();
});

test('fluxo completo do cliente', { timeout: 240_000 }, async (t) => {
  // ── Cadastro (primeiro acesso cria o cliente) ──
  token = await devToken({ sub, email: `${sub}@e2e.volti.dev`, pool: 'customer' });
  const me = await http('GET', '/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.kycStatus ?? me.body.kyc?.status ?? 'not_submitted', 'not_submitted');
  const patched = await http('PATCH', '/me', { token, body: { name: 'Cliente E2E', phone: '+5511987654321' } });
  assert.equal(patched.status, 200, JSON.stringify(patched.body));

  // Sem consentimento de localização o aluguel é recusado mais adiante; registra os consentimentos agora.
  const consents = await http('PUT', '/lgpd/consents', { token, body: { termsVersion: '2026-10', termsAccepted: true, locationTracking: true, marketing: false } });
  assert.equal(consents.status, 200, JSON.stringify(consents.body));
  assert.equal(consents.body.locationTracking, true);

  // ── KYC: upload pré-assinado (PUT real no MinIO) → submit → aprovação do mock ──
  await t.test('KYC', async () => {
    const up = await http('POST', '/kyc/uploads', { token, body: { documentType: 'cnh', contentType: 'image/jpeg' } });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    for (const k of ['documentFront', 'selfie']) {
      const u = up.body[k];
      const put = await fetch(u.uploadUrl, { method: u.method ?? 'PUT', headers: u.headers, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
      assert.equal(put.status, 200, `upload ${k}`);
    }
    const submit = await http('POST', '/kyc/submit', {
      token,
      body: { fullName: 'Cliente E2E da Silva', cpf, birthDate: '1990-05-10', documentType: 'cnh', documentFrontObjectKey: up.body.documentFront.objectKey, selfieObjectKey: up.body.selfie.objectKey },
    });
    assert.ok([200, 201, 202].includes(submit.status), JSON.stringify(submit.body));
    await until(async () => (await http('GET', '/kyc/status', { token })).body.status === 'approved', 15_000, 'KYC aprovado');
  });

  // ── Reserva ──
  const reservation = await http('POST', '/reservations', { token, body: { vehicleId: vehicle.id } });
  assert.equal(reservation.status, 201, JSON.stringify(reservation.body));
  assert.equal(reservation.body.status, 'active');

  // ── Caução (cartão tokenizado no gateway fake; o backend nunca vê o PAN) + desbloqueio ──
  const card = await http('POST', '/payments/cards', { token, idem: true, body: { cardToken: 'tok_visa_4242' } });
  assert.equal(card.status, 201, JSON.stringify(card.body));
  assert.ok(!JSON.stringify(card.body).match(/\b4242424242424242\b/), 'cartão completo nunca volta da API');

  rt = await realtime(token);
  const start = await http('POST', '/rentals', { token, idem: true, body: { vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' } });
  assert.equal(start.status, 201, JSON.stringify(start.body));
  assert.equal(start.body.outcome, 'started');
  assert.ok(['held', 'authorized', 'captured', 'confirmed'].includes(start.body.deposit.status), `caução: ${start.body.deposit.status}`);
  const rentalId = start.body.rental.id;
  await until(() => !tracker.state.travada, 10_000, 'moto destravada pelo shadow');
  rt.socket.disconnect();
  rt = await realtime(token); // reconecta para entrar na sala rental:{id}

  // ── Corrida com troca de zona: entra no calçadão (6 km/h) e sai ──
  tracker.wanted = 25;
  tracker.moveTo(P.insideArea.lat, P.insideArea.lng);
  await sleep(2500);
  tracker.moveTo(P.calcadao.lat, P.calcadao.lng);
  await until(() => tracker.state.limite_kmh === 6, 10_000, 'limite 6 km/h aplicado no calçadão');
  await until(() => rt.events.some((e) => e.name === 'zone.notice' && e.payload.zoneType === 'reduced_speed' && e.payload.transition === 'ENTER'), 5000, 'zone.notice ENTER');
  await sleep(3000);
  assert.ok(tracker.state.velocidade_kmh <= 6, `velocidade no calçadão ${tracker.state.velocidade_kmh}`);
  tracker.moveTo(P.insideArea.lat, P.insideArea.lng);
  await until(() => tracker.state.limite_kmh === 32, 10_000, 'limite volta a 32 ao sair do calçadão');
  assert.ok(Math.max(...tracker.deltas.filter((d) => d.state.limite_kmh !== undefined).map((d) => d.state.limite_kmh)) <= 32);

  // ── Saída da área de operação → aviso + alerta; volta antes de 5 min → sem bloqueio ──
  tracker.moveTo(P.outsideArea.lat, P.outsideArea.lng);
  await until(() => rt.events.some((e) => e.name === 'zone.notice' && e.payload.zoneType === 'operation' && e.payload.transition === 'EXIT'), 8000, 'zone.notice saída da área');
  const admin = await adminToken();
  await until(async () => {
    const a = await http('GET', `/alerts?vehicleId=${vehicle.id}&limit=20`, { token: admin });
    return a.status === 200 && a.body.items.some((x) => /area|área|geofence/i.test(`${x.type} ${x.message}`));
  }, 8000, 'alerta de saída da área');
  await sleep(3000);
  tracker.moveTo(P.insideArea.lat, P.insideArea.lng);
  await until(() => rt.events.some((e) => e.name === 'zone.notice' && e.payload.zoneType === 'operation' && e.payload.transition === 'ENTER'), 8000, 'zone.notice retorno à área');
  assert.equal(tracker.state.travada, false, 'não bloqueia se voltar antes de 5 min');

  // ── Retorno à zona de devolução, parada, foto e encerramento ──
  tracker.wanted = 0;
  await until(() => tracker.state.velocidade_kmh === 0, 15_000, 'moto parada');
  tracker.moveTo(P.returnZone.lat, P.returnZone.lng);
  await sleep(2000);
  const photo = await http('POST', `/rentals/${rentalId}/return-photo`, { token, body: { contentType: 'image/jpeg' } });
  assert.equal(photo.status, 201, JSON.stringify(photo.body));
  const put = await fetch(photo.body.uploadUrl, { method: 'PUT', headers: photo.body.headers, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  assert.equal(put.status, 200);
  const ended = await http('POST', `/rentals/${rentalId}/end`, { token, body: { returnPhotoObjectKey: photo.body.objectKey } });
  assert.ok([200, 202].includes(ended.status), JSON.stringify(ended.body));
  await until(async () => (await http('GET', `/rentals/${rentalId}`, { token })).body.status === 'ended', 30_000, 'aluguel ended');
  assert.equal(tracker.state.travada, true, 'moto travada no fim');

  // Invariante de segurança em toda a corrida: nenhum travada:true entregue com a moto a ≥ 3 km/h.
  for (const d of tracker.deltas) if (d.state.travada === true) assert.ok(d.speedAtDelta < 3 || tracker.reported.every((r) => r.reported.travada !== true || r.reported.velocidade_kmh < 3));
  for (const r of tracker.reported) if (r.reported.travada === true) assert.ok(r.reported.velocidade_kmh < 3);

  // ── Recibo ──
  const receipt = await until(async () => {
    const r = await http('GET', `/rentals/${rentalId}/receipt`, { token });
    return r.status === 200 ? r : undefined;
  }, 30_000, 'recibo disponível');
  assert.equal(receipt.body.rentalId, rentalId);
  assert.ok(receipt.body.breakdown.totalCents > 0, "recibo com total");
  assert.equal(receipt.body.cardLast4, "4242");
  assert.ok(receipt.body.track.length > 0, "recibo com trajeto");

  // ── LGPD: trajeto gravado só durante o aluguel, com expiração de 90 dias ──
  const points = await db.trackPoint.findMany({ where: { rentalId } });
  assert.ok(points.length > 0, 'trajeto gravado durante o aluguel');
  for (const p of points) {
    const days = (p.expiresAt.getTime() - p.recordedAt.getTime()) / 86_400_000;
    assert.ok(Math.abs(days - 90) < 1, `expiresAt a ${days} dias`);
  }
  const before = await db.trackPoint.count({ where: { vehicleId: vehicle.id, rentalId: null } }).catch(() => 0);
  tracker.moveTo(P.returnZone.lat + 0.0001, P.returnZone.lng);
  await sleep(1500);
  assert.equal(await db.trackPoint.count({ where: { rentalId } }), points.length, 'nada gravado depois do fim do aluguel');
  assert.equal(await db.trackPoint.count({ where: { vehicleId: vehicle.id, rentalId: null } }).catch(() => 0), before);
});
