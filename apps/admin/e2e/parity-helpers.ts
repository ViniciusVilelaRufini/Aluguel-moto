import { expect, type APIRequestContext } from '@playwright/test';
import { API, apiGet, apiToken, createCustomer } from './helpers';

type V = { id: string; code: string; status: string; online?: boolean };

async function adminJson<T>(request: APIRequestContext, method: 'post' | 'patch', path: string, data: unknown, headers: Record<string, string> = {}): Promise<T> {
  const token = await apiToken(request, 'admin');
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, ...headers }, data });
  expect(res.ok(), `${method} ${path} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as T;
}

/** Moto livre e online; `skip` evita as usadas por outros specs e dá uma diferente a cada chamada (o alerta deduplica por moto). */
export async function freeBike(request: APIRequestContext, pick: 'first' | 'last' | 'random' = 'last'): Promise<V> {
  const list = await apiGet<{ items: V[] }>(request, '/vehicles?limit=100');
  const free = list.items.filter((v) => v.status === 'free' && v.online !== false && Number(v.code.slice(4)) > 50);
  expect(free.length, 'nenhuma moto livre fora do simulador').toBeGreaterThan(0);
  return pick === 'first' ? free[0] : pick === 'last' ? free[free.length - 1] : free[Math.floor(Math.random() * free.length)];
}

/**
 * Levanta um alerta aberto pelo caminho normal da API: staff abre um incidente de furto numa moto,
 * o que gera o alerta `incident_reported` (prioridade alta). Retorna o alerta e a moto.
 */
export async function raiseOpenAlert(request: APIRequestContext): Promise<{ alertId: string; vehicleId: string; code: string }> {
  const bike = await freeBike(request, 'random');
  await adminJson(request, 'post', '/support/incidents', { category: 'theft', description: 'Alerta criado pelo e2e de paridade', vehicleId: bike.id });
  let alertId = '';
  await expect.poll(async () => {
    const r = await apiGet<{ items: { id: string; vehicleId?: string; type: string }[] }>(request, '/alerts?status=open&limit=100');
    alertId = r.items.find((a) => a.vehicleId === bike.id && a.type === 'incident_reported')?.id ?? '';
    return alertId;
  }, { timeout: 20_000 }).not.toBe('');
  return { alertId, vehicleId: bike.id, code: bike.code };
}

/** Aluguel real de um cliente novo numa moto livre (sem esperar o simulador). Encerra com `endRental`. */
export async function startRentalOnFreeBike(request: APIRequestContext): Promise<{ vehicleId: string; code: string; rentalId: string; customerName: string; startedAt: string }> {
  const bike = await freeBike(request, 'last');
  const customer = await createCustomer(request);
  const headers = { Authorization: `Bearer ${customer.token}` };
  const card = await request.post(`${API}/payments/cards`, { headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, data: { cardToken: 'tok_visa_4242' } });
  expect(card.ok(), `card -> ${card.status()}`).toBeTruthy();
  expect((await request.post(`${API}/reservations`, { headers, data: { vehicleId: bike.id } })).ok()).toBeTruthy();
  const start = await request.post(`${API}/rentals`, {
    headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
    data: { vehicleId: bike.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' },
  });
  expect(start.ok(), `rental -> ${start.status()} ${await start.text()}`).toBeTruthy();
  const rental = ((await start.json()) as { rental: { id: string; startedAt: string } }).rental;
  return { vehicleId: bike.id, code: bike.code, rentalId: rental.id, customerName: customer.name, startedAt: rental.startedAt };
}

export async function endRental(request: APIRequestContext, rentalId: string) {
  await adminJson(request, 'post', `/rentals/${rentalId}/force-end`, { reason: 'Limpeza do e2e de paridade' });
}

export async function sendCommand(request: APIRequestContext, vehicleId: string, type: 'horn', reason: string) {
  await adminJson(request, 'post', `/vehicles/${vehicleId}/commands`, { type, reason });
}
