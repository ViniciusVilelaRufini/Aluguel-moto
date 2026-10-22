// Carga de clientes (agente 8): 200 clientes simultâneos usando o app (mapa de motos, zonas, planos, cotação,
// aluguel atual, carteira, perfil). Cada VU é um cliente diferente (token do POST /dev/token, AUTH_MODE=dev).
//
// Rodar (Docker Desktop no Windows; a API precisa de THROTTLE_LIMIT_PER_MINUTE alto, pois todos os VUs saem do mesmo IP):
//   docker run --rm -i -e API_URL=http://host.docker.internal:3005 -v "$PWD/tests/load:/scripts" grafana/k6 run /scripts/k6-clients.js
// Variáveis: API_URL, VUS (200), DURATION (2m).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API = __ENV.API_URL || 'http://host.docker.internal:3005';
const VUS = Number(__ENV.VUS || 200);

export const errors = new Rate('client_errors');
export const nearbyTrend = new Trend('nearby_ms', true);

export const options = {
  scenarios: {
    clientes: { executor: 'constant-vus', vus: VUS, duration: __ENV.DURATION || '2m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    client_errors: ['rate<0.01'],
  },
  setupTimeout: '120s',
};

export function setup() {
  const tokens = [];
  for (let i = 0; i < VUS; i++) {
    const res = http.post(`${API}/dev/token`, JSON.stringify({ sub: `k6-cliente-${i}`, email: `k6-cliente-${i}@load.volti.dev`, groups: [], pool: 'customer' }), {
      headers: { 'content-type': 'application/json' },
    });
    tokens.push(res.json('accessToken'));
  }
  // Primeiro acesso cria o cliente: feito em série para não medir a corrida do upsert (ver relatório QA-08).
  for (const t of tokens) http.get(`${API}/me`, { headers: { authorization: `Bearer ${t}` } });
  return { tokens };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const h = { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } };
  // Posição do cliente em Pinheiros/Vila Madalena/Paulista.
  const lat = -23.575 + Math.random() * 0.03;
  const lng = -46.70 + Math.random() * 0.05;

  const nearby = http.get(`${API}/vehicles/nearby?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&radiusM=1000`, { ...h, tags: { name: 'GET /vehicles/nearby' } });
  nearbyTrend.add(nearby.timings.duration);
  const responses = [
    nearby,
    http.get(`${API}/zones?limit=50`, { ...h, tags: { name: 'GET /zones' } }),
    http.get(`${API}/pricing/plans`, { ...h, tags: { name: 'GET /pricing/plans' } }),
    http.post(`${API}/pricing/quote`, JSON.stringify({ planCode: 'minute', coverage: 'basic', estimatedMinutes: 20 }), { ...h, tags: { name: 'POST /pricing/quote' } }),
    http.get(`${API}/rentals/current`, { ...h, tags: { name: 'GET /rentals/current' } }),
    http.get(`${API}/wallet`, { ...h, tags: { name: 'GET /wallet' } }),
    http.get(`${API}/me`, { ...h, tags: { name: 'GET /me' } }),
  ];
  for (const r of responses) {
    // /rentals/current sem aluguel responde 404 (contrato) — não é erro.
    const ok = r.status === 200 || r.status === 201 || (r.status === 404 && r.request.url.includes('/rentals/current'));
    errors.add(!ok);
    check(r, { 'status esperado': () => ok });
  }
  sleep(1 + Math.random());
}
