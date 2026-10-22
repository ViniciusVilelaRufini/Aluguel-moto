# Volti — Retirada em Galpão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o fluxo de "moto na rua" pelo fluxo de galpão: o cliente escolhe moto, plano e seguro no app, reserva para retirar agora ou agendado, o operador entrega com checklist e o cliente aceita para destravar; devolução no galpão ou em ponto verde (com recolhimento).

**Architecture:** Nova entidade `Depot` e nova entidade `Handover` na API NestJS/Prisma; `Reservation` ganha modo de retirada, plano, seguro e caução já bloqueada; o aceite da entrega reaproveita `RentalStartService.start()` passando o `depositId` da reserva (cobrança, idempotência e destravamento seguem o caminho já revisado). Regras de horário/prazo ficam num módulo puro testável. Apps (cliente, operador, painel) consomem só o contrato.

**Tech Stack:** NestJS + Prisma 5 + PostgreSQL/PostGIS + Redis + Socket.IO; OpenAPI 3.1 em `packages/contracts` (clientes TS e Dart gerados); Flutter (Riverpod, go_router) com `packages/volti_flutter`; Next.js 14 (static export) + Tailwind + MapLibre + TanStack Query.

**Spec:** `docs/superpowers/specs/2026-10-22-volti-galpao-design.md` (spec mãe: `docs/superpowers/specs/2026-10-21-volti-plataforma-design.md`)

## Global Constraints

- O contrato em `packages/contracts/openapi.yaml` é a fonte da verdade; mudanças só aditivas; registrar em `docs/decisoes.md`; regenerar clientes TS e Dart (ver `packages/contracts/README.md`).
- Código e nomes em inglês; textos de interface em pt-BR (`app_pt.arb` nos apps Flutter).
- Dinheiro em centavos (inteiro); datas UTC ISO 8601; exibição em `America/Sao_Paulo`.
- Segurança: travar só abaixo de 3 km/h; velocidade desconhecida conta como movimento; máximo 32 km/h; zonas 6/20 km/h. Nada deste plano toca o caminho de comandos de trava/velocidade além de chamar o que já existe.
- LGPD: rastreio só durante o aluguel e com consentimento; trajetos 90 dias; export inclui reservas de galpão e entregas; operador vê só o primeiro nome; logs JSON sem dados pessoais.
- Cobrança idempotente (Idempotency-Key); nenhum dado de cartão no backend.
- Design: todas as telas seguem o Volti Design System do app (`design-system/`, `packages/volti_flutter`); telas sem desenho pronto são compostas com componentes existentes (OptionCard, VehicleSummaryCard, PassCard, folhas, VoltiButton com `brandAction`), sem estilo novo; motion respeita "reduzir movimento"; texto a 200% em 360×740 sem overflow.
- Padrões do galpão: `pickupNowWindowMinutes = 120`, `maxScheduleDays = 7`, `scheduledGraceMinutes = 30`, push de lembrete 30 min antes de `expiresAt`, fuso `America/Sao_Paulo`.
- Disponível no galpão = `Vehicle.status = free` com `depotId` preenchido; novo `VehicleStatus.awaiting_pickup`; novo `ReservationStatus.handover`.
- Ambiente local: `docker compose up -d postgres redis mosquitto minio`; prisma CLI com `set -a; . ../../.env; set +a`; API local na porta 3001.
- Commits: `git -c user.email=viniciusvilelarufini@gmail.com -c user.name="Vinicius Vilela Rufini" commit`, mensagem terminando com linha em branco + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

API (`services/api`):
- `prisma/schema.prisma` — modelos `Depot`, `Handover`, campos novos em `Vehicle` e `Reservation`, enums.
- `prisma/migrations/20261023090000_galpao/migration.sql` — migração aditiva.
- `prisma/seed-depot.ts` — galpão de São Paulo + vínculo das motos (idempotente), chamado pelo seed principal.
- `src/modules/depots/depot-rules.ts` (+ `.spec.ts`) — regras puras de horário e prazo.
- `src/modules/depots/depots.{module,controller,service,dto,mapper}.ts` (+ specs) — CRUD, lista de motos, agenda.
- `src/modules/reservations/depot-reservations.service.ts` (+ spec) — reserva de galpão (agora/agendada), cancelamento, expiração, lembrete.
- `src/modules/reservations/pickup-code.ts` (+ spec) — código assinado do QR da reserva.
- `src/modules/handovers/handovers.{module,controller,service,dto,mapper}.ts` (+ specs) — entrega de saída/chegada, aceite, disputa.
- `src/modules/rentals/rental-end.service.ts` — devolução em ponto verde termina em `awaiting_pickup` + tarefa `collect`.
- `src/modules/vehicles/vehicles.service.ts` — `nearby` exclui `awaiting_pickup`; enrich com `depotId`.
- `src/modules/lgpd/lgpd.service.ts` — export inclui reservas de galpão e entregas.
- `test/galpao.e2e-spec.ts` — ciclo completo e corridas.

Contrato (`packages/contracts`): `openapi.yaml`, `generated/**`.

Cliente (`apps/cliente/lib/features`): `home/` (cartão do galpão), `pick/` (lista do galpão), `plan/` (plano em destaque + seguro em tela própria), `pickup/` (nova: retirada agora/agendar + resumo), `reservation/` (nova tela de reserva confirmada com QR), `handover/` (nova: Confira sua moto), `ride/` (Trocar bateria lista galpão+estações), `return_flow/` (devolução no galpão), `core/` (backend + realtime).

