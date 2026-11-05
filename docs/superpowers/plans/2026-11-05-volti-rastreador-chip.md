# Rastreador e chip no painel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastro de chips (SimCard) ligado ao rastreador, console de comandos de texto do J16 (GT06) pelo painel com resposta decodificada, tudo via contrato.

**Architecture:** Chips são CRUD na API (Prisma + Nest) e aparecem no `Vehicle` (staff). O console grava `TrackerConsoleCommand`, publica `acao: "console"` em `motos/{thing}/comandos`; a ponte envia `custom` ao Traccar (`noQueue`) e devolve `console_resposta`/`console_falha` em `motos/{thing}/eventos`; a API casa pelo `comando_id`. Painel mostra chip, console e `STATUS#` decodificado.

**Tech Stack:** NestJS + Prisma (PostgreSQL 16), class-validator, jest; traccar-bridge (TS, mqtt.js, vitest/jest conforme o pacote); Next.js + react-query + openapi-fetch, vitest SSR; OpenAPI 3.1 + JSON Schema 2020-12.

**Spec:** `docs/superpowers/specs/2026-11-05-volti-rastreador-chip-design.md`

## Global Constraints

- Contrato primeiro: `packages/contracts/openapi.yaml` e `packages/contracts/schemas/*.json` são a fonte da verdade; clientes gerados (`pnpm contracts:generate`) vão no mesmo commit da mudança de contrato.
- Código/nomes em inglês; textos de interface e mensagens de erro em pt-BR; datas UTC ISO 8601.
- Logs JSON sem dados pessoais: nunca logar `texto`/`response` do console nem ICCID/linha (logar só ids, `thingName`, `risk`, `status`).
- Histórico do console expira em 90 dias (apagado pelo job diário de housekeeping).
- Política do texto do console (API): 1–100 caracteres; regex `^[A-Za-z0-9,.\-_:]{1,99}#$`; palavra-chave = trecho antes da primeira `,` ou do `#`, em maiúsculas; recusadas `GMT`, `FACTORY`, `FORMAT`, `PWD`, `PASSWORD`; risco `read` = sem vírgula e palavra-chave ≠ `RESET`; `connection` = `RESET`, ou `APN`/`SERVER` com vírgula; `change` = demais com vírgula. `change`/`connection` exigem `confirm: true`. Os argumentos **não** mudam de caixa (`APN,indica.algar.br#` fica igual).
- Um comando de console `pending` por moto; pendente há mais de 90 s vira `failed`/`timeout` (verificado ao listar e ao enviar).
- Ponte: `type: 'custom'`, `attributes: { data: <texto>, noQueue: true }`; HTTP 202 do Traccar = aparelho offline → `console_falha` `offline`; sem resposta em 60 s → `console_falha` `timeout`. Resposta de relé (`parseRelayReply` reconhece) nunca vira resposta de console.
- Permissões: `GET /sim-cards` → `admin`,`operacao`,`suporte`; `POST`/`PATCH /sim-cards` → `admin`; console (envio e histórico) → `admin`.
- Sem Docker local; testes unitários rodam locais (`pnpm --filter <pkg> test`).

## Review Focus

1. APN em minúsculas (`APN,indica.algar.br#`) chega intacto ao aparelho e à resposta — teste na Task 3 (política) e Task 4 (ponte).
2. `RELAY 1 OK` chegando com um comando de console pendente continua sendo do relé — teste na Task 4.
3. Aparelho offline (202 do Traccar) → falha `offline` imediata, nada fica na fila — teste na Task 4.
4. Chip já vinculado a outro rastreador → 409; desvincular (`vehicleId: null`) e vincular de novo funciona — teste na Task 2.
5. Segundo comando com um pendente → 409; pendente velho (>90 s) é encerrado e o novo passa — teste na Task 3.

---

### Task 1: Contrato, migração e modelos

