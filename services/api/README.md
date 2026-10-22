# API Volti (`services/api`)

NestJS 10 + Prisma 5 + PostgreSQL 16/PostGIS + Redis 7. Implementa as operações de `packages/contracts/openapi.yaml` (177; as 6 da entrega no galpão, `/handovers*`, ficam em `PENDING_GALPAO` no `contract-security.spec.ts` até a Task 6 do plano do galpão) e o WebSocket de `packages/contracts/realtime.md` (Socket.IO, namespace `/realtime`).

## Como rodar localmente

```bash
cp .env.example .env                    # na raiz do monorepo
cp .env.example services/api/.env       # o Prisma CLI lê o .env da pasta do pacote
pnpm install
pnpm dev:deps                           # postgres, redis, mosquitto, minio (a API cria os buckets ao subir)
pnpm --filter api prisma migrate deploy # aplica prisma/migrations
pnpm --filter api prisma db seed        # São Paulo: 60 motos (Flash/Urban/Cargo), zonas, preços, estações, baterias, usuários dev
pnpm --filter api dev                   # prisma generate + tsc e sobe em http://localhost:3000
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

Usuários do seed: `dev-admin`, `dev-operacao`, `dev-financeiro`, `dev-suporte`, `dev-campo` (staff) e `dev-cliente-aprovado` / `dev-cliente-pendente` (clientes). As motos `VLT-0001`…`VLT-0006` ficam dentro das zonas de devolução. O seed do contrato v2 (`prisma/seed-v2.ts`) acrescenta o catálogo Volti Flash (79/min), Urban (89/min) e Cargo (99/min) com foto placeholder no bucket `catalogo` do MinIO, 5 estações de troca, odômetro/horas e revisões variadas (em dia, próxima, vencida), uma bateria por moto, 6 baterias na van do `dev-campo`, o cupom `BEMVINDO10` e, para o `dev-cliente-aprovado`, chave Pix (e-mail) e código de indicação `APROVADO7K`. O seed do galpão (`prisma/seed-depot.ts`, idempotente) cria o "Galpão Volti — Pinheiros" (Rua dos Pinheiros, 870; seg–sex 07:00–20:00, sáb 08:00–18:00, dom fechado) e vincula a ele só o lote `VLT-0011`…`VLT-0030` (`DEPOT_CODES`, sem as motos que os e2e usam no fluxo de rua), quando livres, nas coordenadas do galpão; motos fora do lote que apontem para o galpão são desvinculadas e voltam às coordenadas do seed (um banco semeado antes do fix se repara rodando o seed de novo).

## Testes

| Comando | O que roda | Precisa de |
|---|---|---|
| `pnpm --filter api test` | unitários (preço, início/encerramento, reservas, comandos, auth, LGPD, inspeção, IoT/bloqueio seguro/cercas, pagamentos/carteira/seguro com Prisma em memória e Mercado Pago via nock) + conformidade com o contrato (rotas, grupos, schemas) | nada |
| `pnpm --filter api test:e2e` | `test/iot/iot-safe-lock.e2e-spec.ts`: lock pela API com moto simulada andando (Mosquitto) e cerca PostGIS; `test/rental-flow.e2e-spec.ts`: dev token → cartão → reserva → aluguel → pausa → retoma → foto (PUT real no MinIO) → encerra, TTL da reserva, auth, TrackPoint; `test/reports.e2e-spec.ts`: relatórios no fuso de São Paulo; `test/payments.e2e-spec.ts`: caução/captura/recibo/NFS-e/repasse, Pix por webhook assinado (dedup), inadimplência → 403, carteira (`PAYMENT_PROVIDER=fake`); `test/contrato-v2.e2e-spec.ts`: chave Pix, limites da recarga, pausa/moto fixa do plano, cupons, indicação, estações, manutenção pelo cliente, estados do chat, revisão por km/horas, baterias/van e catálogo (respostas validadas contra o contrato). `test/depots.e2e-spec.ts`: galpões (grupos do CRUD, motos do galpão para cliente × staff, inativo some para o cliente, agenda do dia no fuso do galpão só com primeiro nome). O setup lê o `.env` do pacote (`DATABASE_URL`/`REDIS_URL` por worktree) | compose + migrate + seed |
| `pnpm --filter api test:contract` | sobe a API e valida respostas reais de 12 grupos de endpoints com `jest-openapi` (o 12º cobre o contrato v2) | compose + migrate + seed |
| `pnpm --filter api lint` | ESLint + `tsc --noEmit` | nada |

## Estrutura

- `src/ports/` — interfaces fixas: `IotGateway`, `RentalBillingPort`, `InsurancePort` (plano mestre), `ObjectStorage`, `QueueBus`, `KycProvider`, `PushNotifier`, `AuthVerifier`, `StaffDirectory` e `CustomerIdentityDirectory` (Cognito; local = no-op), `ReverseGeocoder` (contrato v2: endereço da moto).
- `src/adapters/` — implementações local/aws escolhidas por variável (`AUTH_MODE`, `STORAGE_MODE`, `QUEUE_MODE`, `KYC_PROVIDER`, `PUSH_MODE`). Valor desconhecido em qualquer `*_MODE` recusa subir.
- `src/modules/iot` — **Task 4** (ver "IoT" abaixo).
- `src/modules/payments`, `insurance`, `wallet` — **Task 5** (`docs/pagamentos.md`): `RentalBillingService` (caução por pré-autorização ou Pix, liquidação com captura parcial, inadimplência) sobre `PaymentProvider` (`PAYMENT_PROVIDER=fake|mercadopago`), webhooks do Mercado Pago validados, enfileirados e deduplicados (`ProcessedWebhook`), carteira em ledger somente inserção, `InsuranceService` com `MockInsuranceProvider` e repasse, recibo em PDF no bucket de relatórios e NFS-e (`MockInvoiceIssuer`). No fake, o cartão precisa ser cadastrado antes de alugar (`POST /payments/cards` com `cardToken: tok_visa_4242`); o Pix se confirma sozinho após `FAKE_PIX_AUTOCONFIRM_SECONDS`.
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
| `IOT_RECONNECT_GRACE_MS` | `10000` | depois de qualquer reconexão, nenhuma amostra de velocidade (telemetria, reported, polling do shadow) vale para travar neste intervalo (fila offline do MQTT esvaziada). Reconexão = presença `connected` (só `local`), primeira mensagem depois de offline, primeira amostra do processo ou lacuna (`IOT_RECONNECT_GAP_MS`) |
| `IOT_QUEUE_LAG_MS` | `5000` | telemetria com atraso de fila `(chegada − chegada anterior) − (timestamp − timestamp anterior)` maior que isto saiu da fila offline → reconexão (a amostra cai na graça); independe da cadência e do desvio do relógio do rastreador |
| `IOT_RECONNECT_GAP_MS` | `15000` | lacuna entre mensagens do rastreador (qualquer canal, hora de chegada) que conta como reconexão, nos dois modos; com a moto parada/travada vale `max(isto, 150000)`. No `aws` é o único detector de quedas mais curtas que `IOT_OFFLINE_AFTER_MS` (a presença vai para o EventBridge) |
| `OUT_OF_AREA_LOCK_MINUTES` | `5` | bloqueio seguro depois de sair da área de operação |
| `TRACK_RETENTION_DAYS` | `90` | `TrackPoint.expiresAt` |

- Bloqueio seguro (`safe-lock.service.ts`): rampa `min(atual,15) → 8 → 3 → 0`, um degrau 2 s depois do `reported`; `travada: true` só com velocidade reportada < 3 km/h; 120 s → `did_not_stop`.
- Telemetria (`telemetry.service.ts`): emite `iot.telemetry`/`iot.device-event`/`iot.connectivity`; grava `TrackPoint` só com aluguel `active`/`paused`/`ending`.
- Cercas (`geofence/`): `reduced_speed` ajusta o limite (comando de sistema com AuditLog); saída da `operation` com aluguel → alerta e bloqueio em 5 min.
- Contrato MQTT: `packages/contracts/mqtt.md`; firmware: `docs/firmware-bloqueio-seguro.md`; ADR: `docs/adr-rastreador.md`.
- Provisionar rastreador: `pnpm --filter api exec tsx scripts/provision-tracker.ts --vehicle VLT-0061 --thing moto-0061 --imei 860000000000061 --mode aws|local`.
- Simulador: `services/iot-sim` (`docker compose --profile sim up -d iot-sim`).
- Teste de integração: `pnpm --filter api test:e2e -- test/iot` (Mosquitto + Postgres/Redis do compose; sobe o simulador sozinho).

## Contrato v2 (`docs/decisoes.md`, 2026-10-22)

| Área | Onde | Regras principais |
|---|---|---|
| Chave Pix de estorno | `PATCH/GET /me` (`auth/me.controller.ts`, `common/pix-key.ts`) | validada e normalizada por tipo (CPF = o da conta); completa para titular, `admin` e `financeiro`; AuditLog sem o valor |
| Recarga de valor livre | `GET /wallet`, `POST /wallet/top-ups` (`wallet/top-up-limits.ts`) | limites `WALLET_TOP_UP_MIN_CENTS`/`_MAX_CENTS` dentro de R$ 10–1.000 → `422 top-up-amount-out-of-range` |
| Plano semanal/mensal | `payments/subscriptions.service.ts`, `subscription-rules.ts` | próxima cobrança; pausa 3 dias (semanal) / 7 (mensal), 1 por período, retomada manual ou automática (job de 1 min) estendendo o período; moto fixa exclusiva do assinante (some do `nearby` dos outros, `409` no aluguel) |
| Cupons e indicação | `referrals/` | cupons salvos com situação calculada; código `NOME+4`, bônus do indicado na hora e de quem indicou na primeira corrida `ended` (lançamentos `bonus`) |
| Estações e manutenção do cliente | `catalog/`, `maintenance/maintenance-v2.service.ts` | janelas de 1 h seg–sáb 8–18 h (SP), capacidade `MAINTENANCE_SLOT_CAPACITY`; exige plano e moto fixa |
| Chat | `support/support.service.ts` | `sent` → `delivered` (o outro lado buscou) → `read` (`POST .../read`); `unreadCount` real |
| Endereço da moto | `vehicles/vehicle-address.service.ts`, `adapters/geocoding/` | gravado na moto e recalculado quando ela anda > 50 m; cache Redis por célula de ~11 m |
| Revisão por km/horas | `maintenance/service-due.ts`, `usage-accumulator.ts`, `usage-tracker.service.ts` | odômetro/horas somados da telemetria (descarta saltos > 45 km/h, ruído < 5 m e lacunas > 10 min); `due_soon` a 90% do intervalo; preventiva concluída = revisão |
| Baterias | `batteries/`, troca em `field-tasks.service.ts` | retirada vai para a van do operador com a última carga; instalada +1 ciclo; carregar/descarregar a van |
| Catálogo | `catalog/`, `PricingService.snapshotFrom` | preço por minuto do modelo vale no plano `minute` (aluguel e cotação com `vehicleId`); foto em bucket `catalogo` com link assinado de 24 h |
| Galpões | `depots/` (`GET/POST /depots`, `GET/PATCH /depots/{id}`, `/vehicles`, `/pickups`) | cliente só vê galpão ativo (inativo → `404`) e, nas motos, só `free` com o `depotId` (nunca `reserved`/`awaiting_pickup`) e sem moto fixa de assinatura vigente de outro cliente, bateria desc; `availableVehicleCount` exclui toda moto fixa vigente; staff vê todas com filtro de `status`; `openingHours` HH:MM, `opensAt < closesAt`, um intervalo por dia (`400`); `distanceM` só com `lat`/`lng`; agenda = todas as reservas do dia no fuso do galpão (agendada por `pickupAt`, agora por `createdAt`), só `customerFirstName`, nunca `pickupCode`, data impossível → `400`; `DepotsService.requireActive` → `422 depot-inactive`; AuditLog `depot.create`/`depot.update` |

| Variável | Padrão | Efeito |
|---|---|---|
| `GEOCODER_MODE` | `local` | `local`: ruas de São Paulo em memória; `aws`: Amazon Location `SearchPlaceIndexForPosition` no índice `LOCATION_PLACE_INDEX` |
| `WALLET_TOP_UP_MIN_CENTS` / `_MAX_CENTS` / `_SUGGESTED_CENTS` | 1000 / 100000 / `2000,5000,10000` | limites e atalhos da recarga |
| `REFERRAL_REFERRER_REWARD_CENTS` / `REFERRAL_REFEREE_REWARD_CENTS` / `REFERRAL_INVITE_BASE_URL` | 1000 / 1000 / `https://volti.com.br/convite` | indicação |
| `MAINTENANCE_SLOT_CAPACITY` / `MAINTENANCE_LOCATION` | 2 / Oficina Volti (Pinheiros) | agendamento pelo cliente |
| `SERVICE_INTERVAL_KM` / `SERVICE_INTERVAL_HOURS` | 1000 / 100 | intervalo de revisão de moto sem modelo |
| `S3_BUCKET_CATALOG` | `catalogo` | fotos do catálogo (criado na subida em `STORAGE_MODE=local`) |
| `FRAUD_HASH_SECRET` | segredo local em dev | HMAC do CPF (indicação/cupom), retido após a exclusão LGPD; **obrigatório em produção** |
| `SUBSCRIPTION_RENEWAL_GRACE_HOURS` / `SUBSCRIPTION_VEHICLE_SWAP_COOLDOWN_HOURS` | 72 / 24 | carência antes de `expired`; espera entre trocas da moto fixa pelo cliente |
| `REFERRAL_MIN_RENTAL_CENTS` | 500 | corrida paga mínima para o bônus de quem indicou |

