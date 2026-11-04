import { expect, test } from '@playwright/test';
import { BENCH_VEHICLE_ID } from '../fixtures';
import { loginMocked } from '../login';
import { openVehicle, watch } from './util';

/**
 * Painel de bancada (2026-11-03): a moto real é um J16 só relé, sem leitura de bateria e com GPS muitas vezes inválido
 * (fixture `veh-024`). Primeira pintura da ficha, posição velha e comando substituído.
 */
test.describe('moto de bancada (J16 só relé)', () => {
  test('primeira pintura: enquanto o GET da ficha não chega, esqueleto — nunca "0% ~0 km" nem "Limite 32 km/h"', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    // Atrasa só o GET /vehicles/veh-024 (a ficha abre com a cópia da frota).
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route(`http://api.mock.local/vehicles/${BENCH_VEHICLE_ID}`, async (route) => { await gate; return route.fallback(); });
    await openVehicle(page, 'VLT-024');
    const sheet = page.getByTestId('vehicle-sheet');
    await expect(sheet.getByTestId('sheet-chips-loading')).toBeVisible();
    await expect(sheet).not.toContainText('0%');
    await expect(sheet).not.toContainText('Limite 32 km/h');
    release();
    await expect(sheet.getByTestId('sheet-chips-loading')).toHaveCount(0);
    await expect(sheet).toContainText('Bateria desconhecida');
    await expect(sheet).toContainText('Sem controle de velocidade');
    await expect(sheet.getByTestId('tracker-mode')).toHaveText('Só relé');
    // GPS inválido: posição de horas atrás, velocidade "—".
    await expect(sheet.getByTestId('vehicle-position-stale')).toContainText('(sem GPS)');
    await expect(sheet.getByTestId('vehicle-speed')).toHaveText('— km/h');
    expect(w.finish('bancada-first-paint')).toEqual([]);
  });

  test('posição nova pelo tempo real tira o aviso de GPS; comando substituído não aparece como falha', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-024');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    const sheet = page.getByTestId('vehicle-sheet');
    await expect(sheet.getByTestId('vehicle-position-stale')).toBeVisible();
    mock.emit('vehicle.position', { vehicleId: BENCH_VEHICLE_ID, lat: -23.55, lng: -46.64, speedKmh: 4.2, batteryPct: 0, batteryKnown: false, status: 'paused', speedLimitKmh: 32, ts: new Date().toISOString() });
    await expect(sheet.getByTestId('vehicle-speed')).toHaveText('4 km/h', { timeout: 3000 });
    await expect(sheet.getByTestId('vehicle-position-stale')).toHaveCount(0);
    // Modo roubada no só relé: o diálogo não promete bloqueio; o comando é substituído por um mais novo (sem falha vermelha).
    await sheet.getByTestId('cmd-stolen').click();
    await expect(page.getByTestId('command-dialog')).toContainText('não bloqueia a moto');
    await page.getByTestId('reason-input').fill('Teste de bancada');
    await page.getByTestId('confirm-action').click();
    await expect(sheet.getByTestId('command-state')).toBeVisible();
    mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: BENCH_VEHICLE_ID, type: 'stolen_mode', status: 'failed', reason: 'superseded' });
    await expect(sheet.getByTestId('command-state')).toContainText('substituído por um comando mais novo', { timeout: 3000 });
    await expect(sheet.getByTestId('command-state')).toHaveAttribute('data-reason', 'superseded');
  });
});
