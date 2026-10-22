// e2e do admin (agente 8), caixa-preta contra a API no ar (IOT_MODE=local) + Mosquitto + simulador (services/iot-sim, 50 motos):
// 1) bloquear moto em movimento: nenhum `travada: true` publicado enquanto a moto reporta velocidade_kmh ≥ 3;
// 2) comando para moto offline fica `pending` e é aplicado ao reconectar;
// 3) criação de cerca nova (velocidade reduzida) aplicada à moto que entra nela; limites legais na criação.
//   node --test tests/e2e/admin-flow.e2e.mjs
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { EmulatedTracker, adminToken, http, mqttClient, prisma, sleep, until } from './lib/harness.mjs';

let db;
let admin;
let observer;

before(async () => {
  db = prisma();
  admin = await adminToken();
  observer = await mqttClient();
});

after(async () => {
  observer?.end(true);
  await db?.$disconnect();
});

test('bloqueio de moto em movimento (simulador): trava só abaixo de 3 km/h', { timeout: 180_000 }, async () => {
  // Uma moto do simulador andando, destravada, fora de qualquer aluguel.
  const moving = await until(async () => {
    const r = await http('GET', '/vehicles?limit=100', { token: admin });
    return r.body.items.find((v) => v.online && !v.locked && v.speedKmh >= 10 && Number(v.thingName.slice(5)) <= 50);
  }, 60_000, 'moto do simulador andando a ≥ 10 km/h');

  const t = moving.thingName;
  const timeline = [];
  await observer.subscribeAsync([`$aws/things/${t}/shadow/update/delta`, `$aws/things/${t}/shadow/update`, `motos/${t}/telemetria`]);
  observer.on('message', (topic, payload) => {
    if (!topic.includes(`/${t}/`)) return;
    const body = JSON.parse(payload.toString());
    const kind = topic.endsWith('/delta') ? 'delta' : topic.endsWith('/telemetria') ? 'telemetry' : 'update';
    timeline.push({ kind, at: Date.now(), body });
  });
  await sleep(1500);

  const res = await http('POST', `/vehicles/${moving.id}/commands`, { token: admin, body: { type: 'lock', reason: 'QA: bloqueio com a moto em movimento' } });
  assert.equal(res.status, 202, JSON.stringify(res.body));
  assert.ok(['in_progress', 'pending'].includes(res.body.status), res.body.status);

  const final = await until(async () => {
    const c = await http('GET', `/commands/${res.body.id}`, { token: admin });
    return ['confirmed', 'failed'].includes(c.body.status) ? c.body : undefined;
  }, 150_000, 'lock terminal');
  assert.equal(final.status, 'confirmed', JSON.stringify(final));

  // Velocidade reportada pela moto (reported do shadow ou telemetria) mais recente antes de cada publicação.
  let lastSpeed = moving.speedKmh;
  const lockDeltas = [];
  const limits = [];
  for (const e of timeline) {
    if (e.kind === 'update' && e.body?.state?.reported?.velocidade_kmh !== undefined) lastSpeed = e.body.state.reported.velocidade_kmh;
    if (e.kind === 'telemetry') lastSpeed = e.body.velocidade_kmh;
    if (e.kind === 'update' && e.body?.state?.desired) {
      const d = e.body.state.desired;
      if (d.limite_kmh !== undefined) limits.push(d.limite_kmh);
      if (d.travada === true) lockDeltas.push({ speed: lastSpeed, via: 'desired' });
    }
    if (e.kind === 'delta' && e.body?.state?.travada === true) lockDeltas.push({ speed: lastSpeed, via: 'delta' });
  }
  assert.ok(lockDeltas.length >= 1, 'travada:true publicado ao fim');
  for (const l of lockDeltas) assert.ok(l.speed < 3, `travada:true publicado com velocidade_kmh=${l.speed} (${l.via})`);
  // Rampa só decrescente e nunca acima de 15.
  const ramp = limits.filter((x) => x <= 15);
  for (let i = 1; i < ramp.length; i++) assert.ok(ramp[i] <= ramp[i - 1], `rampa ${ramp.join('→')}`);
  // Telemetria reportada travada sempre parada.
  for (const e of timeline) if (e.kind === 'telemetry' && e.body.travada) assert.ok(e.body.velocidade_kmh < 3);

  // Destrava para devolver a moto ao simulador.
  await http('POST', `/vehicles/${moving.id}/commands`, { token: admin, body: { type: 'unlock', reason: 'QA: devolve a moto ao simulador' } });
});

