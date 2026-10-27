import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, dshot, watch } from './util';

const row = (page: Page, text: string | RegExp) => page.getByTestId('alerts-table').getByTestId('row').filter({ hasText: text });

test.describe('alertas', () => {
  test('resolver: motivo obrigatorio, POST /resolve, toast e a fila atualiza', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/alerts');
    const first = page.getByTestId('alerts-table').getByTestId('row').first();
    await expect(first).toBeVisible();
    const msg = await first.locator('td').nth(1).innerText();
    await first.getByRole('button', { name: 'Resolver' }).click();
    await page.getByTestId('confirm-action').click(); // sem motivo
    await expect(page.getByRole('dialog').getByText('Informe o motivo')).toBeVisible();
    expect(calls(mock, /resolve$/)).toHaveLength(0);
    await page.getByTestId('reason-input').fill('Verificado em campo');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Alerta resolvido')).toBeVisible();
    expect(calls(mock, /resolve$/)).toHaveLength(1);
    const label = (msg.match(/Alerta de teste \d+/) ?? [msg])[0];
    await expect(page.getByTestId('alerts-table').getByText(new RegExp('^' + label + '$'))).toHaveCount(0);
    expect(w.finish('alerts-resolve')).toEqual([]);
  });

  test('duplo clique em Resolver (com latencia) resolve uma unica vez', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await page.goto('/alerts');
    await page.getByTestId('alerts-table').getByTestId('row').first().getByRole('button', { name: 'Resolver' }).click();
    await page.getByTestId('reason-input').fill('Duplo');
    await page.getByTestId('confirm-action').dblclick();
    await page.waitForTimeout(1500);
    expect(calls(mock, /resolve$/)).toHaveLength(1);
  });

  test('atribuir: padrao e voce, POST /assign com assigneeId, toast', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/alerts');
    await page.getByTestId('alerts-table').getByTestId('row').first().getByRole('button', { name: /Atribuir|Reatribuir/ }).click();
    await expect(page.getByTestId('assign-dialog')).toBeVisible();
    await expect(page.getByTestId('assign-select')).toHaveValue('staff-admin');
    await page.getByTestId('assign-confirm').click();
    await expect(page.getByText('Alerta atribuído a você')).toBeVisible();
    const c = calls(mock, /assign$/);
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { assigneeId: string }).assigneeId).toBe('staff-admin');
  });

  test('[BUG P2-05] duplo clique em Atribuir envia uma unica atribuicao', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await page.goto('/alerts');
    await page.getByTestId('alerts-table').getByTestId('row').first().getByRole('button', { name: /Atribuir|Reatribuir/ }).click();
    await expect(page.getByTestId('assign-select')).toHaveValue('staff-admin');
    await page.getByTestId('assign-confirm').dblclick();
    await page.waitForTimeout(1500);
    expect(calls(mock, /assign$/)).toHaveLength(1);
  });

  test('[BUG P2-06] erro ao atribuir aparece DENTRO do dialogo (nao so atras do scrim)', async ({ page }) => {
    await loginMocked(page, { failPaths: ['/alerts/'] });
    await page.goto('/alerts');
    // a listagem /alerts (sem barra final) continua funcionando: failPaths usa prefixo '/alerts/'
    await page.getByTestId('alerts-table').getByTestId('row').first().getByRole('button', { name: /Atribuir|Reatribuir/ }).click();
    await expect(page.getByTestId('assign-select')).toHaveValue('staff-admin');
    await page.getByTestId('assign-confirm').click();
    await page.waitForTimeout(600);
    await dshot(page, 'alerts-assign-error');
    const inDialog = await page.getByTestId('assign-dialog').getByRole('alert').count();
    expect(inDialog, 'o erro da atribuicao so aparece na pagina, escondido atras do dialogo modal').toBeGreaterThan(0);
  });

  test('tempo real: alert.created atualiza o contador do menu e a fila, sem erros', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/alerts');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    const nav = page.getByRole('navigation').getByText('Alertas').first();
    await expect(nav).toBeVisible();
    mock.db.alerts.unshift({ id: 'alert-new', type: 'tamper', priority: 'critical', status: 'open', vehicleId: 'veh-005', vehicleCode: 'VLT-005', message: 'Violação detectada AGORA', createdAt: new Date().toISOString() } as never);
    mock.emit('alert.created', { alertId: 'alert-new', vehicleId: 'veh-005', type: 'tamper', priority: 'critical', createdAt: new Date().toISOString() });
    await expect(row(page, 'Violação detectada AGORA')).toBeVisible();
    await dshot(page, 'alerts-realtime');
    expect(w.finish('alerts-rt')).toEqual([]);
  });

  test('alerta critico fora da fila mostra toast de perigo (em /tasks)', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    mock.emit('alert.created', { alertId: 'a-x', vehicleId: 'veh-005', type: 'tamper', priority: 'critical', createdAt: new Date().toISOString() });
    await expect(page.getByRole('alert').filter({ hasText: 'Alerta crítico' })).toBeVisible();
  });

  test('abas Abertos/Atribuidos/Resolvidos filtram e resolvidos nao tem botoes de acao', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await page.getByRole('button', { name: 'Resolvidos' }).click();
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    await expect(page.getByTestId('alerts-table').getByRole('button', { name: 'Resolver' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Atribuídos' }).click();
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    await expect(page.getByTestId('alerts-table').getByRole('button', { name: /Atribuir/ }).first()).toBeVisible();
  });
});

