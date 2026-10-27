# e2e-mock: painel com API mockada

Sem Docker, API local nem rede: toda chamada para `http://api.mock.local` e interceptada por `page.route`, o socket.io por `page.routeWebSocket` e os tiles do OSM respondem um PNG 1x1.

Rodar (em `apps/admin`): `pnpm exec playwright test -c playwright.mock.config.ts [arquivo] [-g padrao]`
(o config sobe `next dev -p 3100` com `NEXT_PUBLIC_AUTH_MODE=dev`; `E2E_CHROME` aponta outro Chrome/Chromium).

- `fixtures.ts`: dados no formato do contrato (`@volti/contracts`), incluindo galpões, cadastro de estações e entregas.
- Endpoints do galpão mockados (só leitura, mais `POST`/`PATCH /depots`): `/depots`, `/depots/{id}`, `/depots/{id}/vehicles`, `/depots/{id}/pickups`, `/swap-stations/registry`, `/swap-stations/{id}/swaps`, `/handovers`, `/handovers/{id}`, `/batteries/{id}/movements`, `/payments/deposits`. `GET /batteries` devolve `statusCounts` (BatteryPage).
- Os fixtures não entram no `tsc` do `pnpm lint`; para checar contra o contrato: `tsc --noEmit -p` com um tsconfig que inclua `e2e-mock/**/*.ts`.
- `mock-api.ts`: `installMockApi(page, { group, socket: 'on'|'off', latencyMs, failPaths })` devolve `{ calls, unmocked, emit, db }`. Endpoint sem handler responde 404 e entra em `unmocked`.
- `login.ts`: `loginMocked` (token dev na sessionStorage, sem credencial) e `loginViaUi`.
- `helpers.ts`: coletor de problemas (`collect`), `overflowReport`, `focusReport`, `shot`.
- Specs: `sweep.spec.ts` (todas as rotas, desktop 1440x900 e celular 390x844), `states.spec.ts` (carregando/erro/401), `known-bugs.spec.ts` (regressoes `[BUG P1-xx]` que falham ate o bug ser corrigido).
- `__shots__/` e `__results__/` nao sao versionados.
