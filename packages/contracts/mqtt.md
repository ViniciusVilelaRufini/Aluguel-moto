# Contrato MQTT — rastreadores Volti

Fonte da verdade da comunicação entre os rastreadores (GPS + 4G + relé/controlador) e a plataforma. Os JSON Schemas (draft 2020-12) estão em [`schemas/`](schemas/). Os mesmos tópicos valem em produção (AWS IoT Core) e no desenvolvimento local (Mosquitto do `docker-compose`, com o servidor emulando o serviço de shadow).

## Conexão

| Item | Produção (AWS IoT Core) | Local (Mosquitto) |
|---|---|---|
| Endpoint | `<prefixo>-ats.iot.sa-east-1.amazonaws.com:8883` (SSM `/volti/<env>/iot/endpoint`) | `mqtt://localhost:1883` (`mosquitto:1883` dentro do compose) |
| Segurança | MQTT 3.1.1/5 sobre TLS 1.2, certificado X.509 por rastreador (`services/api/scripts/provision-tracker.ts`) | anônimo, sem TLS (só dev) |
| `clientId` | igual ao `thingName` (`moto-0001`…) — a política só aceita esse | igual ao `thingName` |
| Política | só publica/assina `motos/${thingName}/*` e o próprio shadow (Task 2, `volti-<env>-moto-policy`) | sem restrição |
| Keepalive | 30 s | 30 s |
| Presença | eventos de ciclo de vida do IoT Core (`$aws/events/presence/connected|disconnected/{thingName}`) → EventBridge | o rastreador publica `connected` ao conectar e registra *last will* em `disconnected` |

`thingName` = `moto-` + número com 4 dígitos, igual a `Vehicle.thingName` (o código visível é `VLT-0001`).

## Tópicos

| Tópico | Sentido | QoS | Payload (schema) | Quando |
|---|---|---|---|---|
| `motos/{thingName}/telemetria` | rastreador → nuvem | 0 | [`telemetria.schema.json`](schemas/telemetria.schema.json) | a cada **5 s** destravada (em aluguel) ou em modo roubada; a cada **60 s** parada/travada; e logo ao conectar |
| `motos/{thingName}/eventos` | rastreador → nuvem | 1 | [`eventos.schema.json`](schemas/eventos.schema.json) | na detecção: `queda`, `violacao`, `bateria_critica`, `movimento_sem_aluguel`; e, vindos da ponte GT06, `console_resposta` (exige `comando_id`, `texto`) e `console_falha` (exige `comando_id`, `motivo`: `offline`, `timeout` ou `erro`) como desfecho de um comando de console |
| `motos/{thingName}/comandos` | nuvem → rastreador | 1 | [`comandos.schema.json`](schemas/comandos.schema.json) | ações sem estado: `buzina` (`{ comando_id, acao }`) e `console` (`{ comando_id, acao: "console", texto }`, 1–100 caracteres, só rastreador `relay_only`; a ponte envia `texto` ao aparelho e devolve o desfecho em `eventos`, casado por `comando_id`) |
| `$aws/things/{thingName}/shadow/update` | rastreador → shadow | 1 | [`shadow-update.schema.json`](schemas/shadow-update.schema.json) (só `state.reported`) | na conexão (reported completo), depois de aplicar um delta, ao travar, e a cada 1 s enquanto desacelera para um limite novo |
| `$aws/things/{thingName}/shadow/update/accepted` | shadow → rastreador | 1 | documento aceito | resposta a cada update |
| `$aws/things/{thingName}/shadow/update/rejected` | shadow → rastreador | 1 | `{ code, message }` | update inválido |
| `$aws/things/{thingName}/shadow/update/delta` | shadow → rastreador | 1 | [`shadow-delta.schema.json`](schemas/shadow-delta.schema.json) | quando o servidor grava um `desired` diferente do `reported` |
| `$aws/things/{thingName}/shadow/update/documents` | shadow → assinantes | 1 | `{ previous, current, timestamp }` | a cada mudança do documento |
| `$aws/things/{thingName}/shadow/get` | rastreador → shadow | 1 | `{}` | ao conectar (para aplicar o desired pendente) |
| `$aws/things/{thingName}/shadow/get/accepted` | shadow → rastreador | 1 | `{ state: { desired, reported, delta? }, version }` | resposta ao `get` |

Nada nesses tópicos identifica o cliente: a associação moto ↔ aluguel existe só no backend.

## Telemetria

