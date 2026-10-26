# Volti — fluidez, movimento e resposta ao toque Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o painel (`apps/admin`) e o app do cliente (`apps/cliente`) rápidos e vivos — saídas animadas, retorno imediato ao clique/toque, mapas que deslizam, listas sem engasgo — e tirar do caminho da requisição o trabalho que o usuário não vê no backend.

**Architecture:** Primeiro uma fonte única de tokens de movimento (`design-system/tokens/*.css` → CSS do painel, preset Tailwind e teste de paridade com `volti_flutter`). Depois, por superfície, primitivas pequenas e testáveis em funções puras (máquina de presença, store externo da frota, cache de features do mapa, helpers otimistas, tween de posição no Flutter) ligadas às telas com mudanças locais. No backend, middlewares/decorators transversais (compressão, cache HTTP) e retirada de esperas do caminho (geocoder em segundo plano, progresso do início do aluguel por evento).

**Tech Stack:** Next.js 14 + React 18 + TanStack Query 5 + MapLibre 4.7 + vitest 2 + Playwright 1.48 (painel); Flutter (SDK ^3.11) + flutter_map 8 + Riverpod 3 (app e `packages/volti_flutter`); NestJS 10 + Prisma 5 + PostGIS + jest 29 (API); Node 24 `node:test` (gerador de tokens); OpenAPI 3.1 + `realtime.md` (`packages/contracts`).

**Spec:** `docs/superpowers/specs/2026-10-26-volti-fluidez-design.md` (status: rascunho para aprovação; seção 8 lista decisões não confirmadas — tarefas que dependem delas estão marcadas **Depende da decisão 8.N**).

## Global Constraints

- O contrato em `/packages/contracts` é a fonte da verdade: nada de endpoint/evento inventado; toda mudança de contrato é proposta no contrato e registrada em `docs/decisoes.md`.
- Código e nomes em inglês; textos de interface em português do Brasil.
- Dinheiro em centavos (inteiro); datas em UTC ISO 8601; exibição no fuso America/Sao_Paulo.
- Nenhum segredo no código; logs estruturados em JSON, sem dados pessoais.
- LGPD: localização é dado pessoal — eventos novos não podem levar posição a quem não tem aluguel ativo; trajetos continuam expirando em 90 dias.
- O software nunca pode permitir ultrapassar 32 km/h nem cortar o motor em movimento; nada deste plano mexe em comandos IoT além de exibir estado ("Comandos IoT **não** são otimistas").
- Fora de escopo (spec §1): redesenho de identidade visual, telas/fluxos novos de produto, modo escuro do painel.
- Regra de redução de movimento mantida: estado final no primeiro frame (`prefers-reduced-motion` no painel, `MediaQuery.disableAnimations` no Flutter).
- Sem dependência nova de animação (framer-motion, flutter_animate rejeitados — spec §3). Dependências novas permitidas por este plano: `@tanstack/react-virtual` (decisão 8.2), `compression` + `@types/compression` (API).
- Sem Docker local: testes rodam offline (vitest, jest unitário, flutter test, Playwright com API mockada); verificações que exigem Postgres/PostGIS real (EXPLAIN do índice) rodam contra a AWS dev.
- Flutter: `C:/flutter/bin/flutter`. Painel: `pnpm --filter admin ...`. API: `pnpm --filter api ...`.
- Definição de pronto por sub-projeto (spec §7): lint sem erros, testes passando, README da pasta atualizado e prints antes/depois em `docs/design/screenshots/fluidez/`.
- Pré-requisito: o harness Playwright com API mockada (`apps/admin/e2e-mock/`, branch `fix/qa-painel`) precisa estar **mergeado em `feat/fluidez` antes da Task 1**. Este plano só depende de `apps/admin/e2e-mock/playwright.mock.config.ts`, das fixtures do harness e do helper de login.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefas |
|---|---|---|
| `design-system/package.json` (novo) | pacote `@volti/design-system` com `tokens:sync`, `tokens:check`, `test` | 2 |
| `design-system/scripts/tokens-sync.mjs` (novo) | lê `tokens/*.css`, gera CSS do painel e preset Tailwind | 2 |
| `design-system/tailwind-preset.cjs` (gerado) | preset Tailwind com durações, curvas, espaçamento, tamanhos, cores, raio pill, sombras | 2, 3 |
| `apps/admin/src/styles/tokens.css` (gerado) | variáveis e keyframes `vt-*` do DS para o painel | 2, 3 |
| `apps/admin/e2e-mock/fluidez-kit.ts` (novo) | adaptador do harness: `login`, `mockFleet`, `blockTiles` | 1 |
| `apps/admin/src/lib/presence.ts` (novo) | máquina de presença + `usePresence` + `EXIT_MS` | 5 |
| `apps/admin/src/components/Presence.tsx` (novo) | mantém filho montado durante a saída; `useExiting()` | 5, 6 |
| `apps/admin/src/lib/section-prefetch.ts` (novo) | consultas por seção compartilhadas entre página e prefetch do menu | 7 |
| `apps/admin/src/lib/fleet-store.ts` (novo) | store externo da frota (lotes, refs estáveis, contagens) | 9, 10 |
| `apps/admin/src/lib/fleet-features.ts` (novo) | cache de features GeoJSON por objeto de moto | 11 |
| `apps/admin/src/lib/optimistic.ts` (novo) | snapshot/patch/rollback no cache do TanStack Query | 15, 16 |
| `packages/volti_flutter/test/tokens_parity_test.dart` (novo) | falha se Dart divergir do CSS | 4 |
| `apps/cliente/lib/features/ride/ride_motion.dart` (novo) | interpolação de posição e regra de salto > 1 km | 20 |
| `apps/cliente/lib/features/plan/start_progress.dart` (novo) | estado e painel de etapas do desbloqueio | 32 |
| `services/api/src/common/cache-control.ts` (novo) | decorator + interceptor `Cache-Control` | 26 |
| `services/api/src/common/signed-url-cache.ts` (novo) | reuso de URL assinada por ~10 min | 27 |
| `services/api/src/common/simplify.ts` (novo) | Douglas-Peucker em metros | 34 |
| `services/api/src/modules/rentals/rental-start-progress.ts` (novo) | emissor das etapas do início do aluguel | 31 |

---

# Fase 1 — Fundação de movimento (spec 4.1)

Entrega: uma fonte de tokens; painel e Flutter consumindo/validando contra ela; linha de base visual que detecta regressão nas fases seguintes.

### Task 1: Kit do harness mockado e linha de base visual

**Files:**
- Create: `apps/admin/e2e-mock/fluidez-kit.ts`
- Create: `apps/admin/e2e-mock/fluidez-visual.spec.ts`
- Create (gerado): `apps/admin/e2e-mock/fluidez-visual.spec.ts-snapshots/*.png`

**Interfaces:**
- Consumes: `apps/admin/e2e-mock/playwright.mock.config.ts` e o helper de login do harness (branch `fix/qa-painel`, já mergeada).
- Produces: `login(page, group?)`, `mockFleet(page, n: number): Promise<FakeVehicle[]>`, `blockTiles(page): Promise<void>`, `fakeVehicles(n: number): FakeVehicle[]` — usados pelas Tasks 6, 7, 14, 17.

- [ ] **Step 1: Confirmar o pré-requisito**

Run: `git -C C:/Users/vinic/Desktop/volti-wt/fluidez log --oneline -1 -- apps/admin/e2e-mock/playwright.mock.config.ts`
Expected: um commit (se vazio, faça `git merge fix/qa-painel` antes de seguir).

- [ ] **Step 2: Escrever o kit**

```ts
// apps/admin/e2e-mock/fluidez-kit.ts
import type { Page } from '@playwright/test';
// Único ponto acoplado ao harness: se o helper de login tiver outro nome/arquivo, ajuste só esta linha.
export { login } from './helpers';

export interface FakeVehicle {
  id: string; code: string; status: 'free' | 'rented' | 'reserved' | 'paused' | 'blocked' | 'maintenance' | 'offline';
  lat: number; lng: number; batteryPct: number; speedKmh: number; speedLimitKmh: number; model: string;
  thingName: string; online: boolean; lastSeenAt: string; address?: string;
}

const STATUSES: FakeVehicle['status'][] = ['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline'];

/** `n` motos determinísticas espalhadas por ~4 km em Pinheiros (mesma semente → mesmas posições → prints estáveis). */
export function fakeVehicles(n: number): FakeVehicle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    code: `VLT-${String(i + 1).padStart(4, '0')}`,
    status: STATUSES[i % STATUSES.length],
    lat: -23.563 + ((i * 37) % 200) / 5000 - 0.02,
    lng: -46.675 + ((i * 53) % 200) / 5000 - 0.02,
    batteryPct: 10 + ((i * 7) % 90),
    speedKmh: 0,
    speedLimitKmh: 32,
    model: 'Volti S1',
    thingName: `moto-${String(i + 1).padStart(4, '0')}`,
    online: i % 7 !== 6,
    lastSeenAt: '2026-10-26T12:00:00.000Z',
    address: `R. Teodoro Sampaio, ${100 + i} · Pinheiros, São Paulo`,
  }));
}

/** Sobrepõe `GET /vehicles` do harness com `n` motos (respeita `status` e pagina de 100 em 100). */
export async function mockFleet(page: Page, n: number): Promise<FakeVehicle[]> {
  const all = fakeVehicles(n);
  await page.route(/\/vehicles(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const offset = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const list = status ? all.filter((v) => v.status === status) : all;
    const items = list.slice(offset, offset + limit);
    const next = offset + limit < list.length ? String(offset + limit) : undefined;
    await route.fulfill({ json: { items, ...(next ? { nextCursor: next } : {}) } });
  });
  return all;
}

/** Tiles do OSM viram PNG 1×1 transparente (teste offline e print estável). */
export async function blockTiles(page: Page): Promise<void> {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));
}
```

- [ ] **Step 3: Escrever a linha de base visual**

```ts
// apps/admin/e2e-mock/fluidez-visual.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

const SCREENS: [string, string][] = [
  ['frota-lista', '/fleet?view=list'], ['alertas', '/alerts/'], ['cercas', '/zones/'], ['clientes', '/customers/'],
  ['operacao', '/tasks/'], ['financeiro', '/finance/'], ['precos', '/settings/'], ['equipe', '/team/'],
];

test.describe('fluidez: regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await blockTiles(page);
    await mockFleet(page, 40);
    await login(page, 'admin');
  });
  for (const [name, url] of SCREENS) {
    test(name, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.01, mask: [page.getByTestId('live-indicator')] });
    });
  }
});
```

- [ ] **Step 4: Gerar a linha de base e confirmar que é estável**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-visual.spec.ts --update-snapshots`
Then: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-visual.spec.ts`
Expected: 8 passed nas duas execuções (a segunda sem `--update-snapshots` prova que o print é determinístico). Se alguma tela variar (datas relativas, "há X min"), acrescente o elemento a `mask` e gere de novo.

- [ ] **Step 5: Prints "antes"**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-visual.spec.ts --update-snapshots` já gerou os PNGs; copie a pasta `e2e-mock/fluidez-visual.spec.ts-snapshots/` para `docs/design/screenshots/fluidez/antes/`.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/e2e-mock/fluidez-kit.ts apps/admin/e2e-mock/fluidez-visual.spec.ts apps/admin/e2e-mock/fluidez-visual.spec.ts-snapshots docs/design/screenshots/fluidez/antes
git commit -m "test(admin): linha de base visual da fluidez no harness mockado"
```

### Task 2: Pacote do design system, tokens novos e gerador `tokens:sync`

**Depende da decisão 8.1** (valores de saída: `--dur-exit 160ms` = 0,8 × `--dur-base`; `--ease-exit` acelerando).

**Files:**
- Create: `design-system/package.json`
- Create: `design-system/scripts/tokens-sync.mjs`
- Create: `design-system/scripts/tokens-sync.test.mjs`
- Modify: `design-system/tokens/effects.css` (tokens novos)
- Modify: `design-system/tokens/colors.css` (tokens que só existiam no app)
- Modify: `pnpm-workspace.yaml` (inclui `design-system`)
- Modify: `design-system/readme.md`
- Create (gerado): `design-system/tailwind-preset.cjs`, `apps/admin/src/styles/tokens.css`

**Interfaces:**
- Produces: `parseVars(css: string): Map<string, string>`, `buildTokensCss(sources: {name: string; css: string}[]): string`, `buildPreset(vars: Map<string,string>): {theme:{extend:object}}`, `run({ check: boolean }): { changed: string[] }`; scripts `pnpm --filter @volti/design-system tokens:sync | tokens:check | test`; CSS vars `--dur-exit`, `--ease-exit`, `--spring-drag`, `--ease-panel`, `--brand-action`, `--warning-ink-strong`, `--danger-ink-strong`.

- [ ] **Step 1: Escrever o teste do gerador**

```js
// design-system/scripts/tokens-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPreset, buildTokensCss, parseVars, run } from './tokens-sync.mjs';

test('parseVars ignora comentários @kind e lê valores', () => {
  const v = parseVars(':root{--dur-fast:120ms;/* @kind other */--ease-out:cubic-bezier(.2,.8,.2,1);}');
  assert.equal(v.get('dur-fast'), '120ms');
  assert.equal(v.get('ease-out'), 'cubic-bezier(.2,.8,.2,1)');
});

test('tokens novos de saída, mola e cores do app existem no DS', () => {
  const effects = parseVars(readFileSync(new URL('../tokens/effects.css', import.meta.url), 'utf8'));
  assert.equal(effects.get('dur-exit'), '160ms');
  assert.equal(effects.get('ease-exit'), 'cubic-bezier(.4,0,1,1)');
  assert.equal(effects.get('spring-drag'), '1 520 34');
  assert.equal(effects.get('ease-panel'), 'cubic-bezier(.22,1.18,.36,1)');
  const colors = parseVars(readFileSync(new URL('../tokens/colors.css', import.meta.url), 'utf8'));
  assert.equal(colors.get('brand-action'), '#1C7F38');
  assert.equal(colors.get('warning-ink-strong'), '#9A4A0F');
  assert.equal(colors.get('danger-ink-strong'), '#B0352B');
});

test('preset Tailwind mapeia para var(--*)', () => {
  const p = buildPreset(new Map([['dur-fast', '120ms'], ['ease-exit', 'x'], ['space-8', '8px'], ['fs-14', '14px'], ['coral-500', '#F2665A'], ['status-free', 'x'], ['radius-pill', '999px'], ['shadow-sheet', 'x'], ['shadow-coral', 'x']]));
  const e = p.theme.extend;
  assert.equal(e.transitionDuration.fast, 'var(--dur-fast)');
  assert.equal(e.transitionTimingFunction.exit, 'var(--ease-exit)');
  assert.equal(e.spacing['8'], 'var(--space-8)');
  assert.equal(e.fontSize['14'], 'var(--fs-14)');
  assert.equal(e.colors.coral['500'], 'var(--coral-500)');
  assert.equal(e.colors.status.free, 'var(--status-free)');
  assert.equal(e.borderRadius.pill, 'var(--radius-pill)');
  assert.deepEqual(e.boxShadow, { sheet: 'var(--shadow-sheet)', coral: 'var(--shadow-coral)' });
});

test('CSS gerado tem cabeçalho de arquivo gerado e as fontes na ordem', () => {
  const css = buildTokensCss([{ name: 'a.css', css: ':root{--x:1}' }, { name: 'b.css', css: '@keyframes k{}' }]);
  assert.match(css, /^\/\* GERADO/);
  assert.ok(css.indexOf('a.css') < css.indexOf('b.css'));
});

test('arquivos gerados estão em dia (tokens:check)', () => {
  assert.deepEqual(run({ check: true }).changed, []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test design-system/scripts/`
Expected: FAIL — `Cannot find module './tokens-sync.mjs'`.

- [ ] **Step 3: Tokens novos no DS**

Em `design-system/tokens/effects.css`, antes do `}` final, acrescente:

```css
--dur-exit:160ms;/* @kind other */--ease-exit:cubic-bezier(.4,0,1,1);/* @kind other */
--spring-drag:1 520 34;/* @kind other */
--ease-panel:cubic-bezier(.22,1.18,.36,1);/* @kind other */
```

Em `design-system/tokens/colors.css`, na linha de `--brand:...` (bloco semântico), acrescente ao fim da linha:

```css
--brand-action:#1C7F38;--warning-ink-strong:#9A4A0F;--danger-ink-strong:#B0352B;
```

- [ ] **Step 4: Escrever o gerador**

```js
// design-system/scripts/tokens-sync.mjs
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DS = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(DS, '..');
/** Ordem importa: cores antes de quem as referencia; motion por último (keyframes usam --ease-*). fonts.css/base.css ficam de fora (caminhos de fonte e reset são do app). */
export const TOKEN_FILES = ['colors.css', 'spacing.css', 'typography.css', 'effects.css', 'motion.css'];
const HEADER = '/* GERADO por design-system/scripts/tokens-sync.mjs — não edite. Fonte: design-system/tokens/*.css */\n';

export function parseVars(css) {
  const out = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) out.set(m[1], m[2].trim());
  return out;
}

export function buildTokensCss(sources) {
  return HEADER + sources.map((s) => `\n/* ${s.name} */\n${s.css.trim()}\n`).join('');
}

const v = (name) => `var(--${name})`;
const group = (vars, prefix) =>
  Object.fromEntries([...vars.keys()].filter((k) => k.startsWith(prefix)).map((k) => [k.slice(prefix.length), v(k)]));

export function buildPreset(vars) {
  return {
    theme: {
      extend: {
        transitionDuration: group(vars, 'dur-'),
        transitionTimingFunction: group(vars, 'ease-'),
        spacing: group(vars, 'space-'),
        fontSize: group(vars, 'fs-'),
        colors: { coral: group(vars, 'coral-'), blue: group(vars, 'blue-'), violet: group(vars, 'violet-'), status: group(vars, 'status-') },
        borderRadius: { pill: v('radius-pill') },
        boxShadow: { sheet: v('shadow-sheet'), coral: v('shadow-coral') },
      },
    },
  };
}

const presetSource = (preset) => `${HEADER}module.exports = ${JSON.stringify(preset, null, 2)};\n`;

export function run({ check = false } = {}) {
  const sources = TOKEN_FILES.map((name) => ({ name, css: readFileSync(join(DS, 'tokens', name), 'utf8') }));
  const vars = new Map(sources.flatMap((s) => [...parseVars(s.css)]));
  const outputs = [
    [join(ROOT, 'apps/admin/src/styles/tokens.css'), buildTokensCss(sources)],
    [join(DS, 'tailwind-preset.cjs'), presetSource(buildPreset(vars))],
  ];
  const changed = [];
  for (const [file, content] of outputs) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current === content) continue;
    changed.push(file);
    if (!check) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }
  }
  return { changed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const { changed } = run({ check });
  if (check && changed.length) {
    console.error(`Tokens desatualizados: ${changed.join(', ')}. Rode pnpm --filter @volti/design-system tokens:sync.`);
    process.exit(1);
  }
  console.log(changed.length ? `Atualizados: ${changed.join(', ')}` : 'Tokens em dia.');
}
```

- [ ] **Step 5: Pacote e workspace**

```json
// design-system/package.json
{
  "name": "@volti/design-system",
  "version": "0.1.0",
  "private": true,
  "description": "Tokens do Volti Design System e gerador para o painel (CSS + preset Tailwind).",
  "type": "module",
  "scripts": {
    "tokens:sync": "node scripts/tokens-sync.mjs",
    "tokens:check": "node scripts/tokens-sync.mjs --check",
    "test": "node --test scripts/",
    "lint": "node scripts/tokens-sync.mjs --check"
  }
}
```

Em `pnpm-workspace.yaml`, acrescente `  - design-system` à lista `packages`. Run: `pnpm install` (só atualiza o lockfile; sem dependências).

- [ ] **Step 6: Gerar e testar**

Run: `pnpm --filter @volti/design-system tokens:sync && pnpm --filter @volti/design-system test`
Expected: "Atualizados: …tokens.css, …tailwind-preset.cjs" e depois 5 testes PASS.

- [ ] **Step 7: README do DS**

Em `design-system/readme.md`, no Índice, acrescente:

```md
- `scripts/tokens-sync.mjs` — gera `apps/admin/src/styles/tokens.css` e `tailwind-preset.cjs` a partir de `tokens/`. Depois de editar um token: `pnpm --filter @volti/design-system tokens:sync`. `tokens:check` falha se algo gerado estiver desatualizado. Tokens de saída: `--dur-exit` (160 ms, 0,8× da entrada) e `--ease-exit`; mola de arrastar `--spring-drag` (massa rigidez amortecimento).
```

- [ ] **Step 8: Commit**

```bash
git add design-system pnpm-workspace.yaml pnpm-lock.yaml apps/admin/src/styles/tokens.css
git commit -m "feat(design-system): fonte única de tokens, tokens de saída e gerador tokens:sync"
```

### Task 3: Painel consome os tokens gerados e o preset Tailwind

**Files:**
- Modify: `apps/admin/src/app/layout.tsx` (importa `@/styles/tokens.css` antes de `./globals.css`)
- Modify: `apps/admin/src/app/globals.css` (remove o bloco `:root` copiado, linhas 15–70, e o bloco "Motion (design-system/tokens/motion.css, presets vt-*)" com os keyframes `vt-fade-up` … `vt-screen-out-down`, `.vt-stagger`, `.vt-drop` e a chave global de movimento reduzido)
- Modify: `apps/admin/tailwind.config.ts`
- Create: `apps/admin/tests/tokens-wiring.test.ts`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Consumes: `apps/admin/src/styles/tokens.css`, `design-system/tailwind-preset.cjs` (Task 2).
- Produces: classes Tailwind `duration-exit`, `ease-exit`, `ease-panel`, `bg-coral-500`, `rounded-pill`, `shadow-sheet` etc.; continuam valendo os keyframes próprios do painel (`vt-panel-in`, `vt-section-in`, `vt-scrim-in`, `vt-dialog-in`, `vt-toast-out`, `vt-bar-grow`, `vt-shimmer`, `vt-flash`, `vt-row-new`) em `globals.css`.

- [ ] **Step 1: Teste de ligação**

```ts
// apps/admin/tests/tokens-wiring.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (p: string) => readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('tokens do DS no painel', () => {
  it('globals.css não tem mais cópia manual dos tokens nem dos presets vt-*', () => {
    const g = read('src/app/globals.css');
    expect(g).not.toMatch(/--green-50\s*:/);
    expect(g).not.toMatch(/--dur-base\s*:/);
    expect(g).not.toMatch(/@keyframes vt-fade-up/);
    expect(g).toMatch(/@keyframes vt-panel-in/); // keyframes próprios do painel continuam aqui
  });
  it('layout importa os tokens gerados antes do globals.css', () => {
    const l = read('src/app/layout.tsx');
    const t = l.indexOf("'@/styles/tokens.css'");
    expect(t).toBeGreaterThan(-1);
    expect(t).toBeLessThan(l.indexOf("'./globals.css'"));
  });
  it('tokens.css gerado traz saída, painel e cores fortes', () => {
    const t = read('src/styles/tokens.css');
    for (const v of ['--dur-exit:160ms', '--ease-exit:', '--ease-panel:', '--brand-action:', '--map-land:']) expect(t).toContain(v);
  });
  it('tailwind usa o preset do DS', () => {
    expect(read('tailwind.config.ts')).toContain('design-system/tailwind-preset.cjs');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/tokens-wiring.test.ts`
Expected: FAIL nos itens 1, 2 e 4.

- [ ] **Step 3: Ligar**

Em `apps/admin/src/app/layout.tsx`, imediatamente antes de `import './globals.css';`:

```ts
import '@/styles/tokens.css';
```

Em `apps/admin/src/app/globals.css`: apague o bloco `:root{ … }` que começa em `--green-50:#EAF8EF;` e termina em `--map-land:#F2F3F0;…;--map-park:#B6E3B0;` + `}` (troque o comentário `/* Tokens copiados de design-system/tokens/*.css */` por `/* Tokens: src/styles/tokens.css (gerado por pnpm --filter @volti/design-system tokens:sync) */`), e apague o bloco que começa em `/* ---------- Motion (design-system/tokens/motion.css, presets vt-*) ---------- */` até a linha `@media (prefers-reduced-motion:reduce){*,*::before,*::after{…}}` inclusive (são cópias literais de `motion.css`). Mantenha os `@font-face` e as regras do painel.

Em `apps/admin/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preset = require('../../design-system/tailwind-preset.cjs');

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // (bloco atual de colors/fontFamily/borderRadius/boxShadow sem mudança)
    },
  },
  plugins: [],
};
export default config;
```

(o bloco `extend` atual fica idêntico; o preset só acrescenta chaves).

- [ ] **Step 4: Testes, lint e build**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint && pnpm --filter admin build`
Expected: todos PASS; build estático gerado.

- [ ] **Step 5: Sem regressão visual**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-visual.spec.ts`
Expected: 8 passed (os prints da Task 1 não mudam — prova de que a troca da cópia pelos tokens gerados é neutra).

