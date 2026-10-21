# Volti — plano mestre de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a plataforma Volti (infra, API, IoT, pagamentos, app do cliente, painel, app do operador e QA) rodando localmente de ponta a ponta, seguindo `docs/prompts-agentes.md`.

**Architecture:** Monorepo com `packages/contracts` como fonte da verdade. A API NestJS expõe portas (`IotGateway`, `RentalBillingPort`, `InsurancePort` etc.) com implementação local e AWS, e as integrações e as interfaces são construídas em paralelo a partir do contrato. Execução em quatro fases, um subagente por área, cada um num git worktree próprio.

**Tech Stack:** Node 24, pnpm 9, TypeScript 5, NestJS 10, Prisma 5, PostgreSQL 16 + PostGIS 3.4, Redis 7, Mosquitto 2, MinIO, Socket.IO 4, AWS CDK v2, Next.js 14 (App Router, `output: 'export'`), Tailwind 3, MapLibre GL 4, TanStack Query 5, Playwright, Flutter 3.41 / Dart 3.11, Riverpod 2, go_router, k6.

**Spec:** `docs/superpowers/specs/2026-10-21-volti-plataforma-design.md` (ler junto com `CLAUDE.md` e `docs/prompts-agentes.md`).

## Como este plano funciona

Este é o plano **mestre**. Ele fixa tudo o que cruza a fronteira entre agentes: o scaffolding (Task 0, completo), as interfaces exatas, os eventos, os enums, os testes obrigatórios e os comandos de verificação. Cada área (Tasks 1–9) é executada por um subagente que **primeiro escreve o próprio plano detalhado** (TDD, passos de 2–5 min, sem placeholders, no formato da skill writing-plans) em `docs/superpowers/plans/2026-10-21-<area>.md`, entrega para o orquestrador aprovar e só então implementa. O prompt do agente em `docs/prompts-agentes.md` é o requisito funcional; este plano acrescenta as fronteiras e os critérios de aceite.

## Global Constraints

- Velocidade máxima absoluta: **32 km/h**. Nenhuma API, porta, simulador ou UI aceita `speedLimitKmh > 32` ou `< 0` (rejeitar com erro, nunca truncar em silêncio).
- Limites por zona: **6 km/h** em áreas de pedestres, **20 km/h** em ciclovias (zonas `reduced_speed` com `speedLimitKmh` ≤ 20).
- Bloqueio seguro: travar só com velocidade reportada **< 3 km/h**; antes disso, reduzir o limite progressivamente.
- Retenção de trajetos: **90 dias** (`TrackPoint.expiresAt`).
- Fora da área de operação: alerta imediato e bloqueio seguro após **5 minutos**.
- Dinheiro em centavos (`int`); datas UTC ISO 8601; exibição em `America/Sao_Paulo`.
- Código e nomes em inglês; textos de interface em pt-BR (sem emoji, sentence case, sem km rodados para o cliente).
- Nenhum segredo no código; `.env.example` versionado, `.env` ignorado.
- Logs JSON sem dados pessoais (sem CPF, e-mail, nome, coordenadas associadas a cliente).
- Região AWS `sa-east-1`; tags `projeto=volti`, `ambiente=<dev|prod>`.
- Contrato em `packages/contracts` é a fonte da verdade; mudança depois da Task 1 → proposta em `docs/decisoes.md` e aprovação do usuário.
- Definição de pronto: compila, lint sem erros, testes passando, README da pasta atualizado, resumo final (feito, como rodar, testes executados, pendências).

---

## Interfaces compartilhadas (fixas)

Todo agente que tocar estas fronteiras usa **exatamente** estes nomes e tipos.

### Enums

```ts
// services/api/src/common/enums.ts (e espelhados no openapi.yaml)
export type VehicleStatus = 'free' | 'rented' | 'reserved' | 'paused' | 'blocked' | 'maintenance' | 'offline';
export type ZoneType = 'operation' | 'return' | 'forbidden' | 'reduced_speed';
export type StaffGroup = 'admin' | 'operacao' | 'financeiro' | 'suporte' | 'campo';
export type RentalStatus = 'active' | 'paused' | 'ending' | 'ended' | 'force_ended';
export type CommandType = 'lock' | 'unlock' | 'horn' | 'speed_limit' | 'stolen_mode';
export type CommandStatus = 'pending' | 'in_progress' | 'confirmed' | 'failed';
export type PlanCode = 'minute' | 'hour' | 'day' | 'weekly' | 'monthly';
export type InsuranceCoverage = 'basic' | 'full';
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export const MAX_SPEED_KMH = 32;
export const SAFE_LOCK_SPEED_KMH = 3;
```

### Porta IoT (definida pela Task 3, implementada pela Task 4)

```ts
// services/api/src/ports/iot-gateway.port.ts
export const IOT_GATEWAY = Symbol('IOT_GATEWAY');

export interface CommandRequest {
  commandId: string;   // VehicleCommand.id, criado pelo módulo commands antes da chamada
  thingName: string;
}

export interface CommandOutcome {
  commandId: string;
  status: 'pending' | 'in_progress' | 'confirmed' | 'failed';
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit';
}

export interface VehicleLiveState {
  thingName: string;
  lat: number;
  lng: number;
  speedKmh: number;
  batteryPct: number;
  locked: boolean;
  ignition: boolean;
  signal: number;          // 0–5
  speedLimitKmh: number;
  stolenMode: boolean;
  online: boolean;
  lastSeenAt: string;      // ISO 8601
}

export interface IotGateway {
  /** Bloqueio seguro: se speedKmh > 3, rampa de limite até parar e só então trava. */
  lock(req: CommandRequest): Promise<CommandOutcome>;
  unlock(req: CommandRequest): Promise<CommandOutcome>;
  /** Lança InvalidSpeedLimitError se kmh < 0 ou kmh > 32. */
  setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome>;
  setStolenMode(req: CommandRequest, on: boolean): Promise<CommandOutcome>;
  horn(req: CommandRequest): Promise<CommandOutcome>;
  getLiveState(thingName: string): Promise<VehicleLiveState | null>;
}

export class InvalidSpeedLimitError extends Error {}
```