```json
{ "lat": -23.5614, "lng": -46.6914, "velocidade_kmh": 18.4, "bateria_pct": 76, "travada": false, "ignicao": true, "sinal": 4, "timestamp": "2026-10-21T15:00:00.000Z" }
```

- `timestamp` é a hora da **medição** em UTC. Se divergir mais de 10 min do relógio do servidor, o trajeto usa a hora do servidor.
- Telemetria guardada offline e enviada depois é aceita para o trajeto, mas só atualiza a posição exibida se for a mais nova recebida, e só vale para a rampa do bloqueio se tiver até 10 s, for posterior à reconexão e tiver `timestamp` estritamente maior que o de todas as já vistas na conexão (a janela de frescor usa `timestamp` limitado a "agora"). Depois de qualquer reconexão, nenhuma amostra de velocidade, de nenhuma origem (telemetria, `reported` via MQTT ou lido do shadow), vale para a rampa nos primeiros 10 s (`IOT_RECONNECT_GRACE_MS`), e o `timestamp` de toda telemetria vista nesse intervalo conta para a ordem. Reconexão = presença `connected` (só local), primeira mensagem depois de offline (vigia de 180 s), primeira amostra vista por um processo novo, ou lacuna > `IOT_RECONNECT_GAP_MS` (15 s; parada/travada: 150 s) entre mensagens do rastreador de qualquer canal, pela hora de chegada, ou telemetria com atraso de fila (`(chegada − chegada anterior) − (timestamp − timestamp anterior)`) > `IOT_QUEUE_LAG_MS` (5 s), independente da cadência e do desvio do relógio (no aws são os únicos detectores de quedas curtas); `timestamp` mais de 10 min no futuro nunca vale para a rampa e não ordena a posição exibida.
- Mensagens fora do schema são descartadas (log `telemetry_invalid`, sem o payload).
- `bateria_conhecida` (opcional; ausente = `true`): `false` = o rastreador não tem leitura da bateria e `bateria_pct: 0` não é carga real. A ponte GT06 manda `false` quando publica depois do teto de 5 min sem tensão do pack. A API grava `Vehicle.batteryKnown = false` (REST), não usa o 0 como carga da bateria instalada, e o painel/app não exibem o 0 como nível.
- `velocidade_kmh` acima de 32 é aceita (indica limitador violado e alimenta alertas), nunca usada como limite.
- `satelites` (opcional; ausente = desconhecido): satélites do fix (ponte GT06: `attributes.sat` do Traccar). **Posição fraca** = `satelites` conhecido e menor que 5 (`MIN_GPS_SATELLITES`): continua no mapa e no trajeto, mas não conta como amostra parada para a trava só relé (a sequência parada recomeça; só dificulta o corte), nas cercas é assimétrica — pode **baixar** o limite (entrar numa zona de velocidade reduzida, ou continuar nela), nunca o sobe nem sai de zona restrita (o EXIT só com posição boa), e não muda cercas sem efeito de velocidade (operation, devolução, alertas) nem o bloqueio de fora da área; também não serve de posição para subir o limite (unlock, teto dos comandos manuais: vale o limite gravado) e a ponte não a usa no alerta `movimento_sem_aluguel` nem como amostra parada da segunda guarda. Sem o campo (simulador, firmware próprio), nada muda. A API expõe o valor em `Vehicle.gpsSatellites`.

## Device shadow

```json
{
  "state": {
    "desired":  { "travada": true, "limite_kmh": 20, "modo_roubada": false },
    "reported": { "travada": true, "limite_kmh": 20, "modo_roubada": false, "firmware": "1.4.2", "velocidade_kmh": 0 }
  }
}
```

| Campo | Tipo | Quem escreve | Regra |
|---|---|---|---|
| `travada` | boolean | servidor (desired), rastreador (reported) | o servidor só grava `true` com a velocidade reportada **abaixo de 3 km/h**; o firmware também nunca trava acima disso (fica pendente). `null` (só no `/update` do servidor, trava `relay_only`) apaga um desired pendente; nunca chega no delta |
| `limite_kmh` | inteiro 0..32 | servidor / rastreador | nunca acima de 32 (Contran 996/2023); o firmware recusa valores fora da faixa |
| `modo_roubada` | boolean | servidor / rastreador | telemetria a cada 5 s mesmo travada; sirene ao mover |
| `firmware` | string | rastreador | versão semver |
| `velocidade_kmh` | número | rastreador | velocidade no momento do reporte, usada pela rampa |
| `gps_economia` | boolean | rastreador (ponte GT06) | opcional: `true` = rastreamento GPS desligado com a ignição desligada (modo de economia do J16); vem do byte de status do heartbeat (bit 6 = GPS, bit 1 = ACC, `attributes.status` do Traccar). A API trata como desconhecido 3 min depois do reporte e expõe em `Vehicle.gpsSleep`. No modo aws a API só lê o shadow por polling enquanto há comando aguardando a moto (é quando a trava espera o GPS) |

