/**
 * Chegada no galpão pelo painel (2026-11-04): o cliente devolve a moto no balcão e o atendente registra a chegada
 * (`POST /handovers`, `return_depot`) pela ficha da moto ("Receber no galpão") ou pelas Entregas ("Registrar chegada").
 * Com saldo a acertar, abre o "Acertar no balcão" do aluguel.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';

const PHOTO = { name: 'frente.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) };
const CODES = ['freios', 'pneus', 'luzes', 'carenagem'];

async function openSheet(page: Page, code: string) {
  await page.goto('/fleet');
  await expect(page.getByTestId('fleet-badge')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByTestId('palette-input').fill(code);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
}

async function fillInspection(page: Page, issue?: string) {
  for (const c of CODES) await page.getByTestId(`return-check-${c}-${c === issue ? 'issue' : 'ok'}`).click();
  if (issue) await page.getByTestId(`return-check-${issue}-note`).fill('Pneu traseiro murcho');
  await page.getByTestId('return-photo-input').setInputFiles(PHOTO);
  await expect(page.getByTestId('return-photos')).toContainText('1 de 12');
}

test('Ficha da moto alugada → Receber no galpão → registra → abre o Acertar no balcão', async ({ page }) => {
  const { calls } = await loginMocked(page, { group: 'operacao' });
  await openSheet(page, 'VLT-002');
  await page.getByTestId('vehicle-receive-depot').click();
  const dialog = page.getByTestId('return-handover-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('return-depot')).toHaveValue('dep-1'); // o único galpão ativo
  await expect(page.getByTestId('return-checklist').getByRole('button', { name: 'OK' })).toHaveCount(4);
  await expect(page.getByTestId('return-handover-submit')).toBeDisabled();

  await fillInspection(page, 'pneus');
  await page.getByTestId('return-battery').fill('41');
  await page.getByTestId('return-battery-serial').fill('BT-77');
  await page.getByTestId('return-handover-submit').click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('counter-settle-dialog')).toBeVisible();
  const posts = calls.filter((c) => c.method === 'POST' && c.path === '/handovers');
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toEqual({
    type: 'return_depot', rentalId: 'rent-002', depotId: 'dep-1', photoKeys: [expect.stringMatching(/^handovers\//)], batteryPct: 41, batterySerial: 'BT-77',
    checklist: CODES.map((code) => (code === 'pneus' ? { code, ok: false, note: 'Pneu traseiro murcho' } : { code, ok: true })),
  });
  expect(calls.some((c) => c.method === 'GET' && c.path === '/rentals/rent-002/counter-balance')).toBeTruthy();
});

test('Receber no galpão: moto fora do galpão (422 vehicle-not-at-depot) explica e mantém o diálogo', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  mock.db.returnNotAtDepot = true;
  await openSheet(page, 'VLT-002');
  await expect(page.getByTestId('vehicle-force-end')).toBeVisible(); // admin vê os dois
  await page.getByTestId('vehicle-receive-depot').click();
  await fillInspection(page);
  await page.getByTestId('return-handover-submit').click();
  const error = page.getByTestId('return-handover-error');
  await expect(error).toContainText('A moto precisa estar no galpão (até 150 m) e com sinal');
  await expect(error).toContainText('Encerrar aluguel à força');
  await expect(page.getByTestId('return-handover-dialog')).toBeVisible();
  await expect(page.getByTestId('counter-settle-dialog')).toHaveCount(0);
});

test('Entregas → Registrar chegada → busca VLT-009 → registra; sem saldo não abre o acerto', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  mock.db.counter.debts = [];
  mock.db.counter.deposits = [];
  await page.goto('/entregas');
  await page.getByTestId('handovers-register-arrival').click();
  await expect(page.getByTestId('arrival-search-dialog')).toBeVisible();
  await page.getByTestId('arrival-search-input').fill('VLT-009');
  await page.getByTestId('arrival-pick-VLT-009').click();
  await expect(page.getByTestId('arrival-search-dialog')).toHaveCount(0);
  await expect(page.getByTestId('return-handover-dialog')).toContainText('VLT-009');
  await fillInspection(page);
  await page.getByTestId('return-handover-submit').click();
  await expect(page.getByTestId('return-handover-dialog')).toHaveCount(0);
  await expect(page.getByText('Chegada registrada — aluguel encerrado')).toBeVisible();
  await expect.poll(() => mock.calls.some((c) => c.path === '/rentals/rent-009/counter-balance')).toBeTruthy();
  await expect(page.getByTestId('counter-settle-dialog')).toHaveCount(0);
  const post = mock.calls.find((c) => c.method === 'POST' && c.path === '/handovers')!;
  expect(post.body).toMatchObject({ type: 'return_depot', rentalId: 'rent-009', depotId: 'dep-1' });
});

test('Registrar chegada: a busca só lista motos com aluguel em andamento', async ({ page }) => {
  await loginMocked(page, { group: 'operacao' });
  await page.goto('/entregas');
  await page.getByTestId('handovers-register-arrival').click();
  await page.getByTestId('arrival-search-input').fill('VLT-01'); // VLT-010..019: só VLT-012 e VLT-019 alugadas
  await expect(page.getByTestId('arrival-pick-VLT-019')).toBeVisible();
  await expect(page.getByTestId('arrival-pick-VLT-012')).toBeVisible();
  await expect(page.getByTestId('arrival-search-results').getByRole('button')).toHaveCount(2);
});

test('Suporte não vê Receber no galpão nem Registrar chegada', async ({ page }) => {
  await loginMocked(page, { group: 'suporte' });
  await openSheet(page, 'VLT-002');
  await expect(page.getByTestId('vehicle-force-end')).toBeVisible();
  await expect(page.getByTestId('vehicle-receive-depot')).toHaveCount(0);
  await page.goto('/entregas');
  await expect(page.getByTestId('handovers-table')).toBeVisible();
  await expect(page.getByTestId('handovers-register-arrival')).toHaveCount(0);
});
