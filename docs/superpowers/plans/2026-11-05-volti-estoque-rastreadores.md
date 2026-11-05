# Estoque de rastreadores e instalação na moto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar rastreadores GT06/J16 (com chip) em estoque e instalar/trocar/remover na moto pelo painel, com a ponte cuidando do Traccar sozinha.

**Architecture:** API ganha o módulo `trackers` (lista, cadastro, instalar/remover na moto) e grava o último sinal do rastreador do estoque; a ponte relê o registro a cada 30 s e cria/renomeia o aparelho no Traccar; o painel ganha a aba "Rastreadores" e o bloco "Rastreador e chip" na ficha da moto.

**Tech Stack:** NestJS + Prisma (PostgreSQL 16), class-validator, jest; traccar-bridge (TS, jest); Next.js + react-query + openapi-fetch, vitest SSR; OpenAPI 3.1; bash (`deploy/single/gt06.sh`).

**Spec:** `docs/superpowers/specs/2026-11-05-volti-estoque-rastreadores-design.md` (inclui "Decisões após a leitura do construtor")

## Global Constraints

- Contrato primeiro (`packages/contracts/openapi.yaml`); clientes regerados (`pnpm contracts:generate`) no mesmo commit; decisão em `docs/decisoes.md`.
- Código em inglês; interface e mensagens de erro em pt-BR; datas UTC ISO 8601; exibição em America/Sao_Paulo.
- Logs JSON sem dados pessoais; IMEI em log/auditoria só mascarado (`maskImei` de `services/api/src/cli/provision-gt06.ts`: só os 4 últimos dígitos).
- Rastreador do estoque: `thingName = 'gt06-' + imei`, `vehicleId = null`. Instalado: `thingName = Vehicle.thingName`, `vehicleId = moto`.
- Lista de rastreadores = `Tracker` com `controlMode = 'relay_only'`, `imei` não nulo, `certificateArn` nulo.
- Online = último sinal há no máximo 180 s (instalado: `Vehicle.lastSeenAt`; estoque: `Tracker.lastSeenAt`). Gravação do `Tracker.lastSeenAt` no máximo a cada 15 s por rastreador.
- Instalar/trocar/remover recusados (409) com: aluguel aberto (`hasOpenRental`), reserva em uso (`hasInUseReservation`), lock/unlock `VehicleCommand` em andamento criado nos últimos 5 min, trava em andamento no Redis (mesma checagem do `provision-gt06`).
- Permissões: `GET /trackers` → `admin`,`operacao`,`suporte`; `POST /trackers`, `PUT`/`DELETE /vehicles/{id}/tracker` → `admin`,`operacao`; console continua só `admin` (oculto para os demais).
- Modelos aceitos: `J16`.
- Ponte: `REGISTRY_REFRESH_MS` padrão 30000. Usuário da ponte no Traccar com `deviceReadonly: false`, `deviceLimit: -1`.
- Sem Docker local; unitários locais; e2e da API não roda.

## Review Focus

1. Instalar um rastreador numa moto que já tem outro: o antigo volta ao estoque (`gt06-<IMEI>`) antes do novo assumir o `thingName` da moto, sem violar a unicidade — teste na Task 2.
2. Instalar o mesmo rastreador que já está na moto: não faz nada e responde 200 — teste na Task 2.
3. Telemetria de `gt06-<IMEI>` chegando 10× em 5 s grava `lastSeenAt` uma vez só e não emite nada de trava/cerca — teste na Task 3.
4. Ponte: Traccar já tem o aparelho com nome antigo `moto-0059` e o registro diz `gt06-869890080273430` → renomeia, não cria duplicado — teste na Task 4.
5. Painel: operação sem permissão de admin vê o bloco "Rastreador e chip" com Instalar/Trocar/Remover, mas não vê o console — teste na Task 5.

---

### Task 1: Contrato, migração e decisões

**Files:**
- Modify: `packages/contracts/openapi.yaml`, `packages/contracts/generated/**` (regerado)
- Modify: `services/api/prisma/schema.prisma`; Create: `services/api/prisma/migrations/20261105200000_tracker_stock/migration.sql`
- Modify: `docs/decisoes.md` (nova entrada 2026-11-05 "Estoque de rastreadores", resumindo spec + decisões)

