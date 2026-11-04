/**
 * Entrega de saída pelo painel (2026-11-04): em Retiradas, a reserva "Aguardando" ganha "Entregar moto" (QR do cliente
 * pela câmera ou pelo campo do leitor USB, checklist, fotos e bateria); ao criar a entrega abre o "Contrato e pagamento".
 * Sem QR só o admin, com motivo.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';

const PHOTO = { name: 'frente.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) };
const CODES = ['freios', 'luzes', 'pneus', 'buzina', 'painel', 'carenagem'];
/** QR da reserva `res-2` (aguardando) no formato `v1.<reservationId>.<exp>.<assinatura>`. */
const CODE = 'v1.res-2.1792663200.c2VncmVkbw';

async function openDeliver(page: Page) {
  await page.goto('/retiradas');
  await expect(page.getByTestId('pickups-table')).toContainText('VLT-004');
  await expect(page.getByTestId('pickup-deliver')).toHaveCount(1); // só a reserva aguardando
  await page.getByTestId('pickup-deliver').click();
  await expect(page.getByTestId('pickup-handover-dialog')).toBeVisible();
}

async function fillInspection(page: Page, issue?: string) {
  for (const c of CODES) await page.getByTestId(`pickup-check-${c}-${c === issue ? 'issue' : 'ok'}`).click();
  if (issue) await page.getByTestId(`pickup-check-${issue}-note`).fill('Risco leve');
  await page.getByTestId('pickup-photo-input').setInputFiles(PHOTO);
  await expect(page.getByTestId('pickup-photos')).toContainText('1 de 12');
}

test('Retiradas: Aguardando → Entregar moto (código pelo leitor) → checklist/foto/bateria → Contrato e pagamento', async ({ page }) => {
  const { calls } = await loginMocked(page, { group: 'operacao' });
  await openDeliver(page);
  const dialog = page.getByTestId('pickup-handover-dialog');
  await expect(dialog).not.toContainText('Sem QR'); // operacao não entrega sem QR
  await expect(page.getByTestId('pickup-camera-start')).toHaveCount(0); // Chromium sem BarcodeDetector: só o campo
  await expect(page.getByTestId('pickup-battery')).toHaveValue('95'); // leitura da moto
  await expect(page.getByTestId('pickup-handover-submit')).toBeDisabled();

  // Leitor USB: digita o código e dá Enter.
  await page.getByTestId('pickup-code-input').pressSequentially(CODE);
  await page.getByTestId('pickup-code-input').press('Enter');
  await expect(page.getByTestId('pickup-code-read')).toHaveText('Código lido');
  await expect(dialog).not.toContainText(CODE);

  await fillInspection(page, 'carenagem');
  await page.getByTestId('pickup-battery').fill('92');
  await page.getByTestId('pickup-handover-submit').click();

  await expect(page.getByTestId('pickup-handover-dialog')).toHaveCount(0);
  await expect(page.getByTestId('counter-checkout-dialog')).toBeVisible();

  const upload = calls.find((c) => c.method === 'POST' && c.path === '/handovers/uploads')!;
  expect(upload.body).toEqual({ contentType: 'image/jpeg', purpose: 'photo' });
  const posts = calls.filter((c) => c.method === 'POST' && c.path === '/handovers');
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toEqual({
    type: 'pickup', depotId: 'dep-1', pickupCode: CODE, photoKeys: [expect.stringMatching(/^handovers\//)], batteryPct: 92,
    checklist: CODES.map((code) => (code === 'carenagem' ? { code, ok: false, note: 'Risco leve' } : { code, ok: true })),
  });
  // O "Contrato e pagamento" é da entrega criada.
  await expect.poll(() => calls.some((c) => c.method === 'GET' && c.path === '/handovers/ho-4/counter-quote')).toBeTruthy();
});

test('Retiradas: QR de outra reserva é recusado sem mostrar o código', async ({ page }) => {
  await loginMocked(page, { group: 'operacao' });
  await openDeliver(page);
  const other = 'v1.6c1f0a52-8f3e-4b8e-9d55-0d6a7f1e2c11.1792663200.c2ln';
  await page.getByTestId('pickup-code-input').fill(other);
  await page.getByTestId('pickup-code-confirm').click();
  await expect(page.getByTestId('pickup-handover-dialog')).toContainText('Este QR é de outra reserva.');
  await expect(page.getByTestId('pickup-code-read')).toHaveCount(0);
  await expect(page.getByTestId('pickup-code-input')).toHaveValue('');
});

test('Retiradas: admin entrega sem QR com motivo', async ({ page }) => {
  const { calls } = await loginMocked(page, { group: 'admin' });
  await openDeliver(page);
  await page.getByRole('button', { name: 'Sem QR (admin)', exact: true }).click();
  await expect(page.getByTestId('pickup-no-code')).toContainText('Confira o documento do cliente');
  await fillInspection(page);
  await page.getByTestId('pickup-no-code-reason').fill('curto');
  await expect(page.getByTestId('pickup-handover-submit')).toBeDisabled();
  await page.getByTestId('pickup-no-code-reason').fill('Celular do cliente sem bateria; RG conferido.');
  await page.getByTestId('pickup-handover-submit').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toBeVisible();
  const post = calls.find((c) => c.method === 'POST' && c.path === '/handovers')!;
  expect(post.body).toMatchObject({ type: 'pickup', depotId: 'dep-1', reservationId: 'res-2', noCodeReason: 'Celular do cliente sem bateria; RG conferido.', batteryPct: 95 });
  expect(post.body).not.toHaveProperty('pickupCode');
});
