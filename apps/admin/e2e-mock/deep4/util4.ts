import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
export { calls, watch } from '../deep/util';
export { hOverflow } from '../deep3/util3';

export const SHOTS4 = path.join(__dirname, '..', '__shots__', 'deep4');
export async function s4(page: Page, name: string) {
  fs.mkdirSync(SHOTS4, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS4, `${name}.png`), caret: 'initial' });
}

/** Instala (antes do goto) um observador de long tasks; `window.__lt` guarda as duracoes em ms. */
export async function observeLongTasks(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __lt: number[] };
    w.__lt = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch { /* sem suporte */ }
  });
}
export const longTasks = (page: Page) => page.evaluate(() => (window as unknown as { __lt: number[] }).__lt ?? []);