Operador (`apps/operador/lib/features`): `pickups/` (nova: fila de retiradas, leitor de QR, checklist de saída), `arrivals/` (nova: checklist de chegada/recolhimento), `tasks/` (tarefas `collect`).

Painel (`apps/admin/src`): `app/(panel)/galpoes/` (cadastro e horários), `app/(panel)/retiradas/` (agenda), `app/(panel)/entregas/` (entregas e disputas), mapa da frota.

---

### Task 1: Contrato do galpão (OpenAPI + clientes gerados)

**Files:**
- Modify: `packages/contracts/openapi.yaml`
- Modify (gerado): `packages/contracts/generated/ts/**`, `packages/contracts/generated/dart/**`
- Modify: `docs/decisoes.md`
- Test: `services/api/src/contract-schemas-galpao.spec.ts`

**Interfaces:**
- Produces (schemas): `Depot`, `DepotInput`, `DepotUpdate`, `DepotOpeningHours` (`{ weekday: 0..6, opensAt: "HH:MM", closesAt: "HH:MM" }`), `DepotList`, `DepotVehicleList`, `DepotPickupList`; `Handover`, `HandoverCreate`, `HandoverChecklistItem` (`{ code: string, ok: boolean, note?: string }`), `HandoverDispute` (`{ reason: string }`), `HandoverType` (`pickup|return_depot`), `HandoverStatus` (`pending_customer|accepted|disputed|canceled`); `Reservation` + `depotId?`, `pickupMode?` (`now|scheduled`), `pickupAt?`, `planCode?`, `coverage?`, `depositMethod?`, `pickupCode?`; `ReservationCreate` + mesmos campos de entrada (`vehicleId`, `depotId?`, `pickupMode?`, `pickupAt?`, `planCode?`, `coverage?`, `depositMethod?`, `cardId?`, `couponCode?`); `VehicleStatus` + `awaiting_pickup`; `ReservationStatus` + `handover`; `Vehicle.depotId?`; `LgpdExport.depotReservations?`, `LgpdExport.handovers?`.
- Produces (paths): `GET/POST /depots`, `GET/PATCH /depots/{id}`, `GET /depots/{id}/vehicles`, `GET /depots/{id}/pickups?date=YYYY-MM-DD`, `POST /handovers`, `GET /handovers/{id}`, `GET /handovers?status=&depotId=`, `POST /handovers/{id}/accept` (header `Idempotency-Key` obrigatório), `POST /handovers/{id}/dispute`, `POST /handovers/uploads` (URL presignada, prefixo `handovers/`). `x-required-groups`: cliente em `GET /depots*`, `accept`, `dispute`, `GET /handovers/{id}` (dono); `operacao,campo,admin` em `POST /handovers`, `GET /handovers`, `pickups`; `admin,operacao` em `POST/PATCH /depots`; `suporte` lê `GET /handovers`.
- Produces (WS, documentado em `x-ws-events`): `handover.pending` `{ handoverId, reservationId }`, `handover.updated` `{ handoverId, status }`.

- [ ] **Step 1: Write the failing test** — `services/api/src/contract-schemas-galpao.spec.ts`, no padrão de `contract-schemas-v2.spec.ts`: carrega `openapi.yaml` e afirma:

```ts
import { loadContract } from './contract-test-utils';

describe('contrato do galpão', () => {
  const c = loadContract();
  it('VehicleStatus e ReservationStatus ganham valores novos sem remover os antigos', () => {
    expect(c.components.schemas.VehicleStatus.enum).toEqual(expect.arrayContaining(['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline', 'awaiting_pickup']));
    expect(c.components.schemas.ReservationStatus.enum).toEqual(expect.arrayContaining(['active', 'converted', 'canceled', 'expired', 'handover']));
  });
  it('ReservationCreate continua aceitando só vehicleId (compatível)', () => {
    expect(c.components.schemas.ReservationCreate.required).toEqual(['vehicleId']);
  });
  it('accept exige Idempotency-Key e devolve o aluguel', () => {
    const op = c.paths['/handovers/{id}/accept'].post;
    expect(op.parameters.map((p: any) => p.$ref ?? p.name)).toEqual(expect.arrayContaining([expect.stringMatching(/IdempotencyKey|Idempotency-Key/)]));
    expect(op.responses['201'] ?? op.responses['200']).toBeDefined();
  });
  it('Depot tem os prazos padrão documentados', () => {
    const p = c.components.schemas.Depot.properties;
    expect(p.pickupNowWindowMinutes.default).toBe(120);
    expect(p.maxScheduleDays.default).toBe(7);
    expect(p.scheduledGraceMinutes.default).toBe(30);
  });
});
```
(Se `contract-test-utils` não existir, use o carregamento que `contract-schemas-v2.spec.ts` já usa.)

- [ ] **Step 2: Run test to verify it fails** — `cd services/api && pnpm test -- contract-schemas-galpao` → FAIL (schemas ausentes).
- [ ] **Step 3: Write the contract** — acrescentar schemas e paths acima em `openapi.yaml`, com descrições em pt-BR, exemplos, `problem+json` em 400/401/403/404/409/422 (409 `vehicle-unavailable`, `reservation-open`, `rental-already-active`; 422 `pickup-outside-hours`, `pickup-too-far-ahead`, `depot-inactive`, `handover-not-pending`, `payment-declined`). Rodar `pnpm --filter @volti/contracts lint` (redocly) e a geração dos clientes conforme `packages/contracts/README.md`.
- [ ] **Step 4: Run tests** — `pnpm test -- contract-schemas` e `pnpm --filter @volti/contracts test` → PASS; `dart analyze packages/contracts/generated/dart` → sem problemas; `flutter analyze` em `apps/cliente` e `apps/operador` e `pnpm lint` em `apps/admin` continuam verdes (enum novo não quebra switch exaustivo; corrigir onde quebrar com ramo padrão).
- [ ] **Step 5: Commit** — `feat(contracts): galpão, entrega e reserva de retirada` + `docs/decisoes.md` (decisão: modelo de galpão aprovado em 2026-10-22, abordagem A, status `free`+`depotId`).

