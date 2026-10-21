# API Volti (`services/api`)

NestJS 10 + Prisma 5 + PostgreSQL 16/PostGIS + Redis 7. Implementa as 140 operações de `packages/contracts/openapi.yaml` e o WebSocket de `packages/contracts/realtime.md` (Socket.IO, namespace `/realtime`).

## Como rodar localmente

```bash
cp .env.example .env                    # na raiz do monorepo
cp .env.example services/api/.env       # o Prisma CLI lê o .env da pasta do pacote
pnpm install
pnpm dev:deps                           # postgres, redis, mosquitto, minio (a API cria os buckets ao subir)
pnpm --filter api prisma migrate deploy # aplica prisma/migrations
pnpm --filter api prisma db seed        # São Paulo: 60 motos, zonas, preços, usuários dev
pnpm --filter api dev                   # compila (tsc) e sobe em http://localhost:3000
```

Ou tudo em containers: `docker compose up -d --build api` (sobe sem `.env`, com padrões de dev; porta do host em `API_PORT`, padrão 3000) (o container aplica as migrações com `RUN_MIGRATIONS=true`; `RUN_SEED=true` roda o seed).

> **Migrações:** aplique com `migrate deploy`. Use `migrate dev` só para criar migração nova, revisando o SQL gerado. A migração inicial tem índices GIST e parciais e `CHECK` escritos à mão, e o setup do e2e confere que existem. Para checar drift, rode `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`: o resultado deve ser uma migração vazia.

> `tsx`/esbuild não emite metadados de decorators; por isso o `dev` usa `tsc`. O seed roda com `tsx` (não usa DI).

### Tokens de desenvolvimento (`AUTH_MODE=dev`)

```bash
curl -X POST localhost:3000/dev/token -H 'content-type: application/json' \
  -d '{"sub":"dev-cliente-aprovado","email":"cliente.aprovado@volti.dev","groups":[],"pool":"customer"}'
curl -X POST localhost:3000/dev/token -H 'content-type: application/json' \
  -d '{"sub":"dev-admin","email":"admin@volti.dev","groups":["admin"],"pool":"staff"}'
```

Usuários do seed: `dev-admin`, `dev-operacao`, `dev-financeiro`, `dev-suporte`, `dev-campo` (staff) e `dev-cliente-aprovado` / `dev-cliente-pendente` (clientes). As motos `VLT-0001`…`VLT-0006` ficam dentro das zonas de devolução.

## Testes

| Comando | O que roda | Precisa de |
|---|---|---|
| `pnpm --filter api test` | unitários (preço, início/encerramento, reservas, comandos, auth, LGPD, inspeção) + conformidade com o contrato (rotas, grupos, schemas) | nada |
| `pnpm --filter api test:e2e` | `test/iot/iot-safe-lock.e2e-spec.ts`: lock pela API com moto simulada andando (Mosquitto) e cerca PostGIS; `test/rental-flow.e2e-spec.ts`: dev token → reserva → aluguel → pausa → retoma → foto (PUT real no MinIO) → encerra, TTL da reserva, auth, TrackPoint; `test/reports.e2e-spec.ts`: relatórios no fuso de São Paulo | compose + migrate + seed |
| `pnpm --filter api test:contract` | sobe a API e valida respostas reais de 11 grupos de endpoints com `jest-openapi` | compose + migrate + seed |
| `pnpm --filter api lint` | ESLint + `tsc --noEmit` | nada |

## Estrutura