- [ ] **Step 6: README**

Em `apps/admin/README.md`, seção de desenvolvimento, acrescente: "Tokens do DS chegam por `src/styles/tokens.css` (gerado; não edite) e pelo preset `design-system/tailwind-preset.cjs`. Depois de mudar `design-system/tokens/*.css`, rode `pnpm --filter @volti/design-system tokens:sync`."

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/app/layout.tsx apps/admin/src/app/globals.css apps/admin/tailwind.config.ts apps/admin/tests/tokens-wiring.test.ts apps/admin/README.md
git commit -m "refactor(admin): tokens e presets vt-* vêm do DS (fim da cópia manual)"
```

### Task 4: `volti_flutter` — tokens novos e teste de paridade com o CSS

**Depende da decisão 8.1** (`durExit` e `easeExit`).

**Files:**
- Modify: `packages/volti_flutter/lib/src/tokens/shadows.dart` (classe `VoltiMotion`)
- Modify: `packages/volti_flutter/lib/src/widgets/drag_dismiss.dart:35`
- Create: `packages/volti_flutter/test/tokens_parity_test.dart`
- Modify: `packages/volti_flutter/README.md`

**Interfaces:**
- Produces: `VoltiMotion.durExit` (`Duration(milliseconds: 160)`), `VoltiMotion.easeExit` (`Cubic(.4, 0, 1, 1)`), `VoltiMotion.springDrag` (`SpringDescription(mass: 1, stiffness: 520, damping: 34)`).

- [ ] **Step 1: Teste de paridade**

```dart
// packages/volti_flutter/test/tokens_parity_test.dart
import 'dart:io';

import 'package:flutter/animation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Map<String, String> _vars(String file) {
  final css = File('../../design-system/tokens/$file').readAsStringSync().replaceAll(RegExp(r'/\*[\s\S]*?\*/'), '');
  return {for (final m in RegExp(r'--([a-z0-9-]+)\s*:\s*([^;]+);').allMatches(css)) m[1]!: m[2]!.trim()};
}

Duration _ms(String v) => Duration(milliseconds: int.parse(v.replaceAll('ms', '')));
List<double> _bezier(String v) =>
    RegExp(r'cubic-bezier\(([^)]+)\)').firstMatch(v)![1]!.split(',').map((s) => double.parse(s.trim())).toList();
Color _hex(String v) => Color(int.parse('FF${v.substring(1)}', radix: 16));

void main() {
  final fx = _vars('effects.css');
  final colors = _vars('colors.css');

  test('durações iguais ao CSS', () {
    expect(VoltiMotion.durFast, _ms(fx['dur-fast']!));
    expect(VoltiMotion.durBase, _ms(fx['dur-base']!));
    expect(VoltiMotion.durSlow, _ms(fx['dur-slow']!));
    expect(VoltiMotion.durScreen, _ms(fx['dur-screen']!));
    expect(VoltiMotion.durSpring, _ms(fx['dur-spring']!));
    expect(VoltiMotion.durExit, _ms(fx['dur-exit']!));
  });

  test('curvas iguais ao CSS', () {
    final pairs = {'ease-out': VoltiMotion.easeOut, 'ease-spring': VoltiMotion.easeSpring, 'ease-in-out': VoltiMotion.easeInOut, 'ease-screen': VoltiMotion.easeScreen, 'ease-exit': VoltiMotion.easeExit};
    pairs.forEach((name, c) => expect([c.a, c.b, c.c, c.d], _bezier(fx[name]!), reason: name));
  });

  test('mola de arrastar igual ao CSS', () {
    final p = fx['spring-drag']!.split(' ').map(double.parse).toList();
    expect([VoltiMotion.springDrag.mass, VoltiMotion.springDrag.stiffness, VoltiMotion.springDrag.damping], p);
  });

  test('press scale igual ao CSS', () => expect(VoltiMotion.pressScale, double.parse(fx['press-scale']!)));

  test('cores iguais ao CSS', () {
    final pairs = <String, Color>{
      'green-50': VoltiColors.green50, 'green-500': VoltiColors.green500, 'green-700': VoltiColors.green700, 'green-900': VoltiColors.green900,
      'coral-500': VoltiColors.coral500, 'coral-600': VoltiColors.coral600, 'orange-500': VoltiColors.orange500, 'blue-500': VoltiColors.blue500,
      'ink-900': VoltiColors.ink900, 'ink-500': VoltiColors.ink500, 'ink-50': VoltiColors.ink50,
      'brand-action': VoltiColors.brandAction, 'warning-ink-strong': VoltiColors.warningInkStrong, 'danger-ink-strong': VoltiColors.dangerInkStrong,
    };
    pairs.forEach((name, c) => expect(c, _hex(colors[name]!), reason: name));
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run (em `packages/volti_flutter`): `C:/flutter/bin/flutter test test/tokens_parity_test.dart`
Expected: FAIL — `durExit`/`easeExit`/`springDrag` não definidos. (Se alguma cor existente falhar, o DS e o Dart já divergiam: corrija o lado Dart para o valor do CSS e registre no commit.)

- [ ] **Step 3: Tokens no Dart**

Em `VoltiMotion` (`shadows.dart`), depois de `durSpring`:

```dart
  /// Saídas (`--dur-exit`, 0,8x da entrada base) com `--ease-exit` (acelera ao sair).
  static const durExit = Duration(milliseconds: 160);
  static const easeExit = Cubic(.4, 0, 1, 1);

  /// Mola do arrastar (`--spring-drag`: massa 1, rigidez 520, amortecimento 34).
  static const springDrag = SpringDescription(mass: 1, stiffness: 520, damping: 34);
```

(acrescente `import 'package:flutter/physics.dart';` se `SpringDescription` não estiver importado). Em `drag_dismiss.dart:35`, troque `static const _spring = SpringDescription(mass: 1, stiffness: 520, damping: 34);` por `static const _spring = VoltiMotion.springDrag;`.

- [ ] **Step 4: Rodar tudo do pacote**

Run (em `packages/volti_flutter`): `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: sem issues; todos PASS.

- [ ] **Step 5: README e prints da fase**

Em `packages/volti_flutter/README.md`, seção de tokens: "`test/tokens_parity_test.dart` compara durações, curvas, mola e cores com `design-system/tokens/*.css`; mudou o CSS, mude o Dart." Rode o visual (`…fluidez-visual.spec.ts`, deve passar sem mudanças) — a Fase 1 não altera a aparência, então `docs/design/screenshots/fluidez/fase1/` não é necessário; registre isso no commit.

- [ ] **Step 6: Commit**

```bash
git add packages/volti_flutter
git commit -m "feat(volti_flutter): tokens de saída e mola do DS com teste de paridade CSS↔Dart"
```

---

# Fase 2 — Painel: presença com saída, navegação e microinterações (spec 4.2.1, 4.2.2, 4.2.6)

Entrega: painéis, diálogos e paleta saem animados; trocar de seção mostra esqueleto na hora e dados pré-buscados; estados de hover/press uniformes.

### Task 5: Máquina de presença, `usePresence`, `<Presence>` e keyframes de saída

**Depende da decisão 8.1** (`EXIT_MS` = 0,8 × duração de entrada).

**Files:**
- Create: `apps/admin/src/lib/presence.ts`
- Create: `apps/admin/src/components/Presence.tsx`
- Modify: `apps/admin/src/app/globals.css` (keyframes e classes de saída)
- Test: `apps/admin/tests/presence.test.ts`

**Interfaces:**
- Consumes: `useReducedMotion`, `motionDuration` de `@/lib/motion`.
- Produces:
  - `type PresencePhase = 'hidden' | 'shown' | 'exiting'`
  - `nextPhase(phase: PresencePhase, open: boolean): PresencePhase`
  - `EXIT_MS: { panel: 336; dialog: 256; scrim: 160 }`
  - `usePresence(open: boolean, exitMs: number): { mounted: boolean; exiting: boolean }`
  - `<Presence show: boolean; exitMs?: number>` e `useExiting(): boolean`
  - classes CSS `.panel-out`, `.vt-scrim`, `.vt-scrim-out`, `.vt-dialog`, `.vt-dialog-out`

- [ ] **Step 1: Teste**

```ts
// apps/admin/tests/presence.test.ts
import { describe, expect, it } from 'vitest';
import { EXIT_MS, nextPhase } from '@/lib/presence';

describe('presença', () => {
  it('abre de qualquer fase', () => {
    expect(nextPhase('hidden', true)).toBe('shown');
    expect(nextPhase('exiting', true)).toBe('shown'); // reabrir durante a saída cancela a saída
  });
  it('fechar só inicia saída a partir de mostrado', () => {
    expect(nextPhase('shown', false)).toBe('exiting');
    expect(nextPhase('hidden', false)).toBe('hidden');
    expect(nextPhase('exiting', false)).toBe('exiting');
  });
  it('saídas são 0,8x das entradas (painel 420, diálogo --dur-slow 320, scrim --dur-base 200)', () => {
    expect(EXIT_MS.panel).toBe(Math.round(420 * 0.8));
    expect(EXIT_MS.dialog).toBe(Math.round(320 * 0.8));
    expect(EXIT_MS.scrim).toBe(Math.round(200 * 0.8));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/presence.test.ts`
Expected: FAIL — `Cannot find module '@/lib/presence'`.

- [ ] **Step 3: Implementar**

```ts
// apps/admin/src/lib/presence.ts
'use client';

import { useEffect, useState } from 'react';
import { motionDuration, useReducedMotion } from './motion';

export type PresencePhase = 'hidden' | 'shown' | 'exiting';

/** Saídas = 0,8x da entrada (decisão 8.1): painel 420 ms, diálogo 320 ms (--dur-slow), scrim 200 ms (--dur-base). */
export const EXIT_MS = { panel: 336, dialog: 256, scrim: 160 } as const;

export function nextPhase(phase: PresencePhase, open: boolean): PresencePhase {
  if (open) return 'shown';
  return phase === 'shown' ? 'exiting' : phase;
}

/** Mantém montado durante `exitMs` depois de `open` virar `false` (zero com movimento reduzido). */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; exiting: boolean } {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<PresencePhase>(open ? 'shown' : 'hidden');
  useEffect(() => { setPhase((p) => nextPhase(p, open)); }, [open]);
  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(() => setPhase('hidden'), motionDuration(exitMs, reduced));
    return () => clearTimeout(t);
  }, [phase, exitMs, reduced]);
  return { mounted: open || phase !== 'hidden', exiting: !open && phase === 'exiting' };
}
```

```tsx
// apps/admin/src/components/Presence.tsx
'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { EXIT_MS, usePresence } from '@/lib/presence';

const ExitingCtx = createContext(false);
/** `true` enquanto o conteúdo envolto por `<Presence>` está saindo (SidePanel/Modal trocam a animação). */
export const useExiting = () => useContext(ExitingCtx);

/**
 * Para filhos montados condicionalmente pelo pai (`{selected && <VehicleSheet/>}`): guarda o último filho
 * e o mantém na tela durante a saída.
 */
export function Presence({ show, exitMs = EXIT_MS.panel, children }: { show: boolean; exitMs?: number; children: ReactNode }) {
  const last = useRef<ReactNode>(null);
  if (show) last.current = children;
  const { mounted, exiting } = usePresence(show, exitMs);
  if (!mounted) { last.current = null; return null; }
  return <ExitingCtx.Provider value={exiting}>{show ? children : last.current}</ExitingCtx.Provider>;
}
```

Em `globals.css`, junto de `.panel-in` (seção "Entradas"):

```css
/* Saídas (0,8x da entrada, --ease-exit); sem clique durante a saída */
.panel-out { animation: vt-panel-out 336ms var(--ease-exit) forwards; pointer-events: none; }
.vt-scrim { animation: vt-scrim-in var(--dur-base) var(--ease-out) backwards; }
.vt-scrim-out { animation: vt-scrim-out 160ms var(--ease-exit) forwards; pointer-events: none; }
.vt-dialog { animation: vt-dialog-in var(--dur-slow) var(--ease-screen) backwards; }
.vt-dialog-out { animation: vt-dialog-out 256ms var(--ease-exit) forwards; }
```

e junto dos keyframes do painel (`@keyframes vt-panel-in…`):

```css
@keyframes vt-panel-out{to{opacity:0;transform:translateX(28px)}}
@keyframes vt-scrim-out{to{opacity:0}}
@keyframes vt-dialog-out{to{opacity:0;transform:translateY(10px) scale(.97)}}
```

- [ ] **Step 4: Rodar**

Run: `pnpm --filter admin exec vitest run tests/presence.test.ts && pnpm --filter admin lint`
Expected: 3 PASS; lint limpo.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/presence.ts apps/admin/src/components/Presence.tsx apps/admin/src/app/globals.css apps/admin/tests/presence.test.ts
git commit -m "feat(admin): presença com saída (usePresence, Presence) e keyframes de saída"
```

### Task 6: Saída em SidePanel, Modal/ReasonDialog e CommandPalette

**Depende da decisão 8.1.**

**Files:**
- Modify: `apps/admin/src/components/ui.tsx` (`SidePanel` linhas 31–48; `Modal` linhas 172–214)
- Modify: `apps/admin/src/components/CommandPalette.tsx` (bloco `{open && (` linha 129)
- Modify: `apps/admin/src/app/(panel)/fleet/page.tsx:266`, `apps/admin/src/app/(panel)/customers/page.tsx:120`, `apps/admin/src/components/RentalsPanel.tsx:59`, `apps/admin/src/app/(panel)/team/page.tsx:63-64`
- Test: `apps/admin/e2e-mock/fluidez-presence.spec.ts`

**Interfaces:**
- Consumes: `usePresence`, `EXIT_MS` (Task 5), `Presence`, `useExiting` (Task 5), `login`, `mockFleet`, `blockTiles` (Task 1).
- Produces: `SidePanel` e `Modal` com saída; `data-exiting` no `<aside>`/diálogo durante a saída (usado pelos testes).

- [ ] **Step 1: Teste e2e (mockado)**

```ts
// apps/admin/e2e-mock/fluidez-presence.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

test.describe('fluidez: saídas', () => {
  test.beforeEach(async ({ page }) => { await blockTiles(page); await mockFleet(page, 20); await login(page, 'admin'); });

  test('ficha da moto sai animada e só então desmonta', async ({ page }) => {
    await page.goto('/fleet?view=list');
    await page.getByTestId('fleet-list').getByTestId('row').first().click();
    const sheet = page.getByTestId('vehicle-sheet');
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveAttribute('data-exiting', 'true');
    await expect(sheet).toHaveCount(0, { timeout: 1000 });
  });

  test('com movimento reduzido a ficha some de uma vez', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/fleet?view=list');
    await page.getByTestId('fleet-list').getByTestId('row').first().click();
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vehicle-sheet')).toHaveCount(0, { timeout: 150 });
  });

  test('paleta (Ctrl+K) sai animada', async ({ page }) => {
    await page.goto('/fleet');
    await page.keyboard.press('Control+k');
    const pal = page.getByTestId('command-palette');
    await expect(pal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pal).toHaveAttribute('data-exiting', 'true');
    await expect(pal).toHaveCount(0, { timeout: 1000 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-presence.spec.ts`
Expected: FAIL em `toHaveAttribute('data-exiting', 'true')` (hoje desmonta na hora).

- [ ] **Step 3: SidePanel**

```tsx
// ui.tsx — SidePanel
export function SidePanel({ children, width = 360, onClose, title, testId }: { children: ReactNode; width?: number; onClose?: () => void; title?: ReactNode; testId?: string }) {
  const exiting = useExiting();
  return (
    <aside
      data-testid={testId}
      data-exiting={exiting || undefined}
      aria-hidden={exiting || undefined}
      className={exiting ? 'side-panel panel-out' : 'side-panel panel-in'}
      style={{ width, flexShrink: 0, background: 'var(--surface-card)', borderLeft: '1px solid var(--border-subtle)', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {/* (conteúdo atual sem mudança) */}
    </aside>
  );
}
```

Acrescente `import { useExiting } from './Presence';` em `ui.tsx`.

- [ ] **Step 4: Modal (cobre ReasonDialog)**

No `Modal`, acrescente no início do corpo:

```tsx
  const ctxExiting = useExiting();
  const { mounted, exiting: selfExiting } = usePresence(open, EXIT_MS.dialog);
  const exiting = selfExiting || ctxExiting;
```

troque `if (!open) return null;` por `if (!mounted) return null;` e no JSX:

```tsx
    <div onClick={exiting ? undefined : onClose} className={exiting ? 'vt-scrim vt-scrim-out' : 'vt-scrim'}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'var(--surface-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid={testId} data-exiting={exiting || undefined}
        className={exiting ? 'vt-dialog vt-dialog-out' : 'vt-dialog'} onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 24, boxShadow: 'var(--shadow-2)', display: 'flex', flexDirection: 'column', gap: 14, outline: 'none' }}>
```

(as propriedades `animation:` inline saem; o efeito de foco/Esc continua dependendo só de `open`). Acrescente `import { EXIT_MS, usePresence } from '@/lib/presence';`.

- [ ] **Step 5: CommandPalette**

```tsx
  const { mounted, exiting } = usePresence(open, EXIT_MS.dialog);
  // …
      {mounted && (
        <div onMouseDown={exiting ? undefined : close} className={exiting ? 'vt-scrim vt-scrim-out' : 'vt-scrim'}
          style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'var(--surface-scrim)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12vh 16px 16px' }}>
          <div role="dialog" aria-modal="true" aria-label="Buscar" data-testid="command-palette" data-exiting={exiting || undefined}
            className={exiting ? 'vt-dialog vt-dialog-out' : 'vt-dialog'} onMouseDown={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 600, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
```

- [ ] **Step 6: Pais que montam condicionalmente**

```tsx
// fleet/page.tsx:266
<Presence show={!!selected}>{selected && <VehicleSheet vehicleId={selected} onClose={() => select(null)} onReplay={() => setReplay((r) => !r)} replayActive={replay} />}</Presence>
// customers/page.tsx:120
<Presence show={!!selected}>{selected && <CustomerSheet id={selected} onClose={() => onSelect(null)} onRentals={onRentals} onChat={onChat} />}</Presence>
// RentalsPanel.tsx:59
<Presence show={!!selectedId}>{selectedId && <RentalDetail id={selectedId} onClose={() => onSelect(null)} />}</Presence>
// team/page.tsx:63-64
<Presence show={invite} exitMs={EXIT_MS.dialog}>{invite && <StaffModal onClose={() => setInvite(false)} onSaved={() => { toast('Convite enviado'); qc.invalidateQueries({ queryKey: ['staff'] }); }} />}</Presence>
<Presence show={!!edit} exitMs={EXIT_MS.dialog}>{edit && <StaffModal user={edit} onClose={() => setEdit(null)} onSaved={() => { toast('Acesso atualizado'); qc.invalidateQueries({ queryKey: ['staff'] }); }} />}</Presence>
```

com `import { Presence } from '@/components/Presence';` (e `EXIT_MS` de `@/lib/presence` no team). Procure outros `{x && <Modal`/`{x && <…Dialog` com `grep -rn "&& <[A-Z][A-Za-z]*\(Modal\|Dialog\)" apps/admin/src` e envolva do mesmo jeito.

- [ ] **Step 7: Rodar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-presence.spec.ts e2e-mock/fluidez-visual.spec.ts && pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: 3 + 8 passed; vitest e lint limpos.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src apps/admin/e2e-mock/fluidez-presence.spec.ts
git commit -m "feat(admin): painéis laterais, diálogos e paleta com animação de saída"
```

### Task 7: Navegação — prefetch no menu, esqueleto imediato e item pendente

**Files:**
- Create: `apps/admin/src/lib/section-prefetch.ts`
- Modify: `apps/admin/src/ds/SideNav.tsx` (prop `onHover`)
- Modify: `apps/admin/src/app/(panel)/layout.tsx` (transição, prefetch, fallback)
- Modify: `apps/admin/src/app/(panel)/tasks/page.tsx:57`, `apps/admin/src/app/(panel)/zones/page.tsx:56`, `apps/admin/src/app/(panel)/settings/page.tsx:31` (usam as consultas compartilhadas)
- Modify: `apps/admin/src/app/globals.css` (barra de progresso da navegação)
- Test: `apps/admin/tests/section-prefetch.test.ts`, `apps/admin/e2e-mock/fluidez-nav.spec.ts`

**Interfaces:**
- Consumes: `api`, `unwrap` de `@/lib/api`.
- Produces: `fieldTasksQuery()`, `zonesQuery()`, `plansQuery()`, `alertsFirstPageQuery(tab: 'open' | string)` — cada um `{ queryKey: QueryKey; queryFn: () => Promise<unknown> }`; `prefetchSection(qc: QueryClient, href: string): void`; `SideNav` aceita `onHover?: (value: string) => void`.

- [ ] **Step 1: Teste unitário**

```ts
// apps/admin/tests/section-prefetch.test.ts
import { describe, expect, it, vi } from 'vitest';
import { alertsFirstPageQuery, fieldTasksQuery, plansQuery, prefetchSection, zonesQuery } from '@/lib/section-prefetch';

