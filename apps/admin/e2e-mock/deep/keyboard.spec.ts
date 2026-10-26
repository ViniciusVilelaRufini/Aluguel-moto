import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { dshot, openVehicle } from './util';

/** Abre pelo teclado, confere foco inicial dentro, trap de Tab/Shift+Tab, Esc fecha e o foco volta ao abridor. */
async function dialogKeyboard(page: Page, opener: Locator, dialog: Locator, tag: string) {
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  const inside = () => dialog.evaluate((d) => d.contains(document.activeElement));
  expect(await inside(), `${tag}: foco inicial dentro do dialogo`).toBe(true);
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await inside(), `${tag}: Tab #${i + 1} escapou do dialogo`).toBe(true);
  }
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await inside(), `${tag}: Shift+Tab #${i + 1} escapou do dialogo`).toBe(true);
  }
  await dshot(page, `kb-${tag}`);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const back = await opener.evaluate((el) => document.activeElement === el);
  expect(back, `${tag}: foco nao voltou para o botao que abriu o dialogo`).toBe(true);
}

test.describe('teclado: dialogos', () => {
  test('comando remoto (Bloquear)', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await dialogKeyboard(page, page.getByTestId('cmd-lock'), page.getByTestId('command-dialog'), 'comando');
  });

  test('comando: Enter dentro do campo de motivo nao envia sem querer (textarea) e Esc fecha so o dialogo', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-horn').click();
    await page.getByTestId('reason-input').fill('abc');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-dialog')).toHaveCount(0);
    await expect(page.getByTestId('vehicle-sheet'), 'Esc do dialogo nao deve fechar tambem a ficha').toBeVisible();
  });

  test('historico da moto', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await dialogKeyboard(page, page.getByRole('button', { name: 'Histórico' }), page.getByRole('dialog', { name: /Histórico de/ }), 'historico');
  });

  test('atribuir alerta', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    await dialogKeyboard(page, page.getByTestId('alerts-table').getByRole('button', { name: /Atribuir/ }).first(), page.getByTestId('assign-dialog'), 'atribuir');
  });

  test('resolver alerta', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    await dialogKeyboard(page, page.getByTestId('alerts-table').getByRole('button', { name: 'Resolver' }).first(), page.getByRole('dialog', { name: 'Resolver alerta' }), 'resolver');
  });

  test('nova tarefa', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/tasks');
    await dialogKeyboard(page, page.getByTestId('new-task'), page.getByTestId('new-task-dialog'), 'nova-tarefa');
  });

  test('convidar pessoa', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/team');
    await dialogKeyboard(page, page.getByTestId('invite-staff'), page.getByRole('dialog', { name: 'Convidar pessoa' }), 'convidar');
  });

  test('novo cupom', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    await dialogKeyboard(page, page.getByRole('button', { name: 'Novo cupom' }), page.getByRole('dialog', { name: 'Novo cupom' }), 'cupom');
  });

  test('lista de restricao', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await dialogKeyboard(page, page.getByRole('button', { name: 'Lista de restrição', exact: true }), page.getByRole('dialog', { name: 'Lista de restrição' }), 'restricao');
  });

  test('excluir cerca', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/zones');
    await page.getByTestId('zone-item').first().click();
    await dialogKeyboard(page, page.getByTestId('zone-delete'), page.getByTestId('delete-dialog'), 'excluir-cerca');
  });

  test('bloquear cliente', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await page.getByTestId('customers-table').getByTestId('row').nth(1).click();
    await dialogKeyboard(page, page.getByTestId('block-customer'), page.getByRole('dialog', { name: 'Bloquear conta' }), 'bloquear-cliente');
  });
});

test.describe('teclado: paleta de comandos', () => {
  test('Ctrl+K abre com foco no campo, Tab nao sai, setas mudam a opcao ativa, Esc devolve o foco', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    const trigger = page.locator('.palette-trigger');
    await trigger.focus();
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await expect(page.getByTestId('palette-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('palette-input')).toBeFocused();
    const opts = page.getByTestId('palette-option');
    await expect(opts.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(opts.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(opts.last(), 'ArrowUp no primeiro deve voltar para o ultimo').toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('paleta: "/" abre fora de campos e e ignorada dentro de campo de texto; nao abre sobre um dialogo', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await page.getByTestId('customer-search').fill('a/b');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await page.locator('#main-content').click({ position: { x: 5, y: 5 } });
    await page.getByTestId('customer-search').blur();
    await page.keyboard.press('/');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Lista de restrição', exact: true }).click();
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
  });

  test('[BUG P2-21] paleta: ao abrir uma moto o foco vai para a ficha (e nao para o titulo da pagina)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByTestId('palette-input').fill('VLT-007');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('vehicle-sheet');
  });

  test('[BUG P2-18] paleta: lista de resultados e rotulada e o leitor de tela e avisado do total de resultados', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByTestId('palette-input').fill('VLT-00');
    await expect(page.getByTestId('palette-option').first()).toBeVisible();
    const live = await page.locator('[data-testid="command-palette"] [aria-live], [data-testid="command-palette"] [role="status"]').count();
    expect(live, 'sem regiao aria-live informando "N resultados"; leitor de tela nao sabe que a lista mudou').toBeGreaterThan(0);
  });
});

test.describe('teclado: tabelas e fichas', () => {
  test('linha de tabela e focavel e Enter/Espaco abre a ficha; Esc fecha', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    const r = page.getByTestId('customers-table').getByTestId('row').first();
    await r.focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('customer-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('customer-sheet')).toHaveCount(0);
  });

  test('[BUG P2-19] ficha da moto/cliente: ao abrir pelo teclado o foco vai para a ficha (leitor de tela e navegacao por Tab)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    const r = page.getByTestId('customers-table').getByTestId('row').first();
    await r.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('customer-sheet')).toBeVisible();
    await page.waitForTimeout(500);
    const inSheet = await page.evaluate(() => !!document.activeElement?.closest('[data-testid="customer-sheet"]'));
    expect(inSheet, 'depois de Enter na linha o foco continua na tabela; o proximo Tab percorre as outras linhas antes de chegar a ficha').toBe(true);
  });

  test('[BUG P2-20] ficha lateral e uma regiao nomeada (complementary com aria-label) ', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await page.getByTestId('customers-table').getByTestId('row').first().click();
    const aside = page.getByTestId('customer-sheet');
    await expect(aside).toBeVisible();
    const name = (await aside.getAttribute('aria-label')) ?? (await aside.getAttribute('aria-labelledby'));
    expect(name, '<aside> sem nome acessivel (landmark anonimo)').toBeTruthy();
  });
});
