import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, fixMaintenancePatch } from './util';

async function agenda(page: import('@playwright/test').Page) {
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Manutenção' }).click();
  await page.getByRole('button', { name: 'Agenda e pedidos' }).click();
  await expect(page.getByTestId('agenda-table').getByTestId('row').first()).toBeVisible();
}

test.describe('manutencao', () => {
  test('concluir manutencao envia PATCH status=done e mostra toast', async ({ page }) => {
    const mock = await loginMocked(page);
    await fixMaintenancePatch(page, mock);
    await agenda(page);
    await page.getByTestId('complete-maintenance').first().click();
    await expect(page.getByText(/Manutenção concluída|Revisão registrada/)).toBeVisible();
    const c = calls(mock, /maintenance\/tasks\//, 'PATCH');
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { status: string }).status).toBe('done');
  });

  test('[BUG P2-31] duplo clique em "Concluir" (com latencia) envia um unico PATCH', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await fixMaintenancePatch(page, mock);
    await agenda(page);
    await page.getByTestId('complete-maintenance').first().dblclick();
    await page.waitForTimeout(1500);
    expect(calls(mock, /maintenance\/tasks\//, 'PATCH')).toHaveLength(1);
  });

  test('cancelar manutencao exige motivo e envia notes', async ({ page }) => {
    const mock = await loginMocked(page);
    await fixMaintenancePatch(page, mock);
    await agenda(page);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByRole('dialog').getByText('Informe o motivo')).toBeVisible();
    await page.getByTestId('reason-input').fill('Peca indisponivel');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Manutenção cancelada')).toBeVisible();
    expect((calls(mock, /maintenance\/tasks\//, 'PATCH')[0]!.body as { notes: string }).notes).toBe('Peca indisponivel');
  });

  test('[BUG P2-32] agendar manutencao com data no passado e recusado', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Manutenção' }).click();
    await page.getByRole('button', { name: 'Agendar manutenção' }).click();
    const dlg = page.getByTestId('maintenance-dialog');
    await dlg.getByPlaceholder('VLT-0001').fill('VLT-003');
    await dlg.getByLabel('Data').fill('2020-01-02');
    await page.getByTestId('maintenance-save').click();
    await page.waitForTimeout(700);
    expect(calls(mock, '/maintenance/tasks'), 'manutencao agendada para 02/01/2020').toHaveLength(0);
  });

  test('agendar manutencao: cria tarefa de campo junto (createFieldTask=true) e toast', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Manutenção' }).click();
    await page.getByRole('button', { name: 'Agendar manutenção' }).click();
    const dlg = page.getByTestId('maintenance-dialog');
    await dlg.getByPlaceholder('VLT-0001').fill('VLT-003');
    await dlg.getByLabel('Data').fill('2026-12-02');
    await page.getByTestId('maintenance-save').click();
    await expect(page.getByText('Manutenção agendada')).toBeVisible();
    const b = calls(mock, '/maintenance/tasks')[0]!.body as { createFieldTask: boolean; scheduledFor: string };
    expect(b.createFieldTask).toBe(true);
    expect(b.scheduledFor).toBe('2026-12-02T12:00:00.000Z');
  });
});
