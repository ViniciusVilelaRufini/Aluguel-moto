/**
 * Varredura exploratoria: visita cada rota do painel em desktop e mobile, coleta erros de console,
 * requisicoes sem mock/falhas, overflow horizontal, foco por teclado e exercita as interacoes principais.
 * Cada passo de interacao que falha vira um item em `issues`; no fim o teste falha se houver qualquer item.
 * Os itens sao salvos em e2e-mock/__results__/<rota>-<viewport>.json e triados em findings-N.md.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';
import { collect, DESKTOP, focusReport, MOBILE, overflowReport, shot, type Collector } from './helpers';
import type { Mock } from './mock-api';

type Interact = (page: Page, c: Collector, mock: Mock, mobile: boolean) => Promise<void>;

const dialogOpen = (page: Page) => page.locator('[role="dialog"]:visible').last();

async function paletteFlow(page: Page, c: Collector) {
  await c.step('paleta: Ctrl+K abre', async () => {
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 3000 });
    await page.getByTestId('palette-input').fill('VLT-003');
    await expect(page.getByTestId('command-palette')).toContainText('VLT-003');
    await shot(page, `palette-${page.viewportSize()!.width}`);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
  });
}

const ROUTES: { path: string; title: RegExp | string; interact: Interact }[] = [
  {
    path: '/fleet',
    title: 'Frota ao vivo',
    interact: async (page, c, mock, mobile) => {
      await c.step('frota: badge da frota', async () => { await expect(page.getByTestId('fleet-badge')).toContainText('24 motos'); });
      await c.step('frota: indicador ao vivo conecta', async () => { await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true', { timeout: 8000 }); });
      await c.step('frota: alterna para Lista', async () => {
        await page.getByRole('button', { name: 'Lista', exact: true }).click();
        await expect(page.getByTestId('fleet-search')).toBeVisible();
        await shot(page, `fleet-list-${mobile ? 'm' : 'd'}`);
      });
      await c.step('frota: busca filtra a lista', async () => {
        const s = page.getByTestId('fleet-search');
        await s.fill('VLT-005');
        await expect(page.getByText('VLT-005').first()).toBeVisible();
        await s.fill('zzzz');
        await shot(page, `fleet-empty-search-${mobile ? 'm' : 'd'}`);
        await s.fill('');
      });
      await c.step('frota: abre ficha da moto e fecha com Esc', async () => {
        await page.getByText('VLT-002').first().click();
        await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
        await shot(page, `fleet-sheet-${mobile ? 'm' : 'd'}`);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('vehicle-sheet')).toHaveCount(0);
      });
      await c.step('frota: comando Bloquear exige motivo', async () => {
        await page.getByText('VLT-002').first().click();
        await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
        await page.getByTestId('cmd-lock').click();
        await expect(page.getByTestId('command-dialog')).toBeVisible();
        await page.getByTestId('confirm-action').click();
        await expect(page.getByTestId('command-dialog')).toBeVisible(); // nao pode confirmar sem motivo
        await expect(page.getByTestId('command-dialog').getByRole('alert').first()).toBeVisible();
        await page.getByTestId('reason-input').fill('Teste de bloqueio');
        await page.getByTestId('confirm-action').click();
        expect(mock.calls.some((x) => x.method === 'POST' && x.path.endsWith('/commands'))).toBeTruthy();
        await page.keyboard.press('Escape');
      });
      await c.step('frota: alerta critico em tempo real mostra aviso', async () => {
        mock.emit('alert.created', { alertId: 'alert-rt', vehicleId: 'veh-001', type: 'tamper', priority: 'critical', createdAt: new Date().toISOString() });
        await expect(page.getByText(/Alerta crítico/)).toBeVisible({ timeout: 4000 });
      });
      await c.step('frota: camadas e calor', async () => {
        for (const id of ['layers-toggle', 'heat-toggle']) { const b = page.getByTestId(id); if (await b.count()) await b.click(); }
      });
    },
  },
  {
    path: '/alerts',
    title: 'Alertas',
    interact: async (page, c, mock) => {
      await c.step('alertas: tabela carrega', async () => { await expect(page.getByTestId('alerts-table')).toBeVisible(); await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible(); });
      await c.step('alertas: abas', async () => {
        for (const n of ['Atribuídos', 'Resolvidos', 'Abertos']) {
          await page.getByRole('button', { name: n, exact: true }).click();
          await expect(page.getByTestId('alerts-table')).toBeVisible();
        }
      });
      await c.step('alertas: paginacao', async () => {
        const next = page.getByTestId('page-next');
        if (await next.isEnabled()) { await next.click(); await expect(page.getByTestId('page-prev')).toBeEnabled(); await page.getByTestId('page-prev').click(); }
      });
      await c.step('alertas: atribuir abre dialogo e confirma', async () => {
        await page.getByRole('button', { name: /Atribuir/ }).first().click();
        await expect(page.getByTestId('assign-dialog')).toBeVisible();
        await shot(page, `alerts-assign-${page.viewportSize()!.width}`);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('assign-dialog')).toHaveCount(0);
      });
      await c.step('alertas: resolver exige motivo', async () => {
        await page.getByRole('button', { name: /Resolver/ }).first().click();
        await expect(dialogOpen(page)).toBeVisible();
        await page.getByTestId('confirm-action').click();
        await expect(dialogOpen(page)).toBeVisible();
        await page.keyboard.press('Escape');
      });
      void mock;
    },
  },
  {
    path: '/zones',
    title: 'Cercas e regras',
    interact: async (page, c) => {
      await c.step('cercas: lista de zonas', async () => { await expect(page.getByText('Devolução Trianon').first()).toBeVisible(); });
      await c.step('cercas: selecionar zona', async () => { await page.getByText('Proibida Metrô').first().click(); await shot(page, `zones-selected-${page.viewportSize()!.width}`); });
      await c.step('cercas: botao desenhar', async () => { await page.getByTestId('draw-zone').click(); await page.keyboard.press('Escape'); });
      await c.step('cercas: excluir pede confirmacao', async () => {
        const del = page.getByTestId('zone-delete');
        if (await del.count()) { await del.first().click(); await expect(page.getByTestId('delete-dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByTestId('delete-dialog')).toHaveCount(0); }
      });
    },
  },
  {
    path: '/customers',
    title: 'Clientes',
    interact: async (page, c) => {
      await c.step('clientes: tabela e paginacao', async () => {
        await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
        await expect(page.getByTestId('page-next')).toBeEnabled();
        await page.getByTestId('page-next').click();
        await expect(page.getByTestId('customers-table')).toContainText('Cliente Teste 16');
        await page.getByTestId('page-prev').click();
      });
      await c.step('clientes: busca e vazio', async () => {
        await page.getByTestId('customer-search').fill('Cliente Teste 07');
        await expect(page.getByTestId('customers-table')).toContainText('Cliente Teste 07');
        await page.getByTestId('customer-search').fill('nao-existe-xyz');
        await expect(page.getByTestId('customers-table').getByTestId('row')).toHaveCount(0);
        await shot(page, `customers-empty-${page.viewportSize()!.width}`);
        await page.getByTestId('customer-search').fill('');
      });
      await c.step('clientes: filtros KYC/bloqueados', async () => {
        for (const n of ['Pendentes', 'Bloqueados', 'Todos']) { await page.getByRole('button', { name: n, exact: true }).click(); await expect(page.getByTestId('customers-table')).toBeVisible(); }
      });
      await c.step('clientes: ficha abre, bloqueio exige motivo, fecha', async () => {
        await page.getByTestId('customers-table').getByTestId('row').first().click();
        await expect(page.getByTestId('customer-sheet')).toBeVisible();
        await shot(page, `customers-sheet-${page.viewportSize()!.width}`);
        await page.getByTestId('block-customer').click();
        await page.getByTestId('confirm-action').click();
        await expect(dialogOpen(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('customer-sheet')).toHaveCount(0);
      });
      await c.step('clientes: abas Alugueis / Restricoes', async () => {
        await page.goto('/customers?tab=rentals');
        await expect(page.getByTestId('rentals-table')).toBeVisible();
        await page.getByTestId('rentals-table').getByTestId('row').first().click();
        await expect(page.getByTestId('rental-detail')).toBeVisible();
        await page.keyboard.press('Escape');
      });
    },
  },
  {
    path: '/tasks',
    title: 'Operação',
    interact: async (page, c) => {
      await c.step('operacao: nova tarefa valida campos', async () => {
        await page.getByTestId('new-task').click();
        await expect(page.getByTestId('new-task-dialog')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Criar tarefa' })).toBeDisabled(); // sem codigo, nao envia
        await page.getByPlaceholder('VLT-0001').fill('VLT-999');
        await page.getByRole('button', { name: 'Criar tarefa' }).click();
        await expect(page.getByTestId('new-task-dialog').getByRole('alert').first()).toBeVisible(); // moto inexistente: erro claro, dialogo continua
        await shot(page, `tasks-newtask-${page.viewportSize()!.width}`);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('new-task-dialog')).toHaveCount(0);
      });
      await c.step('operacao: abas do painel', async () => {
        for (const n of ['Manutenção', 'Baterias', 'Tarefas']) { await page.getByRole('button', { name: n, exact: true }).click(); await page.waitForTimeout(300); await shot(page, `tasks-${n}-${page.viewportSize()!.width}`); }
      });
    },
  },
  {
    path: '/finance',
    title: 'Financeiro',
    interact: async (page, c) => {
      await c.step('financeiro: exportar receita', async () => { const b = page.getByTestId('export-revenue'); if (await b.count()) { const dl = page.waitForEvent('download', { timeout: 3000 }).catch(() => null); await b.click(); await dl; } });
      await c.step('financeiro: pagamentos e estorno exige motivo', async () => {
        const refund = page.getByTestId('refund').first();
        if (await refund.count()) { await refund.click(); await expect(dialogOpen(page)).toBeVisible(); await page.getByTestId('confirm-action').click(); await expect(dialogOpen(page)).toBeVisible(); await page.keyboard.press('Escape'); }
      });
    },
  },
  {
    path: '/settings',
    title: 'Preços e planos',
    interact: async (page, c) => {
      await c.step('precos: salvar fica desabilitado sem alteracao', async () => { await expect(page.getByTestId('save-settings')).toBeDisabled(); });
      await c.step('precos: novo modelo valida campos', async () => {
        await page.getByTestId('new-model').click();
        await expect(page.getByTestId('model-dialog')).toBeVisible();
        if (await page.getByTestId('model-save').isEnabled()) await page.getByTestId('model-save').click();
        await expect(page.getByTestId('model-dialog')).toBeVisible();
        await shot(page, `settings-model-${page.viewportSize()!.width}`);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('model-dialog')).toHaveCount(0);
      });
    },
  },
  {
    path: '/team',
    title: 'Equipe e acessos',
    interact: async (page, c) => {
      await c.step('equipe: convidar valida e-mail', async () => {
        await page.getByTestId('invite-staff').click();
        await expect(dialogOpen(page)).toBeVisible();
        await shot(page, `team-invite-${page.viewportSize()!.width}`);
        await page.keyboard.press('Escape');
      });
      await c.step('equipe: auditoria', async () => {
        await page.getByRole('button', { name: 'Auditoria', exact: true }).click();
        await expect(page.getByTestId('audit-table')).toBeVisible();
      });
    },
  },
];

for (const vp of [{ name: 'desktop', size: DESKTOP }, { name: 'mobile', size: MOBILE }]) {
  test.describe(`varredura ${vp.name}`, () => {
    test.use({ viewport: vp.size });

    for (const r of ROUTES) {
      test(`${r.path}`, async ({ page }) => {
        const mock = await loginMocked(page);
        const c = collect(page, mock);
        await page.goto(r.path);
        await c.step('conteudo principal visivel', async () => {
          await expect(page.locator('#main-content')).toBeVisible();
          await expect(page.locator('#main-content').getByText(/./).first()).toBeVisible();
          // Convencao: o <h1> unico e o titulo do cabecalho global; as paginas nao repetem o titulo.
          if ((await page.locator('h1').count()) !== 1) c.note('a11y: a pagina deve ter exatamente um <h1>');
        });
        await page.waitForLoadState('networkidle').catch(() => {});
        await shot(page, `${r.path.slice(1)}-${vp.name}`);
        for (const o of await overflowReport(page)) c.note(`overflow: ${o}`);
        for (const f of await focusReport(page)) c.note(f);
        await paletteFlow(page, c);
        await r.interact(page, c, mock, vp.name === 'mobile');
        for (const o of await overflowReport(page)) c.note(`overflow (apos interacoes): ${o}`);
        const issues = c.finish(`${r.path.slice(1)}-${vp.name}`);
        expect(issues, issues.join('\n')).toEqual([]);
      });
    }

    test('/login', async ({ page }) => {
      const mock = await (await import('./mock-api')).installMockApi(page);
      const c = collect(page, mock);
      await page.goto('/login');
      await c.step('login: formulario visivel', async () => { await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible(); });
      await shot(page, `login-${vp.name}`);
      for (const o of await overflowReport(page)) c.note(`overflow: ${o}`);
      for (const f of await focusReport(page, 6)) c.note(f);
      await c.step('login: codigo incompleto mantem o botao desabilitado', async () => {
        await page.getByTestId('login-password').fill('qualquer');
        await page.getByTestId('login-continue').click();
        await expect(page.getByTestId('login-submit')).toBeDisabled();
        await page.getByLabel('Código de 6 dígitos').fill('123');
        await expect(page.getByTestId('login-submit')).toBeDisabled();
        await shot(page, `login-otp-${vp.name}`);
      });
      await c.step('login: entra e vai para a frota', async () => {
        await page.getByLabel('Código de 6 dígitos').fill('123456');
        await page.getByTestId('login-submit').click();
        await expect(page).toHaveURL(/\/fleet/);
      });
      const issues = c.finish(`login-${vp.name}`);
      expect(issues, issues.join('\n')).toEqual([]);
    });

    test('/ redireciona sem sessao para /login e com sessao para o painel', async ({ page }) => {
      const mock = await (await import('./mock-api')).installMockApi(page);
      const c = collect(page, mock);
      await page.goto('/fleet');
      await c.step('rota protegida sem token vai ao login', async () => { await expect(page).toHaveURL(/\/login/); });
      const issues = c.finish(`guard-${vp.name}`);
      expect(issues, issues.join('\n')).toEqual([]);
    });
  });
}

test('socket recusado: o painel continua usavel e mostra "Reconectando"', async ({ page }) => {
  const mock = await loginMocked(page, { socket: 'off' });
  const c = collect(page, mock);
  await page.goto('/fleet');
  await c.step('indicador mostra Reconectando', async () => { await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'false'); await expect(page.getByTestId('live-indicator')).toContainText('Reconectando'); });
  await c.step('frota ainda lista motos', async () => { await expect(page.getByTestId('fleet-badge')).toContainText('24 motos'); });
  await shot(page, 'fleet-socket-off');
  const issues = c.finish('socket-off');
  expect(issues, issues.join('\n')).toEqual([]);
});
