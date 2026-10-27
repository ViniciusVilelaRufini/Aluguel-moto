/** Fixtures novas da varredura 3 (so exports novos; nada dos arquivos antigos foi alterado). */
import type { Page } from '@playwright/test';
import type { Mock } from '../mock-api';

const NOW = '2026-10-26T15:00:00.000Z';
export const API = 'http://api.mock.local';

export const disputes3 = [
  { id: 'dsp-1', customerId: 'cus-001', rentalId: 'rent-001', status: 'open', reason: 'Cobrança indevida', createdAt: NOW, updatedAt: NOW },
  { id: 'dsp-2', customerId: 'cus-002', rentalId: 'rent-002', status: 'under_review', reason: 'Cobrado por uma corrida que nunca aconteceu, a moto estava sem bateria desde o início do aluguel e o app mostrou erro', createdAt: NOW, updatedAt: NOW },
];
export const claims3 = [
  { id: 'clm-1', customerId: 'cus-001', rentalId: 'rent-001', type: 'damage', status: 'submitted', description: 'Queda em ciclovia, retrovisor quebrado', occurredAt: NOW, createdAt: NOW, updatedAt: NOW },
];
export const messages3 = [
  { id: 'msg-1', conversationId: 'conv-1', authorType: 'customer', authorName: 'Cliente Teste 01', body: 'Minha moto não destrava.', attachmentObjectKeys: ['support/cus-001/foto-1.jpg', 'support/cus-001/foto-2.jpg'], createdAt: NOW },
  { id: 'msg-0', conversationId: 'conv-1', authorType: 'staff', authorName: 'Ana', body: 'Olá! Pode mandar uma foto?', status: 'read', createdAt: '2026-10-26T14:50:00.000Z' },
];

/** Sobrepoe (rota registrada depois ganha) respostas do mock sem tocar em mock-api.ts. */
export async function override(page: Page, mock: Mock, method: string, re: RegExp, json: unknown | ((body: any, url: URL) => unknown), status = 200) {
  await page.route(re, async (route) => {
    const req = route.request();
    if (req.method() !== method) return route.fallback();
    const url = new URL(req.url());
    let body: unknown; try { body = req.postDataJSON(); } catch { body = undefined; }
    mock.calls.push({ method, path: url.pathname, query: url.searchParams, body });
    const out = typeof json === 'function' ? (json as any)(body, url) : json;
    return route.fulfill({ status, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(out) });
  });
}

/** Socket.io (engine.io v4) proprio com controle de queda: `drop()` fecha a conexao atual; `connections` conta reconexoes. */
export async function installControllableSocket(page: Page) {
  const ctl = { connections: 0, current: null as null | { close: (o?: { code?: number; reason?: string }) => Promise<void>; send: (m: string) => void }, refuse: false,
    drop: async () => { await ctl.current?.close({ code: 1006, reason: 'test-drop' }); },
    emit: (event: string, payload: unknown) => ctl.current?.send('42/realtime,' + JSON.stringify([event, payload])) };
  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    ctl.connections++;
    if (ctl.refuse) { void ws.close({ code: 1006, reason: 'refused' }); return; }
    ctl.current = ws as never;
    ws.send('0' + JSON.stringify({ sid: 'ctl-sid-' + ctl.connections, upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage((m) => {
      const s = String(m);
      if (s.startsWith('40')) { const ns = s.slice(2).startsWith('/') ? s.slice(2).split(',')[0] + ',' : ''; ws.send('40' + ns + JSON.stringify({ sid: 'ctl-ns-' + ctl.connections })); }
      else if (s === '2') ws.send('3');
    });
  });
  return ctl;
}