describe('prefetch por seção', () => {
  it('chaves iguais às das páginas', () => {
    // usePagedQuery monta [...key, cursor ?? 'first'] com key = ['alerts', tab]
    expect(alertsFirstPageQuery('open').queryKey).toEqual(['alerts', 'open', 'first']);
    expect(fieldTasksQuery().queryKey).toEqual(['field-tasks']);
    expect(zonesQuery().queryKey).toEqual(['zones']);
    expect(plansQuery().queryKey).toEqual(['plans']);
  });
  it('pré-busca a seção pelo href (com ou sem barra final) e ignora as sem mapa', () => {
    const qc = { prefetchQuery: vi.fn().mockResolvedValue(undefined) };
    prefetchSection(qc as never, '/alerts/');
    prefetchSection(qc as never, '/zones');
    prefetchSection(qc as never, '/team');
    expect(qc.prefetchQuery).toHaveBeenCalledTimes(2);
    expect(qc.prefetchQuery.mock.calls[0][0]).toMatchObject({ queryKey: ['alerts', 'open', 'first'], staleTime: 10_000 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/section-prefetch.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar consultas compartilhadas**

```ts
// apps/admin/src/lib/section-prefetch.ts
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { api, unwrap } from './api';

export interface SectionQuery { queryKey: QueryKey; queryFn: () => Promise<unknown> }

export const fieldTasksQuery = () => ({ queryKey: ['field-tasks'] as QueryKey, queryFn: () => unwrap(api.GET('/field-tasks', { params: { query: { limit: 100 } } })) });
export const zonesQuery = () => ({ queryKey: ['zones'] as QueryKey, queryFn: () => unwrap(api.GET('/zones')) });
export const plansQuery = () => ({ queryKey: ['plans'] as QueryKey, queryFn: () => unwrap(api.GET('/pricing/plans')) });
/** Primeira página da fila de alertas, com a mesma chave que `usePagedQuery(['alerts', tab])` usa. */
export const alertsFirstPageQuery = (tab: string) => ({
  queryKey: ['alerts', tab, 'first'] as QueryKey,
  queryFn: () => unwrap(api.GET('/alerts', { params: { query: { status: tab as never, limit: 20 } } })),
});

const SECTIONS: Record<string, () => SectionQuery[]> = {
  '/alerts': () => [alertsFirstPageQuery('open')],
  '/tasks': () => [fieldTasksQuery()],
  '/zones': () => [zonesQuery()],
  '/settings': () => [plansQuery()],
};

/** Chamado no hover/foco do item do menu: os dados costumam estar no cache quando o clique chega. */
export function prefetchSection(qc: Pick<QueryClient, 'prefetchQuery'>, href: string): void {
  const key = href.replace(/\/+$/, '') || '/';
  for (const q of SECTIONS[key]?.() ?? []) void qc.prefetchQuery({ ...q, staleTime: 10_000 });
}
```

Use nas páginas (mesma consulta, sem duplicar a função):

```ts
// tasks/page.tsx:57
const q = useQuery({ ...fieldTasksQuery(), refetchInterval: 20_000 });
// zones/page.tsx:56
const zonesQ = useQuery(zonesQuery());
// settings/page.tsx:31
const plans = useQuery(plansQuery());
```

(os tipos de `data` saem do `queryFn`; se o TS reclamar de `unknown`, tipe o retorno: `queryFn: () => unwrap(...)` já carrega o tipo — mantenha `as QueryKey` só na chave).

- [ ] **Step 4: SideNav com hover/foco**

Em `SideNav`, assinatura: `{ items = [], value, onChange, onHover, footer, brand = 'volti', style }: { …; onHover?: (v: string) => void; … }` e no `<button>`:

```tsx
            onMouseEnter={onHover ? () => onHover(it.value) : undefined}
            onFocus={onHover ? () => onHover(it.value) : undefined}
```

- [ ] **Step 5: Layout — transição, item pendente e esqueleto**

```tsx
// (panel)/layout.tsx
import { Suspense, useEffect, useState, useTransition, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchSection } from '@/lib/section-prefetch';
import { PanelSkeleton } from '@/components/ui';
// …dentro de PanelLayout:
  const qc = useQueryClient();
  const [navPending, startNav] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => { if (!navPending) setTarget(null); }, [navPending]);
// …no SideNav:
        value={target ?? current?.href}
        onHover={(href: string) => prefetchSection(qc, href)}
        onChange={(href: string) => { setTarget(href); prefetchSection(qc, href); startNav(() => router.push(href)); }}
// …logo abaixo do <header>:
        <div className="nav-progress" data-active={navPending || undefined} aria-hidden />
// …troque o fallback do Suspense:
            <Suspense fallback={<div style={{ flex: 1, padding: 28 }}><PanelSkeleton rows={8} /></div>}>{children}</Suspense>
```

Em `globals.css`:

```css
/* Navegação entre seções: barra fina enquanto a transição do router está pendente */
.nav-progress { height: 2px; background: var(--brand); transform-origin: left; transform: scaleX(0); opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
.nav-progress[data-active] { opacity: 1; animation: vt-nav-progress 1.2s var(--ease-out) forwards; }
@keyframes vt-nav-progress { from { transform: scaleX(0); } to { transform: scaleX(.85); } }
@media (prefers-reduced-motion: reduce) { .nav-progress[data-active] { animation: none; transform: scaleX(.85); } }
```

- [ ] **Step 6: Teste e2e da pré-busca**

```ts
// apps/admin/e2e-mock/fluidez-nav.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

test('hover no menu pré-busca a seção antes do clique', async ({ page }) => {
  await blockTiles(page); await mockFleet(page, 10); await login(page, 'admin');
  await page.goto('/fleet');
  const req = page.waitForRequest((r) => /\/alerts\?/.test(r.url()) && r.method() === 'GET');
  await page.getByRole('button', { name: /^Alertas/ }).hover();
  await req;
  await page.getByRole('button', { name: /^Alertas/ }).click();
  await expect(page.getByRole('button', { name: /^Alertas/ })).toHaveAttribute('aria-current', 'page');
});
```

- [ ] **Step 7: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-nav.spec.ts e2e-mock/fluidez-visual.spec.ts && pnpm --filter admin lint`
Expected: todos PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src apps/admin/tests/section-prefetch.test.ts apps/admin/e2e-mock/fluidez-nav.spec.ts
git commit -m "feat(admin): navegação com prefetch no menu, item pendente e esqueleto imediato"
```

### Task 8: Microinterações uniformes (classes de movimento, hover, cascata) e fechamento da Fase 2

**Files:**
- Modify: `apps/admin/src/components/ui.tsx` (`ToastProvider` linha ~322; `DataTable` `<tbody>` linha 358)
- Modify: `apps/admin/src/ds/Button.tsx:22-23`, `apps/admin/src/ds/IconButton.tsx:19`
- Modify: `apps/admin/src/app/globals.css`
- Test: `apps/admin/tests/motion-classes.test.ts`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Produces: classes `.vt-toast-enter`, `.vt-toast-leave`, `.vt-hover` (hover uniforme), `.vt-stagger` aplicada ao `<tbody>` do `DataTable`.

- [ ] **Step 1: Teste**

```ts
// apps/admin/tests/motion-classes.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = (p: string) => readFileSync(path.resolve(__dirname, '../src', p), 'utf8');

describe('movimento por classes geradas dos tokens', () => {
  it('nenhuma animação vt-* inline em ui.tsx e CommandPalette', () => {
    for (const f of ['components/ui.tsx', 'components/CommandPalette.tsx']) expect(src(f)).not.toMatch(/animation:\s*['`]vt-/);
  });
  it('classes existem no CSS', () => {
    const g = src('app/globals.css');
    for (const c of ['.vt-toast-enter', '.vt-toast-leave', '.vt-hover', '.vt-dialog', '.vt-scrim']) expect(g).toContain(c);
  });
  it('tabelas entram em cascata', () => {
    expect(src('components/ui.tsx')).toMatch(/<tbody className="vt-stagger"/);
  });
  it('botões não fixam filter inline fora do press (o hover da classe precisa valer)', () => {
    expect(src('ds/Button.tsx')).not.toMatch(/filter: p && !disabled \? 'brightness\(\.94\)' : 'none'/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/motion-classes.test.ts`
Expected: FAIL (toast ainda usa `animation:` inline; classes ausentes).

- [ ] **Step 3: Implementar**

`globals.css`:

```css
/* Microinterações (tokens do DS) */
.vt-toast-enter { animation: vt-toast-in var(--dur-slow) var(--ease-spring) backwards; }
.vt-toast-leave { animation: vt-toast-out 200ms var(--ease-exit) forwards; }
.vt-hover { transition: filter var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out); }
.vt-hover:not(:disabled):hover { filter: brightness(1.05); }
```

`ToastProvider` (no `map` dos toasts): troque `style={{ width: '100%', pointerEvents: 'auto', animation: t.leaving ? … : … }}` por `className={t.leaving ? 'vt-toast-leave' : 'vt-toast-enter'} style={{ width: '100%', pointerEvents: 'auto' }}`.

`DataTable`: `<tbody className="vt-stagger" style={{ opacity: refetching ? 0.55 : 1, transition: 'opacity var(--dur-base) var(--ease-out)' }}>` (as linhas só animam ao montar; atualização ao vivo não remonta a linha, então não pisca).

`Button.tsx:22`: `filter: p && !disabled ? 'brightness(.94)' : undefined,` e acrescente `className="vt-hover"` ao `<button>` (concatenando com `className` existente se houver). `IconButton.tsx`: acrescente `className="vt-hover"`.

- [ ] **Step 4: Rodar tudo e atualizar prints**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint && pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/`
Expected: vitest/lint PASS; specs de fluidez PASS. Se `fluidez-visual` acusar diferença só por hover/estado inicial, confira o diff em `test-results/` e, se for a mudança esperada, rode com `--update-snapshots`.

- [ ] **Step 5: Prints "depois" da Fase 2 e README**

Grave um vídeo curto ou sequência de prints (abrir/fechar ficha, Ctrl+K) com `SHOTS_DIR=docs/design/screenshots/fluidez/fase2` usando a spec de presença (acrescente `await page.screenshot({ path: … })` local, sem commitar a alteração da spec) e salve os PNGs. Em `apps/admin/README.md`, acrescente uma seção "Movimento": entradas e saídas (`Presence`, `usePresence`, `EXIT_MS`), prefetch do menu (`section-prefetch.ts`), classes `.vt-*` e como rodar `e2e-mock/fluidez-*.spec.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/admin docs/design/screenshots/fluidez/fase2
git commit -m "feat(admin): microinterações por classes do DS e cascata nas tabelas"
```

---

# Fase 3 — Painel: realtime, mapa, listas e atualizações otimistas (spec 4.2.3, 4.2.4, 4.2.5)

Entrega: lotes de telemetria só re-renderizam quem mudou; mapa recalcula só as features alteradas; comando sem polling com socket conectado; frota carrega em paralelo; lista virtualizada; ações frequentes respondem na hora com rollback.

### Task 9: Store externo da frota

**Files:**
- Create: `apps/admin/src/lib/fleet-store.ts`
- Test: `apps/admin/tests/fleet-store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Vehicle = S<'Vehicle'>;
  interface FleetCounts { total: number; offline: number; byStatus: Partial<Record<S<'VehicleStatus'>, number>> }
  interface FleetStore {
    setBase(list: readonly Vehicle[]): void;        // dados do GET /vehicles; descarta patches antigos
    queue(id: string, patch: Partial<Vehicle>): void; // evento ao vivo; aplicado no próximo flush
    flush(): Set<string>;                            // ids alterados; notifica assinantes só se houve mudança
    getVehicles(): readonly Vehicle[];               // mesma referência entre flushes
    getVehicle(id: string): Vehicle | undefined;     // mesma referência enquanto a moto não muda
    getCounts(): FleetCounts;                        // mesma referência enquanto os números não mudam
    subscribe(fn: () => void): () => void;
  }
  function createFleetStore(): FleetStore;
  ```

- [ ] **Step 1: Teste**

```ts
// apps/admin/tests/fleet-store.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createFleetStore } from '@/lib/fleet-store';

const v = (id: string, status = 'free', lat = 0) => ({ id, code: id, status, lat, lng: 0, batteryPct: 50 }) as never;

describe('store da frota', () => {
  it('flush aplica só os patches e preserva a referência das motos que não mudaram', () => {
    const s = createFleetStore();
    s.setBase([v('a'), v('b')]);
    const [a0, b0] = s.getVehicles();
    s.queue('a', { lat: 1 });
    s.queue('a', { batteryPct: 40 });
    expect([...s.flush()]).toEqual(['a']);
    const [a1, b1] = s.getVehicles();
    expect(a1).not.toBe(a0);
    expect(a1).toMatchObject({ lat: 1, batteryPct: 40 });
    expect(b1).toBe(b0);
    expect(s.getVehicle('b')).toBe(b0);
  });
  it('flush sem pendências não notifica e não troca a lista', () => {
    const s = createFleetStore();
    s.setBase([v('a')]);
    const list = s.getVehicles();
    const fn = vi.fn();
    s.subscribe(fn);
    expect(s.flush().size).toBe(0);
    expect(fn).not.toHaveBeenCalled();
    expect(s.getVehicles()).toBe(list);
  });
  it('ids desconhecidos são ignorados', () => {
    const s = createFleetStore();
    s.setBase([v('a')]);
    s.queue('zzz', { lat: 9 });
    expect(s.flush().size).toBe(0);
  });
  it('contagens mantêm a referência quando os números não mudam', () => {
    const s = createFleetStore();
    s.setBase([v('a', 'free'), v('b', 'offline')]);
    const c0 = s.getCounts();
    expect(c0).toEqual({ total: 2, offline: 1, byStatus: { free: 1, offline: 1 } });
    s.queue('a', { lat: 5 });
    s.flush();
    expect(s.getCounts()).toBe(c0);
    s.queue('a', { status: 'offline' } as never);
    s.flush();
    expect(s.getCounts()).toEqual({ total: 2, offline: 2, byStatus: { offline: 2 } });
  });
  it('setBase notifica e cancela a desinscrição corretamente', () => {
    const s = createFleetStore();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.setBase([v('a')]);
    off();
    s.setBase([v('b')]);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/fleet-store.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// apps/admin/src/lib/fleet-store.ts
import type { S } from './types';

type Vehicle = S<'Vehicle'>;
export interface FleetCounts { total: number; offline: number; byStatus: Partial<Record<S<'VehicleStatus'>, number>> }
export interface FleetStore {
  setBase(list: readonly Vehicle[]): void;
  queue(id: string, patch: Partial<Vehicle>): void;
  flush(): Set<string>;
  getVehicles(): readonly Vehicle[];
  getVehicle(id: string): Vehicle | undefined;
  getCounts(): FleetCounts;
  subscribe(fn: () => void): () => void;
}

function countOf(list: readonly Vehicle[]): FleetCounts {
  const byStatus: FleetCounts['byStatus'] = {};
  for (const v of list) byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
  return { total: list.length, offline: byStatus.offline ?? 0, byStatus };
}

function sameCounts(a: FleetCounts, b: FleetCounts): boolean {
  if (a.total !== b.total || a.offline !== b.offline) return false;
  const ka = Object.keys(a.byStatus);
  return ka.length === Object.keys(b.byStatus).length && ka.every((k) => a.byStatus[k as never] === b.byStatus[k as never]);
}

/**
 * Estado ao vivo da frota fora do React (lido com useSyncExternalStore). Os eventos entram por `queue` e são
 * aplicados em lote por `flush` (o provider chama a cada 500 ms). Motos que não mudaram mantêm a referência,
 * então seletores por moto e o cache de features do mapa só recalculam o que mudou.
 */
export function createFleetStore(): FleetStore {
  let list: readonly Vehicle[] = [];
  let byId = new Map<string, Vehicle>();
  let counts: FleetCounts = countOf([]);
  let pending = new Map<string, Partial<Vehicle>>();
  const subs = new Set<() => void>();

  const commit = (next: readonly Vehicle[]) => {
    list = next;
    byId = new Map(next.map((v) => [v.id, v]));
    const c = countOf(next);
    if (!sameCounts(c, counts)) counts = c;
    subs.forEach((f) => f());
  };

  return {
    setBase(next) { pending = new Map(); commit([...next]); },
    queue(id, patch) { pending.set(id, { ...pending.get(id), ...patch }); },
    flush() {
      const changed = new Set<string>();
      if (pending.size === 0) return changed;
      const p = pending;
      pending = new Map();
      const next = list.map((v) => {
        const patch = p.get(v.id);
        if (!patch) return v;
        changed.add(v.id);
        return { ...v, ...patch };
      });
      if (changed.size) commit(next);
      return changed;
    },
    getVehicles: () => list,
    getVehicle: (id) => byId.get(id),
    getCounts: () => counts,
    subscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
  };
}
```

- [ ] **Step 4: Rodar**

Run: `pnpm --filter admin exec vitest run tests/fleet-store.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/fleet-store.ts apps/admin/tests/fleet-store.test.ts
git commit -m "feat(admin): store externo da frota com lotes e referências estáveis"
```

### Task 10: RealtimeProvider sobre o store e migração dos consumidores

**Files:**
- Modify: `apps/admin/src/lib/realtime.tsx`
- Modify: `apps/admin/src/app/(panel)/layout.tsx` (badge da frota, `CriticalAlertToaster`, `CommandPalette`)
- Modify: `apps/admin/src/components/CommandPalette.tsx` (sem prop `vehicles`)
- Modify: `apps/admin/src/components/VehicleSheet.tsx:37,57` (`useFleetVehicle`)
- Modify: `apps/admin/src/app/(panel)/fleet/page.tsx:50`
- Modify: `apps/admin/src/app/(panel)/customers/page.tsx:338`
- Test: `apps/admin/tests/realtime-consumers.test.ts`

**Interfaces:**
- Consumes: `createFleetStore`, `FleetStore`, `FleetCounts` (Task 9).
- Produces: `useFleetStore(): FleetStore`, `useFleetVehicles(): readonly FleetVehicle[]`, `useFleetVehicle(id: string | null | undefined): FleetVehicle | undefined`, `useFleetCounts(): FleetCounts`; `useRealtime()` passa a devolver `{ connected, vehiclesReady, openAlerts, on }` (sem `vehicles`); `window.__voltiFleet` exposto (como `window.__voltiMap`) para os testes de desempenho da Task 17.

- [ ] **Step 1: Teste estático de migração**

```ts
// apps/admin/tests/realtime-consumers.test.ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../src');
const files = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []; });

describe('consumidores do tempo real', () => {
  it('ninguém lê a frota inteira do contexto (useRealtime().vehicles)', () => {
    const bad = files(root).filter((f) => /vehicles[^\n]*\}\s*=\s*useRealtime\(\)/.test(readFileSync(f, 'utf8')));
    expect(bad.map((f) => path.relative(root, f))).toEqual([]);
  });
  it('a ficha da moto assina só a própria moto', () => {
    expect(readFileSync(path.join(root, 'components/VehicleSheet.tsx'), 'utf8')).toMatch(/useFleetVehicle\(vehicleId\)/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/realtime-consumers.test.ts`
Expected: FAIL listando `app/(panel)/layout.tsx`, `fleet/page.tsx`, `customers/page.tsx`, `components/VehicleSheet.tsx`.

- [ ] **Step 3: Provider com store**

Em `realtime.tsx`:

```tsx
import { useSyncExternalStore } from 'react';
import { createFleetStore, type FleetCounts, type FleetStore } from './fleet-store';

declare global { interface Window { __voltiFleet?: FleetStore } }

interface RealtimeState {
  connected: boolean;
  vehiclesReady: boolean;
  openAlerts: number;
  on: <K extends keyof RealtimeEvents>(event: K, handler: Handler<K>) => () => void;
}
const StoreCtx = createContext<FleetStore | null>(null);
```

No `RealtimeProvider`: troque `overrides`/`pending` por `const [store] = useState(createFleetStore);` e

```tsx
  useEffect(() => { if (typeof window !== 'undefined') window.__voltiFleet = store; }, [store]);
  useEffect(() => { if (vq.data) store.setBase(vq.data); }, [vq.data, store]);
  // Lote de 500 ms: um flush por intervalo; só quem lê motos alteradas re-renderiza.
  useEffect(() => { const t = setInterval(() => store.flush(), 500); return () => clearInterval(t); }, [store]);
```

nos handlers do socket: `store.queue(p.vehicleId, { lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, batteryPct: p.batteryPct, status: p.status, speedLimitKmh: p.speedLimitKmh, lastSeenAt: p.ts });` e `store.queue(p.vehicleId, { status: p.status });`. Remova o `useMemo` de `vehicles`; `value` vira `{ connected, vehiclesReady: vq.isSuccess, openAlerts: (aq.data ?? 0) + alertDelta, on }`; renderize `<StoreCtx.Provider value={store}><Ctx.Provider value={value}>{children}</Ctx.Provider></StoreCtx.Provider>`. Hooks novos:

```tsx
export function useFleetStore(): FleetStore {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useFleetStore fora do RealtimeProvider');
  return s;
}
export function useFleetVehicles() {
  const s = useFleetStore();
  return useSyncExternalStore(s.subscribe, s.getVehicles, s.getVehicles);
}
export function useFleetVehicle(id: string | null | undefined) {
  const s = useFleetStore();
  const get = useCallback(() => (id ? s.getVehicle(id) : undefined), [s, id]);
  return useSyncExternalStore(s.subscribe, get, get);
}
export function useFleetCounts(): FleetCounts {
  const s = useFleetStore();
  return useSyncExternalStore(s.subscribe, s.getCounts, s.getCounts);
}
```

- [ ] **Step 4: Migrar consumidores**

- `layout.tsx`: `const { vehiclesReady, openAlerts, connected } = useRealtime(); const counts = useFleetCounts(); const store = useFleetStore();` — badge: `{counts.total} motos · {counts.offline} sem sinal`, `offline = counts.offline`; `<CriticalAlertToaster store={store} …/>` com `const code = p.vehicleId ? store.getVehicle(p.vehicleId)?.code : undefined;`; `<CommandPalette menu={menu} />`.
- `CommandPalette.tsx`: remova a prop `vehicles`; `const store = useFleetStore();` e onde os resultados são calculados troque `vehicles` por `store.getVehicles()` dentro do `useMemo` (deps `[q, open, store]`) — a paleta não assina o store, só lê ao digitar.
- `VehicleSheet.tsx`: remova `const { vehicles } = useRealtime();` e `const live = vehicles.find(...)`; use `const live = useFleetVehicle(vehicleId);` (mantenha `useRealtime()` só para `connected`, usado na Task 12).
- `fleet/page.tsx:50`: `const vehicles = useFleetVehicles(); const { openAlerts } = useRealtime();` (o resto da página continua usando `vehicles`; `useMemo` de `shown`/`counts` passa a recalcular só quando a lista muda de verdade).
- `customers/page.tsx:338`: `const store = useFleetStore();` e `store.getVehicles().find((v) => v.assignedSubscriptionId === subscriptionId)?.code`.

- [ ] **Step 5: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint && pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/`
Expected: todos PASS (o `tsc --noEmit` do lint garante que ninguém ficou lendo `useRealtime().vehicles`).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src apps/admin/tests/realtime-consumers.test.ts
git commit -m "perf(admin): tempo real por store externo com seletores (sem re-render global)"
```

### Task 11: Mapa por delta — cache de features

**Files:**
- Create: `apps/admin/src/lib/fleet-features.ts`
- Modify: `apps/admin/src/app/(panel)/fleet/page.tsx` (função `toFeatures` no topo e efeito "Posições", ~linhas 160–180)
- Test: `apps/admin/tests/fleet-features.test.ts`

**Interfaces:**
- Consumes: `batteryHex` de `@/lib/map-anim`; `interpolatePositions` (devolve a mesma referência para motos paradas).
- Produces: `toFeature(v: FleetVehicle): GeoJSON.Feature<GeoJSON.Point>`; `createFeatureCache(make?: typeof toFeature): { collection(list: readonly FleetVehicle[]): GeoJSON.FeatureCollection<GeoJSON.Point> }`.

- [ ] **Step 1: Teste**

```ts
// apps/admin/tests/fleet-features.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createFeatureCache, toFeature } from '@/lib/fleet-features';

const v = (id: string, lng = 0) => ({ id, code: id, status: 'free', lat: 0, lng, batteryPct: 80 }) as never;

describe('cache de features do mapa', () => {
  it('feature tem id, status e cor do anel de bateria', () => {
    expect(toFeature(v('a', 1))).toMatchObject({ geometry: { coordinates: [1, 0] }, properties: { id: 'a', status: 'free', battery: 80, batteryColor: '#34C25C' } });
  });
  it('reaproveita a feature quando a moto é o mesmo objeto; recria só as alteradas', () => {
    const make = vi.fn(toFeature);
    const cache = createFeatureCache(make);
    const a = v('a'); const b = v('b');
    const c1 = cache.collection([a, b]);
    const b2 = { ...(b as object), lng: 2 } as never;
    const c2 = cache.collection([a, b2]);
    expect(make).toHaveBeenCalledTimes(3);
    expect(c2.features[0]).toBe(c1.features[0]);
    expect(c2.features[1]).not.toBe(c1.features[1]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/fleet-features.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// apps/admin/src/lib/fleet-features.ts
import type { FleetVehicle } from './realtime';
import { batteryHex } from './map-anim';

export function toFeature(v: FleetVehicle): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
    properties: { id: v.id, code: v.code, status: v.status, battery: v.batteryPct, batteryColor: batteryHex(v.batteryPct) },
  };
}

/**
 * Feature por objeto de moto (WeakMap): o store mantém a referência das motos que não mudaram e o
 * `interpolatePositions` só cria objeto novo para as que estão deslizando, então cada quadro recalcula
 * apenas essas. Continua um `setData` por quadro (cluster do MapLibre exige a coleção inteira).
 */
export function createFeatureCache(make: typeof toFeature = toFeature) {
  const cache = new WeakMap<FleetVehicle, GeoJSON.Feature<GeoJSON.Point>>();
  return {
    collection(list: readonly FleetVehicle[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
      return {
        type: 'FeatureCollection',
        features: list.map((v) => {
          let f = cache.get(v);
          if (!f) { f = make(v); cache.set(v, f); }
          return f;
        }),
      };
    },
  };
}
```

Em `fleet/page.tsx`: apague a função local `toFeatures` (o corpo está em `toFeature`), acrescente `const featureCache = useRef(createFeatureCache());` junto dos outros refs e, no efeito "Posições", troque `src.setData(toFeatures(list));` por `src.setData(featureCache.current.collection(list));`. `shown` precisa vir de `useFleetVehicles()` (Task 10) para manter as referências.

- [ ] **Step 4: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/fleet-features.ts apps/admin/src/app/(panel)/fleet/page.tsx apps/admin/tests/fleet-features.test.ts
git commit -m "perf(admin): mapa recalcula só as features das motos que mudaram"
```

### Task 12: Comando pendente sem polling quando o socket está conectado

**Files:**
- Modify: `apps/admin/src/lib/command-steps.ts`
- Modify: `apps/admin/src/components/VehicleSheet.tsx` (efeito "Fallback por consulta", linhas 95–108)
- Test: `apps/admin/tests/command-steps.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `useRealtime().connected` (Task 10).
- Produces: `COMMAND_FALLBACK_POLL_MS = 5000`; `commandPollMs(status: CommandStatus | undefined, connected: boolean): number | null`.

- [ ] **Step 1: Teste**

Acrescente a `apps/admin/tests/command-steps.test.ts`:

```ts
import { COMMAND_FALLBACK_POLL_MS, commandPollMs } from '@/lib/command-steps';

describe('polling de reserva do comando', () => {
  it('com socket conectado não consulta (command.updated chega pelo socket)', () => {
    expect(commandPollMs('pending', true)).toBeNull();
    expect(commandPollMs('in_progress', true)).toBeNull();
  });
  it('socket caído: consulta a cada 5 s enquanto pendente', () => {
    expect(commandPollMs('pending', false)).toBe(COMMAND_FALLBACK_POLL_MS);
    expect(commandPollMs('in_progress', false)).toBe(5000);
  });
  it('comando terminado ou ausente: nada', () => {
    expect(commandPollMs('confirmed', false)).toBeNull();
    expect(commandPollMs('failed', false)).toBeNull();
    expect(commandPollMs(undefined, false)).toBeNull();
  });
});
```

(se o arquivo não importa `describe/it/expect`, eles já vêm do `import { describe, expect, it } from 'vitest'` do topo.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/command-steps.test.ts`
Expected: FAIL — `commandPollMs` não exportado.

- [ ] **Step 3: Implementar**

```ts
// command-steps.ts
/** Só com o socket caído: a transição chega por `command.updated` (realtime.md). */
export const COMMAND_FALLBACK_POLL_MS = 5000;
export function commandPollMs(status: CommandStatus | undefined, connected: boolean): number | null {
  if (status !== 'pending' && status !== 'in_progress') return null;
  return connected ? null : COMMAND_FALLBACK_POLL_MS;
}
```

Em `VehicleSheet.tsx`, troque o efeito de fallback por:

```tsx
  const { connected } = useRealtime();
  const pendingId = active && (active.status === 'pending' || active.status === 'in_progress') ? active.id : null;
  const pollMs = commandPollMs(active?.status, connected);
  const refreshCommand = useCallback(async (id: string) => {
    try {
      const c = await unwrap(api.GET('/commands/{id}', { params: { path: { id } } }));
      setActive((a) => (a && a.id === c.id ? { ...a, status: c.status, reason: c.statusReason } : a));
      if (c.status === 'confirmed' || c.status === 'failed') qc.invalidateQueries({ queryKey: ['vehicle-commands', vehicleId] });
    } catch { /* mantém o último estado */ }
  }, [qc, vehicleId]);
  // Socket caído: consulta de reserva.
  useEffect(() => {
    if (!pendingId || pollMs === null) return;
    const t = setInterval(() => void refreshCommand(pendingId), pollMs);
    return () => clearInterval(t);
  }, [pendingId, pollMs, refreshCommand]);
  // Reconectou com comando pendente: uma consulta (eventos da queda não são reenviados — realtime.md, Reconexão).
  const wasConnected = useRef(connected);
  useEffect(() => {
    if (connected && !wasConnected.current && pendingId) void refreshCommand(pendingId);
    wasConnected.current = connected;
  }, [connected, pendingId, refreshCommand]);
```

(imports: `useCallback` do React, `commandPollMs` de `@/lib/command-steps`.)

- [ ] **Step 4: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/command-steps.ts apps/admin/src/components/VehicleSheet.tsx apps/admin/tests/command-steps.test.ts
git commit -m "perf(admin): ficha da moto usa command.updated; polling só com socket caído"
```

### Task 13: Carga inicial da frota em paralelo (por status)

**Files:**
- Modify: `apps/admin/src/lib/paging.ts`
- Modify: `apps/admin/src/lib/realtime.tsx` (`loadAllVehicles`, linhas 28–38)
- Test: `apps/admin/tests/paging.test.ts` (novo)

**Interfaces:**
- Consumes: `loadAllPages` (existente).
- Produces: `loadPartitioned<P, T extends { id: string }>(partitions: readonly P[], get: (p: P, cursor?: string) => Promise<Page<T>>, opts?: { concurrency?: number; maxPages?: number }): Promise<{ items: T[]; capped: boolean }>`; `VEHICLE_STATUSES` em `realtime.tsx`.

Por que por status: o cursor de `GET /vehicles` é opaco (`packages/contracts/openapi.yaml`, parâmetro `Cursor`), então páginas da mesma lista não podem ser pedidas em paralelo; o filtro `status` (já no contrato) divide a frota em listas independentes. Sem mudança de contrato.

- [ ] **Step 1: Teste**

```ts
// apps/admin/tests/paging.test.ts
import { describe, expect, it } from 'vitest';
import { loadPartitioned } from '@/lib/paging';

describe('carga particionada', () => {
  it('no máximo 3 cadeias ao mesmo tempo, todas as páginas e sem duplicar ids', async () => {
    let running = 0; let peak = 0;
    const data: Record<string, { id: string }[][]> = {
      free: [[{ id: '1' }, { id: '2' }], [{ id: '3' }]], rented: [[{ id: '4' }]], reserved: [[{ id: '5' }]],
      paused: [[]], blocked: [[{ id: '6' }]], maintenance: [[{ id: '2' }]], offline: [[{ id: '7' }]],
    };
    const r = await loadPartitioned(Object.keys(data), async (p, cursor) => {
      running++; peak = Math.max(peak, running);
      await new Promise((ok) => setTimeout(ok, 5));
      running--;
      const i = Number(cursor ?? 0);
      return { items: data[p][i], nextCursor: i + 1 < data[p].length ? String(i + 1) : undefined };
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(r.items.map((x) => x.id).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(r.capped).toBe(false);
  });
  it('marca capped quando alguma partição passa do limite de páginas', async () => {
    const r = await loadPartitioned(['a'], async (_p, c) => ({ items: [{ id: String(c ?? 0) }], nextCursor: String(Number(c ?? 0) + 1) }), { maxPages: 2 });
    expect(r.capped).toBe(true);
    expect(r.items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/paging.test.ts`
Expected: FAIL — `loadPartitioned` não exportado.

- [ ] **Step 3: Implementar**

```ts
// paging.ts (acrescentar)
/**
 * Várias listas paginadas por cursor (uma por partição) carregadas com `concurrency` cadeias em paralelo.
 * Itens repetidos entre partições (moto mudou de status durante a carga) ficam com a última versão lida.
 */
export async function loadPartitioned<P, T extends { id: string }>(
  partitions: readonly P[],
  get: (p: P, cursor?: string) => Promise<Page<T>>,
  { concurrency = 3, maxPages = 20 }: { concurrency?: number; maxPages?: number } = {},
): Promise<{ items: T[]; capped: boolean }> {
  const byId = new Map<string, T>();
  let capped = false;
  let next = 0;
  const worker = async () => {
    while (next < partitions.length) {
      const p = partitions[next++];
      const r = await loadAllPages((c) => get(p, c), maxPages);
      capped ||= r.capped;
      for (const it of r.items) byId.set(it.id, it);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, partitions.length) }, worker));
  return { items: [...byId.values()], capped };
}
```

Em `realtime.tsx`:

```ts
import { loadPartitioned } from './paging';
const VEHICLE_STATUSES: S<'VehicleStatus'>[] = ['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline'];

async function loadAllVehicles(): Promise<FleetVehicle[]> {
  const r = await loadPartitioned(VEHICLE_STATUSES, (status, cursor) =>
    unwrap(api.GET('/vehicles', { params: { query: { limit: 100, cursor, status } } })));
  return r.items;
}
```

- [ ] **Step 4: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint && pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-visual.spec.ts`
Expected: PASS (o `mockFleet` da Task 1 respeita `status`).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/paging.ts apps/admin/src/lib/realtime.tsx apps/admin/tests/paging.test.ts
git commit -m "perf(admin): carga da frota em 3 cadeias paralelas por status"
```

### Task 14: Lista da frota virtualizada

**Depende da decisão 8.2** (dependência nova `@tanstack/react-virtual`).

**Files:**
- Modify: `apps/admin/package.json` (`"@tanstack/react-virtual": "3.10.8"`)
- Modify: `apps/admin/src/components/ui.tsx` (`DataTable`: prop `virtual`)
- Modify: `apps/admin/src/components/FleetList.tsx` (remove `MAX_ROWS` e o aviso "Mostrando 200 de …")
- Test: `apps/admin/e2e-mock/fluidez-virtual.spec.ts`

**Interfaces:**
- Consumes: `mockFleet` (Task 1).
- Produces: `DataTable` aceita `virtual?: { maxHeight: string; rowHeight: number }`; com ela, só as linhas visíveis (+10) ficam no DOM.

- [ ] **Step 1: Teste e2e**

```ts
// apps/admin/e2e-mock/fluidez-virtual.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

test('lista com 1000 motos mantém poucas linhas no DOM e chega ao fim rolando', async ({ page }) => {
  await blockTiles(page); await mockFleet(page, 1000); await login(page, 'admin');
  await page.goto('/fleet?view=list');
  const list = page.getByTestId('fleet-list');
  await expect(list.getByTestId('row').first()).toBeVisible();
  expect(await list.getByTestId('row').count()).toBeLessThan(80);
  await expect(page.getByText(/Mostrando 200 de/)).toHaveCount(0);
  await list.locator('[data-virtual-scroll]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(list.getByText('VLT-1000')).toBeVisible();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-virtual.spec.ts`
Expected: FAIL (200 linhas no DOM e aviso presente).

- [ ] **Step 3: Dependência**

Run: `pnpm --filter admin add @tanstack/react-virtual@3.10.8` e confirme no `package.json` a versão exata (sem `^`, como as demais).

- [ ] **Step 4: DataTable virtual**

Em `DataTable` (props): `virtual?: { maxHeight: string; rowHeight: number }`. No corpo:

```tsx
  const scrollRef = useRef<HTMLDivElement>(null);
  const rv = useVirtualizer({ count: virtual ? rows.length : 0, getScrollElement: () => scrollRef.current, estimateSize: () => virtual?.rowHeight ?? 40, overscan: 10 });
  const vItems = virtual ? rv.getVirtualItems() : [];
  const padTop = vItems[0]?.start ?? 0;
  const padBottom = virtual ? rv.getTotalSize() - (vItems[vItems.length - 1]?.end ?? 0) : 0;
  const visible: { r: T; i: number }[] = virtual ? vItems.map((it) => ({ r: rows[it.index], i: it.index })) : rows.map((r, i) => ({ r, i }));
```

Troque `<div className={sticky ? 'table-scroll table-sticky' : 'table-scroll'}>` por:

```tsx
      <div ref={scrollRef} data-virtual-scroll={virtual ? '' : undefined} className={sticky ? 'table-scroll table-sticky' : 'table-scroll'}
        style={virtual ? { maxHeight: virtual.maxHeight, overflowY: 'auto' } : undefined}>
```

e no `<tbody>` troque `{rows.map((r, i) => { … })}` por:

```tsx
            {padTop > 0 && <tr aria-hidden style={{ height: padTop }} />}
            {visible.map(({ r, i }) => { /* corpo atual do map, usando r e i */ })}
            {padBottom > 0 && <tr aria-hidden style={{ height: padBottom }} />}
```

(o corpo do `map` atual não muda; `borderBottom: i < rows.length - 1 …` continua correto porque `i` é o índice real). Acrescente `import { useVirtualizer } from '@tanstack/react-virtual';`.

- [ ] **Step 5: FleetList**

Apague `const MAX_ROWS = 200;` e a linha `{rows.length > MAX_ROWS && …}`; no `DataTable`: `rows={rows} virtual={{ maxHeight: 'calc(100vh - 260px)', rowHeight: 41 }}`.

- [ ] **Step 6: Rodar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/ && pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: PASS (se `fluidez-visual` › `frota-lista` mudar só pela ausência do aviso/altura da rolagem, atualize o snapshot depois de conferir o diff).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml apps/admin/src/components apps/admin/e2e-mock/fluidez-virtual.spec.ts
git commit -m "perf(admin): lista da frota virtualizada (sem corte em 200)"
```

### Task 15: Otimistas — helper, toast com ação e alertas

**Files:**
- Create: `apps/admin/src/lib/optimistic.ts`
- Modify: `apps/admin/src/lib/toast-queue.ts` (`ToastItem.action`, `toastDuration` com ação)
- Modify: `apps/admin/src/components/ui.tsx` (`ToastCtx`, `ToastProvider.show`)
- Modify: `apps/admin/src/app/(panel)/alerts/page.tsx` (mutação `assign` linhas 50–53; resolução linhas ~98–105)
- Test: `apps/admin/tests/optimistic.test.ts`, `apps/admin/tests/toast-queue.test.ts` (acrescentar)

**Interfaces:**
- Produces:
  - `patchById<T extends { id: string }>(data: unknown, id: string, patch: Partial<T>): unknown` — aceita `T[]`, `{ items: T[] }` ou `T`
  - `removeById(data: unknown, id: string): unknown`
  - `applyOptimistic(qc: QueryClient, prefixes: QueryKey[], fn: (data: unknown) => unknown): Promise<() => void>` — devolve o rollback
  - `useToast()` → `(msg: string, tone?: ToastTone, opts?: { action?: ToastAction }) => void`, `ToastAction = { label: string; onAction: () => void }`
  - `toastDuration(tone: ToastTone, hasAction?: boolean): number` (com ação: 6000)

- [ ] **Step 1: Testes**

```ts
// apps/admin/tests/optimistic.test.ts
import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { applyOptimistic, patchById, removeById } from '@/lib/optimistic';

describe('otimistas', () => {
  it('patchById em lista, página e item', () => {
    expect(patchById([{ id: 'a', n: 1 }], 'a', { n: 2 })).toEqual([{ id: 'a', n: 2 }]);
    expect(patchById({ items: [{ id: 'a', n: 1 }], nextCursor: 'x' }, 'a', { n: 2 })).toEqual({ items: [{ id: 'a', n: 2 }], nextCursor: 'x' });
    expect(patchById({ id: 'a', n: 1 }, 'a', { n: 2 })).toEqual({ id: 'a', n: 2 });
    expect(patchById({ id: 'b', n: 1 }, 'a', { n: 2 })).toEqual({ id: 'b', n: 1 });
    expect(patchById(undefined, 'a', {})).toBeUndefined();
  });
  it('removeById em lista e página', () => {
    expect(removeById([{ id: 'a' }, { id: 'b' }], 'a')).toEqual([{ id: 'b' }]);
    expect(removeById({ items: [{ id: 'a' }] }, 'a')).toEqual({ items: [] });
  });
  it('aplica em todas as consultas do prefixo e o rollback restaura', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['alerts', 'open', 'first'], { items: [{ id: 'a', assigneeId: null }] });
    qc.setQueryData(['alerts', 'mine', 'first'], { items: [{ id: 'a', assigneeId: null }] });
    const rollback = await applyOptimistic(qc, [['alerts']], (d) => patchById(d, 'a', { assigneeId: 'u1' }));
    expect(qc.getQueryData(['alerts', 'open', 'first'])).toEqual({ items: [{ id: 'a', assigneeId: 'u1' }] });
    expect(qc.getQueryData(['alerts', 'mine', 'first'])).toEqual({ items: [{ id: 'a', assigneeId: 'u1' }] });
    rollback();
    expect(qc.getQueryData(['alerts', 'open', 'first'])).toEqual({ items: [{ id: 'a', assigneeId: null }] });
  });
});
```

Acrescente a `tests/toast-queue.test.ts`:

```ts
it('toast com ação (desfazer) fica 6 s na tela', () => {
  expect(toastDuration('success', true)).toBe(6000);
  expect(toastDuration('success')).toBe(3200);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec vitest run tests/optimistic.test.ts tests/toast-queue.test.ts`
Expected: FAIL — módulo/assinatura inexistentes.

- [ ] **Step 3: Helper**

```ts
// apps/admin/src/lib/optimistic.ts
import type { QueryClient, QueryKey } from '@tanstack/react-query';

type Row = { id?: string };

export function patchById<T extends { id: string }>(data: unknown, id: string, patch: Partial<T>): unknown {
  if (Array.isArray(data)) return data.map((x: Row) => (x?.id === id ? { ...x, ...patch } : x));
  if (data && typeof data === 'object') {
    const d = data as Row & { items?: unknown };
    if (Array.isArray(d.items)) return { ...d, items: patchById(d.items, id, patch) };
    if (d.id === id) return { ...d, ...patch };
  }
  return data;
}

export function removeById(data: unknown, id: string): unknown {
  if (Array.isArray(data)) return data.filter((x: Row) => x?.id !== id);
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    const d = data as { items: Row[] };
    return { ...d, items: d.items.filter((x) => x?.id !== id) };
  }
  return data;
}

/**
 * Atualização otimista com rollback (padrão onMutate/onError/onSettled do TanStack Query): cancela buscas
 * em andamento dos prefixos, guarda o estado atual e aplica `fn`. Chame o retorno no `onError`.
 */
export async function applyOptimistic(qc: QueryClient, prefixes: QueryKey[], fn: (data: unknown) => unknown): Promise<() => void> {
  const snapshots: [QueryKey, unknown][] = [];
  for (const queryKey of prefixes) {
    await qc.cancelQueries({ queryKey });
    for (const [key, data] of qc.getQueriesData({ queryKey })) {
      snapshots.push([key, data]);
      qc.setQueryData(key, fn(data));
    }
  }
  return () => { for (const [key, data] of snapshots) qc.setQueryData(key, data); };
}
```

- [ ] **Step 4: Toast com ação**

`toast-queue.ts`:

```ts
export interface ToastAction { label: string; onAction: () => void }
export interface ToastItem { id: number; msg: string; tone: ToastTone; leaving?: boolean; action?: ToastAction }
export function toastDuration(tone: ToastTone, hasAction = false): number {
  if (hasAction) return 6000;
  return tone === 'danger' ? 6000 : tone === 'warning' ? 4500 : 3200;
}
```

`ui.tsx`: `const ToastCtx = createContext<(msg: string, tone?: ToastTone, opts?: { action?: ToastAction }) => void>(() => {});`; em `show`, `(msg, tone = 'success', opts?: { action?: ToastAction })` → `pushToast(l, { id, msg, tone, action: opts?.action })` e `arm(id, tone, !!opts?.action)` (em `arm`, passe o terceiro argumento para `toastDuration`); no render: `<Toast tone={t.tone} action={t.action?.label ?? 'Fechar'} onAction={() => { t.action?.onAction(); dismiss(t.id); }}>{t.msg}</Toast>`.

- [ ] **Step 5: Alertas otimistas**

```tsx
  const assign = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string; name?: string; prevAssigneeId?: string; prevName?: string }) =>
      unwrap(api.POST('/alerts/{id}/assign', { params: { path: { id } }, body: { assigneeId } })),
    onMutate: async (v) => {
      setAssigning(null);
      return { rollback: await applyOptimistic(qc, [['alerts']], (d) => patchById<S<'Alert'>>(d, v.id, { assigneeId: v.assigneeId, assigneeName: v.name })) };
    },
    onError: (e, _v, ctx) => { ctx?.rollback(); toast(errorText(e), 'danger'); },
    onSuccess: (_a, v) => toast(assignToast(v.assigneeId, me?.id, v.name), 'success', v.prevAssigneeId ? {
      action: { label: 'Desfazer', onAction: () => assign.mutate({ id: v.id, assigneeId: v.prevAssigneeId!, name: v.prevName }) },
    } : undefined),
    onSettled: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
```

Nos pontos que chamam `assign.mutate({ id, assigneeId, name })`, passe também `prevAssigneeId: alert.assigneeId, prevName: alert.assigneeName`. Na resolução (`ReasonDialog` de resolver), antes do `await unwrap(api.POST('/alerts/{id}/resolve', …))`:

```tsx
          const rollback = await applyOptimistic(qc, [['alerts', 'open']], (d) => removeById(d, resolving!.id));
          try {
            await unwrap(api.POST('/alerts/{id}/resolve', { params: { path: { id: resolving!.id } }, body: { resolution } }));
          } catch (e) { rollback(); throw e; } // o ReasonDialog mostra o erro e mantém o diálogo aberto
```

(imports: `applyOptimistic`, `patchById`, `removeById` de `@/lib/optimistic`; `errorText` de `@/lib/api`.)

- [ ] **Step 6: Rodar**

Run: `pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src apps/admin/tests/optimistic.test.ts apps/admin/tests/toast-queue.test.ts
git commit -m "feat(admin): atualizações otimistas com rollback e desfazer nos alertas"
```

### Task 16: Otimistas — atribuir tarefa, bloquear/desbloquear cliente, editar cerca

**Files:**
- Modify: `apps/admin/src/app/(panel)/tasks/page.tsx:123-126`
- Modify: `apps/admin/src/app/(panel)/customers/page.tsx:200-218`
- Modify: `apps/admin/src/app/(panel)/zones/page.tsx:171-190`
- Test: `apps/admin/e2e-mock/fluidez-optimistic.spec.ts`

**Interfaces:**
- Consumes: `applyOptimistic`, `patchById` (Task 15).
- Produces: estados visuais "Salvando…" (pill) na cerca em edição; nada novo para outras tarefas.

Comandos IoT continuam **não** otimistas (Global Constraints). A cerca otimista só muda o desenho/lista no painel; o limite efetivo continua vindo do servidor (Redis/geofence), e em erro a geometria volta.

- [ ] **Step 1: Teste e2e de rollback**

```ts
// apps/admin/e2e-mock/fluidez-optimistic.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

test('bloquear cliente reflete na hora e volta se o servidor recusar', async ({ page }) => {
  await blockTiles(page); await mockFleet(page, 5); await login(page, 'admin');
  let release!: () => void;
  const gate = new Promise<void>((ok) => (release = ok));
  await page.route(/\/customers\/[^/]+\/block$/, async (route) => { await gate; await route.fulfill({ status: 409, json: { type: 'about:blank', title: 'Conflito', status: 409, detail: 'Cliente com aluguel ativo.' } }); });
  await page.goto('/customers/');
  await page.getByTestId('row').first().click();
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await page.getByTestId('reason-input').fill('teste de bloqueio');
  await page.getByTestId('confirm-action').click();
  await expect(page.getByTestId('customer-sheet').getByText('Bloqueado')).toBeVisible(); // antes da resposta
  release();
  await expect(page.getByText('Cliente com aluguel ativo.')).toBeVisible();
  await expect(page.getByTestId('customer-sheet').getByText('Bloqueado')).toHaveCount(0);
});
```

(confira no harness os rótulos exatos do botão e do status do cliente — "Bloquear" e o texto exibido para `status: 'blocked'` em `customers/page.tsx` — e ajuste os seletores; a semântica do teste não muda.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-optimistic.spec.ts`
Expected: FAIL (o status só muda depois da resposta).

- [ ] **Step 3: Cliente**

No `onConfirm` do diálogo de bloqueio (`customers/page.tsx:200`):

```tsx
            onConfirm={async (reason) => {
              const rollback = await applyOptimistic(qc, [['customer', id], ['customers']], (d) => patchById<S<'Customer'>>(d, id, { status: 'blocked' }));
              // Fecha o diálogo na hora; erro reverte e avisa.
              void unwrap(api.POST('/customers/{id}/block', { params: { path: { id } }, body: { reason, addToRestrictionList: addList } }))
                .then(() => toast('Cliente bloqueado'))
                .catch((e) => { rollback(); toast(errorText(e), 'danger'); })
                .finally(() => { qc.invalidateQueries({ queryKey: ['customer', id] }); qc.invalidateQueries({ queryKey: ['customers'] }); });
            }}
```

Desbloqueio (linha ~214): o mesmo com `{ status: 'active' }`, `'/customers/{id}/unblock'`, `body: { reason }` e toast `'Cliente desbloqueado'` (use os textos de toast que já existem no arquivo, se diferentes).

- [ ] **Step 4: Tarefa**

```tsx
  const save = useMutation({
    mutationFn: () => unwrap(api.PATCH('/field-tasks/{id}', { params: { path: { id: task.id } }, body: { assigneeId: who } })),
    onMutate: async () => { onClose(); return { rollback: await applyOptimistic(qc, [['field-tasks']], (d) => patchById<S<'FieldTask'>>(d, task.id, { assigneeId: who })) }; },
    onError: (e, _v, ctx) => { ctx?.rollback(); toast(errorText(e), 'danger'); },
    onSuccess: () => toast('Tarefa atribuída'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['field-tasks'] }),
  });
```

- [ ] **Step 5: Cerca (só edição; criação continua esperando o id do servidor)**

```tsx
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async (d: Draft) => { /* corpo atual */ },
    onMutate: async (d) => {
      if (!d.id) return {};
      setSavingZoneId(d.id);
      const limit = d.limit.trim() === '' ? undefined : Number(d.limit);
      const rollback = await applyOptimistic(qc, [['zones']], (data) => patchById<S<'GeoZone'>>(data, d.id!, { name: d.name.trim(), type: d.type, geometry: d.geometry!, ...(d.type === 'reduced_speed' && limit !== undefined ? { speedLimitKmh: limit } : {}) }));
      cancel();
      return { rollback };
    },
    onSuccess: (_z, d) => toast(d.id ? 'Cerca atualizada' : 'Cerca criada'),
    onError: (e, _d, ctx) => { ctx?.rollback?.(); setServerError(e); },
    onSettled: (_z, _e, d) => { setSavingZoneId(null); qc.invalidateQueries({ queryKey: ['zones'] }); if (!d.id) cancel(); },
  });
```

e na linha da cerca na lista do `SidePanel` de zonas, ao lado do nome: `{savingZoneId === z.id && <Pill tone="info" icon="Loader">Salvando…</Pill>}`.

- [ ] **Step 6: Rodar**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/ && pnpm --filter admin exec vitest run && pnpm --filter admin lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src apps/admin/e2e-mock/fluidez-optimistic.spec.ts
git commit -m "feat(admin): otimistas em tarefa, bloqueio de cliente e edição de cerca"
```

### Task 17: Teste de desempenho do mapa com 500 motos e fechamento da Fase 3

**Depende da decisão 8.6** (limiares: INP < 200 ms, nenhuma long task > 50 ms nos lotes, sem layout shift).

**Files:**
- Create: `apps/admin/e2e-mock/fluidez-perf.spec.ts`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Consumes: `window.__voltiFleet` (Task 10), `window.__voltiMap` (existente), `mockFleet`, `blockTiles`, `login` (Task 1).

- [ ] **Step 1: Escrever o teste**

```ts
// apps/admin/e2e-mock/fluidez-perf.spec.ts
import { test, expect } from '@playwright/test';
import { blockTiles, login, mockFleet } from './fluidez-kit';

test('500 motos: lotes ao vivo sem long task > 50 ms e clique no pino com INP < 200 ms', async ({ page }) => {
  await blockTiles(page);
  const fleet = await mockFleet(page, 500);
  await login(page, 'admin');
  await page.goto('/fleet');
  await page.waitForFunction(() => !!window.__voltiMap && (window.__voltiFleet?.getVehicles().length ?? 0) === 500);

  await page.evaluate(() => {
    (window as never as { __perf: { long: number[]; events: number[]; shift: number } }).__perf = { long: [], events: [], shift: 0 };
    const perf = (window as never as { __perf: { long: number[]; events: number[]; shift: number } }).__perf;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => perf.long.push(e.duration))).observe({ type: 'longtask', buffered: false });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => perf.events.push(e.duration))).observe({ type: 'event', durationThreshold: 16, buffered: false } as PerformanceObserverInit);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!s.hadRecentInput) perf.shift += s.value; })).observe({ type: 'layout-shift', buffered: false });
  });

  // 20 lotes (10 s) movendo todas as motos ~5 m, como a telemetria ao vivo.
  for (let k = 1; k <= 20; k++) {
    await page.evaluate(({ k, ids }) => {
      const s = window.__voltiFleet!;
      for (const id of ids) { const v = s.getVehicle(id)!; s.queue(id, { lat: v.lat + 0.00005 * (k % 2 ? 1 : -1), lng: v.lng + 0.00005 }); }
      s.flush();
    }, { k, ids: fleet.map((v) => v.id) });
    await page.waitForTimeout(500);
  }

  // Clique no pino da primeira moto livre.
  const target = fleet.find((v) => v.status === 'free')!;
  await page.evaluate(([lng, lat]) => window.__voltiMap!.jumpTo({ center: [lng, lat], zoom: 17 }), [target.lng, target.lat]);
  await page.waitForTimeout(800);
  const pt = await page.evaluate(([lng, lat]) => { const p = window.__voltiMap!.project([lng, lat]); const r = window.__voltiMap!.getCanvas().getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; }, [target.lng, target.lat]);
  await page.mouse.click(pt.x, pt.y);
  await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
  await page.waitForTimeout(500);

  const perf = await page.evaluate(() => (window as never as { __perf: { long: number[]; events: number[]; shift: number } }).__perf);
  console.log(JSON.stringify({ maxLongTask: Math.max(0, ...perf.long), maxEvent: Math.max(0, ...perf.events), shift: perf.shift }));
  expect(Math.max(0, ...perf.long)).toBeLessThanOrEqual(50);
  expect(Math.max(0, ...perf.events)).toBeLessThan(200);
  expect(perf.shift).toBeLessThan(0.01);
});
```

- [ ] **Step 2: Registrar o "antes"**

O código anterior à Task 10 não expõe `window.__voltiFleet`, então o teste não roda nele. Para o "antes": num worktree do commit da Task 8 (`git worktree add ../fluidez-antes $(git log --format=%H -1 --grep='microinterações por classes do DS')`), suba o painel com o harness e `mockFleet(page, 500)` e grave 10 s no painel Performance do Chrome com o mapa aberto; anote a maior long task e o tempo do clique no pino no README. Remova o worktree depois (`git worktree remove ../fluidez-antes`).

- [ ] **Step 3: Rodar no código da Fase 3**

Run: `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/fluidez-perf.spec.ts --repeat-each=3`
Expected: 3 passed. Se falhar por pouco só na máquina de CI, ajuste os limiares conforme a decisão 8.6 (não afrouxe sem registrar).

- [ ] **Step 4: README, prints e fase**

Em `apps/admin/README.md`, seção "Desempenho": store da frota (`fleet-store.ts`, `useFleetVehicle/useFleetVehicles/useFleetCounts`), cache de features, polling de comando só com socket caído, carga por status, lista virtual, otimistas (`optimistic.ts`) e o comando do teste de desempenho com os números antes/depois. Salve prints da lista virtual e do mapa com 500 motos em `docs/design/screenshots/fluidez/fase3/`.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/e2e-mock/fluidez-perf.spec.ts apps/admin/README.md docs/design/screenshots/fluidez/fase3
git commit -m "test(admin): desempenho do mapa com 500 motos (long tasks, INP, layout shift)"
```

