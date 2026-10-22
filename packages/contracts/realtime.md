# Volti — eventos de tempo real (WebSocket)

Contrato dos eventos em tempo real entre a API e os clientes (painel e app do cliente). Complementa o `openapi.yaml`: os nomes e tipos dos campos são os mesmos dos schemas REST. Mudanças seguem a mesma regra do contrato (proposta em `docs/decisoes.md` e aprovação do usuário).

## Transporte

- **Socket.IO 4**, namespace **`/realtime`**, no mesmo host da API (`http://localhost:3000/realtime` em dev).
  - API: `@nestjs/platform-socket.io`.
  - Painel: `socket.io-client`.
  - Flutter: `socket_io_client`.
- Servidor → cliente apenas. O cliente não emite eventos de domínio; ações continuam pela API REST.
- Payloads em JSON, campos em camelCase, datas em UTC ISO 8601 (`ts`, `createdAt`), dinheiro em centavos.

## Autenticação

O mesmo JWT da API REST (`customerAuth` ou `staffAuth`), enviado no handshake:

```ts
import { io } from 'socket.io-client';

const socket = io(`${API_BASE_URL}/realtime`, {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

```dart
import 'package:socket_io_client/socket_io_client.dart' as io;

final socket = io.io(
  '$apiBaseUrl/realtime',
  io.OptionBuilder().setTransports(['websocket']).setAuth({'token': accessToken}).build(),
);
```

Token ausente, inválido ou expirado → o servidor recusa a conexão com `connect_error` (`message: "unauthorized"`). Ao renovar o token, o cliente reconecta com o novo `auth`.

## Salas

O servidor coloca o socket nas salas automaticamente, a partir do token; o cliente não pede para entrar.

| Sala | Quem entra | Quando |
|---|---|---|
| `fleet` | staff com grupo `admin`, `operacao` ou `suporte` | ao conectar |
| `rental:{rentalId}` | só o cliente dono do aluguel | enquanto o aluguel estiver `active`, `paused` ou `ending` (entra ao conectar, ou quando o aluguel começa; sai quando termina) |
| `customer:{customerId}` | o próprio cliente | ao conectar (eventos da entrega no galpão e da troca de bateria na estação; nunca posição) |
| `depot:{depotId}` | staff `admin`, `operacao` ou `campo` | ao conectar (todos os galpões) |

Staff de outros grupos (`financeiro`, `campo`) conecta, mas não recebe eventos da frota. Clientes sem aluguel ativo só recebem os eventos da entrega no galpão (`handover.*`, sem posição; LGPD: a posição só é enviada durante o aluguel).

## Eventos

Tabela fixada no plano mestre (`docs/superpowers/plans/2026-10-21-volti-plataforma.md`, "Eventos do WebSocket"):

| Evento | Sala | Payload |
|---|---|---|
| `vehicle.position` | `fleet`, `rental:{id}` | `{ vehicleId, lat, lng, speedKmh, batteryPct, status: VehicleStatus, speedLimitKmh, ts }` |
| `vehicle.status` | `fleet` | `{ vehicleId, status: VehicleStatus, ts }` |
| `command.updated` | `fleet` | `{ commandId, vehicleId, type: CommandType, status: CommandStatus, reason? }` |
| `alert.created` | `fleet` | `{ alertId, vehicleId?, rentalId?, type, priority: 'low' \| 'medium' \| 'high' \| 'critical', createdAt }` |
| `rental.updated` | `rental:{id}` | `{ rentalId, status: RentalStatus, elapsedSeconds, costCents, ts }` |
| `zone.notice` | `rental:{id}` | `{ rentalId, zoneType: ZoneType, speedLimitKmh?, transition: 'ENTER' \| 'EXIT', message }` |
| `device.event` | `rental:{id}` | `{ rentalId, type: 'queda', ts }` (dispara o "você está bem?") |
| `handover.pending` | `customer:{id}`, `depot:{id}` | `{ handoverId, reservationId }` |
| `handover.updated` | `customer:{id}`, `depot:{id}` | `{ handoverId, status: HandoverStatus, lastError? }` |
| `station_swap.updated` | `customer:{id}` | `{ swapId, status: StationSwapStatus }` |

### Detalhes por evento

- **`vehicle.position`** — a cada telemetria (5 s em aluguel, 60 s parada). Na sala `rental:{id}` só chega a moto do aluguel. `speedLimitKmh` é o limite em vigor (0–32). O app do cliente mostra velocidade e bateria; nunca mostra distância percorrida.
- **`vehicle.status`** — mudança de `VehicleStatus` (inclusive `offline` quando o rastreador perde conexão).
- **`command.updated`** — cada transição do comando (`pending` → `in_progress` → `confirmed` | `failed`). `reason` é o mesmo valor de `VehicleCommand.statusReason` no REST (`CommandStatusReason`: `offline`, `timeout`, `did_not_stop`, `invalid_limit`). O texto livre que o operador informou ao pedir o comando fica só em `VehicleCommand.reason` (REST) e no AuditLog. O painel mostra `pending` + `offline` como "moto offline — será aplicado ao reconectar".
- **`alert.created`** — `type` usa os valores de `AlertType` do `openapi.yaml`; `priority` é `AlertPriority`. Detalhes completos por `GET /alerts/{id}`.
- **`rental.updated`** — a cada mudança de status e a cada 30 s com o aluguel `active`/`paused` (atualiza tempo e custo parcial). `costCents` segue a mesma regra de `Rental.costCents`.
- **`zone.notice`** — entrada/saída de zonas que afetam o cliente: `reduced_speed` (com o novo `speedLimitKmh`), `forbidden`, `operation` (saída da área: aviso imediato e bloqueio seguro após 5 minutos fora) e `return`. `message` vem pronto em pt-BR para a UI (ex.: "Você entrou numa área de pedestres. Velocidade máxima: 6 km/h.").
- **`handover.pending`** — o operador registrou a entrega de saída (`POST /handovers`, `type: pickup`). O app do cliente abre "Confira sua moto" e carrega `GET /handovers/{handoverId}`. Também descrito em `x-ws-events` no `openapi.yaml`.
- **`handover.updated`** — aceite, disputa ou cancelamento da entrega, chegada no galpão concluída (`return_depot`, `status: accepted`), ou falha no aceite (`lastError`, ex.: `payment-declined`, com `status` ainda `pending_customer`). O operador vê "Aceito", "Pagamento não aprovado" ou "Problema apontado".
- **`station_swap.updated`** — cada mudança de status da troca de bateria na estação (`opening_slot` → `awaiting_return` → `returned` → `releasing` → `completed`, ou `canceled`/`failed`). O app mostra "Abrindo compartimento", "Devolva a bateria na vaga N", "Liberando a carregada" e "Bateria trocada"; detalhes (vaga, séries, `endReason`) por `GET /swap-stations/{id}/swaps/{swapId}`. Só o dono recebe; sem posição.
- **`device.event`** — hoje só `queda`. O app abre o "Você está bem?" e responde por `POST /rentals/{id}/wellbeing`; sem resposta em 60 s, a API abre alerta `customer_not_ok` (`critical`).

### Tipos TypeScript (referência)

Os tipos REST vêm de `generated/ts/schema.d.ts` (`components['schemas']['VehicleStatus']` etc.). Os payloads do WebSocket não fazem parte do OpenAPI; use estes tipos no painel:

```ts
import type { components } from '@volti/contracts';