---

### Task 2: Modelo de dados, migração e seed do galpão

**Files:**
- Modify: `services/api/prisma/schema.prisma`
- Create: `services/api/prisma/migrations/20261023090000_galpao/migration.sql`
- Create: `services/api/prisma/seed-depot.ts`; Modify: `services/api/prisma/seed.ts` (chamar `seedDepot`)
- Test: `services/api/test/migration-galpao.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 1 (nomes de campos/enums).
- Produces (Prisma): `model Depot { id, name, address, lat Float, lng Float, timezone String @default("America/Sao_Paulo"), openingHours Json, pickupNowWindowMinutes Int @default(120), maxScheduleDays Int @default(7), scheduledGraceMinutes Int @default(30), swapStationId String? @db.Uuid, active Boolean @default(true), createdAt, updatedAt, vehicles Vehicle[], reservations Reservation[], handovers Handover[] }`; `Vehicle.depotId String? @db.Uuid` (+ relação e índice `[depotId, status]`); `Reservation` + `depotId String? @db.Uuid`, `pickupMode PickupMode?`, `pickupAt DateTime?`, `planCode PlanCode?`, `coverage InsuranceCoverage?`, `depositMethod String?`, `cardId String? @db.Uuid`, `couponCode String?`, `reminderSentAt DateTime?`; `model Handover { id, type HandoverType, status HandoverStatus @default(pending_customer), depotId, reservationId String? @unique, rentalId String?, vehicleId, operatorId, checklist Json, photoKeys String[], batteryPct Int, batterySerial String?, disputeReason String?, respondedAt DateTime?, createdAt, updatedAt }` com índice `[depotId, status]` e unicidade parcial "uma entrega `pending_customer` por reserva" (pela `@unique` em `reservationId` para `pickup`; para `return_depot` índice parcial `UNIQUE (rentalId) WHERE type='return_depot' AND status <> 'canceled'`); enums `PickupMode { now scheduled }`, `HandoverType { pickup return_depot }`, `HandoverStatus { pending_customer accepted disputed canceled }`; `VehicleStatus` + `awaiting_pickup`; `ReservationStatus` + `handover`.
- Produces (seed): `seedDepot(prisma)` cria (upsert por nome) "Galpão Volti — Pinheiros", Rua dos Pinheiros 870, lat -23.5654 lng -46.6847, horários seg–sex 07:00–20:00, sáb 08:00–18:00, dom fechado; vincula todas as motos `free` sem `depotId` a ele e as posiciona nas coordenadas do galpão.

- [ ] **Step 1: Write the failing test** — `test/migration-galpao.e2e-spec.ts`: aplica as migrações num schema limpo, insere um `Vehicle` e uma `Reservation` no formato antigo (sem os campos novos) e afirma que as linhas continuam válidas (`depotId` nulo, `pickupMode` nulo), que `ALTER TYPE` adicionou os enums e que inserir duas `Handover` `return_depot` não canceladas para o mesmo `rentalId` falha com violação de unicidade.
- [ ] **Step 2: Run** — `pnpm test:e2e -- migration-galpao` → FAIL.
- [ ] **Step 3: Implement** — schema + `migration.sql` aditiva (colunas anuláveis/defaults; `ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'awaiting_pickup'` etc. em migração separada do uso, conforme limitação do Postgres para enums em transação) + `seed-depot.ts` idempotente.
- [ ] **Step 4: Run** — `set -a; . ../../.env; set +a; npx prisma migrate dev --name galpao` local, `pnpm test:e2e -- migration-galpao` → PASS; `pnpm prisma db seed` duas vezes sem duplicar.
- [ ] **Step 5: Commit** — `feat(api): modelo do galpão e da entrega (migração aditiva e seed de Pinheiros)`.

---

### Task 3: Regras puras de horário e prazo do galpão

**Files:**
- Create: `services/api/src/modules/depots/depot-rules.ts`
- Test: `services/api/src/modules/depots/depot-rules.spec.ts`

**Interfaces:**
- Produces:
  - `type OpeningHours = { weekday: number; opensAt: string; closesAt: string }[]`
  - `interface DepotRulesInput { openingHours: OpeningHours; timezone: string; pickupNowWindowMinutes: number; maxScheduleDays: number; scheduledGraceMinutes: number }`
  - `isOpenAt(depot: DepotRulesInput, at: Date): boolean`
  - `pickupExpiry(depot: DepotRulesInput, mode: 'now' | 'scheduled', now: Date, pickupAt?: Date): Date` — `now`: `min(now + window, fechamento de hoje)`; `scheduled`: `pickupAt + grace`.
  - `validatePickup(depot: DepotRulesInput, mode: 'now' | 'scheduled', now: Date, pickupAt?: Date): { ok: true } | { ok: false; code: 'depot-closed' | 'pickup-outside-hours' | 'pickup-too-far-ahead' | 'pickup-in-past' | 'pickup-at-required' }`
  - `slotsForDay(depot: DepotRulesInput, day: string /* YYYY-MM-DD local */, now: Date, stepMinutes = 30): string[] /* ISO UTC */`

- [ ] **Step 1: Write the failing test**

```ts
import { isOpenAt, pickupExpiry, validatePickup, slotsForDay, DepotRulesInput } from './depot-rules';