Atualizações posteriores do comando (pendente → confirmado, rampa concluída, timeout) chegam pelo evento interno `iot.command-updated`.

### Portas de cobrança e seguro (definidas pela Task 3, implementadas pela Task 5)

```ts
// services/api/src/ports/rental-billing.port.ts
export const RENTAL_BILLING = Symbol('RENTAL_BILLING');

export interface PixCharge { chargeId: string; qrCodeBase64: string; copyPaste: string; expiresAt: string; }

export interface RentalBillingPort {
  holdDeposit(input: { customerId: string; rentalId: string; method: 'card' | 'pix'; idempotencyKey: string })
    : Promise<{ depositId: string; status: 'held' | 'awaiting_pix' | 'failed'; pix?: PixCharge }>;
  settle(input: { rentalId: string; amountCents: number; idempotencyKey: string })
    : Promise<{ paymentId: string; status: 'paid' | 'failed' }>;
  isDelinquent(customerId: string): Promise<boolean>;
}

// services/api/src/ports/insurance.port.ts
export const INSURANCE = Symbol('INSURANCE');

export interface InsurancePort {
  quote(input: { coverage: InsuranceCoverage; planCode: PlanCode }): Promise<{ premiumCents: number }>;
  issueForRental(input: { rentalId: string; customerId: string; coverage: InsuranceCoverage })
    : Promise<{ policyId: string; premiumCents: number }>;
  cancel(policyId: string): Promise<void>;
}
```

A interface `PaymentProvider` (gateway) pertence à Task 5 e fica em `services/api/src/modules/payments/provider/payment-provider.ts`, com as operações listadas no prompt do agente 4.

### Eventos internos (`@nestjs/event-emitter`)

| Evento | Payload | Emissor | Consumidores |
|---|---|---|---|
| `iot.telemetry` | `{ thingName, vehicleId, lat, lng, speedKmh, batteryPct, locked, ignition, signal, ts }` | Task 4 | realtime, alerts, rentals |
| `iot.device-event` | `{ thingName, vehicleId, type: 'queda' \| 'violacao' \| 'bateria_critica' \| 'movimento_sem_aluguel', ts }` | Task 4 | alerts, realtime |
| `iot.command-updated` | `{ commandId, status: CommandStatus, reason? }` | Task 4 | commands (grava), realtime |
| `iot.connectivity` | `{ thingName, vehicleId, online: boolean, ts }` | Task 4 | vehicles (status `offline`), alerts |
| `geofence.transition` | `{ vehicleId, rentalId?, zoneId, zoneType: ZoneType, speedLimitKmh?, transition: 'ENTER' \| 'EXIT', ts }` | Task 4 | rentals, alerts, realtime |
| `payment.updated` | `{ paymentId, rentalId?, status }` | Task 5 | rentals, realtime |

### Eventos do WebSocket (Socket.IO, namespace `/realtime`)

Autenticação: `auth: { token: <JWT> }` no handshake. Salas: `fleet` (staff com grupo `admin`, `operacao` ou `suporte`) e `rental:{rentalId}` (só o cliente dono, só com o aluguel ativo).

| Evento | Sala | Payload |
|---|---|---|
| `vehicle.position` | `fleet`, `rental:{id}` | `{ vehicleId, lat, lng, speedKmh, batteryPct, status: VehicleStatus, speedLimitKmh, ts }` |
| `vehicle.status` | `fleet` | `{ vehicleId, status: VehicleStatus, ts }` |
| `command.updated` | `fleet` | `{ commandId, vehicleId, type: CommandType, status: CommandStatus, reason? }` |
| `alert.created` | `fleet` | `{ alertId, vehicleId?, rentalId?, type, priority: 'low' \| 'medium' \| 'high' \| 'critical', createdAt }` |
| `rental.updated` | `rental:{id}` | `{ rentalId, status: RentalStatus, elapsedSeconds, costCents, ts }` |
| `zone.notice` | `rental:{id}` | `{ rentalId, zoneType: ZoneType, speedLimitKmh?, transition: 'ENTER' \| 'EXIT', message }` |
| `device.event` | `rental:{id}` | `{ rentalId, type: 'queda', ts }` (dispara o "você está bem?") |

### Contrato MQTT (fixado aqui; detalhado pela Task 4 em `packages/contracts/mqtt.md`)

- `motos/{thingName}/telemetria` — `{ lat, lng, velocidade_kmh, bateria_pct, travada, ignicao, sinal, timestamp }` a cada 5 s em aluguel, 60 s parada.
- `motos/{thingName}/eventos` — `{ tipo: 'queda' | 'violacao' | 'bateria_critica' | 'movimento_sem_aluguel', timestamp }`.
- `motos/{thingName}/comandos` — `{ comando_id, acao: 'buzina' }` (comandos momentâneos que não cabem no shadow).
- Shadow: `desired { travada, limite_kmh, modo_roubada }`, `reported { travada, limite_kmh, modo_roubada, firmware, velocidade_kmh }`, nos tópicos `$aws/things/{thingName}/shadow/update`, `/update/accepted`, `/update/delta`, `/update/documents`, `/get`, `/get/accepted`.
- A política IoT da Task 2 permite a cada rastreador publicar/assinar só em `motos/${iot:Connection.Thing.ThingName}/*` e no próprio shadow.

