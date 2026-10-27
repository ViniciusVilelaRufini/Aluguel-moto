import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { DESKTOP, MOBILE, overflowReport } from '../helpers';
import { override, disputes3, claims3, messages3 } from './fixtures3';
import { s3, hOverflow } from './util3';

type View = { name: string; path: string; prep?: (p: Page) => Promise<void> };

const VIEWS: View[] = [
  { name: 'fleet', path: '/fleet' },
  { name: 'fleet-sheet', path: '/fleet', prep: async (p) => { await p.getByTestId('fleet-badge').waitFor(); await p.keyboard.press('Control+k'); await p.getByTestId('palette-input').fill('VLT-001'); await p.keyboard.press('Enter'); await p.getByTestId('vehicle-sheet').waitFor(); } },
  { name: 'alerts', path: '/alerts' },
  { name: 'zones', path: '/zones' },
  { name: 'customers', path: '/customers' },
  { name: 'customer-sheet', path: '/customers?customer=cus-001' },
  { name: 'cust-rentals', path: '/customers?tab=rentals' },
  { name: 'cust-support', path: '/customers?tab=support' },
  { name: 'tasks', path: '/tasks' },
  { name: 'tasks-maint', path: '/tasks', prep: async (p) => { await p.getByRole('button', { name: 'Manutenção' }).click(); } },
  { name: 'tasks-batt', path: '/tasks', prep: async (p) => { await p.getByRole('button', { name: 'Baterias' }).click(); await p.getByTestId('batteries-table').getByTestId('row').first().waitFor(); } },
  { name: 'finance', path: '/finance' },
  { name: 'settings', path: '/settings' },
  { name: 'team', path: '/team' },
  { name: 'team-audit', path: '/team', prep: async (p) => { await p.getByRole('button', { name: 'Auditoria' }).click(); await p.getByTestId('audit-table').getByTestId('row').first().waitFor(); } },
];

async function load(page: Page, v: View) {
  const mock = await loginMocked(page);
  await override(page, mock, 'GET', /api\.mock\.local\/support\/disputes(\?|$)/, { items: disputes3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/claims(\?|$)/, { items: claims3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/conversations\/[^/]+\/messages/, { items: messages3 });
  await page.goto(v.path);
  await expect(page.locator('#main-content')).toBeVisible();
  await page.waitForTimeout(900);
  if (v.prep) await v.prep(page);
  await page.waitForTimeout(500);
}

for (const [label, vp] of [['1440', DESKTOP], ['390', MOBILE]] as const) {
  test.describe(`visual ${label}`, () => {
    test.use({ viewport: vp, hasTouch: label === '390' });
    for (const v of VIEWS) {
      test(`${v.name}: captura e sem estouro horizontal`, async ({ page }) => {
        await load(page, v);
        await s3(page, `v${label}-${v.name}`);
        expect(await hOverflow(page), 'rolagem horizontal da pagina').toBeLessThanOrEqual(1);
        expect(await overflowReport(page)).toEqual([]);
      });
    }
  });
}