**Interfaces — Produces (OpenAPI):**
- `TrackerModel`: enum `J16`.
- `TrackerDevice`: `id` (uuid), `imei` (`^[0-9]{15}$`), `model` (`TrackerModel`), `installed` (boolean), `vehicleId` (uuid|null), `vehicleCode` (string|null), `simCard` (`SimCardSummary`|null), `online` (boolean), `lastSeenAt` (date-time|null), `createdAt`.
- `TrackerDeviceList`: `{ items: TrackerDevice[] }`.
- `CreateTrackerRequest`: `imei` (obrigatório), `model` (obrigatório), `simCardId` (uuid, opcional — vincula um chip do estoque).
- `InstallTrackerRequest`: `trackerId` (uuid, obrigatório).
- `GET /trackers` (`listTrackers`; query `q` dígitos do IMEI, `installed` boolean, `vehicleId` uuid) → 200 `TrackerDeviceList`.
- `POST /trackers` (`createTracker`) → 201 `TrackerDevice`; 409 IMEI já cadastrado; 409 chip já vinculado.
- `PUT /vehicles/{id}/tracker` (`installVehicleTracker`) → 200 `TrackerDevice` (instala ou troca); 404; 409 conforme Global Constraints e "rastreador instalado em outra moto".
- `DELETE /vehicles/{id}/tracker` (`removeVehicleTracker`) → 200 `TrackerDevice` (agora no estoque); 404 moto sem rastreador; 409 regras.
- `CreateSimCardRequest`/`UpdateSimCardRequest` ganham `trackerId` (uuid; no update aceita `null`); descrição: `vehicleId` e `trackerId` juntos → 400.
- `PATCH /vehicles/{id}` documenta 409 quando muda `thingName` com rastreador instalado.
- Grupos conforme Global Constraints.

**Interfaces — Produces (Prisma):** `Tracker.model String?` e `Tracker.lastSeenAt DateTime?`. Migração: `ALTER TABLE "Tracker" ADD COLUMN "model" TEXT, ADD COLUMN "lastSeenAt" TIMESTAMP(3)`; `UPDATE "Tracker" SET "model" = 'J16' WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`; `UPDATE "Tracker" SET "thingName" = 'gt06-' || "imei" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL AND "vehicleId" IS NULL`.

- [ ] **Step 1:** Editar OpenAPI; `pnpm --filter @volti/contracts lint` → sem erros.
- [ ] **Step 2:** `pnpm contracts:generate` → TS e Dart sem erro.
- [ ] **Step 3:** Prisma + migração; `pnpm --filter api exec prisma validate && pnpm --filter api exec prisma generate && pnpm --filter api exec jest src/prisma-migrations.spec.ts src/contract-schemas` → PASS (`contract-security.spec.ts` falha até a Task 2 — esperado).
- [ ] **Step 4:** Entrada em `docs/decisoes.md`. Commit `feat(contracts): estoque de rastreadores e instalação na moto`.

### Task 2: API — módulo de rastreadores (estoque, instalar, trocar, remover)

**Files:**
- Create: `services/api/src/modules/trackers/{trackers.module.ts,trackers.controller.ts,trackers.service.ts,trackers.dto.ts,trackers.mapper.ts,trackers.service.spec.ts}`
- Create: `services/api/src/modules/trackers/install-guards.ts` (+ spec) — checagens compartilhadas
- Modify: `services/api/src/cli/provision-gt06.ts` (passa a usar `install-guards.ts` para aluguel/reserva/trava no Redis; comportamento igual)
- Modify: `services/api/src/modules/sim-cards/*` (`trackerId` no create/update; `vehicleId`+`trackerId` → 400)
- Modify: `services/api/src/modules/vehicles/vehicles.service.ts` (PATCH com `thingName` diferente e rastreador instalado → 409 "Esta moto tem rastreador instalado; remova o rastreador antes de mudar o identificador.")
- Modify: `app.module.ts`, `services/api/src/contract-security.spec.ts` (contagem +4), `services/api/README.md`

**Interfaces:**
- Consumes: Task 1; `hasOpenRental`, `hasInUseReservation` (`vehicle-in-use.ts`); Redis store usado pelo `provision-gt06`; cache de modo do rastreador (`iot/tracker-mode.ts`) — invalidar o `thingName` afetado se houver função para isso.
- Produces: `TrackersService.list(q)`, `.create(dto, actor)`, `.install(vehicleId, trackerId, actor)`, `.remove(vehicleId, actor)` retornando `TrackerDevice`; `stockThingName(imei: string): string` (= `'gt06-' + imei`) exportado do mapper; `assertVehicleFreeForTrackerChange(tx, redis, vehicleId, thingNames: string[]): Promise<void>` em `install-guards.ts` (lança `ConflictException` pt-BR).

