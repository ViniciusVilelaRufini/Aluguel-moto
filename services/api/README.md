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
| `pnpm --filter api test` | unitários (preço, início/encerramento, reservas, comandos, auth, LGPD, inspeção, pagamentos/carteira/seguro com Prisma em memória e Mercado Pago via nock) + conformidade com o contrato (rotas, grupos, schemas) | nada |
| `pnpm --filter api test:e2e` | `test/rental-flow.e2e-spec.ts`: dev token → cartão → reserva → aluguel → pausa → retoma → foto (PUT real no MinIO) → encerra, TTL da reserva, auth, TrackPoint; `test/reports.e2e-spec.ts`: relatórios no fuso de São Paulo; `test/payments.e2e-spec.ts`: caução/captura/recibo/NFS-e/repasse, Pix por webhook assinado (dedup), inadimplência → 403, carteira (`PAYMENT_PROVIDER=fake`). O setup lê o `.env` do pacote (`DATABASE_URL`/`REDIS_URL` por worktree) | compose + migrate + seed |
| `pnpm --filter api test:contract` | sobe a API e valida respostas reais de 11 grupos de endpoints com `jest-openapi` | compose + migrate + seed |
| `pnpm --filter api lint` | ESLint + `tsc --noEmit` | nada |

## Estrutura

- `src/ports/` — interfaces fixas: `IotGateway`, `RentalBillingPort`, `InsurancePort` (plano mestre), `ObjectStorage`, `QueueBus`, `KycProvider`, `PushNotifier`, `AuthVerifier`.
- `src/adapters/` — implementações local/aws escolhidas por variável (`AUTH_MODE`, `STORAGE_MODE`, `QUEUE_MODE`, `KYC_PROVIDER`, `PUSH_MODE`).
- `src/modules/iot` — **dono: Task 4**. Hoje registra `StubIotGateway` (confirma na hora).
- `src/modules/payments`, `insurance`, `wallet` — **Task 5** (`docs/pagamentos.md`): `RentalBillingService` (caução por pré-autorização ou Pix, liquidação com captura parcial, inadimplência) sobre `PaymentProvider` (`PAYMENT_PROVIDER=fake|mercadopago`), webhooks do Mercado Pago validados, enfileirados e deduplicados (`ProcessedWebhook`), carteira em ledger somente inserção, `InsuranceService` com `MockInsuranceProvider` e repasse, recibo em PDF no bucket de relatórios e NFS-e (`MockInvoiceIssuer`). No fake, o cartão precisa ser cadastrado antes de alugar (`POST /payments/cards` com `cardToken: tok_visa_4242`); o Pix se confirma sozinho após `FAKE_PIX_AUTOCONFIRM_SECONDS`.
- `src/common/` — enums compartilhados, erros RFC 7807 (`ProblemException` → `type: https://api.volti.com.br/problems/<slug>`), idempotência (`@Idempotent`), paginação por cursor, logger JSON sem dados pessoais.
- Eventos internos: `src/common/events.ts` (os do plano mestre + os próprios da API, ver `docs/decisoes.md`).
- Jobs (`JOBS_ENABLED`): expiração de reservas (TTL do Redis + varredura), retentativa de encerramento `ending`, `rental.updated` a cada 30 s, "você está bem?" (60 s), limpeza diária de `TrackPoint` expirado.

## Regras que nunca mudam

- Nenhum `speedLimitKmh` fora de 0..32 é aceito (DTO → 400 `speed-limit-out-of-range`; serviço de comandos revalida; `CHECK` no banco).
- Encerrar só em zona `return`, com foto e travamento confirmado; liquidação uma única vez por aluguel.
- Localização só durante o aluguel; trajetos expiram em 90 dias; exportação/exclusão LGPD só do próprio titular.
