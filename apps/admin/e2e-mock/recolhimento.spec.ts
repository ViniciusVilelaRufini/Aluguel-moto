/**
 * Recolhimento concluído pelo painel (2026-11-04): o cliente devolveu a moto fora do galpão (`awaiting_pickup`, tarefa de
 * campo `collect`) e o atendente a trouxe. Ficha da moto → "Recebida no galpão" → a moto volta a ficar Livre no galpão;
 * Operação → "Concluir no galpão" no cartão da tarefa.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';
import type { Mock } from './mock-api';

const CODE = 'VLT-005';

/** Moto `awaiting_pickup` com uma tarefa `collect` (aberta, ou sem tarefa para o dado inconsistente). */
function setupAwaiting(mock: Mock, withTask = true) {
  const v = mock.db.vehicles.find((x) => x.code === CODE)!;
  Object.assign(v, { status: 'awaiting_pickup', currentRentalId: undefined, depotId: undefined });
  mock.db.fieldTasks = mock.db.fieldTasks.filter((t) => t.vehicleId !== v.id);
  if (withTask) {
    mock.db.fieldTasks.push({ ...mock.db.fieldTasks[0]!, id: 'ft-collect', type: 'collect', status: 'open', priority: 'high', vehicleId: v.id, vehicleCode: v.code, vehicleStatus: 'awaiting_pickup' });
  }
}

async function openSheet(page: Page) {
  await page.goto('/fleet');
  await expect(page.getByTestId('fleet-badge')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByTestId('palette-input').fill(CODE);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
}

test('Ficha da moto aguardando recolhimento → Recebida no galpão → a moto vira Livre', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  setupAwaiting(mock);
  await openSheet(page);
  await page.getByTestId('vehicle-collect-arrive').click();
  const dialog = page.getByTestId('collect-arrival-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('collect-depot')).toHaveValue('dep-1'); // único galpão ativo
  await page.getByTestId('collect-notes').fill('Trazida pela equipe');
  await page.getByTestId('collect-arrival-submit').click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Moto recebida no galpão')).toBeVisible();
  await expect(page.getByTestId('vehicle-collect-arrive')).toHaveCount(0);
  const posts = mock.calls.filter((c) => c.method === 'POST' && c.path.startsWith('/field-tasks/'));
  expect(posts.map((c) => c.path)).toEqual(['/field-tasks/ft-collect/start', '/field-tasks/ft-collect/complete']);
  expect(posts[1]!.body).toEqual({ depotId: 'dep-1', notes: 'Trazida pela equipe' });
  expect(mock.db.vehicles.find((x) => x.code === CODE)).toMatchObject({ status: 'free', depotId: 'dep-1' });
  await expect(page.getByTestId('vehicle-sheet')).toContainText('Livre');
});

test('Moto travada pela equipe (409): mostra o texto da API e mantém o diálogo', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  setupAwaiting(mock);
  mock.db.collectLockedByStaff = true;
  await openSheet(page);
  await page.getByTestId('vehicle-collect-arrive').click();
  await page.getByTestId('collect-arrival-submit').click();
  await expect(page.getByTestId('collect-arrival-error')).toContainText('A moto está bloqueada pela equipe; libere-a antes de devolver à frota.');
  await expect(page.getByTestId('collect-arrival-dialog')).toBeVisible();
});

test('Moto aguardando recolhimento sem tarefa collect aberta: aviso e nenhuma ação', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'operacao' });
  setupAwaiting(mock, false);
  await openSheet(page);
  await expect(page.getByTestId('collect-no-task')).toContainText('não há tarefa de recolhimento em aberto');
  await expect(page.getByTestId('vehicle-collect-arrive')).toHaveCount(0);
});

test('Operação: cartão da tarefa collect → Concluir no galpão → a tarefa vai para Concluída', async ({ page }) => {
  const mock = await loginMocked(page, { group: 'admin' });
  setupAwaiting(mock);
  await page.goto('/tasks');
  // Os cartões de recolhimento das fixtures também têm o botão; o da VLT-005 é o do cenário.
  const card = page.getByText(CODE, { exact: true }).locator('xpath=ancestor::div[.//button[@data-testid="task-collect-arrive"]][1]').getByTestId('task-collect-arrive');
  await card.click();
  await page.getByTestId('collect-arrival-submit').click();
  await expect(page.getByTestId('collect-arrival-dialog')).toHaveCount(0);
  expect(mock.db.fieldTasks.find((t) => t.id === 'ft-collect')?.status).toBe('done');
  expect(mock.db.vehicles.find((x) => x.code === CODE)?.status).toBe('free');
});