- [ ] **Step 1: Testes que falham** (`trackers.service.spec.ts`, Prisma mockado no estilo de `sim-cards.service.spec.ts`):
  - `create` grava `thingName 'gt06-869890080273430'`, `controlMode 'relay_only'`, `protocol 'gt06'`, `model 'J16'`; IMEI com 14 dígitos → 400; IMEI repetido → 409; com `simCardId` vincula o chip; chip já vinculado → 409.
  - `install` em moto sem rastreador: `thingName` vira o da moto e `vehicleId` = moto.
  - `install` em moto com outro rastreador: o antigo é atualizado para `gt06-<imei antigo>`/`vehicleId null` **antes** do novo (verificar ordem das chamadas).
  - `install` do mesmo rastreador já instalado → retorna sem escrever.
  - `install` de rastreador instalado em outra moto → 409 "Este rastreador está instalado na VLT-0060. Remova de lá primeiro.".
  - `install`/`remove` com aluguel aberto, reserva em uso, lock em andamento (<5 min) ou trava no Redis → 409; lock antigo (>5 min) não bloqueia.
  - `remove` devolve ao estoque e mantém o chip vinculado; moto sem rastreador → 404.
  - `list` calcula `online` (sinal ≤180 s) pela moto quando instalado e pelo `Tracker.lastSeenAt` no estoque; ignora `certificateArn` não nulo.
  - auditoria `tracker.create`/`tracker.install`/`tracker.remove` com `metadata` só `{ imeiLast4, vehicleId? }`.
  - sim-cards: `trackerId` vincula a rastreador do estoque; `vehicleId`+`trackerId` → 400. vehicles: PATCH `thingName` com rastreador → 409.
- [ ] **Step 2:** `pnpm --filter api exec jest src/modules/trackers src/modules/sim-cards src/modules/vehicles src/cli` → FAIL nos novos.
- [ ] **Step 3:** Implementar (transação; ordem de updates do Review Focus 1; P2002 → 409).
- [ ] **Step 4:** `pnpm --filter api exec jest` (completo) PASS; `pnpm --filter api lint` e `tsc --noEmit` limpos.
- [ ] **Step 5:** README. Commit `feat(api): estoque de rastreadores e instalação na moto`.

### Task 3: API — último sinal do rastreador no estoque

**Files:**
- Modify: `services/api/src/modules/iot/telemetry.service.ts` (ramo de `thingName` sem moto, telemetria e status)
- Create: `services/api/src/modules/iot/stock-tracker-heartbeat.ts` (+ spec)

**Interfaces:**
- Produces: `StockTrackerHeartbeat.touch(thingName: string, at: number): Promise<void>` — só age se `thingName` começa com `gt06-`; no máximo uma escrita a cada 15 s por `thingName` (memória); `prisma.tracker.updateMany({ where: { thingName, vehicleId: null }, data: { lastSeenAt } })`; erro de banco só gera log `stock_heartbeat_failed` (sem IMEI).

- [ ] **Step 1: Testes que falham:** 10 chamadas em 5 s → 1 escrita; outra após 16 s → 2ª escrita; `moto-0059` → nenhuma escrita; telemetria de `gt06-…` no `telemetry.service` chama `touch` e **não** chama `live.applyTelemetry`, cerca nem trava (spec existente do telemetry).
- [ ] **Step 2:** `pnpm --filter api exec jest src/modules/iot` → FAIL.
- [ ] **Step 3:** Implementar e registrar o provider no módulo IoT.
- [ ] **Step 4:** `pnpm --filter api exec jest` completo PASS; lint e tsc limpos.
- [ ] **Step 5:** Commit `feat(api): último sinal do rastreador em estoque`.

### Task 4: Ponte e Traccar — aparelho criado/renomeado sozinho

**Files:**
- Modify: `services/traccar-bridge/src/config.ts` (`REGISTRY_REFRESH_MS` padrão 30000), `src/traccar/rest.ts` (`createDevice(name, uniqueId)`, `updateDeviceName(device, name)`), `src/bridge.ts` (após `loadRegistry`: `ensureTraccarDevices()`; `thingName` trocado para um IMEI → pendentes de console da coisa antiga falham com `erro`), fake do Traccar nos testes
- Modify: `deploy/single/gt06.sh` (`init`: garantir `deviceReadonly:false`, `deviceLimit:-1` no usuário `bridge@volti.local` via `PUT /api/users/{id}` com o admin, idempotente), e o teste de infra que cobre o `gt06.sh` se houver
- Modify: `services/traccar-bridge/README.md`, `deploy/single/cloudshell.md` (o `gt06.sh provision` deixa de ser necessário para J16 novo: cadastrar pelo painel)

**Interfaces:**
- Produces: `ensureTraccarDevices(): Promise<{ created: number; renamed: number }>`; se `created > 0` chama o mecanismo existente de reabertura do WebSocket (respeitando `SOCKET_REOPEN_MIN_MS`).