- `src/ports/` — interfaces fixas: `IotGateway`, `RentalBillingPort`, `InsurancePort` (plano mestre), `ObjectStorage`, `QueueBus`, `KycProvider`, `PushNotifier`, `AuthVerifier`.
- `src/adapters/` — implementações local/aws escolhidas por variável (`AUTH_MODE`, `STORAGE_MODE`, `QUEUE_MODE`, `KYC_PROVIDER`, `PUSH_MODE`).
- `src/modules/iot` — **Task 4** (ver "IoT" abaixo).
- `src/modules/payments`, `insurance`, `wallet` — **dono: Task 5**. Hoje registram `StubRentalBilling` (`held`/`paid`/não inadimplente; Pix confirma sozinho após `STUB_PIX_AUTOCONFIRM_SECONDS`) e `StubInsurance` (prêmios do seed), além de endpoints provisórios sobre o banco.
- `src/common/` — enums compartilhados, erros RFC 7807 (`ProblemException` → `type: https://api.volti.com.br/problems/<slug>`), idempotência (`@Idempotent`), paginação por cursor, logger JSON sem dados pessoais.
- Eventos internos: `src/common/events.ts` (os do plano mestre + os próprios da API, ver `docs/decisoes.md`).
- Jobs (`JOBS_ENABLED`): expiração de reservas (TTL do Redis + varredura), retentativa de encerramento `ending`, `rental.updated` a cada 30 s, "você está bem?" (60 s), limpeza diária de `TrackPoint` expirado.

## IoT (`src/modules/iot`, Task 4)

| Variável | Valores | Efeito |
|---|---|---|
| `IOT_MODE` | `local` (padrão), `aws`, `stub` | `LocalMqttIotGateway` (Mosquitto em `MQTT_URL`, com o servidor emulando o serviço de shadow), `AwsIotGateway` (IoT Data Plane em `IOT_ENDPOINT`; telemetria pela fila SQS `telemetria`) ou o `StubIotGateway` (confirma na hora; padrão dos e2e do fluxo de aluguel) |
| `GEOFENCE_MODE` | `local` (padrão), `aws` | ENTER/EXIT pelo PostGIS; `aws` também sincroniza a geofence collection e o tracker do Amazon Location (`LOCATION_GEOFENCE_COLLECTION`, `LOCATION_TRACKER_NAME`) |
| `IOT_CONFIRM_WAIT_MS` | `3000` | quanto a chamada de comando espera o `reported` antes de responder `in_progress` |
| `IOT_COMMAND_TIMEOUT_MS` | `30000` | sem `reported` → `failed`/`timeout` (o lock tem 120 s) |
| `IOT_OFFLINE_AFTER_MS` | `180000` | sem notícia → `iot.connectivity` offline |
| `IOT_RECONNECT_GRACE_MS` | `10000` | depois de qualquer reconexão, nenhuma amostra de velocidade (telemetria, reported, polling do shadow) vale para travar neste intervalo (fila offline do MQTT esvaziada) |
| `OUT_OF_AREA_LOCK_MINUTES` | `5` | bloqueio seguro depois de sair da área de operação |
| `TRACK_RETENTION_DAYS` | `90` | `TrackPoint.expiresAt` |

- Bloqueio seguro (`safe-lock.service.ts`): rampa `min(atual,15) → 8 → 3 → 0`, um degrau 2 s depois do `reported`; `travada: true` só com velocidade reportada < 3 km/h; 120 s → `did_not_stop`.
- Telemetria (`telemetry.service.ts`): emite `iot.telemetry`/`iot.device-event`/`iot.connectivity`; grava `TrackPoint` só com aluguel `active`/`paused`/`ending`.
- Cercas (`geofence/`): `reduced_speed` ajusta o limite (comando de sistema com AuditLog); saída da `operation` com aluguel → alerta e bloqueio em 5 min.
- Contrato MQTT: `packages/contracts/mqtt.md`; firmware: `docs/firmware-bloqueio-seguro.md`; ADR: `docs/adr-rastreador.md`.
- Provisionar rastreador: `pnpm --filter api exec tsx scripts/provision-tracker.ts --vehicle VLT-0061 --thing moto-0061 --imei 860000000000061 --mode aws|local`.
- Simulador: `services/iot-sim` (`docker compose --profile sim up -d iot-sim`).
- Teste de integração: `pnpm --filter api test:e2e -- test/iot` (Mosquitto + Postgres/Redis do compose; sobe o simulador sozinho).

## Regras que nunca mudam

- Nenhum `speedLimitKmh` fora de 0..32 é aceito (DTO → 400 `speed-limit-out-of-range`; serviço de comandos revalida; `CHECK` no banco).
- Encerrar só em zona `return`, com foto e travamento confirmado; liquidação uma única vez por aluguel.
- Localização só durante o aluguel; trajetos expiram em 90 dias; exportação/exclusão LGPD só do próprio titular.