test('comando para moto offline: pending e aplicado ao reconectar', { timeout: 120_000 }, async () => {
  const code = process.env.E2E_OFFLINE_VEHICLE ?? 'VLT-0059';
  const v = await db.vehicle.findUniqueOrThrow({ where: { code } });
  const tracker = new EmulatedTracker(v.thingName);
  tracker.pos = { lat: -23.5600, lng: -46.6800 };
  await tracker.connect();
  await until(async () => (await http('GET', `/vehicles/${v.id}`, { token: admin })).body.online === true, 15_000, 'moto online');

  await sleep(2000);
  tracker.disconnect(); // queda sem DISCONNECT → o broker publica o last will (presença disconnected)
  await until(async () => (await http('GET', `/vehicles/${v.id}`, { token: admin })).body.online === false, 20_000, 'moto offline');

  const limit = tracker.state.limite_kmh === 20 ? 15 : 20;
  const res = await http('POST', `/vehicles/${v.id}/commands`, { token: admin, body: { type: 'speed_limit', speedLimitKmh: limit, reason: 'QA: comando com a moto offline' } });
  assert.equal(res.status, 202, JSON.stringify(res.body));
  assert.equal(res.body.status, 'pending');
  await sleep(3000);
  assert.equal((await http('GET', `/commands/${res.body.id}`, { token: admin })).body.status, 'pending', 'continua pending enquanto offline');

  // Reconecta: o rastreador pede o shadow (get), recebe o desired pendente, aplica e reporta.
  const back = new EmulatedTracker(v.thingName);
  back.pos = tracker.pos;
  back.state.limite_kmh = tracker.state.limite_kmh;
  await back.connect();
  try {
    await until(() => back.state.limite_kmh === limit, 20_000, 'limite pendente aplicado na reconexão');
    const done = await until(async () => {
      const c = await http('GET', `/commands/${res.body.id}`, { token: admin });
      return c.body.status === 'confirmed' ? c.body : undefined;
    }, 30_000, 'comando confirmado depois da reconexão');
    assert.equal(done.status, 'confirmed');
  } finally {
    back.disconnect();
  }
});

test('cerca nova de velocidade reduzida: criada pelo admin e aplicada à moto que entra', { timeout: 120_000 }, async () => {
  // Limites legais na criação.
  const ring = (lng, lat, d = 0.0008) => [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]];
  const center = { lat: -23.5500, lng: -46.6700 };
  const over32 = await http('POST', '/zones', { token: admin, body: { name: 'QA acima de 32', type: 'reduced_speed', speedLimitKmh: 33, geometry: { type: 'Polygon', coordinates: ring(center.lng, center.lat) } } });
  assert.equal(over32.status, 400, JSON.stringify(over32.body));
  const over20 = await http('POST', '/zones', { token: admin, body: { name: 'QA acima de 20', type: 'reduced_speed', speedLimitKmh: 25, geometry: { type: 'Polygon', coordinates: ring(center.lng, center.lat) } } });
  assert.equal(over20.status, 422, JSON.stringify(over20.body));

  const created = await http('POST', '/zones', { token: admin, body: { name: `QA calçadão ${Date.now()}`, type: 'reduced_speed', speedLimitKmh: 6, geometry: { type: 'Polygon', coordinates: ring(center.lng, center.lat) } } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const zoneId = created.body.id;

  const code = process.env.E2E_ZONE_VEHICLE ?? 'VLT-0060';
  const v = await db.vehicle.findUniqueOrThrow({ where: { code } });
  const tracker = new EmulatedTracker(v.thingName);
  tracker.pos = { lat: center.lat + 0.01, lng: center.lng };
  tracker.state.travada = false;
  try {
    await tracker.connect();
    await sleep(1500);
    tracker.moveTo(center.lat, center.lng);
    await until(() => tracker.state.limite_kmh === 6, 15_000, 'limite 6 da cerca nova aplicado');
    tracker.moveTo(center.lat + 0.01, center.lng);
    await until(() => tracker.state.limite_kmh === 32, 15_000, 'limite volta a 32 fora da cerca');
  } finally {
    tracker.disconnect();
    await http('DELETE', `/zones/${zoneId}`, { token: admin });
  }
});