**Files:**
- Modify: `packages/contracts/openapi.yaml` (paths após `/commands/{id}` ~l.977; schemas junto de `Vehicle` ~l.6233 e de `VehicleCommand` ~l.6408)
- Modify: `packages/contracts/schemas/comandos.schema.json`, `packages/contracts/schemas/eventos.schema.json`, `packages/contracts/mqtt.md`
- Modify: `packages/contracts/generated/**` (regerado)
- Modify: `services/api/prisma/schema.prisma`
- Create: `services/api/prisma/migrations/20261105100000_sim_cards_tracker_console/migration.sql`
- Modify: `services/api/test/helpers/e2e-app.ts` (`HAND_WRITTEN_CHECKS`)
- Modify: `docs/decisoes.md` (nova entrada 2026-11-05, resumo do spec)

**Interfaces — Produces (OpenAPI, nomes exatos):**
- `SimCardStatus`: enum `active | suspended | cancelled`.
- `SimCard`: `id` (uuid), `iccid` (string, `^[0-9]{18,22}$`), `msisdn` (string|null, `^\+?[0-9]{10,15}$`), `carrier` (string 1–40), `apn` (string|null, 1–100), `status` (`SimCardStatus`), `notes` (string|null, ≤500), `vehicleId` (uuid|null), `vehicleCode` (string|null), `createdAt`, `updatedAt` (date-time). `vehicleId`/`vehicleCode` = moto do rastreador vinculado.
- `SimCardSummary`: `id`, `iccid`, `msisdn`, `carrier`, `apn`, `status`.
- `CreateSimCardRequest`: obrigatórios `iccid`, `carrier`; opcionais `msisdn`, `apn`, `status` (padrão `active`), `notes`, `vehicleId` (vincula ao rastreador da moto).
- `UpdateSimCardRequest`: todos opcionais (mesmos campos); `vehicleId: null` desvincula.
- `SimCardList`: `{ items: SimCard[] }`.
- `Vehicle.simCard`: `SimCardSummary | null`, descrição "staff.".
- `TrackerConsoleRisk`: `read | change | connection`. `TrackerConsoleStatus`: `pending | answered | failed`. `TrackerConsoleFailReason`: `offline | timeout | error`.
- `TrackerStatusReport`: `batteryVolts`, `externalVolts` (number|null), `gprsOnline`, `acc`, `gpsOn`, `relay`, `sleep` (boolean|null), `csq` (integer|null).
- `TrackerConsoleCommand`: `id`, `vehicleId`, `text`, `risk`, `status`, `failReason` (|null), `response` (string|null), `statusReport` (`TrackerStatusReport`|null — só quando a resposta é de `STATUS#`), `requestedById` (string), `createdAt`, `respondedAt` (|null).
- `SendTrackerConsoleRequest`: `text` (obrigatório), `confirm` (boolean, opcional).
- `TrackerConsoleList`: `{ items: TrackerConsoleCommand[] }`.
- Paths: `GET /sim-cards` (`listSimCards`; query `q` string opcional — busca em ICCID/linha; `status`; `unlinked` boolean), `POST /sim-cards` (`createSimCard`, 201), `PATCH /sim-cards/{id}` (`updateSimCard`, 200), `POST /vehicles/{id}/tracker-console` (`sendTrackerConsoleCommand`, 202), `GET /vehicles/{id}/tracker-console` (`listTrackerConsoleCommands`; query `limit` 1–50, padrão 20, mais recentes primeiro). Erros no formato existente: 400 validação (texto inválido/recusado, falta `confirm`), 404, 409 `conflict` (ICCID repetido; rastreador já tem chip; chip já vinculado a outro rastreador; moto sem rastreador; console com pendente; rastreador não é `relay_only`). Segurança/grupos conforme Global Constraints.
- MQTT `comandos`: `oneOf` — o atual (`acao: "buzina"`) | `{ comando_id (uuid), acao: "console", texto (string 1–100) }`.
- MQTT `eventos`: `tipo` ganha `console_resposta` (exige `comando_id`, `texto`) e `console_falha` (exige `comando_id`, `motivo` ∈ `offline|timeout|erro`); propriedades novas opcionais no topo, exigências por `if/then`. `timestamp` continua obrigatório.