Fix round 1 (`docs/decisoes.md`): pausa/retomada só com confirmação do gateway (`503 gateway-unavailable`), ciclo de vida das assinaturas (`canceled`/`expired` pelo job), regra única da moto fixa com período vigente (`common/fixed-vehicle.ts`), posição oculta de motos em uso por outros clientes (`locationHidden`), HMAC do CPF contra fraude. `test/migration-v2.e2e-spec.ts` aplica as migrações v2 sobre um banco com as anteriores e dados legados (assinaturas duplicadas).

Retirada em galpão — modelo de dados (Task 2 do plano `2026-10-22-volti-galpao`): `Depot`, `Handover` (saída `pickup` com aceite do cliente; chegada `return_depot`), `Vehicle.depotId` (disponível no galpão = `free` com `depotId`), campos de retirada em `Reservation` (`depotId`, `pickupMode`, `pickupAt`, `planCode`, `coverage`, `depositMethod`, `cardId`, `couponCode`, `reminderSentAt`; todos nulos na reserva de rua), `VehicleStatus.awaiting_pickup` e `ReservationStatus.handover`. Migrações `20261023085900_galpao_enums` (só `ALTER TYPE … ADD VALUE`, separada porque o Postgres não usa valor novo de enum na mesma transação) e `20261023090000_galpao` (aditiva) e `20261023091000_galpao_pickup_unique` (troca a unicidade da saída por índice parcial; nome do galpão único). SQL à mão: `Handover_one_open_return_per_rental` (uma chegada não cancelada por aluguel), `Handover_one_open_pickup_per_reservation` (uma saída `pending_customer`/`accepted` por reserva; disputada ou cancelada libera refazer), `CHECK` `Handover_type_reference` (`pickup` exige `reservationId`, `return_depot` exige `rentalId`), `Reservation_one_active_per_customer`/`_vehicle` passam a valer para `active` e `handover`, `CHECK` `Handover_battery_pct_range` e `Depot_windows_range`. `test/migration-galpao.e2e-spec.ts` aplica as migrações do galpão sobre um banco com as anteriores e uma moto/reserva no formato antigo.