### Preços do seed (para testes determinísticos)

| Plano | Regra |
|---|---|
| `minute` | desbloqueio 300 + 79/min (minuto parcial arredonda para cima); pausa 20/min |
| `hour` | 2900 por hora iniciada |
| `day` | 8900 por dia iniciado |
| `weekly` | 24900 recorrente |
| `monthly` | 79900 recorrente |
| Seguro | `basic` 200 por aluguel (obrigatório), `full` 600 por aluguel |
| Caução | 5000 (pré-autorização no cartão ou Pix) |
| Encerramento forçado fora da zona de devolução (só admin) | taxa 1500 |

---

### Task 0: Scaffolding do monorepo

Executada direto pelo orquestrador na `main` (sem worktree).

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.editorconfig`, `.gitattributes`, `.nvmrc`, `.env.example`, `docker-compose.yml`, `infra/mosquitto/mosquitto.conf`, `README.md`, `docs/decisoes.md`

- [ ] **Step 1: Criar os arquivos de raiz**

`package.json`:
```json
{
  "name": "volti",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "engines": { "node": ">=24" },
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "dev:deps": "docker compose up -d postgres redis mosquitto minio",
    "contracts:generate": "pnpm --filter @volti/contracts generate"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - infra
  - services/*
  - apps/admin
  - packages/contracts
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  }
}
```

`.editorconfig`:
```ini
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.gitattributes`:
```
* text=auto eol=lf
*.woff2 binary
*.png binary
*.jpg binary
*.bat text eol=crlf
```

`.nvmrc`: `24`

`.env.example`:
```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://volti:volti@localhost:5432/volti
REDIS_URL=redis://localhost:6379
MQTT_URL=mqtt://localhost:1883
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=volti
S3_SECRET_KEY=volti-dev-secret
S3_BUCKET_KYC=documentos-kyc
S3_BUCKET_RETURN_PHOTOS=fotos-devolucao
S3_BUCKET_REPORTS=relatorios
AUTH_MODE=dev
DEV_JWT_SECRET=troque-este-segredo-local
IOT_MODE=local
GEOFENCE_MODE=local
QUEUE_MODE=local
STORAGE_MODE=local
PAYMENT_PROVIDER=fake
INSURANCE_PROVIDER=mock
KYC_PROVIDER=mock
PUSH_MODE=log
TRACK_RETENTION_DAYS=90
OUT_OF_AREA_LOCK_MINUTES=5
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
```

`docker-compose.yml`:
```yaml
name: volti
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: volti
      POSTGRES_PASSWORD: volti
      POSTGRES_DB: volti
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U volti"]
      interval: 5s
      retries: 20
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883"]
    volumes: ["./infra/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro"]
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: volti
      MINIO_ROOT_PASSWORD: volti-dev-secret
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]
volumes:
  pgdata:
  miniodata:
```

`infra/mosquitto/mosquitto.conf`:
```
listener 1883
allow_anonymous true
persistence false
```

`docs/decisoes.md`:
```markdown
# Decisões

Registro de mudanças de contrato e decisões que fogem da spec. Formato: data · autor · decisão · motivo · status (proposta/aprovada).
```

`README.md`: visão geral curta do monorepo (tabela de pastas da spec §3), pré-requisitos (Node 24, pnpm 9, Docker, Flutter 3.41, Java 17) e "Como rodar local": `cp .env.example .env`, `pnpm install`, `pnpm dev:deps`.

- [ ] **Step 2: Verificar que o compose sobe**

Run: `docker compose up -d && docker compose ps`
Expected: `postgres` (healthy), `redis`, `mosquitto`, `minio` em `running`. Depois: `docker compose down`.

- [ ] **Step 3: Normalizar fins de linha e commitar**

```bash
git add -A && git add --renormalize . && git commit -m "chore: scaffolding do monorepo e docker-compose local"
```

---

### Task 1: Contrato da API (agente 2, parte A) — **para no checkpoint do usuário**

**Agente:** prompt "Agente 2", só o item 1 (CONTRATO PRIMEIRO). Branch/worktree `fase1/api`.

**Files:**
- Create: `packages/contracts/package.json` (nome `@volti/contracts`), `packages/contracts/openapi.yaml`, `packages/contracts/realtime.md`, `packages/contracts/scripts/generate.mjs`, `packages/contracts/generated/ts/schema.d.ts`, `packages/contracts/generated/dart/**` (pacote `volti_api`), `packages/contracts/README.md`

**Interfaces:**
- Produces: `openapi.yaml` com tags `auth`, `kyc`, `vehicles`, `zones`, `reservations`, `rentals`, `pricing`, `commands`, `payments`, `wallet`, `insurance`, `alerts`, `support`, `field-tasks`, `maintenance`, `reports`, `customers`, `staff`, `audit`, `lgpd`, `webhooks`, `health`. Os schemas usam os enums de "Interfaces compartilhadas". `realtime.md` copia a tabela de eventos do WebSocket deste plano.
- Endpoints mínimos obrigatórios (os demais seguem os prompts 2, 4, 5, 6 e 7):
  - `GET /health`; `POST /dev/token` (só `AUTH_MODE=dev`, body `{ sub, email, groups[], pool: 'customer' | 'staff' }`)
  - `GET /me`; `POST /kyc/uploads` (URLs pré-assinadas documento/selfie); `POST /kyc/submit`; `GET /kyc/status`
  - `GET /vehicles/nearby?lat&lng&radiusM&minRangeKm`; `GET /vehicles/{id}`; `GET /vehicles/by-code/{code}` (QR ou número)
  - `GET /zones?bbox=`; `POST /zones`; `PUT /zones/{id}`; `DELETE /zones/{id}` (GeoJSON Polygon)
  - `POST /reservations`; `DELETE /reservations/{id}`; `GET /reservations/current`
  - `POST /rentals` (Idempotency-Key; body `{ vehicleId, planCode, coverage, depositMethod, couponCode? }`); `POST /rentals/{id}/pause`; `POST /rentals/{id}/resume`; `POST /rentals/{id}/return-photo` (URL pré-assinada); `POST /rentals/{id}/end`; `POST /rentals/{id}/force-end` (staff, `reason` obrigatório); `GET /rentals/{id}`; `GET /rentals/{id}/track`; `GET /rentals` (paginado)
  - `GET /pricing/plans`; `POST /pricing/quote`; CRUD `/pricing/plans`, `/pricing/coupons`, `/pricing/fees` (admin)
  - `POST /vehicles/{id}/commands` (body `{ type: CommandType, reason, speedLimitKmh?, on? }`, `speedLimitKmh` com `maximum: 32`, `minimum: 0`); `GET /commands/{id}`
  - `POST /payments/cards` (recebe token do gateway); `GET /payments`; `POST /payments/{id}/refund`; `POST /webhooks/mercadopago`
  - `GET /wallet`; `POST /wallet/top-ups`; `GET /wallet/ledger`
  - `GET /alerts`; `POST /alerts/{id}/assign`; `POST /alerts/{id}/resolve`
  - `POST /support/incidents`; `POST /support/disputes`; `POST /support/claims`; listas paginadas
  - `GET/POST /field-tasks`; `POST /field-tasks/{id}/complete`; `POST /field-tasks/{id}/inspection`; `POST /field-tasks/{id}/battery-swap`; `POST /vehicles/{id}/service-unlock`
  - `GET /reports/revenue`, `/reports/occupancy`, `/reports/revenue-per-vehicle`, `/reports/finance` (+ `?format=csv`)
  - `GET /customers`, `GET /customers/{id}`, `POST /customers/{id}/block`; `GET /audit-logs`
  - `GET /lgpd/export`; `DELETE /lgpd/account`
- Todo erro: `application/problem+json` (RFC 7807). Paginação: `?cursor&limit` → `{ items, nextCursor }`.

- [ ] **Step 1:** Escrever o plano da área em `docs/superpowers/plans/2026-10-21-contrato.md` e entregar ao orquestrador.
- [ ] **Step 2:** Escrever `openapi.yaml` e validar com `pnpm --filter @volti/contracts exec redocly lint openapi.yaml` (Expected: sem erros).
- [ ] **Step 3:** Script `generate` roda `openapi-typescript openapi.yaml -o generated/ts/schema.d.ts` e `openapi-generator-cli generate -i openapi.yaml -g dart-dio -o generated/dart --additional-properties=pubName=volti_api`. Run: `pnpm contracts:generate` → arquivos gerados sem erro; `cd packages/contracts/generated/dart && dart pub get && dart analyze` → sem erros.
- [ ] **Step 4:** Script `mock` (`prism mock openapi.yaml -p 4010`) e um teste de fumaça: `curl localhost:4010/vehicles/nearby?lat=-23.56&lng=-46.69` → 200.
- [ ] **Step 5:** Commit `feat(contracts): openapi 3.1, realtime e clientes gerados`.
- [ ] **CHECKPOINT:** o orquestrador apresenta o `openapi.yaml` ao usuário e **espera aprovação** antes da Task 3.

---

### Task 2: Infraestrutura AWS (agente 1)

**Agente:** prompt "Agente 1" completo. Branch/worktree `fase1/infra`. Roda em paralelo com a Task 1.

**Files:** tudo em `/infra/**` e `.github/workflows/infra.yml`. Stacks: `NetworkStack`, `DataStack`, `AuthStack`, `ApiStack`, `IotStack`, `MessagingStack`, `AdminWebStack`, `ObservabilityStack`; `bin/volti.ts` lê `-c env=dev|prod`.

**Interfaces:**
- Produces (SSM Parameter Store, prefixo `/volti/<env>/`): `vpc/id`, `rds/endpoint`, `rds/secret-arn`, `redis/endpoint`, `s3/kyc-bucket`, `s3/return-photos-bucket`, `s3/reports-bucket`, `cognito/customer-pool-id`, `cognito/customer-client-id`, `cognito/staff-pool-id`, `cognito/staff-client-id`, `iot/endpoint`, `iot/thing-type`, `location/tracker-name`, `location/geofence-collection`, `sqs/telemetry-url`, `sqs/payments-webhook-url`, `sqs/alerts-url`, `admin/distribution-domain`. Mesmos nomes de variável do `.env.example` documentados em `infra/README.md`.
- Política IoT conforme "Contrato MQTT" deste plano (inclui `motos/{thing}/comandos`).

**Testes obrigatórios (assertions do CDK, `aws-cdk-lib/assertions`):**
- RDS: `StorageEncrypted: true`, `PubliclyAccessible: false`, `BackupRetentionPeriod >= 7`, engine `postgres` 16.
- Todos os buckets com `PublicAccessBlockConfiguration` total e criptografia; `documentos-kyc` com KMS.
- Pool interno com `MfaConfiguration: 'ON'` e os 5 grupos; pool de clientes sem MFA obrigatório.
- Cada fila SQS com `RedrivePolicy` apontando para uma DLQ.
- Política IoT: nenhum `Resource: "*"` em `iot:Publish`/`iot:Subscribe`/`iot:Receive`; recursos contêm `${iot:Connection.Thing.ThingName}`.
- CloudFront com OAC e `WebACLId`; ALB listener 443 com certificado; target group com health check `/health`.
- Dev com exatamente 1 NAT gateway; todos os recursos com tags `projeto` e `ambiente`.
- Budget com limite 100 USD no dev.

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-infra.md`.
- [ ] **Step 2:** Implementar com TDD (assertions antes de cada stack).
- [ ] **Step 3:** Run: `pnpm --filter infra test` → PASS; `pnpm --filter infra exec cdk synth -c env=dev` e `-c env=prod` → sintetiza sem erro (não precisa de credenciais com `env` fixo e lookups desligados).
- [ ] **Step 4:** `.github/workflows/infra.yml`: `synth` + `diff` em PR; `deploy` em dev no push para `main` via OIDC (`aws-actions/configure-aws-credentials` com `role-to-assume`). README com estimativa de custo mensal do dev.
- [ ] **Step 5:** Commit `feat(infra): stacks CDK dev/prod`.

---

### Task 3: API, banco e módulos (agente 2, parte B)

**Agente:** prompt "Agente 2", itens 2–6. Mesma branch `fase1/api`, depois do checkpoint da Task 1.

**Files:** `services/api/**` (NestJS), `services/api/prisma/schema.prisma` + migrações, `services/api/prisma/seed.ts`, serviço `api` no `docker-compose.yml`.

**Interfaces:**
- Consumes: `openapi.yaml` aprovado (Task 1).
- Produces: as portas de "Interfaces compartilhadas" em `services/api/src/ports/` exatamente como escritas, com stubs `StubIotGateway` (responde `confirmed` na hora e guarda o estado em memória), `StubRentalBilling` (`held`/`paid`/`false`) e `StubInsurance` (prêmios da tabela do seed), registrados nos módulos vazios `src/modules/iot/iot.module.ts`, `src/modules/payments/payments.module.ts`, `src/modules/insurance/insurance.module.ts`. Consumidores dos eventos internos (`iot.*`, `geofence.transition`, `payment.updated`) nos módulos realtime, alerts, rentals, commands e vehicles. Tabela `VehicleCommand` (`id`, `vehicleId`, `type`, `status`, `reason`, `requestedById`, `payload`, `createdAt`, `updatedAt`) e `TrackPoint` (`id`, `rentalId`, `vehicleId`, `lat`, `lng`, `speedKmh`, `recordedAt`, `expiresAt`, índice em `expiresAt`).
- Seed: São Paulo — 60 motos (`VLT-0001`…`VLT-0060`, `thingName` `moto-0001`…), zona `operation` cobrindo Pinheiros/Vila Madalena/Paulista, 6 zonas `return`, 1 `forbidden` (Parque Ibirapuera), 2 `reduced_speed` (calçadão a 6 km/h, ciclovia da Faria Lima a 20 km/h), planos e taxas da tabela de preços, usuários dev de cada grupo e 2 clientes (um aprovado, um pendente).

**Testes obrigatórios:**
- Preço (`pricing.service.spec.ts`): `minute` 10 min → 1090; 10 min 01 s → 1169; 10 min + 5 min de pausa → 1190; cupom 20% sobre 1090 → 872; `hour` 61 min → 5800; `day` 25 h → 17800; o valor final do encerramento inclui o seguro (`basic` +200).
- Encerramento (`rental-end.service.spec.ts`): fora de zona `return` → 422 `problem+json` com `type` `.../rental-outside-return-zone`; sem foto → 422; rastreador não confirma `travada` → status `ending` e retentativa; confirmado → `ended`, `settle` chamado uma vez com o valor calculado; `force-end` sem `reason` → 400; `force-end` fora da zona soma a taxa 1500.
- Início: KYC não aprovado → 403; cliente inadimplente → 403; mesmo `Idempotency-Key` duas vezes → um aluguel só e mesma resposta; moto não `free`/reservada por outro → 409.
- Reserva: segunda reserva do mesmo cliente → 409; expiração via TTL do Redis libera a moto (teste com TTL curto).
- Comandos: `speed_limit` com 33 → 400 (validação) e o `IotGateway` nunca é chamado; todo comando grava `AuditLog` com quem/quando/motivo; `reason` vazio → 400.
- Auth: rota de staff com token de cliente → 403; grupo `financeiro` não acessa `POST /vehicles/{id}/commands`.
- LGPD: `GET /lgpd/export` devolve só os dados do próprio cliente; `DELETE /lgpd/account` anonimiza (nome/CPF/e-mail substituídos) e mantém pagamentos; job de expiração apaga `TrackPoint` com `expiresAt < now`.
- e2e (`test/rental-flow.e2e-spec.ts`, Postgres e Redis do compose): `POST /dev/token` → `POST /reservations` → `POST /rentals` → `pause` → `resume` → `return-photo` → `end` → `GET /rentals/{id}` com `ended` e `costCents` correto.

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-api.md`.
- [ ] **Step 2:** Implementar com TDD, módulo a módulo.
- [ ] **Step 3:** Run: `pnpm dev:deps && pnpm --filter api prisma migrate dev && pnpm --filter api prisma db seed && pnpm --filter api lint && pnpm --filter api test && pnpm --filter api test:e2e` → tudo PASS.
- [ ] **Step 4:** Teste de contrato: script `pnpm --filter api test:contract` que sobe a API e valida respostas de 10 endpoints principais contra o `openapi.yaml` (ex.: `jest-openapi`).
- [ ] **Step 5:** Commit `feat(api): módulos, banco, seed e e2e do aluguel`.
- [ ] **REVISÃO (orquestrador):** code review + verificação dos comandos acima; merge de `fase1/api` e `fase1/infra` na `main`.

---

### Task 4: IoT, rastreio e cercas (agente 3)

**Agente:** prompt "Agente 3" completo. Branch/worktree `fase2/iot`, a partir da `main` com a fase 1 mesclada. Paralela à Task 5.

**Files (só estes):** `services/api/src/modules/iot/**`, `services/iot-sim/**`, `packages/contracts/mqtt.md`, `packages/contracts/schemas/**`, `docs/adr-rastreador.md`, `docs/firmware-bloqueio-seguro.md`, `services/api/scripts/provision-tracker.ts`, serviço `iot-sim` (perfil `sim`) no `docker-compose.yml`.

**Interfaces:**
- Consumes: `IotGateway`, `CommandRequest`, `CommandOutcome`, `VehicleLiveState`, `InvalidSpeedLimitError` de `src/ports/iot-gateway.port.ts`; tabelas `Vehicle`, `Zone`, `TrackPoint`, `VehicleCommand`.
- Produces: `LocalMqttIotGateway` e `AwsIotGateway` (seleção por `IOT_MODE`) substituindo o `StubIotGateway`; `LocalGeofenceEngine` (PostGIS) e `AwsLocationGeofenceEngine` (seleção por `GEOFENCE_MODE`); emissão dos eventos `iot.telemetry`, `iot.device-event`, `iot.command-updated`, `iot.connectivity`, `geofence.transition`; `SafeLockService` com a rampa abaixo.
- Rampa do bloqueio seguro: com velocidade reportada ≥ 3 km/h, define `limite_kmh` em degraus `min(atual, 15) → 8 → 3 → 0`, um degrau a cada 2 s depois do `reported`; trava (`travada: true`) assim que `velocidade_kmh < 3`; se não parar em 120 s → `iot.command-updated` `failed`/`did_not_stop` e mantém `limite_kmh: 0`. Moto offline → `pending`/`offline`, aplicado ao reconectar (o shadow guarda o desired).

**Testes obrigatórios:**
- `SafeLockService`: moto a 25 km/h → nunca publica `travada: true` enquanto a velocidade reportada for ≥ 3; publica a sequência de limites 15, 8, 3, 0; trava quando reporta 2 km/h; moto parada (0 km/h) → trava direto; 120 s sem parar → `failed`/`did_not_stop`.
- `setSpeedLimit(…, 33)` e `(…, -1)` → `InvalidSpeedLimitError`, nada publicado.
- Cercas: ENTER em `reduced_speed` de 6 → `setSpeedLimit(6)`; EXIT → volta para 32 (ou para o limite da zona que ainda contém a moto); EXIT de `operation` → alerta imediato e bloqueio seguro após 5 min (com relógio falso), cancelado se voltar antes.
- Telemetria: grava `TrackPoint` com `expiresAt = recordedAt + 90 dias`; só grava trajeto quando há aluguel ativo (LGPD) — sem aluguel, atualiza só Redis/status da frota.
- Simulador: obedece ao shadow (respeita `limite_kmh`, trava só abaixo de 3 km/h, nunca passa de 32); teste unitário do modelo de movimento.
- Integração (Mosquitto do compose): comando `lock` via API com uma moto simulada andando termina `confirmed` com a moto parada.

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-iot.md`.
- [ ] **Step 2:** Implementar com TDD.
- [ ] **Step 3:** Run: `pnpm --filter api test -- iot` → PASS; `pnpm --filter iot-sim test` → PASS; `docker compose --profile sim up -d` com `SIM_VEHICLES=50` → 50 motos publicando, posições mudando em `GET /vehicles/nearby`.
- [ ] **Step 4:** Commit `feat(iot): gateway MQTT/AWS, cercas, bloqueio seguro e simulador`.

---

### Task 5: Pagamentos, caução e seguro (agente 4)

**Agente:** prompt "Agente 4" completo. Branch/worktree `fase2/pagamentos`. Paralela à Task 4.

**Files (só estes):** `services/api/src/modules/payments/**`, `services/api/src/modules/insurance/**`, `services/api/src/modules/wallet/**`, migrações Prisma **novas**, `docs/pagamentos.md` (máquina de estados).

**Interfaces:**
- Consumes: `RentalBillingPort`, `InsurancePort` de `src/ports/`.
- Produces: `PaymentProvider` (interface do prompt 4) com `FakePaymentProvider` e `MercadoPagoPaymentProvider` (seleção por `PAYMENT_PROVIDER`); `RentalBillingService implements RentalBillingPort` e `InsuranceService implements InsurancePort` substituindo os stubs; `InsuranceProvider` com `MockInsuranceProvider`; `ReceiptService` (PDF no bucket `relatorios`, via `ObjectStorage`); `InvoiceIssuer` (NFS-e) com `MockInvoiceIssuer`; ledger `WalletEntry` (só inserção); evento `payment.updated`; endpoints de financeiro do contrato.
- Estados de `Payment`: `pending → authorized → captured | canceled`; `pending → paid`; `paid | captured → refunded | partially_refunded`; `* → failed`. Webhook: valida a assinatura `x-signature` do Mercado Pago (HMAC-SHA256 com `MERCADOPAGO_WEBHOOK_SECRET`), enfileira no `QueueBus` e processa com deduplicação por `eventId` (tabela `ProcessedWebhook`, chave única).

**Testes obrigatórios:**
- Cada transição válida da máquina de estados e rejeição das inválidas (ex.: `capture` de `canceled` → erro).
- Mesmo webhook duas vezes → um efeito só; assinatura inválida → 401 e nada enfileirado.
- Mesmo `idempotencyKey` em `holdDeposit`/`settle` → mesma resposta, uma chamada ao provider.
- `settle` com valor menor que a caução → captura o valor e libera o restante; falha de captura → cliente inadimplente e `isDelinquent` → `true`.
- Carteira: saldo = soma do ledger; nenhum endpoint altera saldo sem lançamento.
- Seguro: `basic` obrigatório (aluguel sem cobertura → erro); prêmio somado ao valor; repasse registrado.
- Nunca armazena número de cartão (teste que o DTO de cartão só aceita `cardToken`).

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-pagamentos.md`.
- [ ] **Step 2:** Implementar com TDD.
- [ ] **Step 3:** Run: `pnpm --filter api test -- payments insurance wallet` → PASS; `pnpm --filter api test:e2e` (fluxo do aluguel com `PAYMENT_PROVIDER=fake`) → PASS.
- [ ] **Step 4:** Commit `feat(payments): caução, cobrança, webhooks idempotentes, carteira e seguro`.
- [ ] **REVISÃO (orquestrador):** code review das Tasks 4 e 5; merge de `fase2/iot` e `fase2/pagamentos` na `main`; `pnpm -r test` e e2e verdes na `main`.

---

### Task 6: App do cliente + `volti_flutter` (agente 5)

**Agente:** prompt "Agente 5" completo. Branch/worktree `fase3/cliente`.

**Files:** `packages/volti_flutter/**`, `apps/cliente/**`.

**Interfaces:**
- Consumes: pacote `volti_api` (`packages/contracts/generated/dart`); eventos do WebSocket deste plano; `POST /dev/token` para o login dev; tokens de `design-system/tokens/*.css`; fontes de `design-system/assets/fonts`; telas de referência em `design-system/ui_kits/app`.
- Produces (`packages/volti_flutter`, usado pela Task 8): `VoltiColors`, `VoltiSpacing`, `VoltiRadii`, `VoltiShadows`, `VoltiTheme.light()`, `VoltiTheme.dark()`, `VoltiTypography` e os widgets `VoltiButton` (variants `primary`, `secondary`, `ghost`, `danger`), `VoltiIconButton`, `BatteryPill(int pct)`, `VehicleMarker(VehicleStatus status, int batteryPct, {bool selected})`, `FleetStatusBadge(VehicleStatus)`, `RouteInfoPill`, `ReservationBanner`, `OptionCard`, `OtpInput`, `PhotoCapture`, `VoltiBottomSheet`, `VoltiDialog`, `VoltiToast`, `ProgressSteps`, `ListRow`, `SwipeAction`; `ApiClientProvider` (Riverpod) com retry exponencial; `AuthRepository` com modos `dev` e `cognito`.
- Cores de bateria: verde > 50, amarelo 21–50, coral ≤ 20. Cores de status iguais a `--status-*`.

**Testes obrigatórios (widget):** cores de `BatteryPill` nos três limites (51, 50, 20); onboarding bloqueia sem aceite do consentimento de localização; tela de plano exige seguro (básico pré-selecionado e não removível); em aluguel, `zone.notice` mostra o novo limite e `device.event` `queda` abre o diálogo "Você está bem?"; encerrar sem foto fica desabilitado; erro de rede mostra estado de erro com "Tentar de novo".

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-app-cliente.md`.
- [ ] **Step 2:** Implementar `volti_flutter` primeiro e commitar (`feat(volti_flutter): tema e widgets`) — **avisar o orquestrador**, que libera a Task 8.
- [ ] **Step 3:** Implementar o app com TDD (feature-first, Riverpod, go_router, `flutter_localizations` com `lib/l10n/app_pt.arb`).
- [ ] **Step 4:** Run: `cd packages/volti_flutter && flutter test` → PASS; `cd apps/cliente && flutter analyze && flutter test` → PASS; `flutter build apk --debug` e `flutter build web` → build ok.
- [ ] **Step 5:** Fluxo navegável apontando para `API_BASE_URL` (`--dart-define`), testado contra o Prism (`pnpm --filter @volti/contracts mock`).
- [ ] **Step 6:** Commit `feat(cliente): app do cliente`.

---

### Task 7: Painel web do admin (agente 6)

**Agente:** prompt "Agente 6" completo. Branch/worktree `fase3/admin`.

**Files:** `apps/admin/**`.

**Interfaces:**
- Consumes: `packages/contracts/generated/ts/schema.d.ts` via `openapi-fetch`; eventos do WebSocket (sala `fleet`); `POST /dev/token` (login dev) ou Cognito do pool interno com MFA; tokens de `design-system/tokens/*.css` (copiados para `app/globals.css` como variáveis e mapeados no `tailwind.config.ts`); layout de `design-system/ui_kits/admin`.
- Produces: build estático em `apps/admin/out` (`output: 'export'`), compatível com o `AdminWebStack` da Task 2.
- Visibilidade por grupo: `admin` vê tudo; `operacao` frota/cercas/alertas/campo; `financeiro` financeiro/relatórios/aluguéis (sem comandos); `suporte` clientes/aluguéis/suporte (CPF mascarado `***.456.789-**`).

**Testes obrigatórios:**
- Playwright (contra a API do compose com o simulador): bloquear uma moto em movimento exige motivo, mostra `pendente` e depois `confirmado`; comando para moto offline mostra "moto offline — será aplicado ao reconectar"; desenhar uma cerca `reduced_speed` com limite 40 → erro de validação "Máximo de 32 km/h"; criar, editar e excluir uma cerca.
- Unitários (Vitest): mapeamento de status → cor; menu filtrado por grupo; máscara de CPF.

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-admin.md`.
- [ ] **Step 2:** Implementar com TDD.
- [ ] **Step 3:** Run: `pnpm --filter admin lint && pnpm --filter admin test && pnpm --filter admin build` → PASS e `out/` gerado; `pnpm --filter admin test:e2e` (Playwright) → PASS.
- [ ] **Step 4:** Commit `feat(admin): painel web`.

---

### Task 8: App do operador de campo (agente 7)

**Agente:** prompt "Agente 7" completo. Branch/worktree `fase3/operador`, criada **depois** do commit do `volti_flutter` da Task 6 (rebase sobre ele).

**Files:** `apps/operador/**`; só acrescentar widgets em `packages/volti_flutter` (sem alterar os existentes).

**Interfaces:**
- Consumes: `volti_flutter` (tema, widgets, `ApiClientProvider`, `AuthRepository`), `volti_api`, endpoints `field-tasks`, `vehicles/{id}/service-unlock`, `vehicles/{id}` (status); layout de `design-system/ui_kits/operator` (header ink-900).
- Produces: fila offline com `drift` (SQLite) ou `hive` para checklists e trocas de bateria, sincronizada ao voltar a rede.

**Testes obrigatórios (widget):** checklist não conclui sem todos os itens e sem foto; item "limitador de velocidade" rejeita valor > 32 km/h; troca de bateria exige dois números de série diferentes; checklist salvo offline aparece como "aguardando sincronização" e é enviado quando a rede volta (repositório fake).

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-app-operador.md`.
- [ ] **Step 2:** Implementar com TDD.
- [ ] **Step 3:** Run: `cd apps/operador && flutter analyze && flutter test` → PASS; `flutter build apk --debug` → ok.
- [ ] **Step 4:** Commit `feat(operador): app do operador de campo`.
- [ ] **REVISÃO (orquestrador):** code review das Tasks 6, 7 e 8; merge das três branches na `main`; `pnpm -r test` e `flutter test` nos três pacotes Flutter verdes.

---

### Task 9: Integração, QA e segurança (agente 8)

**Agente:** prompt "Agente 8" completo, subagente novo sem o contexto desta conversa. Branch/worktree `fase4/qa`.

**Files:** `tests/e2e/**`, `tests/load/k6-*.js`, `docs/relatorio-qa.md`; correções pequenas e pontuais são permitidas, mas reescrita de módulo não.

**Interfaces:**
- Consumes: tudo na `main`; `docker compose --profile sim up` com `SIM_VEHICLES=50`.

**Verificações obrigatórias:**
- e2e cliente (API): cadastro → KYC → reserva → caução → desbloqueio → corrida com troca de zona → saída da área → retorno → encerramento → recibo.
- e2e admin: bloqueio de moto em movimento (assert: nenhum `travada: true` publicado com `velocidade_kmh ≥ 3`); comando para moto offline (fica `pending` e aplica ao reconectar); criação de cerca nova.
- k6: `tests/load/k6-telemetry.js` com 500 motos e `tests/load/k6-clients.js` com 200 clientes simultâneos (`k6` via `docker run grafana/k6`); registrar p95 e taxa de erro.
- Contrato: diff entre rotas implementadas, `openapi.yaml` e clientes gerados.
- Segurança: OWASP API Top 10, permissões por grupo, política IoT, segredos no repositório (`git grep` por chaves), buckets privados, assinatura de webhook.
- LGPD: consentimento, minimização, retenção de 90 dias, exportação e exclusão.
- Regras legais: busca por qualquer caminho que aceite limite > 32 km/h ou fora dos limites de zona.

- [ ] **Step 1:** Plano da área em `docs/superpowers/plans/2026-10-21-qa.md`.
- [ ] **Step 2:** Executar as verificações e escrever os testes que faltarem.
- [ ] **Step 3:** Escrever `docs/relatorio-qa.md` com cada problema por severidade (crítica, alta, média, baixa), como reproduzir e sugestão de correção.
- [ ] **Step 4:** Commit `test(qa): e2e, carga e relatório de QA`.
- [ ] **ENTREGA (orquestrador):** merge de `fase4/qa` e apresentação do relatório ao usuário.

---

## Ordem de execução

```
Task 0 ──► Task 1 (contrato) ──► [CHECKPOINT usuário] ──► Task 3 (API) ──┐
       └─► Task 2 (infra) ────────────────────────────────────────────────┴─► revisão/merge fase 1
                                                                              │
                                     ┌──────── Task 4 (IoT) ◄─────────────────┤
                                     └──────── Task 5 (pagamentos) ◄──────────┘
                                                     │ revisão/merge fase 2
                    ┌─ Task 6 (cliente; volti_flutter primeiro) ──┐
                    ├─ Task 7 (admin) ─────────────────────────────┤ revisão/merge fase 3
                    └─ Task 8 (operador, após volti_flutter) ──────┘
                                                     │
                                              Task 9 (QA) ──► relatório
```
