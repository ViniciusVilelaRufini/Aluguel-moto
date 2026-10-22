// Carga de telemetria (agente 8): 500 motos publicando telemetria pelo MQTT enquanto o painel lê a frota.
//
// A imagem oficial grafana/k6 não fala MQTT (a extensão xk6-mqtt não compilou com o xk6 atual; ver docs/relatorio-qa.md),
// então os 500 rastreadores são gerados pelo simulador oficial (services/iot-sim, mesmo contrato do firmware) e este
// script mede o lado da plataforma:
//   - latência/erros das leituras de frota do painel sob a carga (GET /vehicles, /reports/dashboard, /alerts);
//   - ingestão: % das 500 motos de carga com `lastSeenAt` fresco (≤ FRESH_S) e atraso médio, amostrado a cada iteração.
//
// Preparar e rodar:
//   node tests/load/provision-load-vehicles.mjs 500
//   MQTT_URL=mqtt://localhost:1884 SIM_VEHICLES=500 SIM_FIRST_VEHICLE=1001 SIM_RIDING_RATIO=1 SIM_TELEMETRY_RIDING_MS=1000 \
//     pnpm --filter iot-sim dev        # 500 msg/s de telemetria (5× a cadência do contrato) + reported
//   docker run --rm -i -e API_URL=http://host.docker.internal:3005 -v "$PWD/tests/load:/scripts" grafana/k6 run /scripts/k6-telemetry.js
// Variáveis: API_URL, VUS (20 painéis), DURATION (2m), FRESH_S (35).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API = __ENV.API_URL || 'http://host.docker.internal:3005';
// O REST lê o Postgres, que recebe a posição no máximo a cada 30 s por moto (o ao vivo vai pelo Redis/WebSocket):
// fresco = visto há ≤ 35 s. Atraso que cresça além disso indica fila de ingestão acumulando.
const FRESH_S = Number(__ENV.FRESH_S || 35);

export const freshRatio = new Trend('telemetry_fresh_pct');
export const ingestLag = new Trend('telemetry_ingest_lag_s');
export const stale = new Rate('telemetry_stale');
export const errors = new Rate('fleet_errors');

export const options = {
  scenarios: {
    painel: { executor: 'constant-vus', vus: Number(__ENV.VUS || 20), duration: __ENV.DURATION || '2m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    telemetry_stale: ['rate<0.05'],
  },
};

export function setup() {
  const res = http.post(`${API}/dev/token`, JSON.stringify({ sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' }), {
    headers: { 'content-type': 'application/json' },
  });
  return { token: res.json('accessToken') };
}

export default function (data) {
  const h = { headers: { authorization: `Bearer ${data.token}` } };
  const page = http.get(`${API}/vehicles?limit=100&q=VLT-1`, { ...h, tags: { name: 'GET /vehicles' } });
  const dash = http.get(`${API}/reports/dashboard`, { ...h, tags: { name: 'GET /reports/dashboard' } });
  const alerts = http.get(`${API}/alerts?status=open&limit=50`, { ...h, tags: { name: 'GET /alerts' } });
  for (const r of [page, dash, alerts]) {
    const ok = r.status === 200;
    errors.add(!ok);
    check(r, { '200': () => ok });
  }
  if (page.status === 200) {
    const now = Date.now();
    const items = page.json('items') || [];
    let fresh = 0;
    for (const v of items) {
      const lag = (now - Date.parse(v.lastSeenAt)) / 1000;
      ingestLag.add(Math.max(0, lag));
      const ok = v.online && lag <= FRESH_S;
      stale.add(!ok);
      if (ok) fresh++;
    }
    if (items.length) freshRatio.add((100 * fresh) / items.length);
  }
  sleep(1);
}
