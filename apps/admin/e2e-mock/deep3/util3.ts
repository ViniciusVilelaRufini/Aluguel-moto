import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
export { calls, watch } from '../deep/util';

export const SHOTS3 = path.join(__dirname, '..', '__shots__', 'deep3');
export async function s3(page: Page, name: string) {
  fs.mkdirSync(SHOTS3, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS3, `${name}.png`), caret: 'initial' });
}
export const hOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