---

# Fase 4 — App do cliente: toque, mapa, re-render e listas (spec 4.3.1–4.3.4, 4.3.6)

Entrega: ripple nos toques, mapa sem camada de composição por tile, pino e câmera deslizando na corrida, cronômetro sem reconstruir o mapa, listas preguiçosas, devolução confirmada por evento.

### Task 18: Ripple no tema (InkRipple com cor do DS)

**Files:**
- Modify: `packages/volti_flutter/lib/src/theme.dart:68`
- Test: `packages/volti_flutter/test/ripple_test.dart`

**Interfaces:**
- Produces: `VoltiTheme.light()/dark()` com `splashFactory: InkRipple.splashFactory`, `splashColor` = `VoltiColors.ink900` a 8% (claro) / branco a 12% (escuro), `highlightColor: Colors.transparent`. `VoltiPressable` (escala .97) e `VoltiRipple` dos botões continuam.

- [ ] **Step 1: Teste**

```dart
// packages/volti_flutter/test/ripple_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

void main() {
  test('tema usa ripple (DS v2: "ripple a partir do toque")', () {
    for (final t in [VoltiTheme.light(), VoltiTheme.dark()]) {
      expect(t.splashFactory, InkRipple.splashFactory);
      expect(t.highlightColor, Colors.transparent);
    }
    expect(VoltiTheme.light().splashColor, VoltiColors.ink900.withValues(alpha: .08));
  });

  testWidgets('linha tocável desenha a onda a partir do toque', (t) async {
    await t.pumpWidget(MaterialApp(
      theme: VoltiTheme.light(),
      home: Scaffold(body: ListTile(title: const Text('Histórico'), onTap: () {})),
    ));
    final g = await t.startGesture(t.getCenter(find.byType(ListTile)));
    await t.pump(const Duration(milliseconds: 100));
    final box = Material.of(t.element(find.byType(InkWell))) as RenderBox;
    expect(box, paints..circle());
    await g.up();
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run (em `packages/volti_flutter`): `C:/flutter/bin/flutter test test/ripple_test.dart`
Expected: FAIL — `NoSplash`.

- [ ] **Step 3: Implementar**

Em `_build(ColorScheme scheme, Color scaffold)`:

```dart
    final dark = scheme.brightness == Brightness.dark;
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffold,
      fontFamily: VoltiTypography.fontSans,
      splashFactory: InkRipple.splashFactory,
      splashColor: dark ? Colors.white.withValues(alpha: .12) : VoltiColors.ink900.withValues(alpha: .08),
      highlightColor: Colors.transparent,
    );