test.describe('tarefas de campo', () => {
  test('criar tarefa: valida codigo, resolve moto por codigo e envia POST', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await page.getByTestId('new-task').click();
    await expect(page.getByRole('button', { name: 'Criar tarefa' })).toBeDisabled();
    await page.getByPlaceholder('VLT-0001').fill('VLT-003');
    await page.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByText('Tarefa criada')).toBeVisible();
    const c = calls(mock, '/field-tasks');
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { vehicleId: string }).vehicleId).toBe('veh-003');
  });

  test('codigo de moto inexistente mostra erro no dialogo e nao cria tarefa', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await page.getByTestId('new-task').click();
    await page.getByPlaceholder('VLT-0001').fill('XYZ-999');
    await page.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByTestId('new-task-dialog').getByRole('alert')).toBeVisible();
    expect(calls(mock, '/field-tasks')).toHaveLength(0);
  });

  test('duplo clique em Criar tarefa cria uma unica tarefa', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await page.goto('/tasks');
    await page.getByTestId('new-task').click();
    await page.getByPlaceholder('VLT-0001').fill('VLT-003');
    await page.getByRole('button', { name: 'Criar tarefa' }).dblclick();
    await page.waitForTimeout(1800);
    expect(calls(mock, '/field-tasks')).toHaveLength(1);
  });

  test('atribuir tarefa pendente a um operador de campo', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Atribuir' }).first().click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('button', { name: 'Atribuir' })).toBeDisabled();
    await dlg.locator('select').selectOption({ index: 1 });
    await dlg.getByRole('button', { name: 'Atribuir' }).click();
    await expect(page.getByText('Tarefa atribuída')).toBeVisible();
    expect(calls(mock, /field-tasks\/ft-\d+$/, 'PATCH')).toHaveLength(1);
  });

  test('baterias e manutencao abrem sem erros', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Manutenção' }).click();
    await page.getByRole('button', { name: 'Agenda e pedidos' }).click();
    await expect(page.getByText('Trocar freio dianteiro')).toBeVisible();
    await page.getByRole('button', { name: 'Baterias' }).click();
    await page.waitForTimeout(600);
    expect(w.finish('tasks-tabs')).toEqual([]);
  });
});

