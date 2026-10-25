# @volti/contracts

Contrato da plataforma Volti: **fonte única da verdade** para a API, o painel e os apps.

| Arquivo | Conteúdo |
|---|---|
| `openapi.yaml` | API REST (OpenAPI 3.1): 196 operações em 28 tags, erros RFC 7807, paginação por cursor, `Idempotency-Key`, grupos de staff (`x-required-groups`) |
| `realtime.md` | Eventos do WebSocket (Socket.IO, namespace `/realtime`), salas e payloads |
| `generated/ts/schema.d.ts` | Tipos TypeScript gerados com `openapi-typescript` (painel, com `openapi-fetch`) |
| `generated/dart/` | Pacote Dart `volti_api` gerado com `openapi-generator` (`dart-dio` + `built_value`) para os apps Flutter |
| `scripts/generate.mjs` | Regenera os dois clientes |
| `dart-generator.yaml`, `openapitools.json` | Opções e versão fixada do openapi-generator (7.25.0) |
| `redocly.yaml` | Regras do lint |
| `mqtt.md`, `schemas/` | Contrato MQTT dos rastreadores (Task 4) e das estações de troca (`estacao-*.schema.json`) |

## Pré-requisitos

- Node 24 e pnpm 9 (`pnpm install` na raiz do repositório)
- Java 17 (o openapi-generator é um `.jar`, baixado na primeira execução para `node_modules`)
- Dart 3.11 / Flutter 3.41 (para o `build_runner` e o `dart analyze` do pacote Dart)

## Comandos

Rode a partir da raiz do repositório:

```bash
pnpm --filter @volti/contracts lint        # redocly lint openapi.yaml (tem que sair sem erros e sem avisos)
pnpm contracts:generate                    # regenera TypeScript e Dart (inclui build_runner e dart format)
pnpm --filter @volti/contracts typecheck   # tsc sobre o schema.d.ts gerado
pnpm --filter @volti/contracts mock        # mock Prism em http://localhost:4010
```

Opções do gerador: `pnpm --filter @volti/contracts generate:ts` ou `generate:dart` para gerar só um lado;
`node scripts/generate.mjs --skip-build-runner` para pular o `build_runner` do Dart.

Verificar o pacote Dart:

```bash
cd packages/contracts/generated/dart
dart pub get
dart analyze      # esperado: No issues found!
```

## Como mudar o contrato

1. Depois da aprovação da Task 1, toda mudança é **proposta** em `docs/decisoes.md` e aprovada pelo usuário.
2. Edite `openapi.yaml`, mantendo as convenções: campos em camelCase; dinheiro em `...Cents` (inteiro);
   datas `format: date-time`; `operationId` em camelCase (vira o nome do método nos clientes); toda
   operação com tag, `security` e ao menos uma resposta 4xx; endpoints de staff com `x-required-groups`;
   todo objeto e enum como componente nomeado (sem `allOf`/`oneOf` nem objetos inline: o `dart-dio` gera
   nomes instáveis para eles); sem `null` (campo opcional = ausente).
3. `pnpm --filter @volti/contracts lint`, `pnpm contracts:generate`, `typecheck` e `dart analyze`.
4. Faça commit do `openapi.yaml` **junto com** `generated/` (os clientes gerados são versionados).

Não edite nada em `generated/` à mão; o script apaga e recria a pasta. Exceções mantidas à mão em
`generated/dart`: `.openapi-generator-ignore` (escrito pelo script) e `analysis_options.yaml` (silencia
`unused_import`, que os templates do gerador produzem em todos os arquivos de API).

## Mock (Prism)

```bash
pnpm --filter @volti/contracts mock
curl -H "Authorization: Bearer dev" "http://localhost:4010/vehicles/nearby?lat=-23.56&lng=-46.69"
```

- O Prism exige o header `Authorization: Bearer <qualquer coisa>` nas rotas protegidas (sem ele responde 401);
  não valida o token.
- Valida as requisições contra o contrato: `speedLimitKmh: 33` em `POST /vehicles/{id}/commands` → 400
  `problem+json`; `POST /rentals` sem `Idempotency-Key` → 422.
- Responde com o `example` da operação quando houver (ex.: `/vehicles/nearby`) ou com dados gerados do
  schema. Para respostas dinâmicas: `prism mock -d openapi.yaml`.
- Para forçar um status: header `Prefer: code=404`.
- No docker compose, o serviço `prism` (perfil `mock`) usa este mesmo arquivo na porta 4010.