```

- [ ] **Step 4: Rodar pacote e app**

Run: `cd packages/volti_flutter && C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test && cd ../../apps/cliente && C:/flutter/bin/flutter test`
Expected: PASS (testes do app que procuravam ausência de splash, se houver, devem ser atualizados para o novo comportamento).

- [ ] **Step 5: Commit**

```bash
git add packages/volti_flutter
git commit -m "feat(volti_flutter): ripple a partir do toque no tema (DS v2)"
```

### Task 19: Filtro de cor único sobre a camada de tiles

**Depende da decisão 8.3** (filtro único sobre a `TileLayer` em vez de tiles pré-estilizados).

**Files:**
- Modify: `apps/cliente/lib/core/widgets.dart:176-181` (`VoltiMap`)
- Test: `apps/cliente/test/map_layer_test.dart`

**Interfaces:**
- Produces: `VoltiMap` com um único `ColorFiltered` envolvendo a `TileLayer` (mesma matriz `_filter`).

- [ ] **Step 1: Teste**

```dart
// apps/cliente/test/map_layer_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_cliente/core/widgets.dart';
import 'package:volti_flutter/volti_flutter.dart';

void main() {
  testWidgets('filtro de cor aplicado uma vez sobre a camada de tiles (não por tile)', (t) async {
    await t.pumpWidget(MaterialApp(theme: VoltiTheme.light(), home: const Scaffold(body: VoltiMap(center: LatLng(-23.56, -46.65)))));
    await t.pump();
    final filters = find.byType(ColorFiltered);
    expect(filters, findsOneWidget);
    expect(find.descendant(of: filters, matching: find.byType(TileLayer)), findsOneWidget);
    expect(t.widget<TileLayer>(find.byType(TileLayer)).tileBuilder, isNull);
  });
}
```

(se o construtor de `VoltiMap` tiver outros parâmetros obrigatórios, passe os mesmos valores que os testes existentes usam.)

- [ ] **Step 2: Rodar e ver falhar**

Run (em `apps/cliente`): `C:/flutter/bin/flutter test test/map_layer_test.dart`
Expected: FAIL — `tileBuilder` não nulo / nenhum `ColorFiltered` antes dos tiles carregarem.

- [ ] **Step 3: Implementar**

```dart
      children: [
        // Um ColorFiltered para a camada inteira: uma camada de composição, não uma por tile (engasgava ao arrastar).
        ColorFiltered(
          colorFilter: _filter,
          child: TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'br.com.volti.cliente',
          ),
        ),
        ...layers,
      ],
```

- [ ] **Step 4: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS.

- [ ] **Step 5: Verificação no emulador (manual)**

Rode o app no Pixel_10 (ver memória "como testar no emulador"), arraste o mapa da home por 10 s com o overlay de desempenho (`flutter run --profile`, tecla `P`) e anote se há barras vermelhas antes/depois no commit.

- [ ] **Step 6: Commit**

```bash
git add apps/cliente/lib/core/widgets.dart apps/cliente/test/map_layer_test.dart
git commit -m "perf(cliente): filtro de cor único sobre a camada de tiles"
```

### Task 20: Pino e câmera interpolados na corrida

**Files:**
- Create: `apps/cliente/lib/features/ride/ride_motion.dart`
- Modify: `apps/cliente/lib/features/ride/ride_screen.dart` (estado `_vehiclePos`, `_onEvent` caso `VehiclePositionEvent` linhas 182–190, `_follow` linhas 211–217, `MarkerLayer` linhas 483–493, `dispose`)
- Test: `apps/cliente/test/ride_motion_test.dart`

**Interfaces:**
- Produces: `kRideMoveDuration = Duration(milliseconds: 900)`, `kMaxAnimatedJumpM = 1000.0`, `shouldAnimateMove(LatLng from, LatLng to): bool`, `lerpLatLng(LatLng a, LatLng b, double t): LatLng`; no estado da corrida, `ValueNotifier<LatLng?> _vehiclePosN` (substitui `_vehiclePos`).

- [ ] **Step 1: Testes**

```dart
// apps/cliente/test/ride_motion_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_cliente/features/ride/ride_motion.dart';

void main() {
  test('interpola linearmente entre dois pontos', () {
    final p = lerpLatLng(const LatLng(0, 0), const LatLng(1, 2), .5);
    expect(p.latitude, closeTo(.5, 1e-9));
    expect(p.longitude, closeTo(1, 1e-9));
  });
  test('anima passos curtos; saltos > 1 km vão direto (mesma regra do painel, map-anim.ts)', () {
    const a = LatLng(-23.5600, -46.6600);
    expect(shouldAnimateMove(a, const LatLng(-23.5605, -46.6605)), isTrue); // ~75 m
    expect(shouldAnimateMove(a, const LatLng(-23.5800, -46.6600)), isFalse); // ~2,2 km
  });
  test('duração de 900 ms (spec: 800–1000 ms com easeOut)', () => expect(kRideMoveDuration, const Duration(milliseconds: 900)));
}
```

Acrescente ao `group` da corrida em `apps/cliente/test/ride_return_receipt_test.dart` (usa `pumpRide` e o `FakeRealtime` `rt` já existentes):

```dart
    testWidgets('pino desliza até a nova posição em vez de saltar', (t) async {
      await pumpRide(t, map: true);
      rt.emit(const VehiclePositionEvent(lat: -23.5610, lng: -46.6510, speedKmh: 12, batteryPct: 80, speedLimitKmh: 32));
      await t.pump();
      rt.emit(const VehiclePositionEvent(lat: -23.5615, lng: -46.6515, speedKmh: 12, batteryPct: 80, speedLimitKmh: 32));
      await t.pump(const Duration(milliseconds: 450));
      final mid = t.widget<MarkerLayer>(find.byKey(const Key('ride-markers'))).markers.last.point;
      expect(mid.latitude, inExclusiveRange(-23.5615, -23.5610));
      await t.pump(const Duration(milliseconds: 600));
      final end = t.widget<MarkerLayer>(find.byKey(const Key('ride-markers'))).markers.last.point;
      expect(end.latitude, closeTo(-23.5615, 1e-9));
    });
```

(se `rt` for local a `pumpRide`, devolva-o de `pumpRide` ou use o mesmo padrão de criação do teste vizinho que emite eventos.)

- [ ] **Step 2: Rodar e ver falhar**

Run (em `apps/cliente`): `C:/flutter/bin/flutter test test/ride_motion_test.dart test/ride_return_receipt_test.dart`
Expected: FAIL — `ride_motion.dart` não existe; pino salta.

- [ ] **Step 3: Funções puras**

```dart
// apps/cliente/lib/features/ride/ride_motion.dart
import 'package:latlong2/latlong.dart';

/// Deslize do pino e da câmera na corrida (spec 4.3.2: 800–1000 ms, easeOut).
const kRideMoveDuration = Duration(milliseconds: 900);

/// Acima disto não anima (moto ficou sem sinal e reapareceu longe) — mesma regra do painel (`map-anim.ts`, ~1 km).
const kMaxAnimatedJumpM = 1000.0;

const _distance = Distance();

bool shouldAnimateMove(LatLng from, LatLng to) => _distance.as(LengthUnit.Meter, from, to) <= kMaxAnimatedJumpM;

LatLng lerpLatLng(LatLng a, LatLng b, double t) =>
    LatLng(a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t);
```

- [ ] **Step 4: Ligar na tela**

Em `_RideScreenState`: acrescente `with SingleTickerProviderStateMixin` (ou `TickerProviderStateMixin` se já houver outro ticker); troque `LatLng? _vehiclePos;` por:

```dart
  final _vehiclePosN = ValueNotifier<LatLng?>(null);
  late final AnimationController _move = AnimationController(vsync: this, duration: kRideMoveDuration)
    ..addListener(() {
      final from = _moveFrom, to = _moveTo;
      if (from == null || to == null) return;
      final p = lerpLatLng(from, to, _move.value);
      _vehiclePosN.value = p;
      _follow(p);
    });
  LatLng? _moveFrom, _moveTo;

  void _moveVehicle(LatLng to) {
    final from = _vehiclePosN.value;
    if (from == null || MediaQuery.of(context).disableAnimations || !shouldAnimateMove(from, to)) {
      _move.stop();
      _vehiclePosN.value = to;
      _follow(to);
      return;
    }
    _moveFrom = from;
    _moveTo = to;
    _move
      ..value = 0
      ..animateTo(1, curve: VoltiMotion.easeOut);
  }
```

No carregamento (`_load`), troque `_vehiclePos = LatLng(vehicle.lat, vehicle.lng);` por `_vehiclePosN.value = LatLng(vehicle.lat, vehicle.lng);`. No caso `VehiclePositionEvent`, troque `_vehiclePos = LatLng(e.lat, e.lng); appendTrail(_trail, _vehiclePos!);` + `_follow(_vehiclePos!);` por `final to = LatLng(e.lat, e.lng); appendTrail(_trail, to);` dentro do `setState` (os demais campos continuam por ora — a Task 21 os tira do `setState`) e, depois dele, `_moveVehicle(to);`. Demais leituras de `_vehiclePos` passam a `_vehiclePosN.value`. No `MarkerLayer`, envolva:

```dart
                    ValueListenableBuilder<LatLng?>(
                      valueListenable: _vehiclePosN,
                      builder: (context, pos, _) => MarkerLayer(key: const Key('ride-markers'), markers: [
                        if (_userPos != null) Marker(point: _userPos!, width: 34, height: 34, child: const VoltiUserDot(heading: true)),
                        if (pos != null)
                          Marker(point: pos, width: 56, height: 64, child: VehicleMarker(VehicleStatus.rented, _battery, selected: true, animateIn: firstMarkerDrop)),
                      ]),
                    ),
```

Em `dispose()`: `_move.dispose(); _vehiclePosN.dispose();` antes de `super.dispose()`. Acrescente `import 'ride_motion.dart';`.

- [ ] **Step 5: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/cliente/lib/features/ride apps/cliente/test/ride_motion_test.dart apps/cliente/test/ride_return_receipt_test.dart
git commit -m "feat(cliente): pino e câmera deslizam na corrida (sem salto; > 1 km vai direto)"
```

### Task 21: Re-render localizado na corrida (cronômetro e telemetria fora do `setState`)

**Files:**
- Modify: `apps/cliente/lib/features/ride/ride_screen.dart` (timer linhas 115–117, caso `VehiclePositionEvent`, `build`: gauge/bateria ~linhas 505–525, relógio ~linha 591, polilinha ~linhas 476–481)
- Test: `apps/cliente/test/ride_return_receipt_test.dart` (acrescentar)

**Interfaces:**
- Consumes: `_vehiclePosN` (Task 20).
- Produces: `ValueNotifier<int> _elapsedN`; `ValueNotifier<RideTelemetry> _telemetryN` com `class RideTelemetry { final double speedKmh; final int batteryPct; final int limitKmh; final int? rangeKm; }` (em `ride_motion.dart`); `ValueNotifier<int> _trailVersion`; `@visibleForTesting static int debugBuilds` em `RideScreen`.

- [ ] **Step 1: Teste**

```dart
    testWidgets('cronômetro e telemetria não reconstroem a tela inteira', (t) async {
      await pumpRide(t, map: true);
      final before = RideScreen.debugBuilds;
      await t.pump(const Duration(seconds: 1));
      await t.pump(const Duration(seconds: 1));
      await t.pump(const Duration(seconds: 1));
      rt.emit(const VehiclePositionEvent(lat: -23.5611, lng: -46.6511, speedKmh: 18, batteryPct: 79, speedLimitKmh: 20));
      await t.pump(const Duration(milliseconds: 950));
      expect(RideScreen.debugBuilds, before, reason: 'tick e posição não chamam setState na tela');
      expect(find.byKey(const Key('ride-clock')), findsOneWidget);
      expect(t.widget<VoltiSpeedGauge>(find.byKey(const Key('ride-gauge'))).limitKmh, 20);
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `C:/flutter/bin/flutter test test/ride_return_receipt_test.dart`
Expected: FAIL — `debugBuilds` não existe.

- [ ] **Step 3: Implementar**

Em `ride_motion.dart`:

```dart
/// Velocidade, bateria e limite da moto em aluguel (vem de `vehicle.position`).
class RideTelemetry {
  const RideTelemetry({this.speedKmh = 0, this.batteryPct = 0, this.limitKmh = 32, this.rangeKm});
  final double speedKmh;
  final int batteryPct;
  final int limitKmh;
  final int? rangeKm;
  RideTelemetry copyWith({double? speedKmh, int? batteryPct, int? limitKmh, int? rangeKm}) =>
      RideTelemetry(speedKmh: speedKmh ?? this.speedKmh, batteryPct: batteryPct ?? this.batteryPct, limitKmh: limitKmh ?? this.limitKmh, rangeKm: rangeKm ?? this.rangeKm);
}
```

Em `RideScreen`: `@visibleForTesting static int debugBuilds = 0;` e, no início de `_RideScreenState.build`, `RideScreen.debugBuilds++;`.

No estado: troque `_elapsed`, `_speed`, `_battery`, `_limit`, `_range` por `final _elapsedN = ValueNotifier<int>(0);`, `final _telemetryN = ValueNotifier(const RideTelemetry());`, `final _trailVersion = ValueNotifier<int>(0);`. O timer vira `_tick = Timer.periodic(const Duration(seconds: 1), (_) { if (_rental?.status == RentalStatus.active && mounted) _elapsedN.value++; });`. `RentalUpdated` continua em `setState` para `_rental`/`_cost`, mas `_elapsedN.value = e.elapsedSeconds;` fora dele. O caso `VehiclePositionEvent` fica sem `setState`:

```dart
      case VehiclePositionEvent():
        final to = LatLng(e.lat, e.lng);
        _telemetryN.value = _telemetryN.value.copyWith(speedKmh: e.speedKmh, batteryPct: e.batteryPct, limitKmh: e.speedLimitKmh);
        appendTrail(_trail, to);
        _trailVersion.value++;
        _moveVehicle(to);
```

`ZoneNotice` que muda `_limit` passa a `_telemetryN.value = _telemetryN.value.copyWith(limitKmh: e.speedLimitKmh)`. No `build`, envolva o bloco do gauge/bateria em `ValueListenableBuilder<RideTelemetry>(valueListenable: _telemetryN, builder: (context, tm, _) => Row(children: [VoltiSpeedGauge(key: const Key('ride-gauge'), speedKmh: tm.speedKmh, limitKmh: tm.limitKmh, size: 60, semanticsLabel: l.speedSemantics(tm.speedKmh.round(), tm.limitKmh)), …BatteryPill(tm.batteryPct, rangeKm: tm.rangeKm)…]))`; o relógio em `ValueListenableBuilder<int>(valueListenable: _elapsedN, builder: (context, s, _) => VoltiTicker(clock(s), key: const Key('ride-clock'), style: VoltiTypography.timer))`; a polilinha em `ValueListenableBuilder<int>(valueListenable: _trailVersion, builder: (context, _, __) => _trail.length >= 2 ? DrawnPolyline(key: const Key('ride-route'), points: List.of(_trail), color: VoltiColors.brand) : const SizedBox.shrink())`; o `VehicleMarker` lê `_telemetryN.value.batteryPct`. `_fare`, o aviso de velocidade e qualquer outra leitura passam a `_telemetryN.value`/`_elapsedN.value`. Em `dispose`, descarte os três notifiers.

- [ ] **Step 4: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS (os testes existentes da corrida usam as mesmas chaves `ride-clock`, `ride-gauge`, `ride-route`, `ride-markers`).

- [ ] **Step 5: Commit**

```bash
git add apps/cliente/lib/features/ride apps/cliente/test/ride_return_receipt_test.dart
git commit -m "perf(cliente): cronômetro e telemetria da corrida sem reconstruir o mapa"
```

### Task 22: Listas preguiçosas (histórico, suporte, chat e extrato)

**Files:**
- Modify: `apps/cliente/lib/features/account/history_screen.dart:42-56`
- Modify: `apps/cliente/lib/features/account/support_screens.dart:76-88,220-223`
- Modify: `apps/cliente/lib/features/account/wallet_screen.dart:200-210`
- Test: `apps/cliente/test/lazy_lists_test.dart`

**Interfaces:**
- Produces: nada novo; listas usam `ListView.builder` (ou filhos diretos do `ListView`, que é preguiçoso) em vez de `Column` com todos os itens.

A Central de ajuda (`help_screens.dart`) tem 5 perguntas fixas: fica como está (fora do escopo por não ter ganho mensurável — registrado nas pendências).

- [ ] **Step 1: Teste**

`ListView(children: [...])` já monta só o que aparece (o ganho no histórico, suporte e chat é não construir 300 widgets de uma vez); o caso que monta tudo hoje é o extrato da carteira, porque as linhas ficam dentro de um `Column` que é um único filho do `ListView`. O teste que falha antes é o do extrato; o do histórico é guarda de regressão.

```dart
// apps/cliente/test/lazy_lists_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/features/account/history_screen.dart';
import 'package:volti_cliente/features/account/wallet_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

final _ledgerRows = find.byWidgetPredicate((w) => w.runtimeType.toString() == '_LedgerRow', skipOffstage: false);