O shadow guarda o `desired` enquanto a moto está offline; ao reconectar, ela faz `shadow/get` e aplica o `delta`.

### Confirmação de comandos

Um comando (`VehicleCommand`) é confirmado quando o `reported` alcança o `desired`:

| Comando | Desired | Confirma quando | Prazo |
|---|---|---|---|
| `lock` | rampa (abaixo) e depois `travada: true` | `reported.travada = true` | 120 s → `failed`/`did_not_stop` (ou `timeout` se travou sem confirmar) |
| `unlock` | `travada: false` + `limite_kmh` em vigor (zonas) | `reported.travada = false` | 30 s → `failed`/`timeout` (`relay_only`: 90 s, ver abaixo) |
| `speed_limit` | `limite_kmh` | `reported.limite_kmh` igual | 30 s |
| `stolen_mode` | `modo_roubada` | `reported.modo_roubada` igual | 30 s |
| `horn` | `motos/{t}/comandos` `{ comando_id, acao: "buzina" }` | publicado com a moto online | offline → `failed`/`offline` |
| console (`TrackerConsoleCommand`, não é `VehicleCommand`) | `motos/{t}/comandos` `{ comando_id, acao: "console", texto }` | evento `console_resposta` com o mesmo `comando_id` | `console_falha` (`offline`, `timeout`, `erro`); pendente há mais de 90 s → `failed`/`timeout` |

A chamada à API espera até `IOT_CONFIRM_WAIT_MS` (3 s); depois disso responde `in_progress` e o desfecho chega por `iot.command-updated` (WebSocket `command.updated`). Moto offline → `pending`/`offline`; o prazo começa quando ela reconecta. Um comando novo sobre o mesmo campo substitui o anterior (que termina `failed`).

### Bloqueio seguro (rampa)

1. Velocidade reportada **< 3 km/h** → `desired.travada = true`.
2. Velocidade ≥ 3 km/h → `desired.limite_kmh` em degraus **`min(atual, 15)` → 8 → 3 → 0**, um degrau **2 s depois do `reported.limite_kmh`** do anterior.
3. Assim que a velocidade reportada (telemetria ou `reported.velocidade_kmh`) ficar < 3 km/h → `desired.travada = true`.
4. Sem parar em **120 s** → `failed`/`did_not_stop`; `limite_kmh: 0` fica mantido.
5. Moto offline → `pending`/`offline`; a rampa começa quando ela reconecta (o servidor não grava `travada: true` sem saber a velocidade).
6. **Velocidade conhecida = amostra fresca** (até 10 s, depois da última reconexão e mais nova que a anterior no relógio do rastreador) **e fora da graça**: nos primeiros 10 s depois de qualquer reconexão (`IOT_RECONNECT_GRACE_MS`) nenhuma amostra vale, venha da telemetria, do `reported` via MQTT ou do polling do shadow. Reconexão, nos dois modos: presença `connected` (só chega à API no modo local), primeira mensagem depois de a vigia marcar offline (180 s), primeira amostra vista por um processo novo, e **lacuna** entre mensagens do rastreador (qualquer canal, hora de chegada no servidor; no polling aws, a metadata de um campo novo) maior que `IOT_RECONNECT_GAP_MS` (15 s = 3 × 5 s) — ou `max(IOT_RECONNECT_GAP_MS, 150 s)` se o último estado conhecido é parada/travada (travada ou sem ignição, fora do modo roubada). Para a telemetria vale ainda o **atraso de fila**: `(chegada − chegada anterior) − (timestamp − timestamp anterior)` > `IOT_QUEUE_LAG_MS` (5 s) = a amostra saiu da fila offline → reconexão (ela própria cai na graça), sem depender da cadência nem do estado conhecido. No modo aws os eventos (`motos/+/eventos`) vão para a fila `alertas`, não para o caminho de telemetria da API, então lá eles não contam como mensagem para a lacuna (só telemetria e metadata do polling); isso erra para o lado seguro: menos mensagens ouvidas → lacunas maiores → mais graça. Relógio do rastreador que volta mais de 30 s entre duas telemetrias (correção de GPS/NTP, RTC zerado) conta como reconexão (graça e ordem bruta recomeçam), mas a referência do atraso só passa para a nova linha do tempo quando a amostra seguinte a confirma (também atrás, mais nova e com atraso ≤ 5 s contra a primeira); até lá toda amostra é medida contra a referência antiga, então uma única mensagem velha reordenada no SQS não esconde uma amostra da fila que chegue depois. Um salto real abre a graça no máximo duas vezes; duas mensagens velhas reordenadas, seguidas e coerentes entre si ainda poderiam trocar a referência (resíduo; protegem frescor, ordem e F1). Resíduo: telemetria com atraso ≤ 5 s (frescor, ordem e F1) e `reported` (MQTT ou shadow), que não tem hora de medição e só tem a lacuna — um `reported` com velocidade enfileirado numa queda menor que o limite depende de F5/F11 do firmware. Desconhecida, velha, na graça ou com `timestamp` mais de 10 min no futuro é tratada como "em movimento" (rampa), nunca como 0. No modo aws, campos do `reported` lidos por `GetThingShadow` só valem se `metadata.reported.<campo>.timestamp` for mais novo que o já ingerido, e o polling nunca conta como sinal de vida.
7. `did_not_stop` deixa o limite **segurado em 0** até um `unlock` explícito: nenhuma zona ou operador sobe o limite. Trava sem confirmação em 120 s (`timeout`) → desired `travada: false` + `limite_kmh: 0` (também segurado). Os degraus nunca começam acima do último desired nem do hold.
8. O ack de cada degrau e a confirmação da trava só aceitam `reported` não mais antigo que a publicação.

