/**
 * Balcão do galpão no painel (Task 13 da pré-reserva): "Contrato e pagamento" na Retiradas (reserva já em entrega,
 * sem vistoria no painel) e "Acertar no balcão" no detalhe do aluguel e nas Entregas.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';

const PHOTO = { name: 'contrato.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) };

async function openCheckout(page: Page) {
  await page.goto('/retiradas');
  await expect(page.getByTestId('pickups-table')).toContainText('VLT-003');
  await page.getByTestId('pickup-counter-checkout').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toBeVisible();
}

test('Retiradas: contrato e pagamento inicia o aluguel', async ({ page }) => {
  const { calls } = await loginMocked(page, { group: 'operacao' });
  await openCheckout(page);
  const dialog = page.getByTestId('counter-checkout-dialog');
  await expect(page.getByTestId('pickup-counter-checkout')).toHaveCount(1); // só a reserva em entrega
  await dialog.getByRole('button', { name: 'Semanal', exact: true }).click();
  await page.getByTestId('counter-quantity-inc').click();
  await expect(page.getByTestId('counter-quantity')).toHaveValue('2');
  await expect(page.getByTestId('counter-total')).toContainText('515,00');
  await expect(page.getByTestId('counter-start')).toBeDisabled(); // sem foto do contrato
  await page.getByTestId('counter-contract-photo').setInputFiles(PHOTO);
  await expect(page.getByTestId('counter-photos')).toContainText('1 de 4');
  await page.getByTestId('counter-method').selectOption('cash');
  await page.getByTestId('counter-start').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toHaveCount(0);
  await expect(page.getByText('Aluguel iniciado — moto liberada')).toBeVisible();

  const upload = calls.find((c) => c.method === 'POST' && c.path === '/handovers/uploads')!;
  expect(upload.body).toEqual({ contentType: 'image/jpeg', purpose: 'contract' });
  expect(calls.some((c) => c.method === 'PUT' && c.path.startsWith('/uploads/'))).toBeTruthy();
  const posts = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/counter-checkout'));
  expect(posts).toHaveLength(1);
  const post = posts[0]!;
  expect(post.path).toBe('/handovers/ho-3/counter-checkout');
  expect(post.body).toMatchObject({ planCode: 'weekly', quantity: 2, payment: { method: 'cash', amountCents: 51500 }, contractPhotoKeys: [expect.stringMatching(/^contracts\//)] });
  expect(post.headers['idempotency-key']).toBeTruthy();
  // A agenda recarrega depois do sucesso: a reserva convertida não oferece mais o checkout.
  await expect(page.getByTestId('pickup-counter-checkout')).toHaveCount(0);
});

test('Retiradas: valor divergente recarrega a cotação e mantém a chave até mudar os dados', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  mock.db.counter.mismatchOnce = true;
  await openCheckout(page);
  await page.getByTestId('counter-contract-photo').setInputFiles(PHOTO);
  await page.getByTestId('counter-reference').fill('NSU123');
  const quotes = () => mock.calls.filter((c) => c.method === 'GET' && c.path.endsWith('/counter-quote')).length;
  const before = quotes();
  await page.getByTestId('counter-start').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toContainText('O valor mudou. Confira e toque de novo.');
  await expect.poll(quotes).toBeGreaterThan(before);
  await page.getByTestId('counter-start').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toHaveCount(0);
  const posts = mock.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/counter-checkout'));
  expect(posts).toHaveLength(2);
  // Mesmos dados nas duas tentativas → mesma Idempotency-Key.
  expect(posts[0]!.headers['idempotency-key']).toBe(posts[1]!.headers['idempotency-key']);
  expect(posts[1]!.body).toMatchObject({ planCode: 'day', quantity: 1, coverage: 'basic', payment: { method: 'counter_card', amountCents: 9000, reference: 'NSU123' } });
});

test('Retiradas: consentimento revogado pede ao cliente', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  mock.db.counter.checkoutError = { status: 422, slug: 'location-consent-required', title: 'Peça ao cliente para permitir a localização no app.' };
  await openCheckout(page);
  await page.getByTestId('counter-contract-photo').setInputFiles(PHOTO);
  await page.getByTestId('counter-start').click();
  await expect(page.getByTestId('counter-checkout-dialog')).toContainText('Peça ao cliente para permitir a localização no app');
});

test('Acertar no balcão: abate e devolve', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  await page.goto('/customers?tab=rentals&rental=rent-002');
  await expect(page.getByTestId('rental-detail')).toBeVisible();
  await page.getByTestId('rental-counter-settle').click();
  const dialog = page.getByTestId('counter-settle-dialog');
  await expect(dialog).toContainText('60,00');
  await expect(dialog).toContainText('100,00');

  await page.getByTestId('counter-debt-deduct').click();
  await page.getByTestId('counter-action-amount').fill('60,00');
  await page.getByTestId('counter-action-confirm').click();
  await expect(dialog).toContainText('Nenhum valor a acertar');
  await expect(page.getByTestId('counter-deposit-available')).toContainText('40,00');

  // Valor acima do disponível: erro de campo, nada é enviado.
  await page.getByTestId('counter-deposit-refund').click();
  await page.getByTestId('counter-action-amount').fill('120,00');
  await page.getByTestId('counter-action-confirm').click();
  await expect(dialog.getByRole('alert').first()).toContainText('disponível');
  expect(mock.calls.filter((c) => c.path.endsWith('/counter-refund'))).toHaveLength(0);

  await page.getByTestId('counter-action-amount').fill('40,00');
  await page.getByTestId('counter-action-confirm').click();
  await expect(dialog).toContainText('Nenhuma caução a devolver');

  const settle = mock.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/counter-settle'));
  expect(settle).toHaveLength(1);
  expect(settle[0]!.path).toBe(`/payments/${mock.db.counter.debts[0]!.paymentId}/counter-settle`);
  expect(settle[0]!.body).toEqual({ amountCents: 6000, fromDepositId: mock.db.counter.deposits[0]!.depositId });
  const refund = mock.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/counter-refund'));
  expect(refund).toHaveLength(1);
  expect(refund[0]!.path).toBe(`/payments/deposits/${mock.db.counter.deposits[0]!.depositId}/counter-refund`);
  expect(refund[0]!.body).toEqual({ amountCents: 4000 });
  expect(settle[0]!.headers['idempotency-key']).toBeTruthy();
  expect(refund[0]!.headers['idempotency-key']).toBeTruthy();
  expect(settle[0]!.headers['idempotency-key']).not.toBe(refund[0]!.headers['idempotency-key']);
});

test('Acertar no balcão: recebe pelo método do balcão a partir das Entregas', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  await page.goto('/entregas');
  await page.getByTestId('handovers-table').getByText('VLT-002').first().click();
  await page.getByTestId('handover-counter-settle').click();
  const dialog = page.getByTestId('counter-settle-dialog');
  await page.getByTestId('counter-debt-receive').click();
  await expect(page.getByTestId('counter-action-amount')).toHaveValue('60,00');
  await page.getByTestId('counter-action-amount').fill('25,00');
  await page.getByTestId('counter-action-method').selectOption('counter_pix');
  await page.getByTestId('counter-action-reference').fill('E123');
  await page.getByTestId('counter-action-confirm').click();
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('35,00');
  const settle = mock.calls.find((c) => c.method === 'POST' && c.path.endsWith('/counter-settle'))!;
  expect(settle.body).toEqual({ amountCents: 2500, method: 'counter_pix', reference: 'E123' });
  await expect(dialog).toBeVisible();
});

test('Acertar no balcão: resposta perdida depois do registro não quita duas vezes', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  mock.db.counter.failAfterApplyOnce = true;
  await page.goto('/customers?tab=rentals&rental=rent-002');
  await page.getByTestId('rental-counter-settle').click();
  const dialog = page.getByTestId('counter-settle-dialog');
  await page.getByTestId('counter-debt-receive').click();
  await page.getByTestId('counter-action-amount').fill('25,00');
  await page.getByTestId('counter-action-confirm').click();
  await expect(page.getByTestId('counter-settle-error')).toBeVisible();
  // O saldo recarrega mesmo no erro: o servidor já registrou os 25,00.
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('35,00');
  await page.getByTestId('counter-action-cancel').click();
  // Fecha e reabre o diálogo dentro do staleTime padrão: o saldo vem do servidor de novo.
  await dialog.getByRole('button', { name: 'Fechar' }).click();
  await page.getByTestId('rental-counter-settle').click();
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('35,00');
  await page.getByTestId('counter-debt-receive').click();
  await expect(page.getByTestId('counter-action-amount')).toHaveValue('35,00');
  const settles = () => mock.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/counter-settle'));
  expect(settles()).toHaveLength(1); // reabrir não reenvia nada
  // O atendente repete os mesmos dados: mesma chave, a API devolve o já registrado e o saldo não cai de novo.
  await page.getByTestId('counter-action-amount').fill('25,00');
  await page.getByTestId('counter-action-confirm').click();
  await expect(page.getByTestId('counter-action')).toHaveCount(0);
  expect(settles()).toHaveLength(2);
  expect(settles()[1]!.headers['idempotency-key']).toBe(settles()[0]!.headers['idempotency-key']);
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('35,00');
  expect(mock.db.counter.debts[0]!.outstandingCents).toBe(3500);
});

test('Acertar no balcão: saldo mudado no servidor mostra aviso sem centavos crus e recarrega', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  await page.goto('/entregas');
  await page.getByTestId('handovers-table').getByText('VLT-002').first().click();
  await page.getByTestId('handover-counter-settle').click();
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('60,00');
  mock.db.counter.debts[0]!.outstandingCents = 1000; // outro balcão quitou parte enquanto isso
  await page.getByTestId('counter-debt-receive').click();
  await page.getByTestId('counter-action-confirm').click();
  const err = page.getByTestId('counter-settle-error');
  await expect(err).toHaveText('O saldo mudou. Confira e tente de novo.');
  await expect(err).not.toContainText('1000');
  await expect(page.getByTestId('counter-debt-outstanding')).toContainText('10,00');
});

test('Acertar no balcão: aluguel aberto aguarda o encerramento', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  mock.db.counter.rentalStatus = 'active';
  await page.goto('/customers?tab=rentals&rental=rent-002');
  await page.getByTestId('rental-counter-settle').click();
  await expect(page.getByTestId('counter-settle-dialog')).toContainText('Aguardando o encerramento do aluguel');
  await expect(page.getByTestId('counter-debt-receive')).toHaveCount(0);
  mock.db.counter.rentalStatus = 'ended';
  await page.getByTestId('counter-settle-refresh').click();
  await expect(page.getByTestId('counter-debt-receive')).toBeVisible();
});

test('Acertar no balcão: suporte não vê a ação', async ({ page }) => {
  await loginMocked(page, { group: 'suporte' });
  await page.goto('/customers?tab=rentals&rental=rent-002');
  await expect(page.getByTestId('rental-detail')).toBeVisible();
  await expect(page.getByTestId('force-end')).toHaveCount(0); // rent-002 encerrado
  await expect(page.getByTestId('rental-counter-settle')).toHaveCount(0);
});