void main() {
  testWidgets('extrato com 300 lançamentos só monta o que aparece', (t) async {
    await t.pumpWidget(testApp(const WalletScreen(), overrides: [
      // mesmos overrides de carteira usados em account_gap_c_test.dart (saldo, pacotes, recarga pendente)…
      ledgerProvider.overrideWith((ref) async => [for (var i = 0; i < 300; i++) sampleLedgerEntry(i)]),
    ]));
    await t.pumpAndSettle();
    expect(_ledgerRows.evaluate().length, lessThan(60));
  });

  testWidgets('histórico com 300 aluguéis só monta o que aparece', (t) async {
    await t.pumpWidget(testApp(const HistoryScreen(), overrides: [
      historyProvider.overrideWith((ref) async => [for (var i = 0; i < 300; i++) sampleRental().rebuild((b) => b..id = 'r$i')]),
    ]));
    await t.pumpAndSettle();
    expect(find.byType(ListRow, skipOffstage: false).evaluate().length, lessThan(40));
  });
}
```

(`sampleLedgerEntry(int i)`: acrescente em `test/helpers.dart` um builder de `WalletEntry` com os campos obrigatórios do modelo, no mesmo estilo de `sampleRental`. Se `ledgerProvider`/`historyProvider` forem família ou `AsyncNotifier`, use o override equivalente; se a linha do histórico não for `ListRow`, use o widget que `_row` devolve.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `C:/flutter/bin/flutter test test/lazy_lists_test.dart`
Expected: FAIL no extrato (300 `_LedgerRow` montados); o histórico já passa (guarda).

- [ ] **Step 3: Histórico**

```dart
          final head = VoltiStagger.wrap([for (final r in rentals.take(8)) _row(context, r)]);
          final offset = pick ? 1 : 0;
          return VoltiRefresh(
            onRefresh: () => ref.refresh(historyProvider.future),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              itemCount: rentals.length + offset,
              itemBuilder: (context, i) {
                if (pick && i == 0) {
                  return Padding(padding: const EdgeInsets.only(bottom: VoltiSpacing.s12), child: Text(l.historyPickHint, style: VoltiTypography.body));
                }
                final k = i - offset;
                // Cascata só nos primeiros itens (lista pode ser longa).
                return k < head.length ? head[k] : _row(context, rentals[k]);
              },
            ),
          );
```

- [ ] **Step 4: Suporte (lista e chat)**

Lista de conversas: `final items = VoltiStagger.wrap([for (final c in list.take(8)) _conversationRow(c)]);` com `ListView.builder(itemCount: list.length, itemBuilder: (context, i) => i < items.length ? items[i] : _conversationRow(list[i]))`, extraindo o `ListRow(...)` atual para `Widget _conversationRow(SupportConversation c)` (mesmo conteúdo). Chat: `ListView.builder(padding: const EdgeInsets.all(VoltiSpacing.screenGutter), itemCount: list.length, itemBuilder: (context, i) => _Bubble(message: list[i]))`.

- [ ] **Step 5: Extrato da carteira**

Troque o `AsyncView<List<WalletEntry>>(…, data: (list) => … Column(children: [for (final e in list) _LedgerRow(entry: e)]))` por filhos diretos do `ListView` externo:

```dart
            ...ref.watch(ledgerProvider).when(
                  data: (list) => list.isEmpty
                      ? [Padding(padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s12), child: Text(l.walletLedgerEmpty, style: VoltiTypography.body))]
                      : [for (final e in list) _LedgerRow(entry: e)],
                  loading: () => [VoltiSkeleton.list(rows: 3, label: l.loading)],
                  error: (e, _) => [AsyncView<List<WalletEntry>>(value: ref.watch(ledgerProvider), onRetry: () => ref.invalidate(ledgerProvider), data: (_) => const SizedBox.shrink())],
                ),
```

(o `AsyncView` no erro reaproveita o estado de erro com "Tentar de novo" já existente.)

- [ ] **Step 6: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/cliente/lib/features/account apps/cliente/test/lazy_lists_test.dart
git commit -m "perf(cliente): histórico, suporte, chat e extrato com listas preguiçosas"
```

### Task 23: Devolução confirmada por evento, com polling de reserva

**Files:**
- Modify: `apps/cliente/lib/features/return_flow/return_screen.dart` (`_startPolling` linhas 156–180, `dispose`)
- Test: `apps/cliente/test/ride_return_receipt_test.dart` (acrescentar)

**Interfaces:**
- Consumes: `realtimeFactoryProvider`, `RentalUpdated` (existentes).
- Produces: a tela de devolução abre um `RealtimeService` enquanto espera a trava; com o socket conectado consulta a API só a cada 3 ciclos.

Chat de suporte, recarga e Pix continuam com polling: hoje o cliente só recebe eventos da sala `rental:{id}` (`packages/contracts/realtime.md`, Salas), sem eventos de chat/pagamento — trocar por eventos exige mudança de contrato (pendência registrada).

- [ ] **Step 1: Teste**

```dart
    testWidgets('devolução termina pelo evento rental.updated sem esperar o polling', (t) async {
      final rt = FakeRealtime();
      final b = _ReturnB(); // backend fake da devolução já usado neste arquivo
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1', pollInterval: Duration(seconds: 30)), overrides: [
        backendProvider.overrideWithValue(b),
        realtimeFactoryProvider.overrideWithValue(() => rt),
      ]));
      await t.pumpAndSettle();
      await confirmReturn(t); // mesmo passo dos testes de devolução existentes (foto + confirmar)
      rt.conn.add(true);
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'ended', elapsedSeconds: 600, costCents: 1290));
      await t.pump(const Duration(milliseconds: 100));
      expect(b.rentalCalls, 0, reason: 'não precisou consultar a API');
      // e a navegação para o resumo aconteceu (mesmo expect dos testes existentes de _finish)
    });
```

(use o fake e o passo de confirmação que os testes de devolução atuais já usam; acrescente ao fake um contador `rentalCalls` em `rental(id)`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `C:/flutter/bin/flutter test test/ride_return_receipt_test.dart`
Expected: FAIL — a tela não escuta o socket.

- [ ] **Step 3: Implementar**

```dart
  RealtimeService? _rt;
  StreamSubscription<RealtimeEvent>? _rtEvents;
  StreamSubscription<bool>? _rtConn;
  bool _rtUp = false;

  void _startPolling() {
    _poll?.cancel();
    final maxTicks = (widget.lockTimeout.inMilliseconds / widget.pollInterval.inMilliseconds).ceil();
    var ticks = 0;
    setState(() { _waitingLock = true; _lockTimedOut = false; });
    _rt ??= ref.read(realtimeFactoryProvider)();
    _rtEvents ??= _rt!.events.listen((e) {
      if (e is RentalUpdated && e.rentalId == widget.rentalId && (e.status == 'ended' || e.status == 'force_ended')) {
        _poll?.cancel();
        _finish();
      }
    });
    _rtConn ??= _rt!.connected.listen((up) => _rtUp = up);
    unawaited(_rt!.connect().catchError((_) {}));
    _poll = Timer.periodic(widget.pollInterval, (_) async {
      ticks++;
      // Com o socket conectado o evento chega sozinho: consulta só a cada 3 ciclos, como reserva.
      if (!_rtUp || ticks % 3 == 0) {
        try {
          final r = await ref.read(backendProvider).rental(widget.rentalId);
          if (r.status == RentalStatus.ended || r.status == RentalStatus.forceEnded) {
            _poll?.cancel();
            _finish();
            return;
          }
        } catch (_) {
          // rede instavel: segue tentando ate o prazo
        }
      }
      if (ticks >= maxTicks) {
        _poll?.cancel();
        if (mounted) setState(() => _lockTimedOut = true);
      }
    });
  }
```

Em `dispose`: `_rtEvents?.cancel(); _rtConn?.cancel(); _rt?.dispose();`. Garanta que `_finish` é idempotente (guarde `bool _finished` e retorne cedo na segunda chamada). Imports: `dart:async`, `../../core/services.dart`.

- [ ] **Step 4: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/cliente/lib/features/return_flow apps/cliente/test/ride_return_receipt_test.dart
git commit -m "perf(cliente): devolução confirmada por rental.updated com polling de reserva"
```

### Task 24: Goldens das telas principais, perfil da corrida e fechamento da Fase 4

**Depende da decisão 8.6** (só a parte de desempenho: nenhum frame > 16 ms em 60 s de telemetria simulada).

**Files:**
- Create: `packages/volti_flutter/test/goldens_test.dart` (+ `test/goldens/*.png` gerados)
- Create: `apps/cliente/test/goldens_test.dart` (+ `test/goldens/*.png`)
- Create: `apps/cliente/test/golden_fonts.dart`
- Create: `apps/cliente/integration_test/ride_perf_test.dart`, `apps/cliente/test_driver/perf_driver.dart`
- Modify: `apps/cliente/pubspec.yaml` (dev: `integration_test: { sdk: flutter }`, `flutter_driver: { sdk: flutter }`)
- Modify: `apps/cliente/README.md`, `packages/volti_flutter/README.md`

**Interfaces:**
- Produces: `loadAppFonts()` em `test/golden_fonts.dart` (carrega `FontManifest.json` para os goldens não usarem a fonte Ahem).

- [ ] **Step 1: Carregador de fontes para goldens**

```dart
// apps/cliente/test/golden_fonts.dart (copie igual para packages/volti_flutter/test/golden_fonts.dart)
import 'dart:convert';

import 'package:flutter/services.dart';

/// Carrega as fontes do FontManifest (Plus Jakarta Sans, JetBrains Mono) para os goldens ficarem legíveis.
Future<void> loadAppFonts() async {
  final manifest = json.decode(await rootBundle.loadString('FontManifest.json')) as List<dynamic>;
  for (final f in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(f['family'] as String);
    for (final a in (f['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(a['asset'] as String));
    }
    await loader.load();
  }
}
```

- [ ] **Step 2: Goldens do pacote**

```dart
// packages/volti_flutter/test/goldens_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'golden_fonts.dart';

void main() {
  setUpAll(loadAppFonts);
  testWidgets('galeria de componentes', (t) async {
    t.view.physicalSize = const Size(390 * 3, 844 * 3);
    t.view.devicePixelRatio = 3;
    addTearDown(t.view.reset);
    await t.pumpWidget(MaterialApp(
      theme: VoltiTheme.light(),
      home: Scaffold(body: ListView(padding: const EdgeInsets.all(20), children: [
        VoltiButton(label: 'Desbloquear', onPressed: () {}),
        const SizedBox(height: 12),
        const BatteryPill(64, rangeKm: 22),
        const SizedBox(height: 12),
        ListTile(title: const Text('Histórico'), onTap: () {}),
        const VoltiSuccessCheck(),
      ])),
    ));
    await t.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/galeria.png'));
  });
}
```

(ajuste os construtores ao que os widgets exigem — use os mesmos argumentos de `test/widgets_test.dart`.)

- [ ] **Step 3: Goldens do app (corrida ativa e pausada, mapa desligado)**

```dart
// apps/cliente/test/goldens_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';

import 'golden_fonts.dart';
import 'helpers.dart';

class _GoldenRide extends FakeBackend {
  _GoldenRide(this.status);
  final RentalStatus status;
  @override
  Future<Rental?> currentRental() async => sampleRental(status: status);
  @override
  Future<Rental> rental(String id) async => sampleRental(status: status);
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => const [];
  @override
  Future<List<PricingPlan>> plans() async => const [];
  @override
  Future<Me> me() async => Me((b) => b..email = 'cliente@volti.dev');
}

void main() {
  setUpAll(loadAppFonts);
  for (final s in [RentalStatus.active, RentalStatus.paused]) {
    testWidgets('corrida ${s.name}', (t) async {
      t.view.physicalSize = const Size(390 * 3, 844 * 3);
      t.view.devicePixelRatio = 3;
      addTearDown(t.view.reset);
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(_GoldenRide(s)),
        realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump(const Duration(seconds: 2));
      await expectLater(find.byType(RideScreen), matchesGoldenFile('goldens/corrida_${s.name}.png'));
    });
  }
}
```

(o `Me` precisa dos campos obrigatórios do modelo — copie o builder usado em `_RideB.me()` de `ride_return_receipt_test.dart`.)

- [ ] **Step 4: Gerar e validar goldens**

Run: `cd packages/volti_flutter && C:/flutter/bin/flutter test --update-goldens test/goldens_test.dart && C:/flutter/bin/flutter test test/goldens_test.dart && cd ../../apps/cliente && C:/flutter/bin/flutter test --update-goldens test/goldens_test.dart && C:/flutter/bin/flutter test test/goldens_test.dart`
Expected: PASS nas execuções sem `--update-goldens`. Abra os PNGs e confira que o texto está em Plus Jakarta Sans (não blocos). Goldens são gerados no Windows do dono: rode sempre na mesma plataforma.

- [ ] **Step 5: Perfil da corrida (integration_test)**

`pubspec.yaml` (dev_dependencies): `integration_test: { sdk: flutter }` e `flutter_driver: { sdk: flutter }`; rode `C:/flutter/bin/flutter pub get`.

```dart
// apps/cliente/test_driver/perf_driver.dart
import 'package:flutter_driver/flutter_driver.dart' as driver;
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver(responseDataCallback: (data) async {
      final timeline = driver.Timeline.fromJson(data!['ride_timeline'] as Map<String, dynamic>);
      final summary = driver.TimelineSummary.summarize(timeline);
      await summary.writeTimelineToFile('ride_timeline', pretty: true, includeSummary: true);
      final s = summary.summaryJson;
      final build = (s['worst_frame_build_time_millis'] as num).toDouble();
      final raster = (s['worst_frame_rasterizer_time_millis'] as num).toDouble();
      if (build > 16 || raster > 16) throw StateError('Frame lento na corrida: build ${build}ms, raster ${raster}ms');
    });
```

```dart
// apps/cliente/integration_test/ride_perf_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/widgets.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';

import '../test/helpers.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('corrida: 60 s de telemetria sem frame lento', (t) async {
    final rt = FakeRealtime();
    await t.pumpWidget(testApp(const RideScreen(), overrides: [
      backendProvider.overrideWithValue(GoldenRideBackend()),
      realtimeFactoryProvider.overrideWithValue(() => rt),
      mapEnabledProvider.overrideWithValue(true),
    ]));
    await t.pumpAndSettle(const Duration(seconds: 2));
    await binding.traceAction(() async {
      for (var i = 0; i < 60; i++) {
        rt.emit(VehiclePositionEvent(lat: -23.5610 - i * 0.00004, lng: -46.6510 - i * 0.00004, speedKmh: 15 + (i % 5).toDouble(), batteryPct: 80 - i ~/ 10, speedLimitKmh: 32));
        await t.pump(const Duration(seconds: 1));
      }
    }, reportKey: 'ride_timeline');
  });
}
```

(mova `_GoldenRide` do Step 3 para `test/helpers.dart` como `GoldenRideBackend` público, com status padrão `active`, e use-o nos dois arquivos.)

Run (emulador Pixel_10 aberto): `cd apps/cliente && C:/flutter/bin/flutter drive --profile --driver=test_driver/perf_driver.dart --target=integration_test/ride_perf_test.dart -d emulator-5554`
Expected: "All tests passed"; `build/ride_timeline.timeline_summary.json` com `worst_frame_*` ≤ 16. Rode uma vez no commit anterior à Task 19 para o "antes" e anote os dois números no README.

- [ ] **Step 6: Prints e READMEs**

Copie os goldens para `docs/design/screenshots/fluidez/fase4/` (antes = goldens gerados no commit anterior à Task 18, depois = atuais). `apps/cliente/README.md`: seção "Movimento e desempenho" (ripple do tema, filtro único de tiles, `ride_motion.dart`, notifiers da corrida, listas preguiçosas, devolução por evento, como rodar goldens e o `flutter drive --profile`). `packages/volti_flutter/README.md`: ripple no tema e goldens.

- [ ] **Step 7: Commit**

```bash
git add apps/cliente packages/volti_flutter docs/design/screenshots/fluidez/fase4
git commit -m "test(cliente): goldens das telas principais e perfil da corrida"
```

---

# Fase 5 — Backend: compressão, cache, geocoder e índice (spec 4.4.1, 4.4.3, 4.4.5)

Entrega: respostas comprimidas e revalidáveis; URL do catálogo estável; `/vehicles` nunca espera o geocoder; `nearby` com índice espacial.

### Task 25: Compressão HTTP

**Depende da decisão 8.6** (meta "payload comprimido ≥ 60% menor").

**Files:**
- Modify: `services/api/package.json` (`compression`, `@types/compression`)
- Modify: `services/api/src/bootstrap.ts` (`configureApp`)
- Test: `services/api/src/common/http-perf.spec.ts`

**Interfaces:**
- Produces: toda resposta HTTP ≥ 1 KB sai comprimida (gzip/br conforme `Accept-Encoding`); Socket.IO não muda.

- [ ] **Step 1: Teste**

```ts
// services/api/src/common/http-perf.spec.ts
import { Controller, Get } from '@nestjs/common';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHarness, type Harness } from '../../test/helpers/http-harness';
import { Public } from './public.decorator';

@Controller('perf-fixture')
class FixtureController {
  @Public()
  @Get()
  list() {
    return { items: Array.from({ length: 300 }, (_, i) => ({ id: `veh-${i}`, code: `VLT-${String(i).padStart(4, '0')}`, status: 'free', address: 'R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo', batteryPct: 80 })) };
  }
}

function rawGet(port: number, path: string, headers: Record<string, string>): Promise<{ headers: http.IncomingHttpHeaders; bytes: number; status: number }> {
  return new Promise((ok, fail) => {
    http.get({ port, path, headers }, (res) => {
      let bytes = 0;
      res.on('data', (c: Buffer) => (bytes += c.length));
      res.on('end', () => ok({ headers: res.headers, bytes, status: res.statusCode ?? 0 }));
    }).on('error', fail);
  });
}

describe('compressão HTTP', () => {
  let h: Harness; let port: number;
  beforeAll(async () => { h = await createHarness({ controllers: [FixtureController] }); await h.app.listen(0); port = (h.app.getHttpServer().address() as AddressInfo).port; });
  afterAll(() => h.app.close());

  it('gzip quando o cliente aceita, ≥ 60% menor que sem compressão', async () => {
    const plain = await rawGet(port, '/perf-fixture', { 'accept-encoding': 'identity' });
    const gz = await rawGet(port, '/perf-fixture', { 'accept-encoding': 'gzip' });
    expect(plain.headers['content-encoding']).toBeUndefined();
    expect(gz.headers['content-encoding']).toBe('gzip');
    expect(gz.bytes).toBeLessThanOrEqual(plain.bytes * 0.4);
  });
});
```

(confira o nome/caminho do decorator de rota pública usado nos controllers — ex.: `health.controller.ts`; se o harness já não exige auth para controllers sem guard, remova `@Public()`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/common/http-perf.spec.ts`
Expected: FAIL — sem `content-encoding`.

- [ ] **Step 3: Implementar**

Run: `pnpm --filter api add compression@1.8.0 && pnpm --filter api add -D @types/compression@1.7.5` (confira com `npm view compression version` que 1.8.x é a versão com brotli; fixe a versão exata sem `^`, como as demais).

Em `configureApp`, logo depois do middleware de `X-Request-Id`:

```ts
import compression from 'compression';
  // Fluidez (spec 4.4.1): JSON da frota/listas encolhe ~80%; abaixo de 1 KB não compensa.
  app.use(compression({ threshold: 1024 }));
```

- [ ] **Step 4: Rodar**

Run: `pnpm --filter api exec jest --config jest.config.js src/common/ && pnpm --filter api lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/package.json pnpm-lock.yaml services/api/src/bootstrap.ts services/api/src/common/http-perf.spec.ts
git commit -m "perf(api): compressão HTTP (gzip/br) a partir de 1 KB"
```

### Task 26: `Cache-Control` e ETag nas leituras de catálogo, planos, zonas e consentimentos

**Files:**
- Create: `services/api/src/common/cache-control.ts`
- Modify: `services/api/src/bootstrap.ts` (interceptor global)
- Modify: `services/api/src/modules/catalog/catalog.controller.ts:13-15`, `services/api/src/modules/pricing/pricing.controller.ts:10-12`, `services/api/src/modules/zones/zones.controller.ts:12-14`, `services/api/src/modules/lgpd/lgpd.controller.ts:18-21`
- Test: `services/api/src/common/http-perf.spec.ts` (acrescentar)

**Interfaces:**
- Produces: `CacheControl(directive: string)` (decorator de método); `CacheControlInterceptor`; constante `REVALIDATE = 'private, no-cache'`.

Decisão de desenho (desvio do spec registrado em `docs/decisoes.md` na Task 29): catálogo, planos, zonas e consentimentos são editáveis no painel/app; `max-age` faria o painel ver a versão velha logo depois de salvar (o TanStack Query refaz o GET e o navegador responderia do cache). Usamos `private, no-cache` + ETag: o cliente sempre revalida e o servidor responde `304` sem corpo quando nada mudou.

- [ ] **Step 1: Teste**

Acrescente a `http-perf.spec.ts`:

```ts
import { CacheControl, REVALIDATE } from './cache-control';

@Controller('cache-fixture')
class CacheFixtureController {
  @Public() @CacheControl(REVALIDATE) @Get() list() { return { items: [{ id: 'a', name: 'Plano' }] }; }
  @Public() @Get('plain') plain() { return { ok: true }; }
}

describe('cache HTTP', () => {
  let h: Harness; let port: number;
  beforeAll(async () => { h = await createHarness({ controllers: [CacheFixtureController] }); await h.app.listen(0); port = (h.app.getHttpServer().address() as AddressInfo).port; });
  afterAll(() => h.app.close());

  it('rota marcada: private, no-cache + ETag; If-None-Match igual → 304 sem corpo', async () => {
    const first = await rawGet(port, '/cache-fixture', {});
    expect(first.headers['cache-control']).toBe('private, no-cache');
    expect(first.headers.etag).toBeDefined();
    const again = await rawGet(port, '/cache-fixture', { 'if-none-match': String(first.headers.etag) });
    expect(again.status).toBe(304);
    expect(again.bytes).toBe(0);
  });
  it('rota não marcada não ganha Cache-Control', async () => {
    expect((await rawGet(port, '/cache-fixture/plain', {})).headers['cache-control']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/common/http-perf.spec.ts`
Expected: FAIL — módulo `./cache-control` não existe. (Se o ETag/304 já passar antes do Step 3, é o ETag padrão do Express: o spec dizia "sem ETag"; registre isso na decisão.)

- [ ] **Step 3: Implementar**

```ts
// services/api/src/common/cache-control.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

const KEY = 'volti:cache-control';
/** Revalida sempre (com ETag do Express → 304 quando não mudou). Recursos editáveis não usam max-age. */
export const REVALIDATE = 'private, no-cache';
export const CacheControl = (directive: string) => SetMetadata(KEY, directive);

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() === 'http') {
      const directive = this.reflector.get<string | undefined>(KEY, ctx.getHandler());
      const req = ctx.switchToHttp().getRequest<Request>();
      if (directive && req.method === 'GET') ctx.switchToHttp().getResponse<Response>().setHeader('Cache-Control', directive);
    }
    return next.handle();
  }
}
```

Em `configureApp`: `app.useGlobalInterceptors(new CacheControlInterceptor(app.get(Reflector)));` (import `Reflector` de `@nestjs/core`). Nos quatro controllers, acima do `@Get(...)` dos métodos `list` (catálogo `vehicle-models`), `listPlans`, `list` (zonas) e `consents`: `@CacheControl(REVALIDATE)`.

- [ ] **Step 4: Rodar**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: PASS (inclui os specs de contrato existentes).

- [ ] **Step 5: Commit**

```bash
git add services/api/src
git commit -m "perf(api): Cache-Control com revalidação (ETag/304) em catálogo, planos, zonas e consentimentos"
```

### Task 27: URL assinada do catálogo reaproveitada (~10 min)

**Files:**
- Create: `services/api/src/common/signed-url-cache.ts`
- Modify: `services/api/src/modules/catalog/catalog.service.ts:60-64`
- Test: `services/api/src/common/signed-url-cache.spec.ts`

**Interfaces:**
- Produces: `class SignedUrlCache { constructor(reuseMs?: number, now?: () => number, max?: number); get(key: string, sign: () => Promise<string>): Promise<string> }` (padrão: 10 min, até 1000 chaves).

- [ ] **Step 1: Teste**

```ts
// services/api/src/common/signed-url-cache.spec.ts
import { SignedUrlCache } from './signed-url-cache';