test.describe('equipe', () => {
  test('convidar pessoa: POST /staff e toast', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('invite-staff').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Nome').fill('Beto Teste');
    await dlg.getByLabel('E-mail').fill('beto@volti.dev');
    await dlg.getByRole('button', { name: 'Enviar convite' }).click();
    await expect(page.getByText('Convite enviado')).toBeVisible();
    expect(calls(mock, '/staff')).toHaveLength(1);
  });

  test('[BUG P2-07] duplo clique em "Enviar convite" envia um unico convite', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await page.goto('/team');
    await page.getByTestId('invite-staff').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Nome').fill('Beto Teste');
    await dlg.getByLabel('E-mail').fill('beto@volti.dev');
    await dlg.getByRole('button', { name: 'Enviar convite' }).dblclick();
    await page.waitForTimeout(1800);
    expect(calls(mock, '/staff')).toHaveLength(1);
  });

  test('[BUG P2-08] e-mail invalido e recusado no convite antes de enviar', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('invite-staff').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Nome').fill('Beto Teste');
    await dlg.getByLabel('E-mail').fill('isso-nao-e-email');
    await dlg.getByRole('button', { name: 'Enviar convite' }).click();
    await page.waitForTimeout(600);
    await dshot(page, 'team-invalid-email');
    expect(calls(mock, '/staff'), 'e-mail sem @ foi enviado ao servidor').toHaveLength(0);
  });

  test('desmarcar todos os perfis: aviso aparece como alerta no dialogo, sem enviar', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('invite-staff').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Nome').fill('Beto Teste');
    await dlg.getByLabel('E-mail').fill('beto@volti.dev');
    await dlg.getByLabel('Operação').uncheck();
    await dlg.getByRole('button', { name: 'Enviar convite' }).click();
    await expect(dlg.getByRole('alert')).toContainText('Escolha ao menos um perfil');
    expect(calls(mock, '/staff')).toHaveLength(0);
  });

  test('editar acesso: troca de perfil envia PATCH com grupos', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('row').filter({ hasText: 'Pessoa operacao' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Financeiro').check();
    await dlg.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Acesso atualizado')).toBeVisible();
    const c = calls(mock, /^\/staff\/[^/]+$/, 'PATCH');
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { groups: string[] }).groups.sort()).toEqual(['financeiro', 'operacao']);
  });

  test('[BUG P2-09] admin nao consegue desativar a propria conta nem tirar o proprio perfil admin', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('row').filter({ hasText: 'Pessoa admin' }).click(); // id staff-admin == usuario logado
    const dlg = page.getByRole('dialog');
    const sw = dlg.getByRole('switch');
    const adminBox = dlg.getByLabel('Administrador');
    const blocked = (await sw.isDisabled()) || (await adminBox.isDisabled());
    await dshot(page, 'team-self-edit');
    expect(blocked, 'o admin logado pode se auto-desativar/rebaixar e ficar sem acesso').toBe(true);
    void mock;
  });

  test('[BUG P2-10] campo e-mail no editar e somente leitura (alteracao nao e enviada)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/team');
    await page.getByTestId('row').filter({ hasText: 'Pessoa operacao' }).click();
    const email = page.getByRole('dialog').getByLabel('E-mail');
    const ro = (await email.isDisabled()) || (await email.getAttribute('readonly')) !== null;
    expect(ro, 'e-mail parece editavel mas o PATCH nao o envia: alteracao e descartada em silencio').toBe(true);
  });

  test('auditoria: filtros por data enviam from/to e a tabela carrega', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await expect(page.getByTestId('audit-table').getByTestId('row').first()).toBeVisible();
    await page.getByLabel('De', { exact: true }).fill('2026-10-01');
    await page.getByLabel('Até', { exact: true }).fill('2026-10-10');
    await page.waitForTimeout(600);
    const c = mock.calls.filter((x) => x.path === '/audit-logs').at(-1)!;
    expect(c.query.get('from')).toBe('2026-10-01T03:00:00.000Z');
    expect(c.query.get('to')).toBe('2026-10-11T02:59:59.999Z');
  });
});