**Interfaces — Produces (Prisma):**
- `enum SimCardStatus { active suspended cancelled }`; `model SimCard { id uuid; iccid String @unique; msisdn String?; carrier String; apn String?; status SimCardStatus @default(active); notes String?; trackerId String? @unique @db.Uuid → Tracker; createdAt; updatedAt }`; `Tracker.simCard SimCard?`.
- `enum TrackerConsoleStatus { pending answered failed }`; `model TrackerConsoleCommand { id uuid; vehicleId uuid → Vehicle; trackerId uuid → Tracker; thingName String; text String; risk String; status TrackerConsoleStatus @default(pending); failReason String?; response String?; requestedById String; createdAt @default(now()); respondedAt DateTime?; @@index([vehicleId, createdAt]); @@index([createdAt]) }`.
- CHECKs à mão na migração: `"SimCard_iccid_digits" CHECK (iccid ~ '^[0-9]{18,22}$')`, `"TrackerConsoleCommand_text_len" CHECK (char_length(text) BETWEEN 1 AND 100)`; listar os dois em `HAND_WRITTEN_CHECKS`.

- [ ] **Step 1:** Editar o OpenAPI e os schemas MQTT conforme acima; atualizar `mqtt.md` (tabela de `comandos`/`eventos`).
- [ ] **Step 2:** Run `pnpm --filter @volti/contracts lint` → sem erros.
- [ ] **Step 3:** Run `pnpm contracts:generate` → `generated/ts/schema.d.ts` e `generated/dart` atualizados, sem erro.
- [ ] **Step 4:** Editar `schema.prisma`, escrever a migração (tabelas, enums, índices com nome padrão do Prisma, FKs, CHECKs) e `HAND_WRITTEN_CHECKS`.
- [ ] **Step 5:** Run `pnpm --filter api exec prisma validate && pnpm --filter api exec prisma generate && pnpm --filter api exec jest src/prisma-migrations.spec.ts src/contract-schemas` → PASS (ajustar `contract-schemas*.spec.ts` se listarem schemas MQTT esperados).
- [ ] **Step 6:** Entrada em `docs/decisoes.md` (por quê, abordagem escolhida, política do console, LGPD 90 dias).
- [ ] **Step 7:** Commit `feat(contracts): chips e console do rastreador (OpenAPI, MQTT, migração)`.

### Task 2: API — módulo de chips

**Files:**
- Create: `services/api/src/modules/sim-cards/{sim-cards.module.ts,sim-cards.controller.ts,sim-cards.service.ts,sim-cards.dto.ts,sim-cards.mapper.ts,sim-cards.service.spec.ts}`
- Modify: módulo raiz (registrar `SimCardsModule`), `services/api/src/modules/vehicles/vehicles.service.ts` (`enrich()` inclui `tracker.simCard`) e o mapper do `Vehicle` (campo `simCard`, só para staff)
- Modify: `services/api/README.md`

**Interfaces:**
- Consumes: modelos `SimCard`/`Tracker` (Task 1), `AuditService.record`, `@StaffOnly`, `CurrentUser`.
- Produces: `SimCardsService.list(q: {q?, status?, unlinked?})`, `.create(dto, actor)`, `.update(id, dto, actor)` retornando o `SimCard` do contrato; `toSimCardSummary(simCard | null)` exportado do mapper (usado pelo Vehicle).

- [ ] **Step 1: Testes que falham** em `sim-cards.service.spec.ts` (Prisma mockado no estilo de `commands.service.spec.ts`):
  - `create` com `vehicleId` vincula ao `Tracker` da moto e retorna `vehicleId`/`vehicleCode`.
  - `create` com ICCID repetido → `ConflictException`.
  - `create` com `vehicleId` de moto sem rastreador → `ConflictException`.
  - `update` vinculando a um rastreador que já tem chip → `ConflictException`; `update` de chip já vinculado a outro rastreador para uma moto nova → `ConflictException`.
  - `update` com `vehicleId: null` desvincula; vincular de novo depois funciona.
  - cada escrita chama `audit.record` com `action` `sim_card.create`/`sim_card.update`, `entityType: 'SimCard'`, sem ICCID/linha em `metadata`.