const depot: DepotRulesInput = {
  timezone: 'America/Sao_Paulo',
  openingHours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '20:00' })).concat([{ weekday: 6, opensAt: '08:00', closesAt: '18:00' }]),
  pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30,
};
// 2026-10-22 é quinta-feira. 13:00Z = 10:00 em São Paulo (UTC-3).
const thu10 = new Date('2026-10-22T13:00:00Z');

describe('depot-rules', () => {
  it('aberto quinta 10h, fechado domingo e antes das 7h', () => {
    expect(isOpenAt(depot, thu10)).toBe(true);
    expect(isOpenAt(depot, new Date('2026-10-25T15:00:00Z'))).toBe(false); // domingo 12h
    expect(isOpenAt(depot, new Date('2026-10-22T09:30:00Z'))).toBe(false); // 06:30 local
  });
  it('retirar agora vence em 2h, limitado ao fechamento', () => {
    expect(pickupExpiry(depot, 'now', thu10).toISOString()).toBe('2026-10-22T15:00:00.000Z');
    const thu19 = new Date('2026-10-22T22:00:00Z'); // 19:00 local
    expect(pickupExpiry(depot, 'now', thu19).toISOString()).toBe('2026-10-22T23:00:00.000Z'); // 20:00 local
  });
  it('agendado vence 30 min depois do horário', () => {
    const at = new Date('2026-10-23T14:00:00Z');
    expect(pickupExpiry(depot, 'scheduled', thu10, at).toISOString()).toBe('2026-10-23T14:30:00.000Z');
  });
  it('valida horário fora do funcionamento, longe demais, no passado e sem pickupAt', () => {
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-25T15:00:00Z'))).toEqual({ ok: false, code: 'pickup-outside-hours' });
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-30T14:00:00Z'))).toEqual({ ok: false, code: 'pickup-too-far-ahead' });
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-22T12:00:00Z'))).toEqual({ ok: false, code: 'pickup-in-past' });
    expect(validatePickup(depot, 'scheduled', thu10)).toEqual({ ok: false, code: 'pickup-at-required' });
    expect(validatePickup(depot, 'now', new Date('2026-10-25T15:00:00Z'))).toEqual({ ok: false, code: 'depot-closed' });
    expect(validatePickup(depot, 'now', thu10)).toEqual({ ok: true });
  });
  it('slots de sábado de 30 em 30 min entre 08:00 e 17:30 local', () => {
    const s = slotsForDay(depot, '2026-10-24', thu10);
    expect(s[0]).toBe('2026-10-24T11:00:00.000Z');
    expect(s[s.length - 1]).toBe('2026-10-24T20:30:00.000Z');
    expect(s).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run** — `pnpm test -- depot-rules` → FAIL (módulo ausente).
- [ ] **Step 3: Implement** — converter instantes para o fuso do galpão com `Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year, month, day, hour, minute, weekday })` (sem dependência nova); `closesAt` é exclusivo; o último slot é `closesAt - stepMinutes`; `maxScheduleDays` conta a partir de `now` (`pickupAt <= now + maxScheduleDays*24h`).
- [ ] **Step 4: Run** — `pnpm test -- depot-rules` → PASS.
- [ ] **Step 5: Commit** — `feat(api): regras de horário e prazo do galpão`.

---

### Task 4: Módulo de galpões (CRUD, motos do galpão, agenda)

**Files:**
- Create: `services/api/src/modules/depots/depots.module.ts`, `depots.controller.ts`, `depots.service.ts`, `depots.dto.ts`, `depots.mapper.ts`
- Modify: `services/api/src/app.module.ts`
- Test: `services/api/src/modules/depots/depots.service.spec.ts`, `services/api/test/depots.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 2 (Prisma), Task 3 (`slotsForDay`, `isOpenAt`).
- Produces: `DepotsService.list(): Promise<DepotDto[]>`, `get(id)`, `create(dto: DepotInputDto)`, `update(id, dto: DepotUpdateDto)`, `vehicles(id, principal, status?)` (cliente: só `free` com `depotId = id`, ordenadas por bateria desc, com modelo/foto/preço do catálogo v2; interno: todas), `pickups(id, date)` (reservas do dia com `depotId`, status `active|handover`, primeiro nome do cliente, moto, `pickupMode`, `pickupAt`, `expiresAt`), `requireActive(id): Promise<Depot>` (lança 422 `depot-inactive`). `DepotDto` inclui `isOpenNow` e `slots` do dia corrente quando pedido (`?withSlots=YYYY-MM-DD`).

- [ ] **Step 1: Write failing tests** — unit: `vehicles()` para cliente não retorna `reserved`/`awaiting_pickup`/moto de outro galpão; `create` valida `openingHours` (HH:MM, `opensAt < closesAt`, weekday 0..6) com 400. e2e: `POST /depots` com grupo `campo` → 403; com `admin` → 201; `GET /depots/{id}/vehicles` como cliente lista só as livres do galpão; `GET /depots/{id}/pickups?date=` como `operacao` traz só primeiro nome.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — seguir o padrão de `catalog`/`batteries` (guards de grupo via decorator existente, `problem.filter`, mapper com datas ISO UTC).
- [ ] **Step 4: Run** — `pnpm test -- depots` e `pnpm test:e2e -- depots` → PASS; `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(api): galpões, motos do galpão e agenda de retiradas`.

---

### Task 5: Reserva de galpão (agora/agendada), código de retirada, cancelamento, expiração e lembrete

**Files:**
- Create: `services/api/src/modules/reservations/depot-reservations.service.ts`, `pickup-code.ts`
- Modify: `services/api/src/modules/reservations/reservations.controller.ts` (rotear `POST /reservations` com `depotId` para o serviço novo; sem `depotId` mantém o fluxo antigo), `reservations.service.ts` (`sweep` também trata reservas de galpão; `convert` aceita status `handover`), `reservations.module.ts`
- Test: `depot-reservations.service.spec.ts`, `pickup-code.spec.ts`

**Interfaces:**
- Consumes: Task 3 (`validatePickup`, `pickupExpiry`), Task 4 (`DepotsService.requireActive`), caução existente (o mesmo serviço que `RentalStartService.start()` usa para pré-autorizar cartão ou criar depósito Pix — localizar em `src/modules/payments`), `assertCustomerEligible`, `assertNotFixedForOther`.
- Produces:
  - `signPickupCode(reservationId: string, expiresAt: Date): string` e `verifyPickupCode(code: string, now: Date): { reservationId: string } | null` — HMAC-SHA256 com `PICKUP_CODE_SECRET` (env; em dev cai para um segredo local; em produção ausente → falha no boot como `FRAUD_HASH_SECRET`), formato `v1.<reservationId>.<expEpoch>.<sig base64url>`, sem dado pessoal.
  - `DepotReservationsService.create(customerId, dto: { vehicleId, depotId, pickupMode, pickupAt?, planCode, coverage, depositMethod, cardId?, couponCode? }, idempotencyKey): Promise<ReservationDto>` — valida (Task 3), KYC/termos, sem aluguel/reserva aberta (`reservation-open`), moto `free` com `depotId` igual; bloqueia a caução (cartão: pré-autorização; Pix: cria depósito e devolve o QR igual ao fluxo atual de Pix) e numa transação faz `vehicle.updateMany({ where: { id, status: 'free', depotId }, data: { status: 'reserved' } })` — `count === 0` → libera a caução e lança 409 `vehicle-unavailable`. Grava `expiresAt` de `pickupExpiry`. Resposta inclui `pickupCode` (só para o dono).
  - `cancel(customerId, id)` e expiração pelo `sweep`: status `canceled|expired`, caução liberada, moto `reserved → free` (condicional).
  - `remindJob()` (a cada minuto): reservas `active` com `expiresAt - now <= 30 min` e `reminderSentAt` nulo → push "Sua retirada vence às HH:MM" (fuso do galpão) e grava `reminderSentAt`.

- [ ] **Step 1: Write failing tests** — `pickup-code.spec.ts`: assina/verifica; adulterado → null; vencido → null; não contém CPF/nome. `depot-reservations.service.spec.ts` (Prisma de teste como nos specs existentes): agendado fora do horário → 422 `pickup-outside-hours` sem caução criada; corrida — duas `create` simultâneas para a mesma moto → uma 201 e uma 409, e a caução da perdedora é liberada; Pix → resposta com QR e reserva `active`; `cancel` libera caução e moto volta a `free`; `sweep` expira vencidas; `remindJob` envia uma vez só.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — reaproveitar as funções de caução já usadas no aluguel; não duplicar lógica de pagamento. Idempotência: `Idempotency-Key` obrigatório no `POST /reservations` com `depotId` (mesmo interceptor `@Idempotent` usado em top-ups).
- [ ] **Step 4: Run** — `pnpm test -- reservations pickup-code` → PASS; `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(api): reserva de retirada no galpão com caução, código e lembrete`.

---

### Task 6: Entrega (Handover) — saída com aceite do cliente e chegada no galpão

**Files:**
- Create: `services/api/src/modules/handovers/handovers.module.ts`, `handovers.controller.ts`, `handovers.service.ts`, `handovers.dto.ts`, `handovers.mapper.ts`
- Modify: `services/api/src/modules/rentals/rental-start.service.ts` (aceitar `fromHandover: { reservationId }` e pular a checagem de disponibilidade "free/reserva própria" quando a moto está `reserved` pela reserva do próprio cliente em status `handover`), `services/api/src/modules/realtime/*` (emitir `handover.pending`/`handover.updated` para a sala do cliente e do galpão), `services/api/src/app.module.ts`
- Test: `handovers.service.spec.ts`

**Interfaces:**
- Consumes: Task 5 (`verifyPickupCode`, reservas com `planCode/coverage/depositMethod/cardId/couponCode/depositId`), `RentalStartService.start(user, dto: StartRentalDto, idempotencyKey)` (já aceita `depositId`), `RentalEndService` (fechamento existente), uploads presignados (padrão de `kyc`/`rentals` uploads).
- Produces:
  - `HandoversService.createPickup(operator: Principal, dto: { pickupCode, checklist, photoKeys, batteryPct, batterySerial? })` — verifica o código, exige reserva `active` do galpão do operador, moto `reserved`; cria `Handover(pickup, pending_customer)`, reserva → `handover`; emite `handover.pending`.
  - `accept(customer: Principal, id, idempotencyKey)` — só o dono e só `pending_customer`; chama `RentalStartService.start(customer, { vehicleId, planCode, coverage, depositMethod, cardId, couponCode, depositId }, \`handover:${id}\`)` (chave de idempotência derivada da entrega, então aceites repetidos convergem); sucesso → `Handover.accepted`, `rentalId` preenchido, reserva `converted` (via `convert`), emite `handover.updated`; `payment-declined`/erro de cobrança → entrega continua `pending_customer` com `lastError` no DTO, reserva continua `handover`, emite `handover.updated` com o motivo; resultado ambíguo → mesma reconciliação de `start()`.
  - `dispute(customer, id, reason)` — `disputed`, abre ticket de suporte (serviço `support` existente), moto continua `reserved`, reserva continua `handover`.
  - `createReturn(operator, dto: { rentalId, checklist, photoKeys, batteryPct, batterySerial? })` — aluguel aberto do cliente, cria `Handover(return_depot, accepted)` e chama o encerramento existente com a moto no galpão; ao final moto → `free` com `depotId` do operador, ou `maintenance` se algum item `ok: false`.
  - `uploadUrl(principal, contentType)` → URL presignada com prefixo `handovers/`.

- [ ] **Step 1: Write failing tests** — aceite duplicado (duas chamadas, mesma ou nova Idempotency-Key) cria um aluguel e uma cobrança; pagamento recusado mantém `pending_customer`, moto não destrava (comando de destravar não publicado), reserva em `handover`; outro cliente aceitando → 403; aceite fora de `pending_customer` → 422 `handover-not-pending`; `createPickup` com código adulterado → 404; `createReturn` com item problemático → moto `maintenance`; disputa abre ticket.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — o aceite nunca reimplementa cobrança/destravamento: delega a `start()`. Logs só com ids.
- [ ] **Step 4: Run** — `pnpm test -- handovers rental-start` → PASS; `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(api): entrega no galpão com aceite do cliente e chegada`.

---

### Task 7: Devolução em ponto verde com recolhimento, moto fora da rua e LGPD

**Files:**
- Modify: `services/api/src/modules/rentals/rental-end.service.ts`, `services/api/src/modules/field-tasks/field-tasks.service.ts`, `services/api/src/modules/vehicles/vehicles.service.ts`, `services/api/src/modules/lgpd/lgpd.service.ts`
- Test: specs existentes de `rental-end`, `field-tasks`, `vehicles`, `lgpd` (casos novos)

**Interfaces:**
- Consumes: Task 2, Task 6 (`createReturn` para o caminho do galpão).
- Produces:
  - Encerramento em ponto verde: moto termina em `awaiting_pickup` (em vez de `free`) e cria `FieldTask { type: collect, priority: normal, vehicleId, targetLat/Lng da moto }` (idempotente: não cria se já houver `collect` aberta para a moto).
  - Conclusão de `collect` pelo operador (`FieldTasksService.complete`) com `depotId` informado → moto `free` com esse `depotId` e coordenadas do galpão.
  - `nearby` e qualquer listagem para cliente nunca retornam `awaiting_pickup`.
  - `LgpdService.export` inclui `depotReservations` (id, galpão, modo, horários, status) e `handovers` (tipo, status, datas, checklist; fotos como chaves, sem URLs).

- [ ] **Step 1: Write failing tests** — fim em ponto verde → `awaiting_pickup` + 1 tarefa `collect` (duas finalizações concorrentes não criam 2 tarefas); concluir `collect` → `free` + `depotId`; `nearby` não traz `awaiting_pickup`; export LGPD contém as novas chaves.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — `pnpm test` (suíte toda) → PASS; `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(api): ponto verde vira recolhimento e moto sai da rua`.

---

### Task 8: e2e do ciclo do galpão

**Files:**
- Create: `services/api/test/galpao.e2e-spec.ts`

**Interfaces:**
- Consumes: Tasks 1–7 pelos endpoints HTTP e eventos WS.

- [ ] **Step 1: Write the test** — cenários (cada um isolado com dados próprios; `PAYMENT_PROVIDER=fake`, `IOT_MODE=stub` forçado como nos e2e existentes):
  1. Retirar agora com cartão: `GET /depots` → `GET /depots/{id}/vehicles` → `POST /reservations` (depotId, `now`, `day`, `basic`, `card`) → operador `POST /handovers` com o `pickupCode` → cliente recebe `handover.pending` → `POST /handovers/{id}/accept` → aluguel `active`, moto `rented`, cobrança do plano registrada uma vez.
  2. Agendado com Pix: reserva `scheduled` para amanhã 10:00 local → QR Pix → fake confirma → reserva `active` com `expiresAt = pickupAt + 30 min`.
  3. Corrida: duas reservas simultâneas para a mesma moto → 201 + 409.
  4. Aceite duplicado concorrente → um aluguel.
  5. Pagamento recusado no aceite (fake configurado para recusar) → entrega `pending_customer`, nenhum comando de destravar.
  6. Devolução no galpão → aluguel `ended`, moto `free` no galpão; com item problemático → `maintenance`.
  7. Devolução em ponto verde → `awaiting_pickup` + `collect` → conclusão → `free`.
  8. Expiração: reserva vencida pelo `sweep` → caução liberada, moto `free`.
  9. Horário inválido → 422 com `code` correto.
- [ ] **Step 2: Run** — `pnpm test:e2e -- galpao` → PASS (se algum falhar, corrigir na task de origem dentro desta task e reportar).
- [ ] **Step 3: Run tudo** — `pnpm lint && pnpm test && pnpm test:e2e` → PASS.
- [ ] **Step 4: Commit** — `test(api): ciclo completo do galpão`.

---

### Task 9: App do cliente — home do galpão, Escolher moto, Plano, Seguro, Retirada e Reserva com QR

**Files:**
- Modify: `apps/cliente/lib/core/backend.dart` (+ fake usado nos testes): `depots()`, `depotVehicles(depotId)`, `createDepotReservation(...)`, `cancelReservation(id)`, `currentReservation()`
- Modify: `apps/cliente/lib/features/home/home_screen.dart` (mapa com galpão, pontos verdes e estações; cartão do galpão com "Escolher moto"; sem motos na rua; sem "Escanear para andar")
- Modify: `apps/cliente/lib/features/pick/pick_screen.dart` (lista do galpão, foto/categoria/preço do modelo, sem distância; botão "Continuar com <modelo> · <código>")
- Modify: `apps/cliente/lib/features/plan/plan_screen.dart` (diário/semanal/mensal em destaque; "Outras opções" com minuto/hora; seguro sai para tela própria)
- Create: `apps/cliente/lib/features/plan/insurance_screen.dart`
- Create: `apps/cliente/lib/features/pickup/pickup_screen.dart` (Retirar agora/Agendar com dias e slots do galpão; resumo; caução cartão/Pix com Pix pré-selecionado sem cartão; "Confirmar reserva")
- Create: `apps/cliente/lib/features/reservation/depot_reservation_screen.dart` (QR do `pickupCode`, endereço e "Como chegar", horário/prazo, "Cancelar reserva")
- Modify: `apps/cliente/lib/core/router.dart`, `apps/cliente/lib/l10n/app_pt.arb`
- Test: `apps/cliente/test/galpao_flow_test.dart`

**Interfaces:**
- Consumes: Task 1 (clientes Dart gerados), endpoints das Tasks 4–5.
- Produces (rotas): `/home`, `/pick` (lista do galpão), `/plan` (extra: `DepotSelection { depot, vehicle }`), `/insurance`, `/pickup`, `/reservation/:id`. Provider `currentDepotProvider` (galpão ativo; com um só, ele mesmo).

- [ ] **Step 1: Write failing widget tests** (fake backend com um galpão e 3 motos; um caso extra com dois galpões, em que o cartão vira seletor ordenado pelo mais perto e a lista muda conforme o escolhido): home mostra "Galpão Volti · Pinheiros · 3 motos disponíveis" e não mostra "Escanear para andar"; lista não mostra distância e mostra o preço do modelo; plano mostra diário/semanal/mensal antes de "Outras opções"; seguro básico marcado e não removível; retirada "Agendar" só oferece slots do galpão e o domingo aparece como fechado; confirmar envia `pickupMode`, `pickupAt`, `planCode`, `coverage`, `depositMethod` corretos e abre a reserva com QR; cancelar volta à home; 409 na confirmação mostra "Essa moto acabou de ser reservada" e volta à lista; todas as telas novas a 2,0 em 360×740 sem exceção; com "reduzir movimento" sem animação de voo.
- [ ] **Step 2: Run** — `flutter test test/galpao_flow_test.dart` → FAIL.
- [ ] **Step 3: Implement** — compor com os componentes do Volti Design System (OptionCard, VehicleSummaryCard, PassCard, folhas, VoltiButton/brandAction, LocationHeader); QR com `qr_flutter`; "Como chegar" abre o app de mapas só quando o cliente toca. Remover do fluxo do cliente a reserva de rua (rota a pé, contagem de 15 min) e o "Escanear para andar"; a tela de scan continua existindo só para quem tiver deep link antigo (redireciona para a home).
- [ ] **Step 4: Run** — `flutter analyze` 0 e `flutter test` verde em `apps/cliente`, `packages/volti_flutter`, `apps/operador`.
- [ ] **Step 5: Commit** — `feat(cliente): galpão, escolher moto, plano, seguro, retirada e reserva com QR`.

---

### Task 10: App do cliente — Confira sua moto, troca de bateria e devolução no galpão

**Files:**
- Create: `apps/cliente/lib/features/handover/handover_screen.dart`
- Modify: `apps/cliente/lib/core/realtime.dart` (eventos `handover.pending`/`handover.updated`), `apps/cliente/lib/core/backend.dart` (`handover(id)`, `acceptHandover(id, key)`, `disputeHandover(id, reason)`, `swapStations()`)
- Modify: `apps/cliente/lib/features/ride/ride_screen.dart` (Trocar bateria → lista galpão + estações), `apps/cliente/lib/features/return_flow/*` (opção "Devolver no galpão": mostra endereço e instrui a entregar ao operador; ao `return_depot` aceito abre o recibo)
- Modify: `apps/cliente/lib/l10n/app_pt.arb`
- Test: `apps/cliente/test/handover_test.dart`

**Interfaces:**
- Consumes: Task 6 (endpoints/eventos), Task 9 (rotas, reserva atual).
- Produces: rota `/handover/:id`; ao receber `handover.pending` com a reserva atual, o app navega para ela (também ao abrir o app com reserva em `handover`).

- [ ] **Step 1: Write failing widget tests** — evento `handover.pending` abre "Confira sua moto" com fotos, checklist e bateria; "Aceitar e destravar" chama `acceptHandover` uma vez mesmo com toque duplo e abre a corrida; erro de pagamento mostra o motivo e mantém a tela; "Apontar problema" envia o motivo e mostra "O suporte vai falar com você"; Trocar bateria lista o galpão primeiro e depois as estações; devolução no galpão mostra endereço e, com `handover.updated` de `return_depot`, abre o recibo; 2,0 em 360×740 sem overflow.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — idempotência com a chave gerada uma vez por entrega (guardada no estado da tela).
- [ ] **Step 4: Run** — `flutter analyze` 0 e `flutter test` verde nos três projetos; gerar APK `flutter build apk --debug --target-platform android-x64 --split-per-abi --dart-define=API_BASE_URL=http://10.0.2.2:3001`.
- [ ] **Step 5: Commit** — `feat(cliente): confira sua moto, troca de bateria e devolução no galpão`.

---

### Task 11: App do operador — retiradas, checklist de saída, chegada e recolhimento

**Files:**
- Create: `apps/operador/lib/features/pickups/pickups_page.dart`, `pickup_scan_page.dart`, `pickup_checklist_page.dart`
- Create: `apps/operador/lib/features/arrivals/arrival_checklist_page.dart`
- Modify: `apps/operador/lib/features/tasks/*` (tarefa `collect` conclui com o galpão), `apps/operador/lib/core/*` (backend: `pickups(depotId, date)`, `createPickupHandover`, `createReturnHandover`, `handoverUploadUrl`, eventos `handover.updated`), navegação e `l10n`
- Test: `apps/operador/test/pickups_test.dart`

**Interfaces:**
- Consumes: Tasks 4–7.
- Produces: aba "Retiradas" com a agenda do dia (agora primeiro, depois por horário; primeiro nome, moto, prazo); leitor do QR da reserva → checklist (itens: freios, luzes, pneus, buzina, painel, carenagem, bateria %, nº de série da bateria, fotos frente/trás/lados — mínimo 4 fotos) → envio → estado ao vivo: "Aguardando o cliente" / "Aceito — moto liberada" / "Pagamento não aprovado" / "Problema apontado"; "Chegada" (devolução no galpão e recolhimento) com checklist curto; fila offline continua funcionando (checklist enfileirado e enviado ao reconectar; o aceite do cliente só acontece com o servidor).

- [ ] **Step 1: Write failing widget tests** — lista ordenada; QR adulterado mostra "Código inválido"; checklist exige 4 fotos e bateria; estados ao vivo mudam com `handover.updated`; chegada com item problemático marca a moto como manutenção; só primeiro nome aparece; 2,0 sem overflow.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — reaproveitar câmera, upload presignado e fila offline já existentes no app.
- [ ] **Step 4: Run** — `flutter analyze` 0 e `flutter test` verde em `apps/operador`, `packages/volti_flutter`, `apps/cliente`; gerar APK do operador.
- [ ] **Step 5: Commit** — `feat(operador): retiradas no galpão, checklist de saída e chegada`.

---

### Task 12: Painel — galpões, agenda de retiradas, entregas e disputas

**Files:**
- Create: `apps/admin/src/app/(panel)/galpoes/page.tsx` (+ componentes: formulário com mapa para o ponto, editor de horários por dia, prazos)
- Create: `apps/admin/src/app/(panel)/retiradas/page.tsx` (agenda do dia por galpão; filtros agora/agendada/status)
- Create: `apps/admin/src/app/(panel)/entregas/page.tsx` (lista com fotos, checklist, status; disputas com ação "Abrir no suporte")
- Modify: navegação do painel, mapa da frota (pino do galpão; motos `awaiting_pickup` destacadas com legenda), API client
- Test: vitest dos componentes novos; `apps/admin/e2e/galpao.spec.ts` (Playwright)

**Interfaces:**
- Consumes: Tasks 1, 4, 6, 7.
- Produces: rotas `/galpoes`, `/retiradas`, `/entregas`; permissões: `admin`/`operacao` editam galpão; `suporte` vê entregas/disputas; `campo` não vê o painel de galpões; horários exibidos em `America/Sao_Paulo`.

- [ ] **Step 1: Write failing tests** — vitest: editor de horários valida HH:MM e abertura < fechamento; agenda ordena e mostra só primeiro nome; Playwright (build estático + `npx serve out`, workers=1, porta livre): admin cria galpão com horário, vê a agenda com uma reserva criada pela API e a entrega com fotos; `operacao` não vê botão de excluir; mapa mostra o galpão.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — seguir `design-system/ui_kits/admin-v2` e os componentes do painel existentes.
- [ ] **Step 4: Run** — `pnpm lint`, `pnpm vitest run`, `pnpm build`, Playwright do galpão → PASS.
- [ ] **Step 5: Commit** — `feat(admin): galpões, agenda de retiradas e entregas`.

---

### Task 13: Verificação no emulador (controlador)

**Files:** nenhum código; relatório em `.superpowers/sdd/2026-10-21-volti-plataforma/emulador-galpao.md`.

- [ ] **Step 1:** API local (porta 3001, `S3_PUBLIC_ENDPOINT=http://10.0.2.2:9000`), seed com o galpão, APKs novos do cliente e do operador instalados (desinstalar antes; emulador com pouco espaço).
- [ ] **Step 2:** Cliente: home do galpão → Escolher moto → Plano diário → Seguro → Retirar agora (Pix) → Reserva com QR.
- [ ] **Step 3:** Operador (mesmo emulador, troca de app): Retiradas → ler QR (ou digitar código) → checklist com fotos → enviar.
- [ ] **Step 4:** Cliente: Confira sua moto → Aceitar e destravar → corrida → Trocar bateria (lista) → Devolver no galpão → operador faz chegada → recibo.
- [ ] **Step 5:** Registrar achados com prints; abrir correções conforme o processo de revisão.