describe('SignedUrlCache', () => {
  it('mesma URL por 10 min; depois assina de novo', async () => {
    let t = 0; let n = 0;
    const c = new SignedUrlCache(10 * 60_000, () => t);
    const sign = async () => `https://s3/x?sig=${++n}`;
    expect(await c.get('catalog/a.jpg', sign)).toBe('https://s3/x?sig=1');
    t = 9 * 60_000;
    expect(await c.get('catalog/a.jpg', sign)).toBe('https://s3/x?sig=1');
    t = 10 * 60_000 + 1;
    expect(await c.get('catalog/a.jpg', sign)).toBe('https://s3/x?sig=2');
  });
  it('chave nova (foto trocada) assina na hora; limite de chaves descarta a mais antiga', async () => {
    const c = new SignedUrlCache(60_000, () => 0, 2);
    let n = 0; const sign = async () => String(++n);
    await c.get('a', sign); await c.get('b', sign); await c.get('c', sign);
    expect(await c.get('a', sign)).toBe('4');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/common/signed-url-cache.spec.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// services/api/src/common/signed-url-cache.ts
/**
 * Reaproveita URL assinada (GET no S3) por `reuseMs` para o navegador/app conseguir cachear a imagem
 * (URL nova a cada requisição anulava o cache). A assinatura vale 24 h; o reuso é bem menor que isso.
 */
export class SignedUrlCache {
  private readonly entries = new Map<string, { url: string; until: number }>();
  constructor(private readonly reuseMs = 10 * 60_000, private readonly now: () => number = Date.now, private readonly max = 1000) {}

  async get(key: string, sign: () => Promise<string>): Promise<string> {
    const hit = this.entries.get(key);
    if (hit && hit.until > this.now()) return hit.url;
    const url = await sign();
    this.entries.delete(key);
    this.entries.set(key, { url, until: this.now() + this.reuseMs });
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value as string);
    return url;
  }
}
```

Em `CatalogService`: campo `private readonly photoUrls = new SignedUrlCache();` e em `photoUrl(m)`:

```ts
    return this.photoUrls.get(`${this.cfg.buckets.catalog}/${m.photoObjectKey}`, async () =>
      (await this.storage.presignGet({ bucket: this.cfg.buckets.catalog, key: m.photoObjectKey!, expiresInSeconds: PHOTO_URL_TTL_SECONDS })).url);
```

(mantenha o `if (!m.photoObjectKey) return undefined;` que já existe antes.)

- [ ] **Step 4: Rodar**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/common/signed-url-cache.ts services/api/src/common/signed-url-cache.spec.ts services/api/src/modules/catalog/catalog.service.ts
git commit -m "perf(api): URL assinada do catálogo estável por 10 min (cache do navegador volta a valer)"
```

### Task 28: Geocodificação fora do caminho da requisição

**Files:**
- Modify: `services/api/src/modules/vehicles/vehicle-address.service.ts` (`ensure`)
- Modify: `services/api/src/modules/vehicles/vehicle-address.service.spec.ts` (testes existentes passam a esperar o segundo plano)
- Test: mesmo arquivo

**Interfaces:**
- Produces: `ensure<T extends AddressRow>(rows: T[]): Promise<T[]>` devolve na hora com o endereço já gravado (pode estar desatualizado ou ausente); `whenIdle(): Promise<void>` (para testes e desligamento); geocodificação em fila única, sem duplicar a mesma moto.

O cache Redis continua por célula de ~11 m (`cached-reverse-geocoder.ts`) e o recálculo a cada 50 m de deslocamento; o spec cita "célula de ~100 m" — manter a grade atual não muda o custo da requisição (que deixa de esperar o geocoder) e evita endereço impreciso. Registrado como desvio na Task 29.

- [ ] **Step 1: Testes**

Acrescente a `vehicle-address.service.spec.ts` (reaproveite a criação de `prisma`/`svc` do `beforeEach` existente):

```ts
  it('não espera o geocoder: devolve na hora e grava depois', async () => {
    let resolve!: (v: string) => void;
    geocoder.reverse.mockReturnValue(new Promise<string>((ok) => (resolve = ok)));
    const rows = [{ id: 'v1', lat: -23.56, lng: -46.65, addressLabel: null }];
    const started = Date.now();
    const out = await svc.ensure(rows);
    expect(Date.now() - started).toBeLessThan(50);
    expect(out[0].addressLabel).toBeNull();
    resolve('R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo');
    await svc.whenIdle();
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: 'v1' }, data: expect.objectContaining({ addressLabel: 'R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo' }) });
  });

  it('mesma moto em duas leituras seguidas geocodifica uma vez', async () => {
    geocoder.reverse.mockResolvedValue('Rua X');
    const row = () => [{ id: 'v1', lat: -23.56, lng: -46.65, addressLabel: null }];
    await svc.ensure(row());
    await svc.ensure(row());
    await svc.whenIdle();
    expect(geocoder.reverse).toHaveBeenCalledTimes(1);
  });

  it('erro do geocoder não derruba a fila', async () => {
    geocoder.reverse.mockRejectedValueOnce(new Error('fora')).mockResolvedValueOnce('Rua Y');
    await svc.ensure([{ id: 'a', lat: 1, lng: 1, addressLabel: null }, { id: 'b', lat: 2, lng: 2, addressLabel: null }]);
    await svc.whenIdle();
    expect(prisma.vehicle.updateMany).toHaveBeenCalledTimes(1);
  });
```

Nos testes existentes que esperavam `rows[0].addressLabel` preenchido logo após `ensure`, acrescente `await svc.whenIdle();` e verifique a gravação (`updateMany`) em vez da mutação da linha; os testes de orçamento (`BUDGET_MS`) saem, porque não há mais orçamento por leitura.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/modules/vehicles/vehicle-address.service.spec.ts`
Expected: FAIL — `whenIdle` não existe; `ensure` espera o geocoder.

- [ ] **Step 3: Implementar**

```ts
  private readonly queued = new Map<string, { lat: number; lng: number }>();
  private draining: Promise<void> | null = null;

  /**
   * Fluidez (spec 4.4.3): a leitura nunca espera o geocoder. Devolve o endereço já gravado e agenda o
   * recálculo das motos que andaram > 50 m (uma por vez, sem repetir a mesma moto). Nunca lança.
   */
  async ensure<T extends AddressRow>(rows: T[]): Promise<T[]> {
    for (const r of rows) if (needsAddress(r) && !this.queued.has(r.id)) this.queued.set(r.id, { lat: r.lat, lng: r.lng });
    if (this.queued.size && !this.draining) this.draining = this.drain().finally(() => { this.draining = null; });
    return rows;
  }

  /** Resolve quando a fila de endereços esvaziar. */
  async whenIdle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  private async drain(): Promise<void> {
    for (const [id, p] of this.queued) {
      try {
        const label = await withTimeout(this.geocoder.reverse(p.lat, p.lng), CALL_TIMEOUT_MS);
        if (label) {
          await this.prisma.vehicle.updateMany({ where: { id }, data: { addressLabel: label, addressLat: p.lat, addressLng: p.lng, addressUpdatedAt: new Date() } });
        }
      } catch (err) {
        this.logger.warn({ msg: 'vehicle_address_failed', vehicleId: id, error: (err as Error).message });
      } finally {
        this.queued.delete(id);
      }
    }
  }
```

(iterar um `Map` enquanto se apaga a entrada corrente e se acrescentam novas é seguro em JS: entradas novas também são visitadas.) Remova `BUDGET_MS` e o comentário de orçamento; mantenha `withTimeout`, `CALL_TIMEOUT_MS`, `needsAddress` e `label()`.

- [ ] **Step 4: Rodar**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: PASS (`vehicles.service.spec.ts` continua passando; se algum teste de lista esperava endereço recém-calculado, ajuste para o endereço gravado).

- [ ] **Step 5: Commit**

```bash
git add services/api/src/modules/vehicles
git commit -m "perf(api): /vehicles não espera mais o geocoder (endereço em segundo plano)"
```

### Task 29: Índice espacial em `Vehicle` e fechamento da Fase 5

**Files:**
- Create: `services/api/prisma/migrations/20261027090000_vehicle_geo_index/migration.sql`
- Test: `services/api/src/modules/vehicles/vehicle-geo-index.spec.ts`
- Modify: `services/api/README.md`, `docs/decisoes.md`

**Interfaces:**
- Produces: índice GiST `Vehicle_geog_idx` sobre `(ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography)` — a mesma expressão de `ST_DWithin` em `VehiclesService.nearby`.

- [ ] **Step 1: Teste (expressão do índice = expressão da consulta)**

```ts
// services/api/src/modules/vehicles/vehicle-geo-index.spec.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

const norm = (s: string) => s.replace(/\bv\./g, '').replace(/\s+/g, '');
const EXPR = 'ST_SetSRID(ST_MakePoint("lng","lat"),4326)::geography';

describe('índice espacial de Vehicle', () => {
  it('migração cria GiST na mesma expressão usada pelo nearby (senão o Postgres não usa o índice)', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261027090000_vehicle_geo_index/migration.sql'), 'utf8');
    expect(norm(sql)).toContain(`USINGGIST((${EXPR}))`);
    const svc = readFileSync(path.resolve(__dirname, 'vehicles.service.ts'), 'utf8');
    expect(norm(svc)).toContain(`ST_DWithin(${EXPR}`);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/modules/vehicles/vehicle-geo-index.spec.ts`
Expected: FAIL — arquivo de migração não existe.

- [ ] **Step 3: Migração**

```sql
-- Fluidez (spec 4.4.5): índice espacial para /vehicles/nearby crescer com a frota.
-- Mesma expressão do ST_DWithin em VehiclesService.nearby. Expressão não é representável no schema.prisma:
-- se um `prisma migrate dev` futuro gerar DROP INDEX "Vehicle_geog_idx", apague essa linha da migração gerada.
CREATE INDEX IF NOT EXISTS "Vehicle_geog_idx" ON "Vehicle" USING GIST ((ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography));
```

- [ ] **Step 4: Rodar e validar na AWS dev**

Run: `pnpm --filter api exec jest --config jest.config.js src/modules/vehicles/vehicle-geo-index.spec.ts && pnpm --filter api test`
Expected: PASS.
Na AWS dev (sem Docker local), depois do deploy da migração: `EXPLAIN SELECT id FROM "Vehicle" v WHERE ST_DWithin(ST_SetSRID(ST_MakePoint(v."lng", v."lat"), 4326)::geography, ST_SetSRID(ST_MakePoint(-46.65, -23.56), 4326)::geography, 1000);` deve mostrar `Index Scan using "Vehicle_geog_idx"` (com poucas linhas o planejador pode preferir Seq Scan; rode com `SET enable_seqscan = off;` só para confirmar que o índice é elegível). Medir `GET /vehicles` p95 (meta da decisão 8.6: < 300 ms) com a frota simulada e anotar no README.

- [ ] **Step 5: Decisões e README**

Em `docs/decisoes.md`, nova seção:

```md
## 2026-10-26 · fluidez do backend (branch `feat/fluidez`) · status: proposta

1. **Compressão** `compression` (gzip/br) a partir de 1 KB em todas as respostas HTTP; WebSocket inalterado.
2. **Cache HTTP por revalidação, não por `max-age`.** Catálogo, planos, zonas e consentimentos respondem `Cache-Control: private, no-cache` com o ETag padrão do Express (304 sem corpo). `max-age` faria o painel ver dados velhos logo depois de salvar (spec 4.4.1 pedia "max-age curtos").
3. **URL assinada do catálogo** reaproveitada por 10 min por chave de objeto (assinatura de 24 h).
4. **Endereço da moto em segundo plano.** `/vehicles` devolve o último endereço gravado; motos que andaram > 50 m entram numa fila única. A grade de cache segue ~11 m (spec citava ~100 m).
5. **Índice GiST** `Vehicle_geog_idx` na expressão de `nearby`; não aparece no `schema.prisma`.
```

Em `services/api/README.md`, seção "Desempenho" com os cinco itens e o comando do EXPLAIN.

- [ ] **Step 6: Commit**

```bash
git add services/api/prisma/migrations/20261027090000_vehicle_geo_index services/api/src/modules/vehicles/vehicle-geo-index.spec.ts services/api/README.md docs/decisoes.md
git commit -m "perf(api): índice espacial em Vehicle para nearby"
```

---

# Fase 6 — Início de aluguel com progresso e simplificação de trajeto (spec 4.4.2, 4.3.5, 4.4.4)

Entrega: o cliente vê "reservando a moto → caução → seguro → destravando" em vez de um spinner de até 35 s; caução e seguro em paralelo no cartão; trajetos simplificados no servidor para replay e recibo.

### Task 30: Contrato — evento `rental.start-progress` na sala do cliente

**Depende da decisão 8.4** (`POST /rentals` continua síncrono + eventos de progresso, em vez de 202 + polling).

**Files:**
- Modify: `packages/contracts/realtime.md` (Salas, Eventos, Detalhes, Tipos TypeScript)
- Modify: `packages/contracts/openapi.yaml` (descrição de `POST /rentals`, linha ~1175)
- Modify: `apps/admin/src/lib/types.ts` (se `RealtimeEvents` for copiado de `realtime.md`, acrescente o tipo — o painel não assina o evento)
- Modify: `docs/decisoes.md`

**Interfaces:**
- Produces: sala `user:{customerId}` documentada (já existe no gateway, `realtime.gateway.ts`: `socket.join(\`user:${principal.customerId}\`)`); evento `rental.start-progress` com payload `{ attemptId: string; step: 'vehicle' | 'deposit' | 'insurance' | 'unlock'; state: 'active' | 'done' | 'failed'; ts: string }`, onde `attemptId` = valor do header `Idempotency-Key` da chamada a `POST /rentals`.

- [ ] **Step 1: `realtime.md`**

Na tabela de Salas:

```md
| `user:{customerId}` | o próprio cliente | sempre, ao conectar (sem posição: só eventos do início do aluguel) |
```

Na tabela de Eventos:

```md
| `rental.start-progress` | `user:{customerId}` | `{ attemptId, step: 'vehicle' \| 'deposit' \| 'insurance' \| 'unlock', state: 'active' \| 'done' \| 'failed', ts }` |
```

Em "Detalhes por evento":

```md
- **`rental.start-progress`** — etapas do `POST /rentals` em andamento, para o app mostrar progresso em vez de um spinner. `attemptId` é o `Idempotency-Key` enviado na chamada (o app gera e já conhece; o servidor nunca inventa outro). Ordem típica: `vehicle` (elegibilidade e disponibilidade) → `deposit` e `insurance` (em paralelo no cartão) → `unlock` (espera a confirmação da moto, até `IOT_COMMAND_TIMEOUT_MS` + 5 s). Em erro, a etapa em curso chega como `failed` e a resposta HTTP traz o problema. A resposta de `POST /rentals` continua sendo a fonte da verdade; o evento é só apresentação e pode se perder (o app conecta antes de chamar e tolera ausência). Sem dados de localização (LGPD). Uma repetição respondida pelo cache de idempotência não emite eventos.
```

No bloco TypeScript, acrescente:

```ts
  'rental.start-progress': { attemptId: string; step: 'vehicle' | 'deposit' | 'insurance' | 'unlock'; state: 'active' | 'done' | 'failed'; ts: string };
```

- [ ] **Step 2: `openapi.yaml`**

Na `description` de `POST /rentals`, acrescente a frase: "Enquanto a chamada está em andamento, o cliente recebe `rental.start-progress` na sala `user:{customerId}` do WebSocket, com `attemptId` = `Idempotency-Key` (ver `realtime.md`)."

- [ ] **Step 3: Validar contrato**

Run: `pnpm --filter @volti/contracts test && pnpm contracts:generate`
Expected: lint/typecheck PASS; gerados sem diferença funcional (só a descrição).

- [ ] **Step 4: Decisão**

Em `docs/decisoes.md`, seção da fluidez, acrescente:

```md
6. **Progresso do início do aluguel por evento (decisão 8.4 do spec de fluidez).** `POST /rentals` continua síncrono (sem quebrar clientes); o servidor publica `rental.start-progress` na sala `user:{customerId}` (sala que já existia no gateway e agora está documentada), com `attemptId` = `Idempotency-Key`. Alternativa rejeitada: 202 + polling (muda o contrato do fluxo mais sensível).
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts docs/decisoes.md apps/admin/src/lib/types.ts
git commit -m "docs(contracts): evento rental.start-progress na sala user:{customerId}"
```

### Task 31: API emite o progresso e paraleliza caução e seguro no cartão

**Depende da decisão 8.4.**

**Files:**
- Create: `services/api/src/modules/rentals/rental-start-progress.ts`
- Modify: `services/api/src/common/events.ts` (`EV.RENTAL_START_PROGRESS`)
- Modify: `services/api/src/modules/rentals/rental-start.service.ts` (`start`, linhas 163–310)
- Modify: `services/api/src/modules/realtime/realtime.gateway.ts` (handler novo)
- Test: `services/api/src/modules/rentals/rental-start-progress.spec.ts`, `services/api/src/modules/rentals/rental-start.service.spec.ts` (acrescentar), `services/api/src/modules/realtime/realtime.gateway.spec.ts` (acrescentar)

**Interfaces:**
- Produces:
  - `EV.RENTAL_START_PROGRESS = 'rental.start-progress'`
  - `type StartStep = 'vehicle' | 'deposit' | 'insurance' | 'unlock'`; `type StartStepState = 'active' | 'done' | 'failed'`
  - `interface RentalStartProgressEvent { customerId: string; attemptId: string; step: StartStep; state: StartStepState; ts: string }`
  - `class StartProgress { constructor(emit: (e: RentalStartProgressEvent) => void, customerId: string, attemptId: string | undefined, now?: () => Date); begin(step: StartStep): void; done(step: StartStep): void; fail(): void }`

- [ ] **Step 1: Teste do emissor**

```ts
// services/api/src/modules/rentals/rental-start-progress.spec.ts
import { StartProgress, type RentalStartProgressEvent } from './rental-start-progress';

describe('StartProgress', () => {
  const now = () => new Date('2026-10-26T12:00:00.000Z');
  it('emite active/done e, em falha, failed só para as etapas em curso', () => {
    const out: RentalStartProgressEvent[] = [];
    const p = new StartProgress((e) => out.push(e), 'c1', 'key-1', now);
    p.begin('vehicle'); p.done('vehicle'); p.begin('deposit'); p.begin('insurance'); p.done('insurance'); p.fail();
    expect(out.map((e) => `${e.step}:${e.state}`)).toEqual(['vehicle:active', 'vehicle:done', 'deposit:active', 'insurance:active', 'insurance:done', 'deposit:failed']);
    expect(out[0]).toEqual({ customerId: 'c1', attemptId: 'key-1', step: 'vehicle', state: 'active', ts: '2026-10-26T12:00:00.000Z' });
  });
  it('sem attemptId não emite nada', () => {
    const emit = jest.fn();
    const p = new StartProgress(emit, 'c1', undefined, now);
    p.begin('vehicle'); p.fail();
    expect(emit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/modules/rentals/rental-start-progress.spec.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Emissor e evento**

```ts
// services/api/src/modules/rentals/rental-start-progress.ts
export type StartStep = 'vehicle' | 'deposit' | 'insurance' | 'unlock';
export type StartStepState = 'active' | 'done' | 'failed';
export interface RentalStartProgressEvent { customerId: string; attemptId: string; step: StartStep; state: StartStepState; ts: string }

/** Etapas do POST /rentals para o app (realtime.md, `rental.start-progress`). Só apresentação: nunca lança. */
export class StartProgress {
  private readonly running = new Set<StartStep>();
  constructor(
    private readonly emit: (e: RentalStartProgressEvent) => void,
    private readonly customerId: string,
    private readonly attemptId: string | undefined,
    private readonly now: () => Date = () => new Date(),
  ) {}
  begin(step: StartStep): void { this.running.add(step); this.send(step, 'active'); }
  done(step: StartStep): void { this.running.delete(step); this.send(step, 'done'); }
  fail(): void { for (const s of this.running) this.send(s, 'failed'); this.running.clear(); }
  private send(step: StartStep, state: StartStepState): void {
    if (!this.attemptId) return;
    try { this.emit({ customerId: this.customerId, attemptId: this.attemptId, step, state, ts: this.now().toISOString() }); } catch { /* apresentação */ }
  }
}
```

Em `events.ts`, dentro de `EV`: `RENTAL_START_PROGRESS: 'rental.start-progress',`.

- [ ] **Step 4: Testes do serviço**

Acrescente a `rental-start.service.spec.ts` (usa `h`, `billing`, `insurance`, `commands`, `body` e os mocks do `beforeEach` existente; o caminho feliz é o mesmo do teste "começa com caução retida"):

```ts
  describe('progresso e paralelismo (fluidez)', () => {
    it('emite as etapas com attemptId = Idempotency-Key, na ordem', async () => {
      const ee = h.app.get(EventEmitter2);
      const seen: string[] = [];
      const off = (e: { step: string; state: string; attemptId: string }) => seen.push(`${e.step}:${e.state}:${e.attemptId}`);
      ee.on(EV.RENTAL_START_PROGRESS, off);
      // (arranje o caminho feliz como no teste existente de início com cartão: holdDeposit → held, issueForRental → apólice, unlock confirmado)
      await request(h.app.getHttpServer()).post('/rentals').set('Authorization', `Bearer ${customerToken()}`).set('Idempotency-Key', 'key-123').send(body).expect(201);
      ee.off(EV.RENTAL_START_PROGRESS, off);
      expect(seen[0]).toBe('vehicle:active:key-123');
      expect(seen).toEqual(expect.arrayContaining(['vehicle:done:key-123', 'deposit:done:key-123', 'insurance:done:key-123', 'unlock:active:key-123', 'unlock:done:key-123']));
      expect(seen.indexOf('unlock:active:key-123')).toBeGreaterThan(seen.indexOf('deposit:done:key-123'));
    });

    it('no cartão, caução e seguro começam juntos', async () => {
      const order: string[] = [];
      billing.holdDeposit.mockImplementation(async () => { order.push('deposit:start'); await new Promise((r) => setTimeout(r, 20)); order.push('deposit:end'); return { depositId: DEPOSIT_ID, status: 'held' }; });
      insurance.issueForRental.mockImplementation(async () => { order.push('insurance:start'); await new Promise((r) => setTimeout(r, 20)); order.push('insurance:end'); return { policyId: POLICY_ID, premiumCents: 300 }; });
      // (resto do caminho feliz igual ao teste acima)
      await request(h.app.getHttpServer()).post('/rentals').set('Authorization', `Bearer ${customerToken()}`).set('Idempotency-Key', 'key-par').send(body).expect(201);
      expect(order.slice(0, 2).sort()).toEqual(['deposit:start', 'insurance:start']);
    });

    it('caução recusada com seguro já emitido: cancela a apólice e marca deposit como failed', async () => {
      billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'failed' });
      insurance.issueForRental.mockResolvedValue({ policyId: POLICY_ID, premiumCents: 300 });
      const ee = h.app.get(EventEmitter2);
      const seen: string[] = [];
      const off = (e: { step: string; state: string }) => seen.push(`${e.step}:${e.state}`);
      ee.on(EV.RENTAL_START_PROGRESS, off);
      await request(h.app.getHttpServer()).post('/rentals').set('Authorization', `Bearer ${customerToken()}`).set('Idempotency-Key', 'key-fail').send(body).expect(402);
      ee.off(EV.RENTAL_START_PROGRESS, off);
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
      expect(seen).toContain('deposit:failed');
    });

    it('Pix continua sequencial (sem apólice antes de o Pix ser pago)', async () => {
      billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'awaiting_pix', pix: { expiresAt: new Date(Date.now() + 900_000).toISOString() } });
      await request(h.app.getHttpServer()).post('/rentals').set('Authorization', `Bearer ${customerToken()}`).set('Idempotency-Key', 'key-pix').send({ ...body, depositMethod: 'pix' }).expect(202);
      expect(insurance.issueForRental).not.toHaveBeenCalled();
    });
  });
```

(para o `prisma.deposit.findUnique` do caminho feliz, use o mesmo mock dos testes existentes; o terceiro teste precisa que `findUnique` devolva uma caução `status: 'failed'` ou o fluxo atual de `held.status === 'failed'` — siga o teste existente de "payment-failed".)

- [ ] **Step 5: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/modules/rentals/rental-start.service.spec.ts`
Expected: FAIL nos quatro testes novos (sem eventos; caução e seguro sequenciais).

- [ ] **Step 6: Ligar no serviço**

Em `start(user, dto, idempotencyKey)`: renomeie o corpo atual para `private async startInner(user, dto, idempotencyKey, progress: StartProgress)` e crie:

```ts
  async start(user: Principal, dto: StartRentalDto, idempotencyKey: string): Promise<StartResult> {
    const progress = new StartProgress((e) => this.events.emit(EV.RENTAL_START_PROGRESS, e), user.customerId!, idempotencyKey);
    try {
      return await this.startInner(user, dto, idempotencyKey, progress);
    } catch (err) {
      progress.fail();
      throw err;
    }
  }
```

Dentro de `startInner`: `progress.begin('vehicle')` na primeira linha; `progress.done('vehicle')` logo antes do comentário `// ── caução ──`. No ramo `else` (sem `dto.depositId`), troque a chamada sequencial `holdDeposit` + (mais adiante) `issueForRental` por:

```ts
      rentalId = randomUUID();
      progress.begin('deposit');
      const parallel = dto.depositMethod === 'card';
      if (parallel) progress.begin('insurance');
      const [heldR, policyR] = await Promise.allSettled([
        this.billing.holdDeposit({ customerId, rentalId, method: dto.depositMethod, idempotencyKey: `deposit:${customerId}:${idempotencyKey}` }),
        parallel ? this.insurance.issueForRental({ rentalId, customerId, coverage: dto.coverage }) : Promise.resolve(null),
      ]);
      // A apólice emitida entra na compensação do catch mesmo se a caução falhar.
      if (policyR.status === 'fulfilled' && policyR.value) { policyId = policyR.value.policyId; earlyPolicy = policyR.value; progress.done('insurance'); }
      if (policyR.status === 'rejected') throw policyR.reason;
      if (heldR.status === 'rejected') throw heldR.reason;
      const held = heldR.value;
      // (validações atuais de `held`/`d` sem mudança)
```

com `let earlyPolicy: { policyId: string; premiumCents: number } | null = null;` junto das outras variáveis. Depois das validações da caução (e do `return` 202 do Pix), `progress.done('deposit')` (também no ramo `if (dto.depositId)`, que é só leitura: `progress.begin('deposit')` no início e `progress.done('deposit')` no fim). Na emissão da apólice:

```ts
    if (!earlyPolicy) progress.begin('insurance');
    const policy = earlyPolicy ?? (await this.insurance.issueForRental({ rentalId, customerId, coverage: dto.coverage }));
    policyId = policy.policyId;
    if (!earlyPolicy) progress.done('insurance');
```

Em volta de `unlock = await this.unlockAndWait(...)`: `progress.begin('unlock')` antes e `progress.done('unlock')` depois de passar as duas verificações (`locked_by_staff`/`!== 'confirmed'`). O `catch` de compensação existente (linhas ~311–335) não muda: ele já cancela `policyId` e libera a caução.

- [ ] **Step 7: Gateway**

Acrescente a `realtime.gateway.ts`:

```ts
  /** Etapas do POST /rentals só para o próprio cliente (sala `user:{customerId}`; sem posição). */
  @OnEvent(EV.RENTAL_START_PROGRESS)
  onStartProgress(ev: RentalStartProgressEvent): void {
    this.server?.to(`user:${ev.customerId}`).emit('rental.start-progress', { attemptId: ev.attemptId, step: ev.step, state: ev.state, ts: ev.ts });
  }
```

e o teste em `realtime.gateway.spec.ts` (crie o gateway como o `beforeEach` existente faz):

```ts
  it('rental.start-progress vai só para a sala do cliente, sem customerId no payload', () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    (gateway as unknown as { server: unknown }).server = { to };
    gateway.onStartProgress({ customerId: 'c1', attemptId: 'k', step: 'unlock', state: 'active', ts: '2026-10-26T12:00:00.000Z' });
    expect(to).toHaveBeenCalledWith('user:c1');
    expect(emit).toHaveBeenCalledWith('rental.start-progress', { attemptId: 'k', step: 'unlock', state: 'active', ts: '2026-10-26T12:00:00.000Z' });
  });
```

- [ ] **Step 8: Rodar**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: PASS (todos os testes existentes de início do aluguel continuam passando — o comportamento HTTP não mudou).

- [ ] **Step 9: Commit**

```bash
git add services/api/src
git commit -m "feat(api): progresso do início do aluguel por evento e caução+seguro em paralelo no cartão"
```

### Task 32: App — progresso do desbloqueio na tela de plano

**Depende da decisão 8.4.**

**Files:**
- Create: `apps/cliente/lib/features/plan/start_progress.dart`
- Modify: `apps/cliente/lib/core/services.dart` (evento `RentalStartProgress` e `socket.on('rental.start-progress')`)
- Modify: `apps/cliente/lib/features/plan/plan_screen.dart` (`_pay`, linhas 109–145; `build` perto do botão `loading: _busy`, linha ~252)
- Modify: `apps/cliente/lib/l10n/app_pt.arb` (+ `flutter gen-l10n`)
- Test: `apps/cliente/test/start_progress_test.dart`

**Interfaces:**
- Consumes: `newIdempotencyKey()` (`core/backend.dart`), `Backend.startRental(request, {idempotencyKey})`, `realtimeFactoryProvider`, `VoltiSuccessCheck`.
- Produces: `class RentalStartProgress extends RealtimeEvent { attemptId, step, state }`; `enum StartStep { vehicle, deposit, insurance, unlock }`; `enum StartStepState { todo, active, done, failed }`; `class StartProgressState { final Map<StartStep, StartStepState> steps; final bool succeeded; StartProgressState apply(String step, String state); StartProgressState success(); }`; widget `StartProgressPanel(state: StartProgressState)`.

- [ ] **Step 1: Testes**

```dart
// apps/cliente/test/start_progress_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/features/plan/start_progress.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

void main() {
  test('aplica etapas do servidor e ignora valores desconhecidos', () {
    var s = StartProgressState.initial();
    s = s.apply('vehicle', 'done').apply('deposit', 'active').apply('insurance', 'active').apply('xyz', 'done');
    expect(s.steps[StartStep.vehicle], StartStepState.done);
    expect(s.steps[StartStep.deposit], StartStepState.active);
    expect(s.steps[StartStep.unlock], StartStepState.todo);
    expect(s.apply('deposit', 'failed').failed, isTrue);
    expect(s.success().succeeded, isTrue);
  });

  testWidgets('painel mostra as quatro etapas em pt-BR e o check no sucesso', (t) async {
    await t.pumpWidget(testApp(Scaffold(body: StartProgressPanel(state: StartProgressState.initial().apply('vehicle', 'done').apply('unlock', 'active')))));
    for (final label in ['Reservando a moto', 'Caução', 'Seguro', 'Destravando a moto']) {
      expect(find.text(label), findsOneWidget);
    }
    await t.pumpWidget(testApp(Scaffold(body: StartProgressPanel(state: StartProgressState.initial().success()))));
    await t.pump(const Duration(milliseconds: 600));
    expect(find.byType(VoltiSuccessCheck), findsOneWidget);
  });
}
```

Acrescente a um teste de tela de plano existente (ou crie em `start_progress_test.dart`, com o fake do plano usado em `screens_test.dart`): ao tocar em pagar, o `FakeRealtime` recebe `connect()` antes de `startRental`, e emitir `RentalStartProgress(attemptId: <key passada ao fake>, step: 'unlock', state: 'active')` mostra "Destravando a moto" como ativa. No fake, capture o `idempotencyKey` recebido por `startRental` e devolva o resultado só depois de um `Completer` controlado pelo teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `C:/flutter/bin/flutter test test/start_progress_test.dart`
Expected: FAIL — `start_progress.dart` não existe.

- [ ] **Step 3: Textos**

Em `lib/l10n/app_pt.arb`:

```json
  "startStepVehicle": "Reservando a moto",
  "startStepDeposit": "Caução",
  "startStepInsurance": "Seguro",
  "startStepUnlock": "Destravando a moto",
  "startDone": "Moto destravada. Boa viagem!",
```

Run: `C:/flutter/bin/flutter gen-l10n`.

- [ ] **Step 4: Estado e painel**

```dart
// apps/cliente/lib/features/plan/start_progress.dart
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

enum StartStep { vehicle, deposit, insurance, unlock }
enum StartStepState { todo, active, done, failed }

/// Etapas do POST /rentals vindas de `rental.start-progress` (realtime.md).
class StartProgressState {
  const StartProgressState(this.steps, {this.succeeded = false});
  factory StartProgressState.initial() => StartProgressState({for (final s in StartStep.values) s: StartStepState.todo});
  final Map<StartStep, StartStepState> steps;
  final bool succeeded;

  bool get failed => steps.values.contains(StartStepState.failed);

  StartProgressState apply(String step, String state) {
    final s = StartStep.values.where((e) => e.name == step).firstOrNull;
    final st = StartStepState.values.where((e) => e.name == state).firstOrNull;
    if (s == null || st == null || st == StartStepState.todo) return this;
    return StartProgressState({...steps, s: st}, succeeded: succeeded);
  }

  StartProgressState success() => StartProgressState({for (final s in StartStep.values) s: StartStepState.done}, succeeded: true);
}

class StartProgressPanel extends StatelessWidget {
  const StartProgressPanel({super.key, required this.state});
  final StartProgressState state;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final labels = {StartStep.vehicle: l.startStepVehicle, StartStep.deposit: l.startStepDeposit, StartStep.insurance: l.startStepInsurance, StartStep.unlock: l.startStepUnlock};
    return AnimatedSwitcher(
      duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
      switchInCurve: VoltiMotion.easeOut,
      switchOutCurve: VoltiMotion.easeExit,
      child: state.succeeded
          ? Column(key: const ValueKey('done'), mainAxisSize: MainAxisSize.min, children: [
              const VoltiSuccessCheck(),
              const SizedBox(height: VoltiSpacing.s12),
              Text(l.startDone, style: VoltiTypography.bodyStrong),
            ])
          : Column(key: const ValueKey('steps'), mainAxisSize: MainAxisSize.min, children: [
              for (final s in StartStep.values)
                Semantics(
                  label: '${labels[s]}: ${state.steps[s]!.name}',
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s6),
                    child: Row(children: [
                      _StepIcon(state.steps[s]!),
                      const SizedBox(width: VoltiSpacing.s12),
                      Expanded(child: Text(labels[s]!, style: state.steps[s] == StartStepState.active ? VoltiTypography.bodyStrong : VoltiTypography.body)),
                    ]),
                  ),
                ),
            ]),
    );
  }
}

class _StepIcon extends StatelessWidget {
  const _StepIcon(this.state);
  final StartStepState state;
  @override
  Widget build(BuildContext context) => switch (state) {
        StartStepState.done => const Icon(LucideIcons.circleCheck, color: VoltiColors.brand, size: 22),
        StartStepState.failed => const Icon(LucideIcons.circleX, color: VoltiColors.danger, size: 22),
        StartStepState.active => const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: VoltiColors.brand)),
        StartStepState.todo => const Icon(LucideIcons.circle, color: VoltiColors.ink300, size: 22),
      };
}
```

(se `context.l` vier de outro import — ex.: `../../core/widgets.dart` ou da extensão de l10n — use o mesmo import da `plan_screen.dart`; confira os nomes dos ícones Lucide no pacote, ex.: `circleCheck`/`circleCheckBig`.)

- [ ] **Step 5: Evento no RealtimeService**

Em `services.dart`:

```dart
class RentalStartProgress extends RealtimeEvent {
  const RentalStartProgress({required this.attemptId, required this.step, required this.state});
  final String attemptId;
  final String step;
  final String state;
}
```

e em `connect()`:

```dart
    socket.on('rental.start-progress', (d) {
      final j = m(d);
      _controller.add(RentalStartProgress(attemptId: j['attemptId'] as String, step: j['step'] as String, state: j['state'] as String));
    });
```

Atualize os `switch` exaustivos sobre `RealtimeEvent` (ex.: `ride_screen.dart` `_onEvent`) com `case RentalStartProgress(): break;`.

- [ ] **Step 6: Tela de plano**

No estado: `final _progress = ValueNotifier<StartProgressState?>(null);` (descartar em `dispose`). Em `_pay`, depois de `_busy = true`:

```dart
    final attemptId = newIdempotencyKey();
    final rt = ref.read(realtimeFactoryProvider)();
    final sub = rt.events.listen((e) {
      if (e is RentalStartProgress && e.attemptId == attemptId && _progress.value != null) _progress.value = _progress.value!.apply(e.step, e.state);
    });
    _progress.value = StartProgressState.initial();
    try {
      // Conecta antes de chamar: os eventos chegam durante a espera. Sem socket em 1,5 s, segue sem progresso.
      await rt.connect().catchError((_) {});
      await rt.connected.firstWhere((up) => up).timeout(const Duration(milliseconds: 1500), onTimeout: () => false);
      var result = await backend.startRental(request, idempotencyKey: attemptId);
      // (bloco atual do Pix: na segunda chamada, gere outro attemptId e reinicie _progress)
      _progress.value = _progress.value?.success();
      await Future<void>.delayed(VoltiMotion.scaled(context, const Duration(milliseconds: 900)));
      // (resto atual: limpar cupom, invalidar providers, context.go('/ride'))
    } catch (e) {
      if (mounted) setState(() => _error = failureText(l, e));
    } finally {
      await sub.cancel();
      rt.dispose();
      _progress.value = null;
      if (mounted) setState(() => _busy = false);
    }
```

(o `attemptId` do Pix: troque `final attemptId` por `var attemptId` e, antes da segunda `startRental`, faça `attemptId = newIdempotencyKey(); _progress.value = StartProgressState.initial();`, passando-o em `idempotencyKey:` — o listener lê a variável atual.) No `build`, acima do botão de pagar:

```dart
          ValueListenableBuilder<StartProgressState?>(
            valueListenable: _progress,
            builder: (context, s, _) => AnimatedSize(
              duration: VoltiMotion.scaled(context, VoltiMotion.durSlow),
              curve: VoltiMotion.easeScreen,
              child: s == null ? const SizedBox(width: double.infinity) : Padding(padding: const EdgeInsets.only(bottom: VoltiSpacing.s16), child: StartProgressPanel(state: s)),
            ),
          ),
```

- [ ] **Step 7: Rodar**

Run: `C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS (testes existentes da tela de plano usam `FakeRealtime` via `realtimeFactoryProvider` — acrescente o override onde faltar).

- [ ] **Step 8: Commit**

```bash
git add apps/cliente/lib apps/cliente/test/start_progress_test.dart
git commit -m "feat(cliente): etapas do desbloqueio com sucesso animado em vez de spinner"
```

### Task 33: Contrato — parâmetro `simplify` nos trajetos

**Depende da decisão 8.5** (mudança de contrato).

**Files:**
- Modify: `packages/contracts/openapi.yaml` (`components.parameters`, `/vehicles/{id}/track` linha 745, `/rentals/{id}/track` linha 1491, descrição de `/rentals/{id}/receipt`)
- Modify: `docs/decisoes.md`
- Regenerate: `packages/contracts/generated/ts`, `packages/contracts/generated/dart`

**Interfaces:**
- Produces: query `simplify` (inteiro 0–50, metros) em `getVehicleTrack` e `getRentalTrack`; Dart `getRentalTrack(id: ..., simplify: int?)`; TS `query: { from, to, simplify? }`.

- [ ] **Step 1: Parâmetro**

Em `components.parameters` (perto de `Limit`):

```yaml
    Simplify:
      name: simplify
      in: query
      required: false
      description: Tolerância de simplificação do trajeto em metros (Douglas-Peucker no servidor; primeiro e último ponto sempre ficam). Ausente ou 0 = todos os pontos.
      schema: { type: integer, minimum: 0, maximum: 50 }
```

Em `/vehicles/{id}/track` → `parameters`, acrescente `- $ref: '#/components/parameters/Simplify'`; em `/rentals/{id}/track`, acrescente `parameters` com `- $ref: '#/components/parameters/PathId'` (já existe) e `- $ref: '#/components/parameters/Simplify'`. Na `description` de `/rentals/{id}/receipt`, acrescente: "O trajeto do recibo vem simplificado com tolerância de 5 m."

- [ ] **Step 2: Validar e gerar**

Run: `pnpm --filter @volti/contracts test && pnpm contracts:generate` (o gerador Dart precisa de Java no PATH).
Expected: PASS; diffs em `generated/ts/schema.d.ts` e no `RentalsApi`/`VehiclesApi` do Dart com o parâmetro novo.

- [ ] **Step 3: Decisão**

Em `docs/decisoes.md`, seção da fluidez: "7. **`simplify` nos trajetos (decisão 8.5).** Parâmetro opcional em metros (0–50) em `GET /vehicles/{id}/track` e `GET /rentals/{id}/track`; o recibo usa 5 m fixos. Aditivo: clientes atuais recebem todos os pontos."

- [ ] **Step 4: Commit**

```bash
git add packages/contracts docs/decisoes.md
git commit -m "docs(contracts): parâmetro simplify nos trajetos"
```

### Task 34: API simplifica trajetos e consumidores usam, com fechamento da Fase 6

**Depende da decisão 8.5.**

**Files:**
- Create: `services/api/src/common/simplify.ts`
- Test: `services/api/src/common/simplify.spec.ts`
- Modify: `services/api/src/modules/vehicles/vehicles.dto.ts:123-129` (`TrackQuery.simplify`), `services/api/src/modules/vehicles/vehicles.controller.ts:58-59`, `services/api/src/modules/vehicles/vehicles.service.ts:224-237`
- Modify: `services/api/src/modules/rentals/rentals.controller.ts:114-121`, `services/api/src/modules/rentals/rentals.service.ts:193-229`, `services/api/src/modules/rentals/rentals.dto.ts` (`SimplifyQuery`)
- Modify: `apps/admin/src/app/(panel)/fleet/page.tsx:297` (replay pede `simplify: 3`)
- Modify: `apps/cliente/lib/features/ride/ride_data.dart:16-17` (`simplify: 5`)
- Modify: `services/api/README.md`, `apps/admin/README.md`, `apps/cliente/README.md`

**Interfaces:**
- Produces: `simplifyTrack<T extends { lat: number; lng: number }>(points: T[], toleranceM: number): T[]`; `RECEIPT_SIMPLIFY_M = 5`; `SimplifyQuery { simplify?: number }`.

- [ ] **Step 1: Teste do algoritmo**

```ts
// services/api/src/common/simplify.spec.ts
import { simplifyTrack } from './simplify';

const line = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: -23.56 + i * 0.0001, lng: -46.65, i }));