- [ ] **Step 2:** Run `pnpm --filter api exec jest src/modules/sim-cards` → FAIL.
- [ ] **Step 3:** Implementar DTOs (class-validator com os mesmos padrões do contrato), service (transação no vínculo; P2002 → 409), controller (rotas e grupos do contrato), mapper, registro do módulo e `Vehicle.simCard`.
- [ ] **Step 4:** Run `pnpm --filter api exec jest src/modules/sim-cards src/modules/vehicles src/contract-schemas` → PASS (o `contract-security.spec.ts` só fecha na Task 3, quando todas as rotas novas têm controller); `pnpm --filter api lint` sem erros; `pnpm --filter api exec tsc --noEmit` limpo.
- [ ] **Step 5:** README da API (seção chips). Commit `feat(api): cadastro de chips vinculado ao rastreador`.

### Task 3: API — console do rastreador

**Files:**
- Create: `services/api/src/modules/tracker-console/{tracker-console.module.ts,tracker-console.controller.ts,tracker-console.service.ts,tracker-console.dto.ts,console-policy.ts,status-report.ts,console-policy.spec.ts,status-report.spec.ts,tracker-console.service.spec.ts}`
- Modify: `services/api/src/modules/iot/telemetry.service.ts` (`deviceEvent`: `console_*` → evento interno, nunca alerta) e o parser de evento de aparelho; `services/api/src/common/events.ts` (`EV.TRACKER_CONSOLE_EVENT`); o tipo `MomentaryCommand` e os transports (`local-mqtt`, `aws-iot`) aceitam `{ comando_id, acao: 'console', texto }`; `services/api/src/modules/iot/aws-iot.transport.ts` (canal `eventos` já roteia)
- Modify: `services/api/src/modules/housekeeping/housekeeping.service.ts` (apaga `TrackerConsoleCommand` com `createdAt` < agora − 90 dias, em lotes de 5000, no job diário existente)
- Modify: `services/api/src/contract-security.spec.ts` (contagem 205 → 210: as 5 operações novas), `services/api/README.md`

**Interfaces:**
- Consumes: Task 1 (modelo, contrato), `BaseIotGateway`/transport `publishCommand(thingName, MomentaryCommand)`.
- Produces:
  - `classifyConsoleText(text: string): { ok: true; text: string; keyword: string; risk: 'read'|'change'|'connection' } | { ok: false; reason: string }` (`reason` em pt-BR; `text` só com `trim`).
  - `parseStatusReport(response: string): TrackerStatusReport | null` — formato do J16: `Battery:4.27V;Exvkk:12.38,0;GPRS:Offline;CSQ:18;ACC:ON;GPS:ON;Gid:11;Relay:1;Slp:0;` → `{batteryVolts:4.27, externalVolts:12.38, gprsOnline:false, csq:18, acc:true, gpsOn:true, relay:true, sleep:false}`; campo ausente/ilegível → `null` naquele campo; nenhum campo reconhecido → `null`.
  - `TrackerConsoleService.send(vehicleId, {text, confirm}, actor)`, `.list(vehicleId, limit)`, `.onDeviceEvent({thingName, comandoId, kind: 'resposta'|'falha', texto?, motivo?})`.
  - `EV.TRACKER_CONSOLE_EVENT` payload `{ thingName: string; comandoId: string; kind: 'resposta' | 'falha'; texto?: string; motivo?: 'offline' | 'timeout' | 'erro' }`.