Comportamento esperado do firmware: [`docs/firmware-bloqueio-seguro.md`](../../docs/firmware-bloqueio-seguro.md).

## Cercas e limites por zona

- ENTER em `reduced_speed` → `limite_kmh` da zona (6 em calçadões, 20 em ciclovias).
- EXIT → menor limite das zonas que ainda contêm a moto; nenhuma → 32.
- EXIT da zona `operation` durante aluguel → alerta imediato e `zone.notice` ao cliente; bloqueio seguro após `OUT_OF_AREA_LOCK_MINUTES` (5), cancelado se a moto voltar antes.

## Rastreadores só relé (`relay_only`, GT06 via Traccar)

Hardware sem controle de velocidade (ex.: Concox J16, protocolo GT06 sobre TCP sem TLS) entra por uma ponte:
`rastreador ──TCP 5023──► Traccar ──WebSocket /api/socket + REST──► services/traccar-bridge ──MQTT──► IoT Core / Mosquitto`.
Tópicos, schemas e shadow são os desta página. A API escolhe a estratégia por `Tracker.controlMode`
(`speed_control` | `relay_only`; no painel, `Vehicle.trackerControlMode`).

| Item | `speed_control` | `relay_only` |
|---|---|---|
| `lock` | rampa de `limite_kmh` e `travada: true` abaixo de 3 km/h | **sem rampa**: espera **3 telemetrias frescas e consecutivas < 3 km/h cobrindo ≥ 20 s**, com no máximo **12 s** entre duas seguidas (hora da medição; `RELAY_MAX_SAMPLE_GAP_MS`), a última fresca (≤ 10 s, `SPEED_FRESH_MS`) e a velocidade conhecida < 3 km/h no instante da gravação (fora da graça, com as mesmas regras de frescor, ordem, lacuna e atraso de fila), e grava `travada: true` **uma única vez**; a ponte manda `engineStop` (segunda guarda: posição de até 7 s com < 3 km/h). Regra feita para a cadência mínima de 10 s do J16 (`docs/decisoes.md`, 2026-11-03, bancada do J16) |
| sem parar em 120 s | `failed`/`did_not_stop`, limite 0 segurado | `failed`/`did_not_stop`, **nenhum corte enviado**, nada segurado |
| corte sem confirmação em 120 s | `failed`/`timeout`, desired `travada: false` + `limite_kmh: 0` | `failed`/`timeout`, o corte pendente é apagado (desired `travada: null`; nunca `false`, que soltaria uma moto cortada com o status atrasado) |
| moto offline | `pending`/`offline`, rampa ao reconectar | `pending`/`offline`; ao reconectar, exige amostras novas (fora da graça) |
| `unlock` | `travada: false` + limite da zona | `travada: false` → `engineResume`; confirma por `reported.travada = false` em **90 s** (`RELAY_UNLOCK_TIMEOUT_MS`; normalmente confirma pela resposta do J16 ao comando, ~1 s; o prazo cobre o heartbeat de 60 s) |
| `speed_limit`, `horn` | normais | `failed`/`unsupported_by_tracker`, shadow intocado |
| `stolen_mode` | `modo_roubada` | aceito; a ponte ecoa `reported.modo_roubada` (sem mudança de telemetria no GT06) |
| zona `reduced_speed` | ENTER grava `limite_kmh` | **aviso**: `zone.notice` "Área com limite de X km/h." (sem limite conhecido: "Área com limite de velocidade reduzido."; `advisory: true`); acima do limite por mais de 5 s → alerta `zone_speed_exceeded` |
| 32 km/h | firmware + controlador | só o controlador da moto (configuração física) |
| acima de 32 km/h | telemetria acima de 35 km/h (32 + 3 de tolerância do GPS) por mais de 5 s → alerta `speed_limiter_noncompliant` (high, "Acima de 32 km/h: limitador fora da norma"), um por episódio | igual |

