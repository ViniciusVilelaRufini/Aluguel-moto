import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { Mock } from './mock-api';

export const SHOTS = path.join(__dirname, '__shots__');
export const RESULTS = path.join(__dirname, '__results__');
export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

/** Coleta tudo o que indica problema durante o teste. Chame `collect(page, mock)` ANTES do primeiro goto. */
export interface Collector {
  issues: string[];
  note: (msg: string) => void;
  /** Roda um passo de interacao; falha vira um item em `issues` em vez de abortar a varredura. */
  step: (name: string, fn: () => Promise<void>) => Promise<void>;
  finish: (label: string) => string[];
}

export function collect(page: Page, mock: Mock): Collector {
  const issues: string[] = [];
  const seen = new Set<string>();
  const note = (m: string) => { if (!seen.has(m)) { seen.add(m); issues.push(m); } };
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().startsWith('Failed to load resource')) return; // respostas HTTP de erro sao validadas pelo mock (mock.unmocked) e pelos testes de estado
    const loc = m.location();
    note(`console.error: ${m.text().slice(0, 300)}${loc.url ? ` @ ${loc.url}:${loc.lineNumber}` : ''}`);
  });
  page.on('pageerror', (e) => note(`pageerror: ${e.message.slice(0, 300)}`));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (u.includes('/_next/') || u.includes('hot-update') || r.failure()?.errorText === 'net::ERR_ABORTED') return;
    note(`requestfailed: ${r.method()} ${u} ${r.failure()?.errorText}`);
  });
  return {
    issues,
    note,
    step: async (name, fn) => {
      try { await fn(); } catch (e) { note(`passo "${name}" falhou: ${String((e as Error).message).split('\n')[0]!.slice(0, 260)}`); }
    },
    finish: (label) => {
      for (const u of mock.unmocked) note(`requisicao sem mock: ${u}`);
      fs.mkdirSync(RESULTS, { recursive: true });
      fs.writeFileSync(path.join(RESULTS, `${label}.json`), JSON.stringify(issues, null, 2));
      return issues;
    },
  };
}

export async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false, caret: 'initial' });
}

/** Rolagem horizontal da pagina inteira e elementos que estouram a janela. */
export async function overflowReport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push(`documento rola na horizontal (${de.scrollWidth} > ${de.clientWidth})`);
    const vw = de.clientWidth;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
      if (r.right > vw + 2 && !el.closest('[data-scroll-x],.dt,[style*="overflow"]') && out.length < 6) {
        out.push(`elemento fora da tela: <${el.tagName.toLowerCase()} ${el.className?.toString().slice(0, 40) ?? ''}> "${(el.textContent ?? '').trim().slice(0, 30)}" right=${Math.round(r.right)} > ${vw}`);
      }
    }
    return out;
  });
}

/** Percorre N Tabs e informa elementos focados sem nenhum indicador de foco visivel. */
export async function focusReport(page: Page, tabs = 14): Promise<string[]> {
  const out: string[] = [];
  await page.addStyleTag({ content: '*{transition:none!important}' });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press('Tab');
    // O estado de foco de alguns componentes vem de React (onFocus -> setState): espera um quadro antes de medir.
    await page.waitForTimeout(60);
    const sigJs = () => {
      const el = document.activeElement as HTMLElement;
      const chain: HTMLElement[] = [];
      for (let n: HTMLElement | null = el, d = 0; n && d < 4; n = n.parentElement, d++) chain.push(n);
      return chain.map((n) => { const cs = getComputedStyle(n); return [cs.outlineStyle, cs.outlineWidth, cs.boxShadow, cs.borderColor, cs.backgroundColor].join('|'); }).join('##');
    };
    const focused = await page.evaluate(sigJs);
    const meta = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      (window as unknown as { __ae: HTMLElement }).__ae = el;
      el.blur();
      return { desc: `<${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? ` data-testid=${el.getAttribute('data-testid')}` : ''}> "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`, visible: r.width > 0 && r.height > 0 };
    });
    await page.waitForTimeout(60);
    const blurred = await page.evaluate(() => {
      const el = (window as unknown as { __ae: HTMLElement }).__ae;
      const chain: HTMLElement[] = [];
      for (let n: HTMLElement | null = el, d = 0; n && d < 4; n = n.parentElement, d++) chain.push(n);
      const out = chain.map((n) => { const cs = getComputedStyle(n); return [cs.outlineStyle, cs.outlineWidth, cs.boxShadow, cs.borderColor, cs.backgroundColor].join('|'); }).join('##');
      el.focus({ preventScroll: true });
      return out;
    });
    const info = meta ? { ...meta, ok: focused !== blurred } : null;
    if (info && info.visible && !info.ok) out.push(`sem indicador de foco: ${info.desc}`);
  }
  return out;
}
