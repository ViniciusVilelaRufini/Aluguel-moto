import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, s3 } from './util3';
import { override, disputes3, claims3, messages3 } from './fixtures3';

async function openSupport(page: Page, group: 'admin' | 'suporte' = 'admin') {
  const mock = await loginMocked(page, { group });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/disputes(\?|$)/, { items: disputes3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/claims(\?|$)/, { items: claims3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/conversations\/[^/]+\/messages/, { items: messages3 });
  await page.goto('/customers?tab=support');
  return mock;
}

const openConv = async (page: Page) => { await page.getByText('Moto não destrava').first().click(); };
const resolveBtn = (page: Page) => page.getByRole('row').filter({ hasText: 'Cobrança indevida' }).getByRole('button', { name: 'Resolver' });

test.describe('suporte: conversas', () => {
  test('abrir conversa lista mensagens e marca como lida (POST read com a ultima do cliente)', async ({ page }) => {
    const mock = await openSupport(page, 'suporte');
    await openConv(page);
    await expect(page.getByText('Minha moto não destrava.')).toBeVisible();
    await expect.poll(() => calls(mock, /\/read$/).length).toBe(1);
    expect((calls(mock, /\/read$/)[0]!.body as { upToMessageId: string }).upToMessageId).toBe('msg-1');
    await s3(page, 'support-chat');
  });

  test('responder: envia body aparado, limpa o campo; botao desabilitado quando vazio', async ({ page }) => {
    const mock = await openSupport(page);
    await openConv(page);
    const send = page.getByRole('button', { name: 'Enviar' });
    await expect(send).toBeDisabled();
    await page.getByPlaceholder('Escreva uma resposta').fill('  Vamos verificar agora  ');
    await send.click();
    await expect.poll(() => calls(mock, /messages$/).length).toBe(1);
    expect(calls(mock, /messages$/)[0]!.body).toEqual({ body: 'Vamos verificar agora' });
    await expect(page.getByPlaceholder('Escreva uma resposta')).toHaveValue('');
  });

  test('[BUG P3-02] resposta com mais de 4000 caracteres e barrada no painel (contrato maxLength 4000)', async ({ page }) => {
    const mock = await openSupport(page);
    await openConv(page);
    await page.getByPlaceholder('Escreva uma resposta').fill('x'.repeat(4100));
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(600);
    const sent = calls(mock, /messages$/);
    expect(sent.every((c) => (c.body as { body: string }).body.length <= 4000), 'mensagem de 4100 caracteres chegou a API (o servidor devolveria 400 sem explicacao clara)').toBe(true);
  });

  test('[BUG P3-03] mensagem do cliente com anexos mostra a lista de anexos (attachmentObjectKeys)', async ({ page }) => {
    await openSupport(page);
    await openConv(page);
    await expect(page.getByText('Minha moto não destrava.')).toBeVisible();
    await s3(page, 'support-attachments');
    await expect(page.getByText(/foto-1|2 anexos|Anexo/i).first(), 'o painel ignora attachmentObjectKeys: o atendente nao ve o que o cliente anexou').toBeVisible({ timeout: 2000 });
  });

  test('[BUG P3-04] conversa da lista e acessivel por teclado (role/tabIndex)', async ({ page }) => {
    await openSupport(page);
    const item = page.getByText('Moto não destrava').first().locator('xpath=ancestor::div[@style][1]');
    const ok = await item.evaluate((el) => el.hasAttribute('tabindex') || el.hasAttribute('role'));
    expect(ok, 'a linha da conversa e um <div onClick> sem role/tabIndex: nao abre com Tab+Enter').toBe(true);
  });

  test('fechar conversa envia status=closed e limpa a selecao', async ({ page }) => {
    const mock = await openSupport(page);
    // O mock-api acha a conversa por seg[1] ("conversations") e devolve 404: limitacao do harness, nao do painel.
    await override(page, mock, 'PATCH', /api\.mock\.local\/support\/conversations\/conv-1$/, { id: 'conv-1', customerId: 'cus-001', subject: 'Moto não destrava', status: 'closed', unreadCount: 0, createdAt: '2026-10-26T14:00:00.000Z', lastMessageAt: '2026-10-26T14:50:00.000Z' });
    await openConv(page);
    await page.getByRole('button', { name: 'Fechar conversa' }).click();
    await expect.poll(() => calls(mock, /conversations\/conv-1$/, 'PATCH').length).toBe(1);
    expect(calls(mock, /conversations\/conv-1$/, 'PATCH')[0]!.body).toEqual({ status: 'closed' });
    await s3(page, 'support-close');
    await expect(page.getByText('Selecione uma conversa.')).toBeVisible();
  });

  test('erro 500 ao enviar mostra a mensagem e mantem o texto digitado', async ({ page }) => {
    const mock = await openSupport(page);
    await override(page, mock, 'POST', /api\.mock\.local\/support\/conversations\/[^/]+\/messages/, { type: 'x', title: 'Falha simulada', status: 500, detail: 'Falha simulada' }, 500);
    await openConv(page);
    await page.getByPlaceholder('Escreva uma resposta').fill('Texto importante');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/Falha simulada/)).toBeVisible();
    await expect(page.getByPlaceholder('Escreva uma resposta')).toHaveValue('Texto importante');
  });
});