- [ ] **Step 1: Testes que falham — política** (`console-policy.spec.ts`): `STATUS#` → read; `status#` → read com keyword `STATUS`; `APN,indica.algar.br#` → connection, `text` idêntico (minúsculas preservadas); `SERVER,1,api-volti-dev.prestarecondominios.com.br,5023,0#` → connection; `TIMER,30,3600#` → change; `RESET#` → connection; `GMT,W,3,0#`, `FACTORY#`, `PWD,123#` → `ok:false`; `STATUS` (sem `#`), `STA TUS#`, `""`, 101 caracteres, `<script>#` → `ok:false`.
- [ ] **Step 2: Testes que falham — STATUS** (`status-report.spec.ts`): a string acima → objeto acima; `GPRS:Online` → `gprsOnline:true`; `LastPosition! Lati:...` → `null`.
- [ ] **Step 3: Testes que falham — service** (`tracker-console.service.spec.ts`):
  - `send` cria `pending`, publica `{comando_id: <id>, acao:'console', texto}` e grava audit `tracker_console.send` (metadata `{risk, keyword}`, sem o texto).
  - `send` de `change`/`connection` sem `confirm` → `BadRequestException`; texto recusado → `BadRequestException` com o `reason`.
  - moto com rastreador `speed_control` ou sem rastreador → `ConflictException`.
  - já existe `pending` com menos de 90 s → `ConflictException`; `pending` com mais de 90 s → é marcado `failed`/`timeout` e o novo é aceito.
  - `onDeviceEvent` resposta → `answered`, `response`, `respondedAt`; falha `offline` → `failed`/`offline`; `comandoId` desconhecido ou já encerrado → ignorado sem erro.
  - `list` devolve `statusReport` preenchido só quando `response` é de `STATUS#` e marca pendentes vencidos como `timeout`.
  - `telemetry.deviceEvent` com `tipo: 'console_resposta'` emite `EV.TRACKER_CONSOLE_EVENT` e **não** emite `EV.IOT_DEVICE_EVENT` (teste no spec existente do telemetry).
- [ ] **Step 4:** Run `pnpm --filter api exec jest src/modules/tracker-console src/modules/iot` → FAIL.
- [ ] **Step 5:** Implementar (listener `@OnEvent(EV.TRACKER_CONSOLE_EVENT)` chama `onDeviceEvent`; housekeeping; logs só com ids).
- [ ] **Step 6:** Run `pnpm --filter api exec jest src/modules/tracker-console src/modules/iot src/modules/housekeeping src/contract-security.spec.ts src/contract-schemas` → PASS; lint e `tsc --noEmit` limpos.
- [ ] **Step 7:** README da API (seção console). Commit `feat(api): console de comandos do rastreador GT06`.

### Task 4: Ponte Traccar — comandos de console

**Files:**
- Modify: `services/traccar-bridge/src/traccar/rest.ts` (`sendCustom(deviceId: number, data: string): Promise<'sent' | 'offline'>`: POST `/api/commands/send` `{deviceId, type:'custom', attributes:{data, noQueue:true}}`; 200 → `'sent'`, 202 → `'offline'`, outro → lança)
- Modify: `services/traccar-bridge/src/bridge.ts` (`onMqtt`: `comandos` com `acao:'console'` válido → envia; `buzina` segue ignorado como hoje), `services/traccar-bridge/src/mapping.ts` (expor a resposta de texto que não é de relé)
- Create: `services/traccar-bridge/src/console.ts` (+ `console.spec.ts`): fila por moto de pendentes `{comandoId, sentAt}`, prazo 60 s
- Modify: `services/traccar-bridge/README.md`

**Interfaces:**
- Consumes: schemas MQTT da Task 1; `parseRelayReply` existente.
- Produces: publica em `TOPICS.events(thing)` `{tipo:'console_resposta', comando_id, texto, timestamp}` ou `{tipo:'console_falha', comando_id, motivo, timestamp}` (QoS 1).

- [ ] **Step 1: Testes que falham** (`console.spec.ts` e specs do bridge/rest, no estilo dos existentes):
  - `sendCustom` monta o corpo exato acima e mapeia 200/202.
  - comando `console` com `texto: 'APN,indica.algar.br#'` → `sendCustom(deviceId, 'APN,indica.algar.br#')` (texto intacto).
  - 202 → publica `console_falha` `offline` na hora, sem pendente.
  - posição com `attributes.result = 'Battery:4.27V;...'` e um pendente → publica `console_resposta` com o `comando_id` do pendente mais antigo e o texto; o pendente sai da fila.
  - `attributes.result = 'RELAY 1 OK'` com pendente de console → tratado pelo fluxo do relé; nada publicado para o console; pendente continua.
  - sem resposta em 60 s (relógio injetado) → `console_falha` `timeout`.
  - payload inválido (sem `comando_id`, `texto` vazio/ >100) → ignorado com log `console_invalid`, nada enviado.