type S = components['schemas'];

export interface RealtimeEvents {
  'vehicle.position': { vehicleId: string; lat: number; lng: number; speedKmh: number; batteryPct: number; status: S['VehicleStatus']; speedLimitKmh: number; ts: string };
  'vehicle.status': { vehicleId: string; status: S['VehicleStatus']; ts: string };
  'command.updated': { commandId: string; vehicleId: string; type: S['CommandType']; status: S['CommandStatus']; reason?: S['CommandStatusReason'] };
  'alert.created': { alertId: string; vehicleId?: string; rentalId?: string; type: S['AlertType']; priority: S['AlertPriority']; createdAt: string };
  'rental.updated': { rentalId: string; status: S['RentalStatus']; elapsedSeconds: number; costCents: number; ts: string };
  'zone.notice': { rentalId: string; zoneType: S['ZoneType']; speedLimitKmh?: number; transition: 'ENTER' | 'EXIT'; message: string };
  'device.event': { rentalId: string; type: 'queda'; ts: string };
  'handover.pending': { handoverId: string; reservationId: string };
  'handover.updated': { handoverId: string; status: S['HandoverStatus']; lastError?: string };
  'station_swap.updated': { swapId: string; status: S['StationSwapStatus'] };
}
```

No Flutter, os enums (`VehicleStatus`, `CommandType`, `CommandStatus`, `RentalStatus`, `ZoneType`, `AlertPriority`…) existem no pacote `volti_api`; decodifique os payloads com o `serializers` do pacote (`standardSerializers.deserializeWith(VehicleStatus.serializer, json['status'])`).

## Reconexão

- O Socket.IO reconecta sozinho. Depois de reconectar, o cliente recarrega o estado pela API (`GET /rentals/current` no app; `GET /vehicles` e `GET /alerts` no painel), porque eventos emitidos durante a queda não são reenviados.
- Ordem não garantida entre salas diferentes; use `ts`/`createdAt` para descartar eventos mais antigos que o estado já carregado.
