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
| `motos/{thingName}/eventos` | rastreador → nuvem | 1 | [`eventos.schema.json`](schemas/eventos.schema.json) | na detecção: `queda`, `violacao`, `bateria_critica`, `movimento_sem_aluguel` |
| `motos/{thingName}/comandos` | nuvem → rastreador | 1 | [`comandos.schema.json`](schemas/comandos.schema.json) | ações sem estado (hoje só `buzina`) |
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
- `velocidade_kmh` acima de 32 é aceita (indica limitador violado e alimenta alertas), nunca usada como limite.

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
| `travada` | boolean | servidor (desired), rastreador (reported) | o servidor só grava `true` com a velocidade reportada **abaixo de 3 km/h**; o firmware também nunca trava acima disso (fica pendente) |
| `limite_kmh` | inteiro 0..32 | servidor / rastreador | nunca acima de 32 (Contran 996/2023); o firmware recusa valores fora da faixa |
| `modo_roubada` | boolean | servidor / rastreador | telemetria a cada 5 s mesmo travada; sirene ao mover |
| `firmware` | string | rastreador | versão semver |
| `velocidade_kmh` | número | rastreador | velocidade no momento do reporte, usada pela rampa |

O shadow guarda o `desired` enquanto a moto está offline; ao reconectar, ela faz `shadow/get` e aplica o `delta`.

### Confirmação de comandos

Um comando (`VehicleCommand`) é confirmado quando o `reported` alcança o `desired`:

| Comando | Desired | Confirma quando | Prazo |
|---|---|---|---|
| `lock` | rampa (abaixo) e depois `travada: true` | `reported.travada = true` | 120 s → `failed`/`did_not_stop` (ou `timeout` se travou sem confirmar) |
| `unlock` | `travada: false` + `limite_kmh` em vigor (zonas) | `reported.travada = false` | 30 s → `failed`/`timeout` |
| `speed_limit` | `limite_kmh` | `reported.limite_kmh` igual | 30 s |
| `stolen_mode` | `modo_roubada` | `reported.modo_roubada` igual | 30 s |
| `horn` | `motos/{t}/comandos` `{ comando_id, acao: "buzina" }` | publicado com a moto online | offline → `failed`/`offline` |

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