## Como consumir

**Painel (TypeScript):**

```ts
import createClient from 'openapi-fetch';
import type { paths, components } from '@volti/contracts';

const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL });
const { data, error } = await api.GET('/vehicles/nearby', {
  params: { query: { lat: -23.56, lng: -46.69 } },
  headers: { Authorization: `Bearer ${token}` },
});
type Vehicle = components['schemas']['Vehicle'];
```

Adicione `"@volti/contracts": "workspace:*"` às dependências do pacote.

**Apps Flutter (Dart):**

```yaml
# pubspec.yaml
dependencies:
  volti_api:
    path: ../../packages/contracts/generated/dart
```

```dart
import 'package:volti_api/volti_api.dart';

final api = VoltiApi(basePathOverride: apiBaseUrl);
api.dio.options.headers['Authorization'] = 'Bearer $token';
final res = await api.getVehiclesApi().listNearbyVehicles(lat: -23.56, lng: -46.69);
final vehicles = res.data!.items;
```

Observações do pacote Dart: os enums aceitam valores desconhecidos (`unknownDefaultOpenApi`), então um
valor novo no servidor não quebra o app; o campo `on` de `SendCommandRequest`/`VehicleCommand` virou `on_`
(palavra reservada no Dart); os modelos são `built_value` (imutáveis, criados com
`SendCommandRequest((b) => b..type = CommandType.lock..reason = '...')`).

## Contrato v2 (2026-10-22)

Acréscimos aprovados em `docs/decisoes.md` (nenhuma renomeação; todos os campos novos são opcionais na resposta):

- **Conta do cliente:** chave Pix para estornos em `PATCH/GET /me` (`pixRefundKeyType` + `pixRefundKey`, `422 pix-key-invalid`);
  limites da recarga de valor livre em `GET /wallet` (`topUpMinCents`, `topUpMaxCents`, `suggestedTopUpAmountsCents`); cupons salvos
  (`/me/coupons`, `/me/coupons/validate`) e indicação (`/me/referral`, `/me/referral/rewards`, `/me/referral/redeem`).
- **Plano semanal/mensal:** `GET /payments/subscriptions/{id}`, `POST .../pause` (3 dias no semanal, 7 no mensal, 1 por período),
  `POST .../resume`, `PUT .../vehicle` (moto fixa); `Subscription` ganha `nextChargeAt`, `pausedAt`, `pauseEndsAt`,
  `assignedVehicle`, cartão e última cobrança; `SubscriptionStatus` ganha `paused`.
- **Mapa e manutenção do cliente:** `GET /swap-stations`; `/me/maintenance-slots` e `/me/maintenance-requests` (plano + moto fixa).
- **Chat:** `SupportMessage.status` (`sent | delivered | read`), `deliveredAt`, `readAt`; `POST /support/conversations/{id}/read`.
- **Operação:** `Vehicle.address`, odômetro/horas e `service` (`VehicleServiceInfo`: `ok | due_soon | overdue`), `battery`;
  `GET /maintenance/vehicles` (tabela "Manutenção"); `FieldTask.vehicleAddress`/`targetAddress`/`vehicleStatus`/bateria;
  `BatterySwap` com carga e ciclos; `/batteries`, `/batteries/van-stock` (+ `/load`, `/unload`).
- **Catálogo:** `/vehicle-models` (foto assinada, `pricePerMinuteCents` usado no plano por minuto), `VehicleSummary`/`Vehicle`
  com `vehicleModelId`, `categoryLabel`, `pricePerMinuteCents`; `QuoteRequest.vehicleId`.

Fix round 1: `503 gateway-unavailable` em pausar/retomar, `422 subscription-vehicle-cooldown`, `429` em cupons/indicação, `Vehicle.locationHidden`,
`VehicleModelUpdate.inheritPlanUnlockFee`, `LgpdExport` com assinaturas/cupons/indicações/manutenções.

Slugs novos: `gateway-unavailable`, `subscription-vehicle-cooldown`, `pix-key-invalid`, `top-up-amount-out-of-range`, `subscription-not-pausable`, `subscription-pause-limit-reached`,
`subscription-required`, `subscription-vehicle-required`, `maintenance-slot-unavailable`, `referral-code-invalid`, `referral-not-eligible`.

## Retirada em galpão (2026-10-22)

Acréscimos aprovados em `docs/decisoes.md` (abordagem A: galpão como entidade, reserva de retirada e entrega formal):

