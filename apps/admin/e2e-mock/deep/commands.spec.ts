import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, dshot, openVehicle, watch } from './util';

const travada = (page: import('@playwright/test').Page) => page.getByTestId('vehicle-sheet').getByText('Travada', { exact: true }).locator('xpath=following-sibling::*');

test.describe('frota: comandos remotos', () => {
  test('lock: pendente -> em andamento -> confirmado por command.updated, sem erros de console', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await openVehicle(page, 'VLT-002');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    await page.getByTestId('cmd-lock').click();
    await page.getByTestId('reason-input').fill('Teste de bloqueio');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'pending');
    mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: 'veh-002', type: 'lock', status: 'in_progress' });
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'in_progress');
    mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: 'veh-002', type: 'lock', status: 'confirmed' });
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'confirmed');
    await expect(page.getByText('Bloquear: confirmado pela moto')).toBeVisible();
    await dshot(page, 'cmd-lock-confirmed');
    expect(w.finish('cmd-lock'), 'sem problemas').toEqual([]);
  });

  test('lock: falha por evento mostra toast de erro e estado Falhou', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-002');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    await page.getByTestId('cmd-lock').click();
    await page.getByTestId('reason-input').fill('Teste de falha');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'pending');
    mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: 'veh-002', type: 'lock', status: 'failed', reason: 'timeout' });
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'failed');
    await expect(page.getByRole('alert').filter({ hasText: 'falhou' })).toBeVisible();
    await dshot(page, 'cmd-lock-failed');
  });

  test('[BUG P2-01] depois de bloquear com sucesso a ficha passa a mostrar Travada = Sim', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-002'); // rented => locked=false
    await expect(travada(page)).toHaveText('Não');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    await page.getByTestId('cmd-lock').click();
    await page.getByTestId('reason-input').fill('Teste travada');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-state')).toBeVisible();
    mock.db.vehicles.find((v) => v.id === 'veh-002')!.locked = true; // o servidor passou a refletir a trava
    mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: 'veh-002', type: 'lock', status: 'confirmed' });
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', 'confirmed');
    await page.waitForTimeout(1500);
    await expect(travada(page), 'ficha segue dizendo Não depois do comando confirmado').toHaveText('Sim');
  });

  test('duplo clique em "Confirmar e enviar" envia um unico comando', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-unlock').click();
    await page.getByTestId('reason-input').fill('Teste duplo clique');
    await page.getByTestId('confirm-action').dblclick();
    await page.waitForTimeout(1200);
    expect(calls(mock, /\/vehicles\/veh-001\/commands$/)).toHaveLength(1);
  });

  test('speed_limit: acima de 32, decimal e negativo sao recusados; 20 envia speedLimitKmh=20', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-speed').click();
    await page.getByTestId('reason-input').fill('Limite de teste');
    await page.getByTestId('speed-limit-input').fill('33');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByText('Máximo de 32 km/h').first()).toBeVisible();
    await page.getByTestId('speed-limit-input').fill('12.5');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByText(/inteiro/).first()).toBeVisible();
    await page.getByTestId('speed-limit-input').fill('-1');
    await page.getByTestId('confirm-action').click();
    expect(calls(mock, /commands$/)).toHaveLength(0);
    await page.getByTestId('speed-limit-input').fill('20');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog')).toHaveCount(0);
    const c = calls(mock, /commands$/);
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { speedLimitKmh: number }).speedLimitKmh).toBe(20);
  });

  test('[BUG P2-02] limite de velocidade invalido anuncia UM unico alerta (role=alert duplicado)', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-speed').click();
    await page.getByTestId('reason-input').fill('Limite de teste');
    await page.getByTestId('speed-limit-input').fill('33');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByText('Máximo de 32 km/h').first()).toBeVisible();
    await dshot(page, 'cmd-speed-double-alert');
    await expect(page.getByTestId('command-dialog').getByRole('alert')).toHaveCount(1);
  });

  test('comando com erro 500 do servidor mostra mensagem e mantem o dialogo aberto', async ({ page }) => {
    await loginMocked(page, { failPaths: ['/vehicles/veh-001/commands'] });
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-horn').click();
    await page.getByTestId('reason-input').fill('Falha simulada');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByRole('alert').first()).toBeVisible();
    await expect(page.getByTestId('confirm-action')).toBeEnabled();
  });

  test('lock com moto em movimento avisa a velocidade', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-002'); // rented, 18 km/h
    await page.getByTestId('cmd-lock').click();
    await expect(page.getByTestId('command-dialog').getByText(/18 km\/h/)).toBeVisible();
  });

  test('stolen_mode envia on=false quando escolhido Desligar', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await page.getByTestId('cmd-stolen').click();
    await page.getByTestId('command-dialog').locator('select').selectOption('off');
    await page.getByTestId('reason-input').fill('Recuperada');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog')).toHaveCount(0);
    const c = calls(mock, /commands$/);
    expect((c[0]!.body as { on: boolean }).on).toBe(false);
  });
});