test.describe('suporte: contestacoes e sinistros', () => {
  test('resolver contestacao aceita com estorno: POST com refundAmountCents em centavos', async ({ page }) => {
    const mock = await openSupport(page, 'suporte');
    await page.getByRole('button', { name: 'Contestações' }).click();
    await resolveBtn(page).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    await dlg.getByPlaceholder('0,00').fill('12,50');
    await dlg.locator('textarea').fill('Cobranca duplicada confirmada');
    await dlg.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Contestação resolvida')).toBeVisible();
    const c = calls(mock, /disputes\/dsp-1\/resolve$/);
    expect(c).toHaveLength(1);
    expect(c[0]!.body).toEqual({ decision: 'accepted', resolution: 'Cobranca duplicada confirmada', refundAmountCents: 1250 });
  });

  test('recusar nao envia refundAmountCents mesmo com valor digitado antes', async ({ page }) => {
    const mock = await openSupport(page);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await resolveBtn(page).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('0,00').fill('5');
    await dlg.locator('select').selectOption('rejected');
    await expect(dlg.getByPlaceholder('0,00')).toHaveCount(0);
    await dlg.locator('textarea').fill('Sem fundamento');
    await dlg.getByRole('button', { name: 'Confirmar' }).click();
    await expect.poll(() => calls(mock, /resolve$/).length).toBe(1);
    expect(calls(mock, /resolve$/)[0]!.body).toEqual({ decision: 'rejected', resolution: 'Sem fundamento' });
  });

  for (const v of ['abc', '-5', '0']) {
    test(`[BUG P3-05] estorno invalido "${v}" e recusado com mensagem (hoje some ou segue sem estorno)`, async ({ page }) => {
      const mock = await openSupport(page);
      await page.getByRole('button', { name: 'Contestações' }).click();
      await resolveBtn(page).click();
      const dlg = page.getByRole('dialog');
      await dlg.getByPlaceholder('0,00').fill(v);
      await dlg.locator('textarea').fill('Teste de valor');
      await dlg.getByRole('button', { name: 'Confirmar' }).click();
      await page.waitForTimeout(600);
      const sent = calls(mock, /resolve$/);
      const stillOpenWithMsg = (await dlg.isVisible()) && /valor|inválid/i.test(await dlg.innerText());
      expect(sent.length === 0 && stillOpenWithMsg, `resolveu enviando ${JSON.stringify(sent[0]?.body)} sem avisar que o valor "${v}" foi ignorado/invalido`).toBe(true);
    });
  }

  test('[BUG P3-06] contestacao mostra a que aluguel/cliente se refere', async ({ page }) => {
    await openSupport(page);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await s3(page, 'support-disputes');
    await expect(page.getByRole('row').filter({ hasText: 'Cobrança indevida' })).toContainText(/rent-001|Cliente Teste 01|Aluguel/, { timeout: 2000 });
  });

  test('[BUG P3-07] estorno acima do valor pago e barrado antes de enviar (R$ 99.999.999,00)', async ({ page }) => {
    const mock = await openSupport(page);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await resolveBtn(page).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('0,00').fill('99999999');
    await dlg.locator('textarea').fill('Teste maximo');
    await dlg.getByRole('button', { name: 'Confirmar' }).click();
    await page.waitForTimeout(600);
    expect(calls(mock, /resolve$/), 'foi enviado refundAmountCents=9999999900 sem checar o pagamento do aluguel').toHaveLength(0);
  });

  test('motivo longo nao gera rolagem horizontal em 1440', async ({ page }) => {
    await openSupport(page);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'nunca aconteceu' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test('erro 422 na resolucao mostra mensagem do servidor e mantem o dialogo', async ({ page }) => {
    const mock = await openSupport(page);
    await override(page, mock, 'POST', /api\.mock\.local\/support\/disputes\/[^/]+\/resolve/, { type: 'x', title: 'Estorno maior que o pagamento', status: 422, detail: 'Estorno maior que o pagamento' }, 422);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await resolveBtn(page).click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('textarea').fill('Teste erro');
    await dlg.getByRole('button', { name: 'Confirmar' }).click();
    await expect(dlg).toContainText('Estorno maior que o pagamento');
    await expect(page.getByText('Contestação resolvida')).toHaveCount(0);
  });

  test('[BUG P3-08] duplo clique em Confirmar nao resolve (e estorna) duas vezes', async ({ page }) => {
    const mock = await openSupport(page);
    await override(page, mock, 'POST', /api\.mock\.local\/support\/disputes\/[^/]+\/resolve/, () => ({}), 200);
    await page.getByRole('button', { name: 'Contestações' }).click();
    await resolveBtn(page).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('0,00').fill('10');
    await dlg.locator('textarea').fill('Teste duplo');
    await dlg.getByRole('button', { name: 'Confirmar' }).dblclick();
    await page.waitForTimeout(800);
    expect(calls(mock, /resolve$/).length, 'duplo clique enviou 2 resolucoes (2 estornos)').toBe(1);
  });

  test('sinistros: atualizar situacao envia PATCH com statusNote', async ({ page }) => {
    const mock = await openSupport(page);
    await page.getByRole('button', { name: 'Sinistros' }).click();
    await page.getByRole('row').filter({ hasText: 'retrovisor' }).getByRole('button', { name: 'Atualizar' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('select').selectOption('approved');
    await dlg.locator('textarea').fill('Aprovado pela seguradora');
    await dlg.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Sinistro atualizado')).toBeVisible();
    expect(calls(mock, /claims\/clm-1$/, 'PATCH')[0]!.body).toEqual({ status: 'approved', statusNote: 'Aprovado pela seguradora' });
  });
});