Retirada em galpão — moto fora da rua (Task 7): moto do galpão (com `depotId`, ou que saiu por uma entrega `pickup` aceita para o aluguel) encerrada em ponto verde (`POST /rentals/{id}/end` ou encerramento forçado) termina em `awaiting_pickup` e ganha uma tarefa `collect` (prioridade `medium`, destino = posição da moto), criada sob `pg_advisory_xact_lock` por moto e só se não houver `collect` aberta. Moto de rua (sem `depotId`) continua voltando a `free`. `RentalEndService.finalize(..., { returnTo: 'depot' })` é o caminho da devolução no galpão (Task 6): não cria recolhimento. Concluir a `collect` com `depotId` (`POST /field-tasks/{id}/complete`) põe a moto em `free` (ou no `vehicleStatus` enviado) com esse `depotId` e as coordenadas do galpão; sem `depotId` numa moto `awaiting_pickup` → `422`. `GET /vehicles/nearby` do cliente exclui motos com `depotId` e `awaiting_pickup` (staff vê todas); `POST /rentals` de cliente para moto com `depotId` ou `awaiting_pickup` → `409 vehicle-unavailable` (`isDepotLocked` em `rental-start.service.ts`, onde a Task 6 põe o bypass `fromHandover`). Rastreador que volta online mantém `awaiting_pickup`. O export LGPD inclui `depotReservations` (sem `pickupCode`) e `handovers` (fotos só como chaves). `test/galpao-ponto-verde.e2e-spec.ts` cobre o ciclo.

