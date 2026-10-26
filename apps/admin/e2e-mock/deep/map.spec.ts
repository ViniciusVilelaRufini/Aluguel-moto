import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { dshot, openVehicle, watch } from './util';

type Pt = { x: number; y: number };

async function ready(page: Page) {
  await page.goto('/fleet');
  await expect(page.getByTestId('fleet-badge')).toBeVisible();
  await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
  await page.waitForFunction(() => {
    const m = (window as unknown as { __voltiMap?: { getLayer(id: string): unknown; getSource(id: string): { _data?: { features?: unknown[] } } | undefined } }).__voltiMap;
    return !!m?.getLayer('vehicles') && ((m.getSource('fleet')?._data as { features?: unknown[] } | undefined)?.features?.length ?? 0) > 0;
  });
  await page.waitForTimeout(600);
}

/** Pixel (na pagina) de uma moto, projetado pelo mapa. */
async function pinPoint(page: Page, id: string): Promise<Pt> {
  return page.evaluate((vid) => {
    const m = (window as unknown as { __voltiMap: { project(c: [number, number]): { x: number; y: number }; getSource(s: string): { _data: { features: { properties: { id: string }; geometry: { coordinates: [number, number] } }[] } }; getContainer(): HTMLElement } }).__voltiMap;
    const f = m.getSource('fleet')._data.features.find((x) => x.properties.id === vid)!;
    const p = m.project(f.geometry.coordinates);
    const r = m.getContainer().getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, id);
}

const renderedPins = (page: Page) => page.evaluate(() => {
  const m = (window as unknown as { __voltiMap: { queryRenderedFeatures(o: unknown, p: unknown): unknown[] } }).__voltiMap;
  return { pins: m.queryRenderedFeatures(undefined, { layers: ['vehicles'] }).length, clusters: m.queryRenderedFeatures(undefined, { layers: ['clusters'] }).length };
});

test.describe('mapa da frota', () => {
  test('pins renderizam, clique seleciona (URL, ficha, pulso) e Esc limpa', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await ready(page);
    const r = await renderedPins(page);
    expect(r.pins + r.clusters).toBeGreaterThan(0);
    const p = await pinPoint(page, 'veh-003');
    await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.click(p.x, p.y);
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    await expect(page.getByTestId('vehicle-code')).toHaveText('VLT-003');
    await expect(page).toHaveURL(/vehicle=veh-003/);
    await expect(page.locator('.map-pulse')).toHaveCount(1);
    await dshot(page, 'map-selected');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vehicle-sheet')).toHaveCount(0);
    await expect(page.locator('.map-pulse')).toHaveCount(0);
    await expect(page).not.toHaveURL(/vehicle=/);
    expect(w.finish('map-select')).toEqual([]);
  });

  test('passar o mouse sobre o pin mostra dica com codigo, status e bateria; sair a remove', async ({ page }) => {
    await loginMocked(page);
    await ready(page);
    const p = await pinPoint(page, 'veh-004');
    await page.mouse.move(p.x - 40, p.y - 40);
    await page.mouse.move(p.x, p.y, { steps: 6 });
    const tip = page.locator('.vt-tip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('VLT-004');
    await expect(tip).toContainText('%');
    await dshot(page, 'map-hover');
    await page.mouse.move(p.x + 200, p.y + 200, { steps: 6 });
    await expect(tip).toHaveCount(0);
  });

  test('cluster: com zoom afastado aparecem clusters e clicar em um aproxima o mapa', async ({ page }) => {
    await loginMocked(page);
    await ready(page);
    await page.evaluate(() => (window as unknown as { __voltiMap: { jumpTo(o: unknown): void } }).__voltiMap.jumpTo({ zoom: 11 }));
    await page.waitForTimeout(800);
    const r = await renderedPins(page);
    expect(r.clusters, 'a 11x deveria haver clusters').toBeGreaterThan(0);
    const z0 = await page.evaluate(() => (window as unknown as { __voltiMap: { getZoom(): number } }).__voltiMap.getZoom());
    const pt = await page.evaluate(() => {
      const m = (window as unknown as { __voltiMap: { queryRenderedFeatures(o: unknown, p: unknown): { geometry: { coordinates: [number, number] } }[]; project(c: [number, number]): { x: number; y: number }; getContainer(): HTMLElement } }).__voltiMap;
      const f = m.queryRenderedFeatures(undefined, { layers: ['clusters'] })[0]!;
      const p = m.project(f.geometry.coordinates); const rc = m.getContainer().getBoundingClientRect();
      return { x: rc.left + p.x, y: rc.top + p.y };
    });
    await dshot(page, 'map-clusters');
    await page.mouse.move(pt.x, pt.y, { steps: 4 });
    await page.mouse.click(pt.x, pt.y);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voltiMap: { getZoom(): number } }).__voltiMap.getZoom()), { timeout: 5000 }).toBeGreaterThan(z0 + 0.5);
  });

  test('filtro de status reduz os pins e "Limpar filtro" restaura', async ({ page }) => {
    await loginMocked(page);
    await ready(page);
    const all = await page.evaluate(() => (window as unknown as { __voltiMap: { getSource(s: string): { _data: { features: unknown[] } } } }).__voltiMap.getSource('fleet')._data.features.length);
    expect(all).toBe(24);
    await page.getByRole('button', { name: /Livre/ }).first().click();
    await page.waitForTimeout(1200);
    const some = await page.evaluate(() => (window as unknown as { __voltiMap: { getSource(s: string): { _data: { features: unknown[] } } } }).__voltiMap.getSource('fleet')._data.features.length);
    expect(some).toBeLessThan(all);
    await page.getByRole('button', { name: 'Limpar filtro de status' }).click();
    await page.waitForTimeout(1200);
    const back = await page.evaluate(() => (window as unknown as { __voltiMap: { getSource(s: string): { _data: { features: unknown[] } } } }).__voltiMap.getSource('fleet')._data.features.length);
    expect(back).toBe(all);
  });

  test('tempo real: vehicle.position move a moto na ficha em ate 1 s; vehicle.status atualiza o contador', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await ready(page);
    const p = await pinPoint(page, 'veh-003');
    await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.click(p.x, p.y);
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    mock.emit('vehicle.position', { vehicleId: 'veh-003', lat: -23.5, lng: -46.6, speedKmh: 11.4, batteryPct: 33, status: 'rented', speedLimitKmh: 20, ts: new Date().toISOString() });
    await expect(page.getByTestId('vehicle-sheet').getByText('-23.5000, -46.6000')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('vehicle-sheet').getByText('11 km/h')).toBeVisible();
    await expect(page.getByTestId('vehicle-sheet').getByText('Limite 20 km/h')).toBeVisible();
    const badge0 = await page.getByTestId('fleet-badge').innerText();
    mock.emit('vehicle.status', { vehicleId: 'veh-001', status: 'offline', ts: new Date().toISOString() });
    await expect.poll(() => page.getByTestId('fleet-badge').innerText(), { timeout: 3000 }).not.toBe(badge0);
    expect(w.finish('map-rt')).toEqual([]);
  });
});

