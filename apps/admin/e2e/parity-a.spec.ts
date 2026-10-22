import { expect, test } from '@playwright/test';
import { login, vehicleByCode } from './helpers';
import { endRental, freeBike, raiseOpenAlert, sendCommand, startRentalOnFreeBike } from './parity-helpers';

type MapHandle = { getLayer(id: string): unknown; hasImage(id: string): boolean; queryRenderedFeatures(o: { layers: string[] }): { properties: { point_count: number } }[] };

test.describe('paridade com o design (Lote A)', () => {
  test('ficha da moto: copy do design e GPS / 4G em texto', async ({ page, request }) => {
    const v = await vehicleByCode(request, 'VLT-0001');
    // O seed não traz sinal de rede; a ficha recebe `signal` pela rede para checar o texto.
    await page.route(`**/vehicles/${v.id}`, async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, json: { ...(await res.json()), online: true, signal: 5 } });
    });
    await login(page, 'admin');
    await page.goto(`/fleet?vehicle=${v.id}`);
    const sheet = page.getByTestId('vehicle-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('GPS / 4G')).toBeVisible();
    await expect(sheet.getByText(/Sinal \d\/5/)).toHaveCount(0);
    await expect(sheet.getByText('4G forte', { exact: true })).toBeVisible();
    await expect(page.getByTestId('cmd-speed')).toHaveText('Limitar vel.');
  });

  test('log de auditoria do admin mostra o comando enviado, quem e por quê', async ({ page, request }) => {
    const bike = await freeBike(request, 'first');
    const reason = `Auditoria parity ${Date.now()}`;
    await sendCommand(request, bike.id, 'horn', reason);
    await login(page, 'admin');
    await page.goto(`/fleet?vehicle=${bike.id}`);
    const log = page.getByTestId('audit-log');
    await expect(log).toContainText('Log de auditoria');
    await expect(log).toContainText('Buzina');
    await expect(log).toContainText(reason);
    await expect(log).toContainText('Dev');
    await expect(log.getByRole('link', { name: 'Ver auditoria completa' })).toBeVisible();
  });

  test('pin com ícone e cluster com imagem de contagem registrados no mapa', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fleet');
    await expect.poll(() => page.evaluate(() => {
      const m = (window as unknown as { __voltiMap?: MapHandle }).__voltiMap;
      if (!m || !m.getLayer('vehicles-icon') || !m.hasImage('pin-bike')) return 'sem pin';
      const clusters = m.queryRenderedFeatures({ layers: ['clusters'] });
      if (clusters.length === 0) return 'sem cluster';
      const missing = clusters.filter((c) => !m.hasImage(`cluster-${c.properties.point_count}`));
      return missing.length === 0 ? 'ok' : 'sem imagem de cluster';
    }), { timeout: 30_000 }).toBe('ok');
  });

  test.describe('com aluguel em andamento', () => {
    test.describe.configure({ mode: 'serial' });
    let rental: Awaited<ReturnType<typeof startRentalOnFreeBike>>;
    test.beforeAll(async ({ request }) => { rental = await startRentalOnFreeBike(request); });
    test.afterAll(async ({ request }) => { if (rental) await endRental(request, rental.rentalId).catch(() => {}); });

    test('cliente: nome real para admin e "Restrito" para operação', async ({ page }) => {
      await login(page, 'admin');
      await page.goto(`/fleet?vehicle=${rental.vehicleId}`);
      await expect(page.getByTestId('vehicle-sheet').getByText(rental.customerName)).toBeVisible();
      await page.getByTestId('logout').click();
      await login(page, 'operacao');
      await page.goto(`/fleet?vehicle=${rental.vehicleId}`);
      const sheet = page.getByTestId('vehicle-sheet');
      await expect(sheet.getByText('Restrito')).toBeVisible();
      await expect(sheet.getByText(rental.customerName)).toHaveCount(0);
    });

    test('replay: o aluguel aparece como opção e, ao escolher, o trajeto dele é carregado', async ({ page }) => {
      await login(page, 'admin');
      await page.goto(`/fleet?vehicle=${rental.vehicleId}`);
      await page.getByTestId('replay-toggle').click();
      const select = page.getByTestId('replay-range');
      const option = select.locator(`option[value="rental:${rental.rentalId}"]`);
      await expect(option).toBeAttached();
      await expect(option).toContainText('Aluguel de ');
      const track = page.waitForResponse((r) => r.url().includes(`/vehicles/${rental.vehicleId}/track`) && decodeURIComponent(r.url()).includes(rental.startedAt));
      await select.selectOption(`rental:${rental.rentalId}`);
      expect((await track).ok()).toBeTruthy();
      // com ou sem pontos, é o estado do aluguel (nunca a mensagem do período)
      await expect(page.getByTestId('replay-bar').getByText('Sem trajeto no período')).toHaveCount(0);
    });
  });

  test('alertas: atribuir a outra pessoa, ver o toast e o responsável na linha', async ({ page, request }) => {
    const alert = await raiseOpenAlert(request);
    await login(page, 'admin');
    await page.goto('/alerts');
    const rowOf = () => page.getByTestId('alerts-table').locator('tr').filter({ hasText: alert.code }).first();
    await expect(rowOf()).toBeVisible();
    await rowOf().getByRole('button', { name: 'Atribuir', exact: true }).click();

    const select = page.getByTestId('assign-select');
    await expect(page.getByTestId('assign-dialog')).toBeVisible();
    // padrão: quem está logado
    await expect(select.locator('option:checked')).toContainText('(você)');
    const labels = await select.locator('option').allTextContents();
    const other = labels.find((l) => !l.includes('(você)'));
    expect(other, 'precisa de outro usuário ativo no seed').toBeTruthy();
    await select.selectOption({ label: other! });
    await page.getByTestId('assign-confirm').click();
    await expect(page.getByText(`Alerta atribuído a ${other}`)).toBeVisible();

    // sai de "Abertos"; em "Atribuídos" a linha mostra o responsável e o botão Reatribuir
    await page.getByText('Atribuídos', { exact: true }).click();
    await expect(rowOf()).toContainText(other!);
    await expect(rowOf().getByRole('button', { name: 'Reatribuir' })).toBeVisible();
  });

  test('cercas: menu Camadas por tipo e taxa de devolução na regra', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/zones');
    await expect(page.getByTestId('draw-zone')).toBeEnabled();
    await page.getByTestId('layers-toggle').click();
    await expect(page.getByTestId('layers-menu')).toBeVisible();
    await page.getByTestId('layer-forbidden').uncheck();
    await expect(page.getByTestId('layers-toggle')).toContainText('3/4');
    await page.getByTestId('layer-forbidden').check();
    await expect(page.getByText(/taxa de R\$\s15,00/)).toBeVisible();
  });
});