O que a ponte faz (detalhes em `services/traccar-bridge/README.md`):
- telemetria só de posição válida e não `outdated`, com `fixTime` crescente: `velocidade_kmh = speed (nós) × 1,852`,
  `timestamp = fixTime` (hora da medição), `travada ← attributes.blocked`, `ignicao ← attributes.ignition`,
  `sinal ← attributes.rssi` (0–4 ou 0–31 → 0–5), `bateria_pct ← attributes.power` (curva aproximada por pack);
- eventos: `powerCut` → `violacao`, `lowBattery`/`lowPower` → `bateria_critica`, `vibration` com o corte ativo ou deslocamento
  > 20 m travada → `movimento_sem_aluguel`; outros alarmes são descartados com log;
- delta `travada: true` → `engineStop` **só** com o dispositivo online, posição de até 7 s (`CUT_FRESH_MS`) com velocidade < 3 km/h e sem corte
  já ativo (segunda guarda); `travada: false` → `engineResume`; `limite_kmh` nunca vira comando (reported `limite_kmh: 32` fixo);
- `reported.travada` vem do bit `blocked` da primeira posição **depois** do comando, ou da **resposta do J16 ao comando** (`attributes.result` com `RELAY 1 OK`/`RELAY 0 OK`, ~1 s depois do envio: estado do relé fresco, publicado na hora), nunca do aceite do comando pelo Traccar. "Confirmado" quer dizer "o J16 disse que acionou o relé", não "o relé atuou" (a ponte não mede a saída);
- reconexão (`deviceOnline`): presença `connected` (modo local), `reported` completo e `shadow/get`; do delta pendente só
  `travada: false` é reaplicado (um `travada: true` pendente nunca: a API recomeça o fluxo com amostras novas);
- `motos/{t}/comandos` (`buzina`) é ignorado com log.

## Produção: caminho das mensagens

| Origem | Caminho | Consumidor |
|---|---|---|
| `motos/+/telemetria` | regra IoT `SELECT *, topic(2) AS thingName, timestamp() AS ingestedAt` → SQS `telemetria` | API (`QUEUE_MODE=sqs`) |
| `motos/+/eventos` | regra IoT → SQS (proposta: `telemetria`; hoje vai para `alertas`, ver `docs/decisoes.md`) | API |
| shadow `reported` | API consulta `GetThingShadow` enquanto há comando aguardando a moto | API |
| presença | regra IoT → Lambda → EventBridge (a API não recebe); na API, vigia de inatividade (180 s sem notícia → offline) e lacuna de telemetria (> 15 s andando / 150 s parada → reconexão, abre a graça da rampa) | alertas |
| posições | API → Amazon Location `BatchUpdateDevicePosition` (tracker `volti-<env>-tracker`) | Amazon Location |
| cercas | API → `PutGeofence`/`BatchDeleteGeofence` na coleção `volti-<env>-geofences` a cada `zone.changed` | Amazon Location |

## Simulador

`services/iot-sim` implementa este contrato (testes validam as mensagens contra os schemas). Ver o README do pacote.

## Estações de troca de bateria (troca pelo cliente via QR)

