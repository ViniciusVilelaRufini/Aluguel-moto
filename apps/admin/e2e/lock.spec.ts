import { expect, test } from '@playwright/test';
import { login, startRentalOnSimulatorBike, vehicleByCode } from './helpers';

test.describe('comandos da moto', () => {
  test('bloquear exige motivo e mostra o estado do comando', async ({ page, request }) => {
    const v = await vehicleByCode(request, 'VLT-0001');
    await login(page, 'operacao');
    await page.goto(`/fleet?vehicle=${v.id}`);
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    await expect(page.getByTestId('vehicle-code')).toHaveText('VLT-0001');

    await page.getByTestId('cmd-lock').click();
    const dialog = page.getByTestId('command-dialog');
    await expect(dialog).toBeVisible();
    // sem motivo não envia
    await page.getByTestId('confirm-action').click();
    await expect(dialog.getByText('Informe o motivo')).toBeVisible();
    await expect(page.getByTestId('command-state')).toHaveCount(0);

    await page.getByTestId('reason-input').fill('Teste e2e de bloqueio');
    await page.getByTestId('confirm-action').click();
    await expect(dialog).toBeHidden();
    // Com o stub de IoT o rastreador confirma na hora; com o simulador a ordem é pendente -> confirmado.
    await expect(page.getByTestId('command-state')).toHaveAttribute('data-status', /pending|in_progress|confirmed/);
    await expect(page.getByTestId('command-state')).toContainText(/confirmado/, { timeout: 60_000 });
  });

  test('limite de velocidade acima de 32 km/h é recusado na tela', async ({ page, request }) => {
    const v = await vehicleByCode(request, 'VLT-0002');
    await login(page, 'admin');
    await page.goto(`/fleet?vehicle=${v.id}`);
    await page.getByTestId('cmd-speed').click();
    await page.getByTestId('speed-limit-input').fill('40');
    await page.getByTestId('reason-input').fill('Teste de limite');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByText('Máximo de 32 km/h').first()).toBeVisible();
  });

  test('comando para moto offline mostra "moto offline — será aplicado ao reconectar"', async ({ page, request }) => {
    // O stub de IoT confirma tudo na hora, então a resposta de "offline" é simulada na rede (pending + statusReason offline,
    // exatamente o que a API devolve com o gateway real quando o rastreador está sem conexão).
    const v = await vehicleByCode(request, 'VLT-0003');
    await login(page, 'operacao');
    await page.route(`**/vehicles/${v.id}/commands`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const body = route.request().postDataJSON();
      const now = new Date().toISOString();
      return route.fulfill({
        status: 202, contentType: 'application/json',
        body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', vehicleId: v.id, type: body.type, status: 'pending', statusReason: 'offline', reason: body.reason, createdAt: now, updatedAt: now }),
      });
    });
    await page.goto(`/fleet?vehicle=${v.id}`);
    await page.getByTestId('cmd-lock').click();
    await page.getByTestId('reason-input').fill('Moto sem sinal');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-state')).toContainText('moto offline — será aplicado ao reconectar');
  });

  // Precisa do simulador de rastreadores (rode com SIM=1). A massa é criada aqui: um cliente novo aluga uma moto do simulador pela API.
  test('bloquear moto em movimento: pendente e depois confirmado (só abaixo de 3 km/h)', async ({ page, request }) => {
    test.skip(!process.env.SIM, 'Requer o simulador de rastreadores (SIM=1)');
    test.setTimeout(240_000);
    const moving = await startRentalOnSimulatorBike(request);
    await login(page, 'operacao');
    await page.goto(`/fleet?vehicle=${moving.vehicleId}`);
    await page.getByTestId('cmd-lock').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-dialog').getByText('Informe o motivo')).toBeVisible();
    await page.getByTestId('reason-input').fill('Teste e2e: bloqueio em movimento');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('command-state')).toContainText(/pendente|em andamento/);
    await expect(page.getByTestId('command-state')).toContainText('confirmado', { timeout: 90_000 });
  });
});
