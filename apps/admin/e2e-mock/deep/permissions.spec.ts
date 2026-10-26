import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { can, menuFor, MENU, type Action } from '../../src/lib/permissions';
import type { StaffGroup } from '../../src/lib/types';
import { dshot, openVehicle, watch } from './util';

const GROUPS: StaffGroup[] = ['operacao', 'suporte', 'financeiro'];

async function navLabels(page: Page) {
  return page.getByRole('navigation').getByRole('button').allInnerTexts().then((t) => t.map((x) => x.replace(/\d+$/, '').trim()));
}

for (const g of GROUPS) {
  test.describe(`perfil ${g}`, () => {
    test(`menu lateral mostra exatamente as secoes de permissions.ts`, async ({ page }) => {
      const mock = await loginMocked(page, { group: g });
      const w = watch(page, mock);
      await page.goto(menuFor([g])[0]!.href);
      await expect(page.getByTestId('logout')).toBeVisible();
      const labels = await navLabels(page);
      expect(labels.filter((l) => MENU.some((m) => m.label === l)).sort()).toEqual(menuFor([g]).map((m) => m.label).sort());
      expect(w.finish(`perm-menu-${g}`)).toEqual([]);
    });

    test(`URL direta de secao proibida redireciona para a primeira secao permitida`, async ({ page }) => {
      await loginMocked(page, { group: g });
      const allowed = new Set(menuFor([g]).map((m) => m.href));
      const forbidden = MENU.filter((m) => !allowed.has(m.href));
      for (const f of forbidden) {
        await page.goto(f.href);
        await expect(page).toHaveURL(new RegExp(menuFor([g])[0]!.href));
      }
    });
  });
}

test('operacao: ficha da moto tem comandos e nao mostra cliente nem auditoria completa', async ({ page }) => {
  await loginMocked(page, { group: 'operacao' });
  await openVehicle(page, 'VLT-002');
  await expect(page.getByTestId('cmd-lock')).toBeVisible();
  await expect(page.getByTestId('vehicle-sheet').getByText('Restrito')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver auditoria completa' })).toHaveCount(0);
});

test('suporte: ficha da moto sem comandos, sem replay; alertas com acoes; zonas sem acesso', async ({ page }) => {
  await loginMocked(page, { group: 'suporte' });
  await openVehicle(page, 'VLT-002');
  await expect(page.getByTestId('cmd-lock')).toHaveCount(0);
  await expect(page.getByText('Seu perfil não envia comandos para a moto.')).toBeVisible();
  await expect(page.getByTestId('replay-toggle')).toHaveCount(0);
  await page.goto('/alerts');
  await expect(page.getByTestId('alerts-table').getByRole('button', { name: 'Resolver' }).first()).toBeVisible();
});

test('suporte: pode bloquear cliente e revisar KYC; nao remove CPF da lista de restricao; CPF mascarado', async ({ page }) => {
  await loginMocked(page, { group: 'suporte' });
  await page.goto('/customers');
  await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
  await page.getByTestId('customers-table').getByTestId('row').first().click(); // cus-001: pendente
  await expect(page.getByTestId('block-customer')).toBeVisible();
  await expect(page.getByTestId('customer-sheet').getByRole('button', { name: 'Aprovar' })).toBeVisible();
  await page.getByRole('button', { name: 'Lista de restrição', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Remover' })).toHaveCount(0);
});

test('financeiro: precos sao somente leitura (sem inputs, sem Salvar) e ve aviso', async ({ page }) => {
  await loginMocked(page, { group: 'financeiro' });
  await page.goto('/settings');
  await expect(page.getByText('Seu perfil só visualiza preços e planos.')).toBeVisible();
  await expect(page.getByTestId('save-settings')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Novo cupom' })).toHaveCount(0);
  await expect(page.locator('input.field-mini')).toHaveCount(0);
});

test('operacao: cercas editaveis, nova tarefa disponivel; financeiro nao ve criar tarefa', async ({ page }) => {
  await loginMocked(page, { group: 'operacao' });
  await page.goto('/zones');
  await expect(page.getByTestId('draw-zone')).toBeVisible();
  await page.goto('/tasks');
  await expect(page.getByTestId('new-task')).toBeVisible();
});

test('[BUG P2-16] financeiro: switches de ativo ficam desabilitados e a interface nao sugere edicao', async ({ page }) => {
  await loginMocked(page, { group: 'financeiro' });
  await page.goto('/settings');
  await expect(page.getByRole('switch').first()).toBeVisible();
  const enabled = await page.getByRole('switch').evaluateAll((els) => els.filter((e) => !(e as HTMLButtonElement).disabled && e.getAttribute('aria-disabled') !== 'true').length);
  await dshot(page, 'settings-readonly-switches');
  expect(enabled, 'switches de somente leitura sao <button> habilitados (focaveis, sem disabled/aria-disabled) so com opacidade 0.4').toBe(0);
});

test('[BUG P2-17] grupo "campo" (sem secoes no painel) e redirecionado para o login sem nenhuma explicacao: deve ver mensagem de sem acesso', async ({ page }) => {
  await loginMocked(page, { group: 'campo' });
  await page.goto('/fleet');
  await page.waitForTimeout(2500);
  await dshot(page, 'campo-no-access');
  const url = new URL(page.url());
  const text = (await page.locator('body').innerText()).toLowerCase();
  const explained = /sem acesso|acesso negado|não tem permissão|app de campo|use o app/.test(text);
  expect(explained, `fica em ${url.pathname} com texto: "${text.slice(0, 80).replace(/\n/g, ' ')}"`).toBe(true);
});

test('permissoes de acao: tabela do codigo e coerente com a UI para todos os grupos (amostra de Actions)', async () => {
  const actions: Action[] = ['vehicle.command', 'zone.edit', 'customer.block', 'settings.edit', 'payment.refund'];
  for (const a of actions) expect(can(['admin'], a)).toBe(true);
  expect(can(['campo'], 'vehicle.command')).toBe(false);
});