Armário com vagas que recebe a bateria descarregada e libera uma carregada (spec `docs/superpowers/specs/2026-10-22-volti-troca-bateria-qr-design.md`). Mesmo modelo dos rastreadores: uma *thing* por estação (`thing = station-{stationId}`, certificado X.509 próprio em produção, `clientId` = `thing`), tópicos próprios fora de `$aws/` (o IoT Core reserva esse prefixo). Por padrão `thing = station-{stationId}`; o cadastro do painel pode apontar a estação para outro armário provisionado (`SwapStation.thingName`, sempre no formato `station-<uuid>`, único) — a API manda os comandos e atribui os eventos pela thing do cadastro.

| Tópico | Sentido | QoS | Payload (schema) | Quando |
|---|---|---|---|---|
| `estacoes/{thing}/comandos` | nuvem → estação | 1 | [`estacao-comandos.schema.json`](schemas/estacao-comandos.schema.json) | `open_slot` ao criar a troca (`POST /swap-stations/{id}/swaps`); `release_battery` depois de `battery_returned` **e** `slot_closed` (ou logo depois de uma devolução atrasada); `abort_swap {swapId, slotNumber?}` no cancelamento pelo cliente e em todo prazo vencido |
| `estacoes/{thing}/eventos` | estação → nuvem | 1 | [`estacao-eventos.schema.json`](schemas/estacao-eventos.schema.json) | `slot_opened {slotNumber}`, `battery_returned {serial, pct}`, `slot_closed`, `battery_released {serial}` |

Regras:
- A API **nunca** manda `release_battery` sem a devolução registrada; `battery_released` de uma troca que não está liberando é ignorado (exceto atraso depois do prazo de liberação, que completa a troca: o cliente recebeu a bateria).
- Cada etapa tem prazo de 3 min (a API cancela/falha a troca e manda `abort_swap`: a estação fecha a vaga, se aberta, e confirma com `slot_closed`, sem liberar bateria); eventos repetidos ou fora de ordem são ignorados.
- Devolução que chega depois do cancelamento pelo cliente ou de um prazo antes da devolução vale: a API registra a bateria, volta a troca para `releasing` e manda `release_battery`; sem carregada livre → troca `failed/no_battery_after_return` e alerta para a operação. Se nesse meio-tempo o aluguel foi encerrado ou abriu outra troca, a devolução fica registrada e a troca vira `failed/return_after_close` (alerta). Devolução numa troca encerrada por qualquer outro motivo só entra no estoque (alerta).
- **`release_battery` depois de `abort_swap` é válido**: para um `swapId` cuja devolução foi recebida (`battery_returned` publicado pela estação), a estação tem de aceitar o `release_battery` mesmo que antes tenha recebido `abort_swap` para essa troca (o cancelamento cruzou com a devolução). Sem devolução recebida, a estação continua recusando.
- Encerramento do aluguel pelo staff (forçado ou chegada no galpão): troca sem devolução → `canceled/rental_force_ended` + `abort_swap`; troca com a devolução registrada termina a liberação, mas a moto (já com a operação) não recebe a bateria nova no cadastro — alerta para conferir.
- Bateria devolvida ou liberada que consta instalada em **outra** moto nunca é desvinculada: troca `failed/serial_mismatch` e alerta (só ids). Série diferente da registrada na moto, ou liberada fora do estoque da estação → alerta, a troca segue.
- No modo aws a fila `estacoes` tem de ser **FIFO** (`.fifo`, `MessageGroupId` = `thing`): a API recusa subir com outra fila e, quando o processamento de um evento falha, não processa o resto do mesmo grupo naquele lote (volta na ordem depois do visibility timeout).
- Estoque: `battery_returned` põe a bateria devolvida como `charging` na estação (série e carga lidas); `battery_released` tira uma do `availableBatteries`, instala a liberada na moto (+1 ciclo) e atualiza `Vehicle.batterySerial`.
- Nada nesses tópicos identifica o cliente (só o `swapId`).

Modos na API (`IOT_MODE`): `stub` (estação imaginária que avança sozinha a cada `STATION_STUB_STEP_MS`, padrão 1,5 s: e2e e emulador sem simulador), `local` (Mosquitto + simulador `services/station-sim`) e `aws` (`Publish` no IoT Data Plane; eventos pela regra IoT `SELECT *, topic(2) AS thing FROM 'estacoes/+/eventos'` → SQS `estacoes`, `SQS_QUEUE_ESTACOES_URL` — regra, fila e política da *thing* ainda não estão no CDK, ver `docs/decisoes.md`).