- [ ] **Step 2:** Run `pnpm --filter traccar-bridge test` → FAIL nos novos.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm --filter traccar-bridge test && pnpm --filter traccar-bridge lint && pnpm --filter traccar-bridge exec tsc --noEmit` → tudo limpo.
- [ ] **Step 5:** README da ponte. Commit `feat(traccar-bridge): comandos de console do GT06`.

### Task 5: Painel — chip, console e diagnóstico

**Files:**
- Create: `apps/admin/src/lib/tracker-console.ts` (`CONSOLE_PRESETS`, `apnMismatch(simApn, response)`), `apps/admin/src/components/tracker/SimCardSection.tsx`, `apps/admin/src/components/tracker/TrackerConsole.tsx`
- Modify: `apps/admin/src/components/VehicleSheet.tsx` (seções "Chip" e "Console do rastreador" abaixo de "Comandos remotos"), `apps/admin/e2e-mock/mock-api.ts` + `fixtures.ts` (handlers dos 5 endpoints)
- Test: `apps/admin/tests/tracker-console.test.tsx`, `apps/admin/tests/sim-card-section.test.tsx`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Consumes: tipos gerados (`components['schemas']['SimCard' | 'TrackerConsoleCommand' | ...]`), `api`/`unwrap`, `can(...)` de `lib/permissions`.
- Produces: `CONSOLE_PRESETS: { label: string; text: string }[]` = Estado `STATUS#`, Parâmetros `PARAM#`, Posição `WHERE#`, APN `APN#`, Servidor `SERVER#`, Versão `VERSION#`; `apnMismatch(simApn: string | null, response: string | null): string | null` — lê `APN:<valor>,` de uma resposta e devolve o APN do aparelho quando difere (comparação sem caixa) do cadastrado; senão `null`.

Comportamento:
- **Chip** (staff com acesso ao veículo): sem chip → "Nenhum chip vinculado" e, para admin, "Vincular chip" (busca por ICCID/linha em `GET /sim-cards?unlinked=true` ou "Cadastrar novo"). Com chip → ICCID, linha, operadora, APN esperado, situação; admin edita e desvincula.
- **Console** (só admin e só `trackerControlMode === 'relay_only'`): botões dos presets, campo de texto livre + "Enviar"; texto `change`/`connection` (vírgula ou `RESET`) pede confirmação ("Este comando muda a configuração do rastreador. Se o APN ou o servidor ficarem errados, o aparelho perde a conexão e só volta com acesso físico. Enviar mesmo assim?") e envia `confirm: true`. Histórico (`limit 20`) com horário em America/Sao_Paulo, status (Aguardando/Respondido/Falhou: offline "Rastreador offline" · timeout "Sem resposta em 90 s" · erro), resposta em fonte mono; `statusReport` vira mini-tabela (Bateria interna, Alimentação, Dados móveis Online/Offline, Sinal CSQ, Ignição, GPS, Relé, Sono). Enquanto houver `pending`, refaz a lista a cada 3 s. `apnMismatch` não nulo → aviso "O aparelho está com o APN X, mas o chip cadastrado usa Y."
- [ ] **Step 1: Testes que falham** (SSR, estilo de `j16-vehicle-sheet*.test.tsx`): `apnMismatch('indica.algar.br','APN:algar.br,,,')` → `'algar.br'`; mesma caixa diferente → `null`; render do console com um item `answered` com `statusReport` mostra "Dados móveis" e "Offline"; console não renderiza para `operacao` nem para `speed_control`; seção do chip mostra ICCID e "Algar".
- [ ] **Step 2:** Run `pnpm --filter admin exec vitest run tests/tracker-console.test.tsx tests/sim-card-section.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar componentes, integração na `VehicleSheet` e handlers do e2e-mock.
- [ ] **Step 4:** Run `pnpm --filter admin exec vitest run && pnpm --filter admin lint` → PASS e lint limpo (o `lint` já roda `tsc --noEmit`).
- [ ] **Step 5:** README do painel. Commit `feat(admin): chip e console do rastreador na ficha da moto`.