Fix round 2: assinatura `canceled`/`expired` nunca reabre. A cobrança tardia é estornada pelo gateway (`PaymentRefund`, chave `subscription-late-refund:<paymentId>`). O cancelamento no gateway de assinatura expirada ou de conta excluída fica pendente (`gatewayCancelPendingAt`) e é refeito pelo job `subscriptions-gateway-cancel-retry` (5 min). O odômetro usa compare-and-set atômico no Redis (`RedisStore.hcas`, testado contra o Redis real em `test/usage-tracker-redis.e2e-spec.ts`).

## Segurança e LGPD (correções do QA, `docs/relatorio-qa.md`)

| Variável | Padrão | Efeito |
|---|---|---|
| `CORS_ORIGINS` | vazio | origens aceitas (vírgulas), HTTP e Socket.IO, sem credenciais; vazio = só `localhost` fora de produção, nenhuma em produção |
| `TRUST_PROXY` | vazio | saltos de proxy confiáveis (`1` atrás do ALB); vazio = ignora `X-Forwarded-For` |
| `TERMS_CURRENT_VERSION` | vazio | versão dos termos exigida em `POST /rentals` (vazio = basta ter aceitado) |

- Produção (`NODE_ENV=production`) recusa `AUTH_MODE=dev` e `MERCADOPAGO_WEBHOOK_SECRET=CHANGE_ME`.
- Autorização: grupos do staff = cadastro ∩ token, lidos a cada requisição (`PATCH /staff/{id}` vale na hora e é espelhado no pool pelo `StaffDirectory`). Cognito: só access token; staff casado pelo `sub`.
- Exclusão de conta: identidade excluída no pool de clientes, `cognitoSub` vira `deleted:<sha256(sub)>` e o token antigo recebe 401; trajetos, posição de início, fotos de devolução e documentos de KYC são apagados.
- Consentimento de localização revogado durante o aluguel: o trajeto para de ser gravado na hora.
- `POST /rentals`: moto offline ou desbloqueio não confirmado → `409 vehicle-offline`, sem aluguel nem cobrança; o relógio começa no desbloqueio confirmado.
- Rate limit no Redis (compartilhado entre instâncias); cabeçalhos `helmet`; exportação LGPD com `Cache-Control: no-store`; link do recibo assinado na leitura (15 min).

## Regras que nunca mudam

- Nenhum `speedLimitKmh` fora de 0..32 é aceito (DTO → 400 `speed-limit-out-of-range`; serviço de comandos revalida; `CHECK` no banco).
- Encerrar só em zona `return`, com foto e travamento confirmado; liquidação uma única vez por aluguel.
- Localização só durante o aluguel; trajetos expiram em 90 dias; exportação/exclusão LGPD só do próprio titular.