test.describe('tempo real: overrides', () => {
  test('status ao vivo antigo nao sobrepoe o dado novo quando a frota recarrega', async ({ page }) => {
    const mock = await loginMocked(page);
    await openVehicle(page, 'VLT-001');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'true');
    const sheet = page.getByTestId('vehicle-sheet');
    mock.emit('vehicle.status', { vehicleId: 'veh-001', status: 'maintenance', ts: new Date().toISOString() });
    await expect(sheet.getByText('Manutenção', { exact: true })).toBeVisible({ timeout: 3000 });
    // o servidor passa a dizer outra coisa e a frota recarrega (comando confirmado invalida ['fleet'])
    mock.db.vehicles.find((v) => v.id === 'veh-001')!.status = 'rented';
    await page.waitForTimeout(700);
    mock.emit('command.updated', { commandId: 'cmd-x', vehicleId: 'veh-001', type: 'horn', status: 'confirmed' });
    await expect(sheet.getByText('Alugada', { exact: true }), 'override velho de vehicle.status segue valendo depois do recarregamento').toBeVisible({ timeout: 4000 });
  });
});

test.describe('replay de trajeto', () => {
  async function openReplay(page: Page) {
    await ready(page);
    const p = await pinPoint(page, 'veh-002');
    await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.click(p.x, p.y);
    await page.getByTestId('replay-toggle').click();
    await expect(page.getByTestId('replay-bar')).toBeVisible();
  }
  const replayCoords = (page: Page, src: string) => page.evaluate((s) => {
    const m = (window as unknown as { __voltiMap: { getSource(s: string): { _data?: { geometry?: { coordinates: unknown[] }; coordinates?: unknown[] } } | undefined } }).__voltiMap;
    const d = m.getSource(s)?._data;
    return d ? ((d.geometry?.coordinates ?? d.coordinates ?? []) as unknown[]).length : -1;
  }, src);

  test('replay: carrega trajeto, play avanca a linha percorrida, scrub volta ao inicio, fechar remove camadas', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await openReplay(page);
    await expect(page.getByLabel('Linha do tempo')).toBeVisible();
    await page.waitForTimeout(900);
    expect(await replayCoords(page, 'replay-line')).toBeGreaterThan(2);
    await page.getByRole('button', { name: 'Reproduzir replay' }).click();
    await expect(page.getByRole('button', { name: 'Pausar replay' })).toBeVisible();
    await expect.poll(() => replayCoords(page, 'replay-done'), { timeout: 5000 }).toBeGreaterThan(2);
    await dshot(page, 'replay-playing');
    // termina e o botao volta a Reproduzir
    await expect(page.getByRole('button', { name: 'Reproduzir replay' })).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Linha do tempo').fill('0');
    await expect.poll(() => replayCoords(page, 'replay-done')).toBeLessThanOrEqual(2);
    await page.getByTestId('replay-toggle').click();
    await expect(page.getByTestId('replay-bar')).toHaveCount(0);
    expect(await replayCoords(page, 'replay-line')).toBe(-1);
    expect(w.finish('replay')).toEqual([]);
  });

  test('replay por aluguel: opcao "Aluguel de ..." consulta a janela do aluguel', async ({ page }) => {
    const mock = await loginMocked(page);
    await openReplay(page);
    const sel = page.getByTestId('replay-range');
    await expect(sel.locator('option')).not.toHaveCount(3, { timeout: 5000 });
    const label = await sel.locator('option').nth(3).getAttribute('value');
    await sel.selectOption(label!);
    await page.waitForTimeout(600);
    const tracks = mock.calls.filter((c) => /\/track$/.test(c.path));
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    const q = tracks.at(-1)!.query;
    expect(q.get('from')).toBeTruthy();
    expect(q.get('to')).toBeTruthy();
  });

  test('replay sem trajeto no periodo mostra mensagem', async ({ page }) => {
    await loginMocked(page);
    await page.route('http://api.mock.local/vehicles/*/track*', (r) => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ vehicleId: 'veh-002', points: [] }) }));
    await openReplay(page);
    await expect(page.getByText('Sem trajeto no período. Tente um período maior.')).toBeVisible();
  });

  test.describe('movimento reduzido', () => {
    test('replay: linha completa desenhada de imediato (sem esperar a animacao de 700 ms)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await loginMocked(page);
      await openReplay(page);
      await expect(page.getByLabel('Linha do tempo')).toBeVisible();
      await page.waitForTimeout(150);
      expect(await replayCoords(page, 'replay-line'), 'rota deveria aparecer completa (12 pontos)').toBe(12);
    });

    test('animacoes CSS desligadas: troca de secao, toasts, skeleton e pulso nao animam', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await loginMocked(page);
      await ready(page);
      const p = await pinPoint(page, 'veh-003');
      await page.mouse.move(p.x, p.y, { steps: 4 });
      await page.mouse.click(p.x, p.y);
      await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
      const anim = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
          const cs = getComputedStyle(el);
          const names = cs.animationName.split(',').map((s) => s.trim()).filter((s) => s && s !== 'none');
          if (!names.length) continue;
          const durs = cs.animationDuration.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 1 : 1000));
          const iter = cs.animationIterationCount;
          if (durs.some((d) => d > 50) || iter === 'infinite') bad.push(`${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 30)} ${cs.animationName} ${cs.animationDuration} ${iter}`);
        }
        return bad;
      });
      expect(anim, 'elementos ainda animando com prefers-reduced-motion: reduce').toEqual([]);
    });

    test('financeiro: KPIs e barras aparecem no valor final logo no primeiro quadro', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await loginMocked(page);
      await page.goto('/finance');
      await expect(page.getByText('R$ 6,6 mil')).toBeVisible({ timeout: 2500 });
      const h = await page.locator('div[title^="R$"]').first().evaluate((el) => el.getBoundingClientRect().height);
      expect(h).toBeGreaterThan(20);
    });
  });
});