- **Galpão:** `Depot` (horário por dia em `openingHours`, prazos `pickupNowWindowMinutes` 120, `maxScheduleDays` 7,
  `scheduledGraceMinutes` 30), `GET/POST /depots`, `GET/PATCH /depots/{id}`, `GET /depots/{id}/vehicles`,
  `GET /depots/{id}/pickups?date=`. Moto disponível = `free` com `Vehicle.depotId`; `VehicleStatus` ganha `awaiting_pickup`.
- **Reserva de retirada:** `POST /reservations` com `depotId`, `pickupMode` (`now | scheduled`), `pickupAt`, `planCode`,
  `coverage`, `depositMethod` (+ `Idempotency-Key`); `Reservation.pickupCode` (QR, só para o dono); `ReservationStatus`
  ganha `handover`. Só `vehicleId` continua sendo a reserva de rua.
- **Entrega:** `Handover` (`pickup | return_depot`; `pending_customer | accepted | disputed | canceled`), `POST/GET /handovers`,
  `POST /handovers/uploads`, `GET /handovers/{id}`, `POST /handovers/{id}/accept` (`Idempotency-Key`, devolve o `Rental`),
  `POST /handovers/{id}/dispute`. Eventos `handover.pending`/`handover.updated` em `x-ws-events` e em `realtime.md`.
- **LGPD:** `LgpdExport.depotReservations` e `LgpdExport.handovers`.

Slugs novos: `reservation-open`, `reservation-in-handover`, `pickup-outside-hours`, `pickup-too-far-ahead`, `depot-inactive`, `handover-not-pending`, `payment-declined`.

Regra: moto com `depotId` (ou separada por reserva de galpão) só sai pela entrega — `409 vehicle-unavailable` em `POST /rentals` e na reserva de rua; o `nearby` do cliente não mostra motos de galpão nem `awaiting_pickup`.

## Inadimplência, alerta de pagamento e LGPD completa (2026-10-24, Task 14 das lacunas)

- `POST /payments/{id}/retry` (`payDebt`, cliente): quita o saldo devedor por cartão ou Pix num pagamento `debt_settlement`.
- `POST /customers/{id}/delinquency/clear` (`clearCustomerDelinquency`, admin/financeiro): quitação manual com motivo.
- `Payment`: `customerName` (staff), `outstandingCents`, `debtSettledAt`, `debtSettlement`, `settlesPaymentId`, `pix`.
- `AlertType.payment_needs_review` e `Alert.paymentId`; alertas abertos ao `financeiro` (só os de pagamento).
- `Customer.walletBalanceCents` e `debtCents` (admin/financeiro, detalhe); `Handover.cancelReason`/`canceledAt`/`canceledByName`.
- `LgpdExport.supportConversations`; `RevenueRow.walletCents`; CSV dos relatórios em pt-BR.

Slugs novos: `debt-not-payable`, `debt-in-collection`.

## Fechamento sem cartão (2026-10-25, Task 16 das lacunas, R2-01)

- `Receipt`: `paymentId`, `paymentStatus` (`ReceiptPaymentStatus`: `paid`, `pending`, `processing`), `depositUsedCents`, `depositReleasedCents`, `amountDueCents`; `pdfUrl` só com `paid`; `paymentMethod` é a forma do valor recebido.
- Reservas com dívida em aberto: `409` `payment-pending` (slug novo). `payDebt` declara `503`.
- `StartRentalRequest.useWalletCredits` `deprecated` (a carteira sempre abate primeiro no fechamento).
- `realtime.md`: salas `alerts:ops` e `alerts:finance`.

## Regras que o contrato garante

- `speedLimitKmh` configurável sempre `0..32` (comandos, zonas, ficha da moto); acima disso → 400.
- Zonas `reduced_speed`: `speedLimitKmh` acima de 32 → `400` (validação do schema); ausente → `422`
  `zone-speed-limit-required`; entre 21 e 32 → `422` `zone-speed-limit-invalid` (máximo 20).
- Inspeção: `configuredMaxKmh` é observação (0..100); acima de 32 com `ok: true` → `422`
  `speed-limiter-noncompliant`, e a API põe a moto em manutenção e abre alerta.
- Cartão: só `cardToken` do gateway; nenhum campo de número, CVV ou validade completa.
- Cliente nunca recebe distância percorrida; recebe tempo, custo, bateria, autonomia e velocidade.
- CPF completo só para o próprio cliente e para `admin`.