describe('simplifyTrack (Douglas-Peucker em metros)', () => {
  it('reta vira dois pontos, mantendo os objetos originais das pontas', () => {
    const pts = line(100);
    const out = simplifyTrack(pts, 5);
    expect(out).toEqual([pts[0], pts[99]]);
    expect(out[0]).toBe(pts[0]);
  });
  it('desvio maior que a tolerância fica; menor some', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 0.0001, lng: 0.0002 }, { lat: 0, lng: 0.0004 }]; // meio ~11 m fora da reta
    expect(simplifyTrack(pts, 5)).toHaveLength(3);
    expect(simplifyTrack(pts, 20)).toHaveLength(2);
  });
  it('tolerância 0 ou poucos pontos: devolve igual', () => {
    const pts = line(10);
    expect(simplifyTrack(pts, 0)).toBe(pts);
    expect(simplifyTrack(pts.slice(0, 2), 5)).toHaveLength(2);
    expect(simplifyTrack([], 5)).toEqual([]);
  });
  it('20.000 pontos em menos de 100 ms', () => {
    const pts = Array.from({ length: 20_000 }, (_, i) => ({ lat: -23.56 + Math.sin(i / 50) * 0.001, lng: -46.65 + i * 0.00001 }));
    const t = Date.now();
    simplifyTrack(pts, 5);
    expect(Date.now() - t).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api exec jest --config jest.config.js src/common/simplify.spec.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar (iterativo, sem recursão)**

```ts
// services/api/src/common/simplify.ts
const M_PER_DEG = 111_320;

/** Douglas-Peucker com distâncias em metros (projeção equirretangular local; erro desprezível na escala de uma cidade). */
export function simplifyTrack<T extends { lat: number; lng: number }>(points: T[], toleranceM: number): T[] {
  if (!(toleranceM > 0) || points.length <= 2) return points;
  const k = Math.cos((points[0].lat * Math.PI) / 180);
  const x = (p: T) => p.lng * M_PER_DEG * k;
  const y = (p: T) => p.lat * M_PER_DEG;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = x(points[a]), ay = y(points[a]), bx = x(points[b]), by = y(points[b]);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = x(points[i]) - ax, py = y(points[i]) - ay;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const ex = px - t * dx, ey = py - t * dy;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > toleranceM) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i] === 1);
}
```

- [ ] **Step 4: Ligar nos endpoints**

`vehicles.dto.ts` (`TrackQuery`) e `rentals.dto.ts` (novo `SimplifyQuery` com o mesmo campo):

```ts
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(50)
  simplify?: number;
```

(imports `Transform` de `class-transformer`; `IsOptional, IsInt, Min, Max` de `class-validator`.) `vehicles.controller.ts`: `return this.vehicles.track(id, q.from, q.to, q.simplify);`; em `VehiclesService.track(id, fromIso, toIso, simplify = 0)`: `const pts = points.map((p) => ({ lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, recordedAt: p.recordedAt.toISOString() })); return { vehicleId: id, points: simplifyTrack(pts, simplify) };`. `rentals.controller.ts`: `track(@Param('id', ParseUUIDPipe) id: string, @Query() q: SimplifyQuery, @CurrentUser() user: Principal) { return this.rentals.track(user, id, q.simplify); }`; `RentalsService.track(user, id, simplify = 0)` aplica `simplifyTrack` do mesmo jeito; em `receipt`, chame `this.track(user, id, RECEIPT_SIMPLIFY_M)` com `export const RECEIPT_SIMPLIFY_M = 5;` no topo de `rentals.service.ts`.

Teste no spec existente do serviço de aluguéis (ou de veículos): `GET /rentals/{id}/track?simplify=5` com 100 pontos colineares mockados em `prisma.trackPoint.findMany` devolve 2 pontos; `?simplify=99` → 400; sem parâmetro → 100 pontos.

- [ ] **Step 5: Consumidores**

Painel (`fleet/page.tsx:297`): `api.GET('/vehicles/{id}/track', { params: { path: { id: vehicleId }, query: { ...w, simplify: 3 } } })`. App (`ride_data.dart`): `(await api.getRentalsApi().getRentalTrack(id: rentalId, simplify: 5)).data` (nome do parâmetro conforme o código Dart gerado na Task 33).

- [ ] **Step 6: Rodar tudo**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api test:contract && pnpm --filter admin exec vitest run && pnpm --filter admin lint && cd apps/cliente && C:/flutter/bin/flutter analyze && C:/flutter/bin/flutter test`
Expected: PASS em todos (`test:contract` valida as respostas contra o OpenAPI novo).

- [ ] **Step 7: READMEs, prints e entrega**

READMEs: `services/api` (simplify + progresso do início), `apps/admin` (replay simplificado), `apps/cliente` (etapas do desbloqueio, trajeto simplificado). Prints da tela de plano com as etapas e do recibo em `docs/design/screenshots/fluidez/fase6/`. Rode a bateria final: `pnpm -r lint && pnpm -r test` + `pnpm --filter admin exec playwright test -c e2e-mock/playwright.mock.config.ts e2e-mock/` + `flutter test` nos dois pacotes Flutter, e escreva no PR o resumo (o que foi feito, como rodar localmente, testes executados, pendências: polling de chat/recarga/Pix sem evento no contrato; Central de ajuda sem lista preguiçosa por ser fixa; decisões 8.x ainda não confirmadas que tenham sido implementadas).

- [ ] **Step 8: Commit**

```bash
git add services/api apps/admin apps/cliente docs/design/screenshots/fluidez/fase6
git commit -m "feat: trajetos simplificados no servidor para replay e recibo"
```

---

## Lacunas do spec encontradas ao planejar (para o dono)

1. **Cursor opaco em `GET /vehicles`**: "3 páginas por vez" é impossível na mesma lista; a Task 13 paraleliza por `status` (já no contrato), sem mudança de contrato.
2. **Progresso do início antes de existir aluguel**: o cliente só entra em `rental:{id}` depois do início, e o `rentalId` nasce no servidor. A Task 30 usa a sala `user:{customerId}`, que já existe no gateway mas não estava em `realtime.md`, e usa `attemptId = Idempotency-Key`.
3. **Ordem real do início** é caução → seguro → reserva da moto → destravamento (o spec fala em "seguro e caução após a reserva"). A Task 31 paraleliza caução e seguro só no cartão; no Pix a apólice seria emitida antes do pagamento.
4. **"Polling → eventos" no chat, na recarga e no Pix**: o cliente não recebe esses eventos hoje. Só a devolução muda (Task 23); o resto fica pendente e pede mudança de contrato.
5. **Otimistas**: não existe endpoint para "reconhecer" alerta (vira atribuir/resolver), "concluir tarefa" não é feito no painel e pausar/retomar assinatura é só do cliente (`decisoes.md`, 2026-10-22, item 1). Ficam fora.
6. **Cache HTTP**: com `max-age`, o painel veria dados velhos depois de salvar. A Task 26 usa `private, no-cache` com ETag. O ETag padrão do Express pode já estar ativo; o teste da Task 26 tira a dúvida.
7. **Geocoder "célula de ~100 m"**: a grade atual é de ~11 m, com recálculo a cada 50 m. A Task 28 mantém a grade e só tira a espera do caminho da requisição.
8. **Já existiam**: contadores animados nos StatTiles (`numeric`) e ripple nos `VoltiButton` (`VoltiRipple`). O `splashFactory: NoSplash` fica em `packages/volti_flutter/lib/src/theme.dart:68`, e não em `apps/cliente/lib/core/theme.dart`.
9. **Sem tarefa**: os popovers do painel (não há componente, só a dica do MapLibre, que já tem entrada) e a Central de ajuda (5 perguntas fixas, sem ganho com lista preguiçosa).
10. **`--ease-exit` não tinha valor no spec**: o plano propõe `cubic-bezier(.4,0,1,1)`, dentro da decisão 8.1.