- [ ] **Step 1: Testes que falham:** registro com IMEI sem aparelho → `createDevice('gt06-869890080273430', '869890080273430')` e pedido de reabertura do socket; aparelho existente com nome `moto-0059` e registro `gt06-…` → `updateDeviceName`, sem criar; aparelho com nome igual → nada; falha de criação → log `traccar_device_create_failed` (IMEI mascarado) e tenta de novo na próxima releitura; pendente de console de `moto-0059` falha com `erro` quando o IMEI passa a `gt06-…`; padrão de `REGISTRY_REFRESH_MS` = 30000.
- [ ] **Step 2:** testes da ponte → FAIL nos novos.
- [ ] **Step 3:** Implementar ponte e `gt06.sh`.
- [ ] **Step 4:** testes + lint da ponte limpos; `bash -n deploy/single/gt06.sh`; testes de infra que leem o `gt06.sh` PASS.
- [ ] **Step 5:** Commit `feat(traccar-bridge): cria e renomeia o aparelho no Traccar a partir do cadastro`.

### Task 5: Painel — aba Rastreadores e bloco "Rastreador e chip"

**Files:**
- Create: `apps/admin/src/components/trackers/{TrackersTab.tsx,CreateTrackerWizard.tsx,TrackerSection.tsx,TrackerPicker.tsx}`, `apps/admin/src/lib/trackers.ts`
- Modify: página de Motos (abas "Motos" | "Rastreadores", `?tab=rastreadores`), `apps/admin/src/components/vehicles/VehicleDetailPanel.tsx` (+ `TrackerSection`, `SimCardSection`, `TrackerConsole`), `apps/admin/src/components/VehicleSheet.tsx` (+ `TrackerSection`), `apps/admin/src/lib/permissions.ts` (`tracker.manage`: admin, operacao), `apps/admin/e2e-mock/{mock-api.ts,fixtures.ts}` (4 endpoints novos + `trackerId` em sim-cards)
- Test: `apps/admin/tests/trackers-tab.test.tsx`, `apps/admin/tests/tracker-section.test.tsx`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Consumes: tipos gerados `TrackerDevice`, `TrackerDeviceList`, `CreateTrackerRequest`, `InstallTrackerRequest`; `SimCardSection`, `TrackerConsole` existentes.
- Produces: `trackerStatusLabel(t: TrackerDevice, now: number): string` em `lib/trackers.ts` → `'Online'` | `'Offline · último sinal há <tempo>'` | `'Nunca conectou'`; `imeiLast4(imei: string): string`.

Textos exatos:
- Aba vazia: "Nenhum rastreador cadastrado. Cadastre o primeiro para poder instalar nas motos."
- Botão: "Cadastrar rastreador". Assistente: passo "1. Aparelho" (IMEI — ajuda "15 números. Está na etiqueta do aparelho ou na resposta do comando PARAM#."; Modelo "J16"), passo "2. Chip" (opções "Escolher um chip do estoque", "Cadastrar chip novo", "Pular — vincular depois"). Concluir: "Cadastrar".
- Colunas da lista: IMEI, Modelo, Chip, Instalado em ("No estoque" quando sem moto), Sinal. Filtro: "Todos" | "Instalados" | "No estoque"; busca "Buscar por IMEI".
- Bloco na ficha, título "Rastreador e chip". Sem rastreador: "Esta moto não tem rastreador." + "Instalar rastreador" (lista do estoque; atalho "Cadastrar novo" abre o assistente e instala ao concluir). Com rastreador: IMEI, Modelo, Chip, Sinal + "Trocar" e "Remover".
- Confirmações: trocar — "Trocar o rastreador da {code}? O rastreador atual (final {last4}) volta para o estoque."; remover — "Remover o rastreador da {code}? Ele volta para o estoque e a moto fica sem rastreamento até instalar outro."
- Erros 409 da API exibidos como vieram (já em pt-BR).

- [ ] **Step 1: Testes que falham** (SSR, estilo dos testes existentes): `trackerStatusLabel` (online ≤180 s, offline com tempo, nunca conectou); aba vazia mostra o texto exato; lista mostra "No estoque"; `TrackerSection` sem rastreador mostra "Esta moto não tem rastreador." e "Instalar rastreador" para `operacao`; com rastreador mostra "Trocar"/"Remover"; `suporte` não vê os botões; `VehicleDetailPanel` mostra o console para `admin` e não para `operacao`.
- [ ] **Step 2:** `pnpm --filter admin exec vitest run tests/trackers-tab.test.tsx tests/tracker-section.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar (react-query; invalidar `['vehicle', id]`, `['trackers']`, `['sim-cards']` após mutações).
- [ ] **Step 4:** `pnpm --filter admin exec vitest run && pnpm --filter admin lint` → PASS e limpo.
- [ ] **Step 5:** README. Commit `feat(admin): estoque de rastreadores e instalação na ficha da moto`.
