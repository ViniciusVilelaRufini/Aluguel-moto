import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, dshot, watch } from './util';

/** Desenha um triangulo com gestos humanos (mover, pausar, clicar); o ultimo clique no ultimo vertice fecha o poligono. */
async function drawTriangle(page: Page, dx = 0) {
  const canvas = page.locator("canvas.maplibregl-canvas");
  const b = (await canvas.boundingBox())!;
  const cx = b.x + b.width / 2 - 120 + dx;
  const cy = b.y + b.height / 2 - 40;
  const tap = async (x: number, y: number) => { await page.mouse.move(x, y, { steps: 6 }); await page.waitForTimeout(90); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(120); };
  await tap(cx, cy);
  await tap(cx + 120, cy);
  await tap(cx + 60, cy + 100);
  await tap(cx + 60, cy + 100);
  await expect(page.getByText("Polígono desenhado")).toBeVisible();
}

async function startDraw(page: Page) {
  await page.goto('/zones');
  await expect(page.getByTestId('draw-zone')).toBeEnabled();
  await page.getByTestId('draw-zone').click();
  await expect(page.getByTestId('zone-form-title')).toHaveText('Nova cerca');
}

test.describe('cercas: desenho, validacao, salvar, editar, excluir', () => {
  test('criar cerca com o desenho: POST com poligono fechado e toast', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await startDraw(page);
    await drawTriangle(page);
    await expect(page.getByText('Polígono desenhado')).toBeVisible();
    await page.getByTestId('zone-name').fill('Praça de teste');
    await dshot(page, 'zone-drawn');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Cerca criada')).toBeVisible();
    const c = calls(mock, '/zones');
    expect(c).toHaveLength(1);
    const body = c[0]!.body as { name: string; type: string; geometry: { type: string; coordinates: number[][][] } };
    expect(body.name).toBe('Praça de teste');
    expect(body.geometry.type).toBe('Polygon');
    expect(body.geometry.coordinates[0]!.length).toBeGreaterThanOrEqual(4);
    expect(body.geometry.coordinates[0]![0]).toEqual(body.geometry.coordinates[0]!.at(-1));
    await expect(page.getByTestId('zone-item').filter({ hasText: 'Praça de teste' })).toBeVisible();
    expect(w.finish('zones-create')).toEqual([]);
  });

  test('validacao: salvar vazio mostra nome e desenho; nada e enviado', async ({ page }) => {
    const mock = await loginMocked(page);
    await startDraw(page);
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Informe o nome da cerca')).toBeVisible();
    await expect(page.getByTestId('zone-geometry-error')).toHaveText('Desenhe o polígono no mapa');
    await dshot(page, 'zone-validation-empty');
    expect(calls(mock, '/zones')).toHaveLength(0);
  });

  test('validacao: nome so com espacos e recusado', async ({ page }) => {
    const mock = await loginMocked(page);
    await startDraw(page);
    await drawTriangle(page);
    await page.getByTestId('zone-name').fill('    ');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Informe o nome da cerca')).toBeVisible();
    expect(calls(mock, '/zones')).toHaveLength(0);
  });

  test('validacao: velocidade reduzida exige 6..20 km/h', async ({ page }) => {
    const mock = await loginMocked(page);
    await startDraw(page);
    await drawTriangle(page);
    await page.getByTestId('zone-name').fill('Calcadao');
    await page.getByTestId('zone-type').selectOption('reduced_speed');
    for (const [v, msg] of [['', /Informe o limite/], ['5', /Mínimo de 6/], ['21', /Máximo de 20/], ['40', /Máximo de 32/], ['-3', /negativo/]] as const) {
      await page.getByTestId('zone-limit').fill(v);
      await page.getByTestId('zone-save').click();
      await expect(page.getByTestId('zones-panel').getByText(msg).first(), `limite "${v}"`).toBeVisible();
    }
    expect(calls(mock, '/zones')).toHaveLength(0);
    await page.getByTestId('zone-limit').fill('6');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Cerca criada')).toBeVisible();
    expect((calls(mock, '/zones')[0]!.body as { speedLimitKmh: number }).speedLimitKmh).toBe(6);
  });

  test('[BUG P2-03] limite decimal (12.5 km/h) e recusado no formulario (contrato: inteiro)', async ({ page }) => {
    const mock = await loginMocked(page);
    await startDraw(page);
    await drawTriangle(page);
    await page.getByTestId('zone-name').fill('Ciclovia decimal');
    await page.getByTestId('zone-type').selectOption('reduced_speed');
    await page.getByTestId('zone-limit').fill('12.5');
    await page.getByTestId('zone-save').click();
    await page.waitForTimeout(500);
    expect(calls(mock, '/zones'), 'limite 12.5 km/h (nao inteiro) foi enviado ao servidor').toHaveLength(0);
  });

  test('duplo clique em "Salvar cerca" cria uma unica cerca', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await startDraw(page);
    await drawTriangle(page);
    await page.getByTestId('zone-name').fill('Duplo clique');
    await page.getByTestId('zone-save').dblclick();
    await page.waitForTimeout(1500);
    expect(calls(mock, '/zones')).toHaveLength(1);
  });

  test('erro do servidor na criacao mostra mensagem e preserva rascunho', async ({ page }) => {
    await loginMocked(page, { failPaths: ['/zones'] });
    // GET /zones tambem falha (prefixo); ainda assim o desenho continua possivel
    await page.goto('/zones');
    await expect(page.getByTestId('draw-zone')).toBeEnabled();
    await page.getByTestId('draw-zone').click();
    await drawTriangle(page);
    await page.getByTestId('zone-name').fill('Falha');
    await page.getByTestId('zone-save').click();
    await expect(page.getByTestId('zones-panel').getByRole('alert').first()).toBeVisible();
    await expect(page.getByTestId('zone-name')).toHaveValue('Falha');
    await expect(page.getByText('Polígono desenhado')).toBeVisible();
  });

  test('editar cerca existente: PUT com a geometria original e novo nome', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/zones');
    const item = page.getByTestId('zone-item').first();
    await expect(item).toBeEnabled();
    await item.click();
    await expect(page.getByTestId('zone-form-title')).toHaveText('Editar cerca');
    const name = await page.getByTestId('zone-name').inputValue();
    await page.getByTestId('zone-name').fill(name + ' (editada)');
    await dshot(page, 'zone-edit');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Cerca atualizada')).toBeVisible();
    const put = calls(mock, /^\/zones\/[^/]+$/, 'PUT');
    expect(put).toHaveLength(1);
    expect((put[0]!.body as { name: string }).name).toBe(name + ' (editada)');
    // lista mostra o novo nome
    await expect(page.getByTestId('zone-item').first()).toContainText('(editada)');
  });

  test('editar: Cancelar descarta e libera a lista; itens ficam desabilitados durante a edicao', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/zones');
    await page.getByTestId('zone-item').first().click();
    await expect(page.getByTestId('zone-item').nth(1)).toBeDisabled();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByTestId('zone-form-title')).toHaveCount(0);
    await expect(page.getByTestId('zone-item').nth(1)).toBeEnabled();
  });

  test('excluir: confirmacao, DELETE e remocao da lista; cancelar nao exclui', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/zones');
    await expect(page.getByTestId('zone-item').first()).toBeEnabled();
    const before = await page.getByTestId('zone-item').count();
    await page.getByTestId('zone-item').first().click();
    await page.getByTestId('zone-delete').click();
    await expect(page.getByTestId('delete-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('delete-dialog')).toHaveCount(0);
    expect(calls(mock, /^\/zones\/[^/]+$/, 'DELETE')).toHaveLength(0);
    await page.getByTestId('zone-delete').click();
    await page.getByTestId('zone-delete-confirm').click();
    await expect(page.getByText('Cerca excluída')).toBeVisible();
    expect(calls(mock, /^\/zones\/[^/]+$/, 'DELETE')).toHaveLength(1);
    await expect(page.getByTestId('zone-item')).toHaveCount(before - 1);
  });

  test('[BUG P2-04] Esc durante o desenho cancela o rascunho ou ao menos nao deixa o formulario preso sem poligono', async ({ page }) => {
    await loginMocked(page);
    await startDraw(page);
    await page.locator('canvas.maplibregl-canvas').click({ position: { x: 300, y: 300 } });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    // depois do Esc o mapa saiu do modo de desenho; o painel nao pode continuar dizendo para clicar no mapa
    const stuck = await page.getByText('Clique no mapa para marcar os vértices').count();
    expect(stuck, 'formulario continua pedindo para clicar no mapa mas o desenho foi cancelado pelo Esc').toBe(0);
  });

  test('camadas: desligar "Zona proibida" some com a cerca do mapa (menu fecha com Esc)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/zones');
    await page.getByTestId('layers-toggle').click();
    await expect(page.getByTestId('layers-menu')).toBeVisible();
    await page.getByTestId('layer-forbidden').uncheck();
    await expect(page.getByTestId('layers-toggle')).toContainText('(3/4)');
    await page.getByTestId('layer-forbidden').press('Escape');
    await expect(page.getByTestId('layers-menu')).toHaveCount(0);
  });
});
