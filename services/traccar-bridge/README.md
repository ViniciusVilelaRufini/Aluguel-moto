# traccar-bridge

Ponte dos rastreadores **só relé** (Concox J16, protocolo GT06) para o contrato MQTT da Volti. Spec:
`docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md` (§6). Decisões: `docs/decisoes.md`.

```
J16 ──TCP 5023 (GT06)──► Traccar ──(WebSocket /api/socket + REST)──► traccar-bridge ──MQTT──► IoT Core / Mosquitto
                                                                       ▲
                       shadow delta / motos/+/comandos ────────────────┘
```

> **Traccar mínimo: 6.7.0.** Antes disso o Traccar ignora `attributes.noQueue` e enfileira comandos de dispositivo sem sessão
> (um `engineStop` seria entregue na reconexão, em qualquer velocidade). A ponte lê `GET /api/server` (`version`) ao iniciar e a
> cada releitura dos dispositivos; com versão < 6.7.0 ou desconhecida **não manda nenhum comando de motor** (log
> `engine_stop_refused`/`engine_resume_refused` com `reason: traccar_no_noqueue`).

Para a API nada muda: mesmos tópicos (`packages/contracts/mqtt.md`), mesmos schemas, mesmo shadow. O que a ponte faz:

- **Telemetria** (`motos/{t}/telemetria`) de cada posição válida, não `outdated`, com `fixTime` crescente: `velocidade_kmh = speed × 1,852`
  (o Traccar usa nós), `timestamp = fixTime`, `travada ← blocked`, `ignicao ← ignition`, `sinal ← rssi` (0–5), `bateria_pct ←
  power` pela curva do pack (`BATTERY_MODEL`; aproximado), `satelites ← sat` (opcional; satélites do fix). Heartbeats do GT06 só
  atualizam o estado (corte, ignição, sinal, byte de status).
- **Qualidade do GPS (bancada 2026-11-04):** posição com `sat` conhecido abaixo de 5 (`MIN_GPS_SATELLITES`, `contract.ts`) é
  **fraca**: sai na telemetria (com `satelites`), mas parada não é amostra parada da segunda guarda (`last` some → `no_position`;
  só dificulta o corte) e não entra no alerta de movimento travada. Sem `sat` (simulador), como antes.
- **Modo de economia do GPS:** o decoder GT06 do Traccar grava o byte terminal info cru do status/heartbeat 0x13 em
  `attributes.status` (`Position.KEY_STATUS`; além de `ignition` = bit 1, `charge` = bit 2, `blocked` = bit 7). O bit 6
  (rastreamento GPS ligado) só existe nesse byte. Com a ACC desligada e `Slp:1` o J16 liga o GPS por ~5 min e desliga por 10–70
  min. `reported.gps_economia` = `true` com bit 6 e bit 1 desligados, `false` com qualquer um ligado; vai junto do
  `reported.travada` do heartbeat e, sozinho, só na mudança (ou no máximo 1/min); no reported completo da reconexão só com status
  de até 3 min (`GPS_STATUS_FRESH_MS`). Sem `attributes.status`, não vai (desconhecido).
- **Retenção:** com `engineResume` enviado e ainda sem status novo (defesa em profundidade: a API só confirma o unlock
  `relay_only` por `reported.travada: false` posterior ao pedido, nunca pela telemetria) ou sem bateria conhecida a telemetria
  fica retida (log `telemetry_held` com o motivo, no máximo 1/min por moto). Bit de corte desconhecido sem comando pendente
  (depois de uma (re)conexão sem status novo, ou nunca visto) **não** retém: a telemetria sai com `travada: false` (A4-6;
  cercas, zonas e trajeto não ficam cegos se o firmware não mandar heartbeat em movimento). Com o corte conhecido e a bateria ainda desconhecida há 5 min (ex.:
  J16 alimentado por conversor DC-DC), a telemetria sai com `bateria_pct: 0` **e `bateria_conhecida: false`** (log
  `battery_unknown`; o 0 é falta de leitura, não bateria vazia). Com a bateria conhecida o campo não vai (ausente = `true`). Com `engineStop`
  enviado e ainda sem status novo, ou com o bit recebido há mais de 90 s (firmware sem heartbeat em movimento), a telemetria
  **não** é retida: sai com `travada: false` (conservador — nunca confirma lock; a API não vê lacuna nem reconexão, e cercas e
  zonas continuam vendo a moto).
- **Eventos** (`motos/{t}/eventos`): `powerCut` → `violacao`, `lowBattery`/`lowPower` → `bateria_critica`, `vibration` com o corte
  ativo ou deslocamento > 20 m travada → `movimento_sem_aluguel` (este sai mesmo com a telemetria retida). O deslocamento só
  conta entre posições **boas** (sem `sat` ou com ≥ 5) da mesma cadeia: > 20 m entre duas seguidas ou desde a âncora (primeira boa
  da cadeia; pega o arrasto lento). A cadeia recomeça (a primeira boa **reancora**, sem comparar) com o corte não confirmado,
  posição fraca, posição nova sem fix, heartbeat com o GPS desligado ou mais de 60 s (`LOCK_ANCHOR_MAX_GAP_MS`) desde a boa
  anterior: o salto do GPS que volta do modo de economia não é movimento. Mas a **última posição boa travada** (`lastGoodLocked`)
  não se perde (só some com status de corte solto): a primeira boa depois da quebra e toda posição fraca comparam com ela a
  150 m (`LOCK_REANCHOR_ALARM_M`, erro do primeiro fix depois de lacuna; fraca alarma uma vez a cada 150 m) — moto levada com o
  GPS dormindo, numa van ou arrastada com fix ruim ainda gera `movimento_sem_aluguel`. Outros alarmes:
  log `alarm_ignored`. Os alarmes vêm de `position.attributes.alarm` (sem Notification no Traccar o WebSocket não traz
  `events`); se houver Notification, o mesmo alarme por `events` é deduplicado pelo id da posição. Replay de conexão não gera alarme.
- **Mensagem retida:** delta, `get/accepted` ou comando entregue como **retido** (`packet.retain`, no SUBSCRIBE e de novo a cada
  reconexão) é descartado com log `mqtt_retained_ignored` (auditoria run-4): o shadow do servidor nunca retém essas mensagens.
- **Shadow:** todo delta passa pela segunda guarda. `travada: true` → `engineStop` **só** com o dispositivo online, posição de até
  7 s (`CUT_FRESH_MS`; com `TIMER,5,5#` uma amostra perdida já recusa) abaixo de 3 km/h, sem corte ativo (bit recebido há ≤ 90 s, contado do `serverTime` do Traccar) e sem outro `engineStop` em 30 s (a primeira guarda é a API, que exige 3 amostras paradas
  cobrindo 20 s, com no máximo 12 s entre elas); recusa = log `engine_stop_refused` com o motivo. A guarda é **refeita imediatamente antes do envio** (depois da
  releitura da versão e de qualquer outra espera), com o aparelho resolvido uma vez no início do delta: se a posição envelheceu,
  o dispositivo caiu ou o IMEI do thing mudou no meio (`device_changed`), nada é enviado. A sessão HTTP do Traccar é aberta
  **antes** da guarda refeita; no envio do `engineStop` não há login nem reenvio no 401 (sessão expirada = `engine_stop_not_sent`;
  a API expira o lock com segurança). O `engineResume` mantém o novo login e o reenvio. Lock numa moto já travada → eco `reported.travada: true`.
  `travada: false` → `engineResume`; `travada` null/ausente não vira comando; `limite_kmh` nunca vira comando (reported
  `limite_kmh: 32`).
- **Comandos sem fila:** `engineStop`/`engineResume` vão com `attributes.noQueue`; se o dispositivo caiu entre a checagem e o
  envio o Traccar recusa (log `engine_stop_not_sent`, erro) em vez de guardar o corte para entregar na reconexão em qualquer
  velocidade. Um Traccar que ignore `noQueue` e responda 202 gera `engine_stop_queued` (erro, alertar).
- **`reported.travada`** sai de status/heartbeat com o bit de corte, sempre do bit atual (`currentBlocked`), nunca do
  "comando aceito" nem de memória anterior à reconexão: na mudança, ou no máximo 1/min se igual. O eco do lock numa moto já
  travada sai sempre. Bit recebido há mais de 90 s não vale para "já travada" nem para o eco (sessão TCP nova do J16 pode não
  aparecer no Traccar; **heartbeat do J16 ≤ 60 s é obrigatório**). Depois de um `engineStop`/`engineResume` aceito, o bit
  anterior é descartado (`markCommandSent`): só vale status recebido **depois da resposta do J16 ao comando** (posição do
  Traccar com `attributes.result`) ou, sem resposta, depois de envio + 5 s (`COMMAND_ACK_GRACE_MS`; um heartbeat emitido
  antes de o J16 executar o `Relay` pode chegar logo depois do envio). Esse primeiro status sai sempre como `reported.travada`
  (sem a deduplicação de 1/min). Assim um unlock sem resposta seguido de relock não "confirma" a trava pelo bit de antes do
  `engineResume`.
- **Resposta do J16 com o estado do relé** (bancada 2026-11-03: `"Stop engine Succeed\nRELAY 1 OK"` /
  `"Resume engine Succeed\nRELAY 0 OK"` em ~1 s): `attributes.result` que casa com `/\bRELAY\s*([01])\s*OK\b/i` é status fresco
  do próprio aparelho — `blocked = ($1 === '1')`, hora = min(`serverTime`, relógio da ponte) — e sai **na hora** como
  `reported.travada` (log `relay_reply`, sem a deduplicação de 1/min). É isso que confirma o lock/unlock sem esperar o
  heartbeat de 60 s. **"Confirmado" quer dizer "o J16 disse que acionou", não "o relé atuou"**: a ponte não mede a saída
  (bobina sem +12 V, pino errado ou corte adiado pelo firmware passam como confirmados; veja o guia do J16, seção 6). Com comando pendente só vale a resposta recebida depois do envio **e** do comando pendente (`engineStop`
  → `RELAY 1`, `engineResume` → `RELAY 0`); uma resposta atrasada do comando anterior não confirma, não é ack e não vira eco
  `already_blocked`. Posição com `attributes.result` nunca vira telemetria nem renova a amostra de velocidade da guarda do corte
  (é a última localização repetida); com `fixTime` mais novo que a última telemetria ou velocidade ≥ 3 km/h ela apaga a amostra
  parada. No replay de conexão do WebSocket a
  resposta é ignorada como o bit `blocked`. **Status com o bit antigo logo depois da resposta** (bancada: o J16 manda, ~1 s depois
  de `RELAY 0 OK`, um status ainda com `blocked: true`): status cujo bit contraria a resposta aceita e recebido até 5 s depois
  dela (`RELAY_REPLY_SETTLE_MS`) é ignorado para o bit — nem `blocked`, nem a hora, nem `reported` (log
  `stale_status_after_reply`); bateria e ignição valem. Depois de 5 s vale normalmente. Comando novo e reconexão encerram a janela.
  O emulador `GT06_REPLY_STYLE=j16` reproduz esse status velho.
- **MQTT fora:** nada é entregue ao mqtt.js: telemetria (QoS 0) é descartada; `reported`, presença, eventos e `shadow/get`
  (QoS 1) são pulados na hora (log `mqtt_down_skipped` com o tipo, 1/min por moto e tipo), sem esperar o prazo. Um QoS 1 que já
  estava em voo na queda (ou abandonado pelo prazo) fica no `outgoingStore` do mqtt.js, que o reenvia na reconexão **antes** do
  `connect`; depois disso a ponte reassina, republica `reported.travada` do estado atual (que vale por último) e pede `shadow/get`
  das motos online. Publicação sem conclusão em 10 s é abandonada (log `mqtt_publish_timeout`); SUBSCRIBE sem SUBACK em 10 s
  falha (`mqtt_subscribe_timeout`, tenta de novo na próxima releitura do registro).
- **Desbloqueio pendente:** no início e a cada reconexão do MQTT a ponte pede `shadow/get` de cada moto do registro online no
  Traccar; um `travada: false` pendente (desbloqueio pedido com a ponte fora) vira `engineResume` sem esperar o aparelho reconectar.
  `travada: true` pendente nunca é reaplicado.
- **Reconexão:** dispositivo online de novo no Traccar → esquece o bit de corte, presença `connected` (só local), reported completo
  (sem `travada` até chegar status novo) e `shadow/get`; do get só `travada: false` pendente é reaplicado (nunca `true`: a API
  recomeça o fluxo). WebSocket da ponte reaberto → esquece o bit de corte de todas as motos e ignora o `blocked` do replay de
  últimas posições que o Traccar manda ao conectar. Watchdog do WebSocket: sem mensagem (o Traccar manda keepalive `{}` a cada
  55 s) por 130 s, derruba e reconecta.
- `motos/{t}/comandos` com `acao: "buzina"` é ignorado (log `command_ignored_no_horn`).
- **Console do GT06** (`acao: "console"`, `comando_id` + `texto` de 1 a 100): a ponte envia o texto, intacto (APN em minúsculas
  continua minúsculo), ao Traccar como `custom` com `attributes: { data, noQueue: true }` (`TraccarRest.sendCustom`) e guarda o
  comando numa fila por moto (`src/console.ts`). Antes de enviar (todas → `console_falha`, nada enviado):
  - texto de relé/motor (`RELAY`, `DYD`, `HFYD`, `STOP`, `RESUME`, sem diferenciar caixa; `isRelayConsoleText`) → `erro` +
    log `console_relay_refused` (defesa em profundidade: a allowlist da API já recusa; o console nunca corta nem libera o relé
    fora do bloqueio seguro);
  - mesmo gate de `noQueue` dos comandos de motor (Traccar ≥ 6.7.0; versão desconhecida = não) não satisfeito → `erro`
    (log `console_refused`);
  - status do dispositivo conhecido e diferente de `online` → `offline`.
  Resposta do `POST /api/commands/send`: 200 = enviado; **202 = o Traccar ENFILEIROU** (ignorou o `noQueue`) → `console_falha`
  `erro` + log de erro `console_queued_by_traccar` (não há helper para tirar da fila do Traccar: alertar); 400 cujo corpo indica
  dispositivo sem sessão (`NO_SESSION_RE`: "Failed to send command", "not online", "offline") → `offline`; outro 400 ou erro
  HTTP → `erro`, salvo se o status conhecido do aparelho deixou de ser `online` durante o envio (→ `offline`). `comando_id` já visto (pendente ou concluído; memória dos últimos 500) é
  reentrega QoS 1: log `console_duplicate_ignored`, não reenvia. O aparelho responde como posição com `attributes.result`:
  texto que não é de relé (`parseRelayReply` indefinido) vai ao pendente mais antigo como `console_resposta` (`comando_id`,
  `texto`); "RELAY n OK" segue só pelo fluxo do relé e nunca consome um pendente. **Coerência mínima (FIFO sem correlação):**
  se o pendente mais antigo é `STATUS#`, `WHERE#`, `PARAM#`, `APN#` ou `SERVER#`, a resposta precisa conter (sem diferenciar
  caixa) `Battery:`, `Lati`/`Position`, `IMEI`, `APN` ou `SERVER`, respectivamente; senão não é atribuída (log
  `console_reply_unmatched`, sem o texto) e o pendente segue esperando. Os demais comandos ficam no FIFO puro. Com comando de
  console pendente, uma resposta sem estado do relé **não** conta como ack de `engineStop`/`engineResume` em curso
  (`applyPosition(..., { consolePending })`). Sem resposta em 60 s (`CONSOLE_TIMEOUT_MS`, varredura a cada 5 s, relógio
  injetável) → `console_falha` `timeout`. Eventos saem em `motos/{t}/eventos` (QoS 1). Payload inválido → log
  `console_invalid`, nada enviado. Os logs só levam `thingName` e `comandoId`, nunca o texto nem a resposta (podem conter
  localização). Replay de conexão (resposta antiga) nunca vira resposta de console.
- **Registro** IMEI → thingName: `Tracker` com `controlMode = relay_only` (papel `volti_bridge`, só SELECT em 3 colunas), relido a
  cada `REGISTRY_REFRESH_MS` e, para IMEI desconhecido, no máximo a cada 10 s **sem segurar a fila de entrada** (a mensagem que
  disparou a releitura é descartada como desconhecida; as seguintes já mapeiam; uma releitura em voo por vez). Log
  `traccar_unknown_device` 1/min por IMEI. Thing com IMEI trocado, removido ou devolvido recomeça sem memória (bit de corte, envio
  recente, `modo_roubada`).
- **Prazos de I/O (nada espera para sempre na fila de entrada):** Postgres com `connectionTimeoutMillis`, `query_timeout` e
  `statement_timeout` de 5 s (erro de cliente ocioso vira log `db_pool_error`, sem derrubar o processo); toda chamada REST ao
  Traccar com `AbortSignal.timeout` de 10 s; publicação MQTT 10 s; SUBSCRIBE 10 s.
- **Saúde (HEALTHCHECK):** a cada 30 s uma sonda entra na fila de entrada; ao ser processada, toca `LIVENESS_FILE`
  (`/tmp/bridge-alive`). `node dist/healthcheck.js` falha se o arquivo tem mais de 120 s (fila travada). Usado pelo Dockerfile, pelos
  dois compose (o emulador, mesma imagem, desliga o herdado) e pelo health check do container no ECS (task substituída).
- Logs JSON por linha, sem dado pessoal; IMEI sempre mascarado (`***********0901`).

## Variáveis

Nenhum segredo no código: senhas e certificado vêm do ambiente (Secrets Manager na AWS).

| Variável | Padrão | Uso |
|---|---|---|
| `IOT_MODE` | `local` | `local` (Mosquitto) ou `aws` (IoT Core com certificado de serviço) |
| `MQTT_URL` | `mqtt://localhost:1883` (local) | No dev single, com usuário e senha da ponte: `mqtt://traccar-bridge:<senha>@mosquitto:1883` (o mqtt.js lê da URL; a URL nunca vai para log) |
| `MQTT_URL` | `mqtt://localhost:1883` | local; no aws vem de `IOT_ENDPOINT` (`mqtts://<endpoint>:8883`) |
| `MQTT_CLIENT_ID` | `traccar-bridge` | no aws, `traccar-bridge-<env>` (a política só aceita esse) |
| `MQTT_CERT_PEM`, `MQTT_KEY_PEM` | — | aws: certificado da ponte (Secrets Manager) |
| `TRACCAR_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD` | — | REST/WebSocket do Traccar (rede interna) |
| `TRACCAR_BOOTSTRAP_ADMIN` | `false` | só no compose local: cria o primeiro usuário do Traccar |
| `DATABASE_URL` ou `DATABASE_HOST/PORT/NAME/USER/PASSWORD` (+ `DATABASE_SSL=require`) | — | leitura do `Tracker` |
| `BATTERY_MODEL` | `72v` | `48v`, `60v` ou `72v` |
| `REGISTRY_REFRESH_MS` | `60000` | releitura do registro (≥ 1000) |
| `LIVENESS_FILE` | `/tmp/bridge-alive` | arquivo de vida do HEALTHCHECK |

## Rodar e testar

```bash
pnpm --filter traccar-bridge test     # unidade + integração (Traccar falso HTTP/WebSocket e broker MQTT em memória, sem Docker)
pnpm --filter traccar-bridge lint
pnpm --filter traccar-bridge build    # dist/main.js
pnpm --filter traccar-bridge dev      # local, com as variáveis acima (Traccar, Postgres e MQTT acessíveis)
pnpm --filter traccar-bridge test -- relay-lock.e2e   # só o e2e em processo (abaixo)
```

**e2e em processo** (`test/e2e/relay-lock.e2e.spec.ts`, spec §11, sem Docker, ~2 s): Traccar falso (HTTP + WebSocket reais) →
ponte real → broker em memória → pilha IoT real da API (`BaseIotGateway`, `LiveStateStore`, `LocalMqttTransport` +
`LocalShadowStore`, `TelemetryService`, `RelayLockService`, Redis em memória) → delta → ponte → `POST /api/commands/send`. Um
`FakeClock` comum à API e à ponte; o código da API entra por caminho relativo (o ts-jest só transpila; o `tsc` da ponte exclui
`test/e2e`, o ESLint cobre). Cenários: o `lock` só termina `confirmed` depois de 3+ paradas cobrindo 20 s (no máximo 12 s entre elas) e do bit de corte de
um status seguinte; andando o tempo todo → `did_not_stop` sem `engineStop` nem `travada:false`; moto já travada → `confirmed`
sem corte; ordem telemetria → reported da ponte; GPS 8 s atrás (mais que a cadência) com reported fora de banda a cada posição
→ andando nada corta, parada corta e confirma; Traccar 6.5 → nenhum comando de motor (lock e unlock); WebSocket que reconecta
com bit de corte velho no replay → nada confirma; moto offline no meio → `pending`/`offline` → `in_progress`; corte feito com
status atrasado → `timeout` limpa o pedido (`travada:null`, nunca `false`) → status `blocked:true` e reconexão → nenhum
`engineResume` (a moto continua travada).

Imagem: `docker build -f services/traccar-bridge/Dockerfile .` (da raiz; usuário `volti`, sem root; base `node:24-alpine` fixada
por digest — para atualizar, troque o `ARG NODE_IMAGE`). Dev single: `deploy/single/gt06.sh` e `deploy/single/cloudshell.md`. A
ponte não tem endpoint HTTP; a saúde é o HEALTHCHECK do arquivo de vida (acima). O Docker não reinicia contêiner `unhealthy`
sozinho (veja `docker ps`); no ECS a task é substituída.

**Dispositivo provisionado com a ponte rodando:** na bancada do J16 (2026-11-03) a ponte só passou a receber o dispositivo
recém-ligado ao usuário dela no Traccar depois de reiniciar (a sessão do WebSocket não incluía o dispositivo novo). Por isso o
`gt06.sh provision` reinicia a `traccar-bridge` quando ela está rodando (linha `traccar-bridge reiniciada ...`). O reinício é
seguro: a ponte relê o registro, esquece o bit de corte de todas as motos, ignora o replay e espera status novo; um
`engineStop` em voo de outra moto não é reenviado (o lock expira na API) e um `engineResume` pendente é reaplicado ao subir
(`shadow/get` das motos online, `requestPendingUnlocks`). A própria ponte também reabre o WebSocket (login novo) quando uma moto
do registro, online no Traccar, não chega nele em 90 s (`traccar_socket_reopen_undelivered`; uma vez por moto, no máximo uma
reabertura a cada 5 min; se nem assim chegar, erro `traccar_device_not_delivered`). Provisionou por outro caminho e o `status`
não mostra nenhum log da ponte para a moto: `docker compose ... restart traccar-bridge`.

### Local com Docker (profile `gt06` do `docker-compose.yml`)

O PC do dono não tem Docker; vale numa máquina que tenha (ou no dev single). Os testes estáticos do compose
(`pnpm --filter infra test -- compose-gt06`) rodam em qualquer lugar.

```bash
docker compose up -d postgres redis mosquitto api          # a API migra ao subir (cria a tabela "Tracker")
docker compose --profile gt06 up -d traccar bridge-db-grants traccar-bridge gt06-emulator
```

- `traccar`: `traccar/traccar:6.16.0-ubuntu` (mínimo 6.7.0), banco `traccar` próprio (papel `traccar`), só o protocolo `gt06`.
  Portas só em `127.0.0.1`: 5023 (GT06) e 8082 (painel/REST, `admin@volti.local` / `volti-dev-traccar`). JDBC com `sslmode=prefer`
  (o Postgres do compose não oferece TLS; no AWS é `require`).
- `bridge-db-grants`: uma vez, espera a tabela `"Tracker"` e dá `GRANT SELECT ("imei","thingName","controlMode")` ao papel
  `volti_bridge` (`infra/postgres/`). Sem a API ter migrado ele falha após ~5 min e a ponte não sobe. Volume do Postgres criado
  antes do profile: aplique `infra/postgres/traccar-db.sql` à mão (`docker compose exec -T postgres psql -U volti -d volti < infra/postgres/traccar-db.sql`).
- `traccar-bridge`: `IOT_MODE=local` (Mosquitto), cria o admin do Traccar (`TRACCAR_BOOTSTRAP_ADMIN`), lê o registro com o papel
  só-leitura.
- `gt06-emulator`: mesma imagem; `GT06_SCENARIO=parked` (padrão) ou `ride-then-stop`; `GT06_REPLY_STYLE=legacy` (padrão; resposta sem estado do relé) ou `j16` (o texto do J16 real, `... RELAY 1 OK`, que a ponte aceita como estado do relé; o compose do dev single usa `j16`); a tensão segue `GT06_BATTERY_MODEL` (padrão `72v`,
  repassado como `BATTERY_MODEL` à ponte e ao emulador).

**O dispositivo do emulador precisa existir no Traccar e estar vinculado ao usuário da ponte** (senão não há pushes no
`/api/socket` nem registro IMEI -> thing). Faça o provisionamento (o `provision-gt06` cria o dispositivo e o vincula):

```bash
TRACCAR_URL=http://localhost:8082 TRACCAR_ADMIN_EMAIL=admin@volti.local TRACCAR_ADMIN_PASSWORD=volti-dev-traccar TRACCAR_BRIDGE_EMAIL=admin@volti.local DATABASE_URL=postgresql://volti:volti@localhost:5432/volti   pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle VLT-0001 --thing moto-0001 --imei 860000000000901
docker compose --profile gt06 logs -f traccar-bridge gt06-emulator
```

`TRACCAR_BRIDGE_EMAIL` é o usuário com que a ponte entra no Traccar (no compose local, `admin@volti.local`): sem ele o dispositivo é criado
mas **não é vinculado** a esse usuário e a ponte não recebe nada no `/api/socket`. A moto (`VLT-0001`) precisa existir antes (`POST /vehicles`
ou o seed). Até o provisionamento o emulador loga falhas de conexão/login e reconecta a cada 5 s (esperado).

Para ver o lock:
`GT06_SCENARIO=ride-then-stop docker compose --profile gt06 up -d --force-recreate gt06-emulator`.

**Pipeline e2e com conferência** (ver "Emulador GT06 e conferência do e2e"): com a pilha acima no ar,

```bash
docker compose --profile gt06 logs -f --no-log-prefix gt06-emulator > emulador.log &
mosquitto_sub -h localhost -v -t 'motos/moto-0001/#' -t '$aws/things/moto-0001/shadow/#'   | node dist/e2e/check-timeline.js stamp > mqtt.log        # stamp prefixa a hora UTC com milissegundos
# ... dispare o lock (POST /api/commands/send) e aguarde a confirmação; depois, parando os dois processos acima:
node dist/e2e/check-timeline.js moto-0001 --emulator-log=emulador.log < mqtt.log
```

Não semeie o shadow com `desired.travada: false` (o conferidor reprova `travada:false` em desired/delta, salvo `--unlock-requested`);
o compose e a ponte nunca publicam `desired`.

## Provisionar um J16 de verdade

**Guia de campo completo** (SMS de configuração com o grau de confiança de cada comando, ligação do relé, teste de bancada e
tabela de sintomas): `docs/gt06-j16-instalacao.md`. No dev single, provisionar e diagnosticar com `deploy/single/gt06.sh
provision` e `gt06.sh status <moto>`.

1. Cadastrar a moto (`POST /vehicles`) e rodar `pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle
   VLT-0000 --thing moto-0000 --imei <15 dígitos>`. Não cria certificado: marca o `Tracker` como `relay_only`/`gt06` e cria o
   dispositivo no Traccar (`uniqueId = IMEI`). Todo dispositivo GT06 precisa estar **vinculado ao usuário da ponte** no Traccar
   (o `provision-gt06` faz isso): ser admin não basta para receber os pushes do `/api/socket`. Com o `iot-sim` rodando (dev
   single), **espere um ciclo** (`SIM_FLEET_REFRESH_SEC`, 60 s) depois de provisionar ou desprovisionar antes de testar o
   bloqueio: ele relê a frota e solta a moto com desconexão limpa. Não o reinicie (o SIGTERM anuncia `disconnected` pela moto).
2. Configurar o aparelho por SMS para o chip M2M. **Sintaxe a confirmar no manual do aparelho** (varia por firmware Concox):
   - APN: `APN,<apn>,<usuário>,<senha>#` (bancada: APN do chip M2M; produção: **APN privada**, requisito da ADR);
   - servidor: `SERVER,1,<domínio>,5023,0#` (domínio, preferido no dev single: o IP muda a cada partida) ou
     `SERVER,0,<ip>,5023,0#` (IP);
   - fuso UTC: `GMT,E,0,0#`;
   - intervalo de posição fixo de 5 s (com e sem ACC), p.ex. `TIMER,5,5#` — a trava só-relé exige 3 posições paradas cobrindo 20 s, no máximo 12 s entre elas (o J16 G900L só aceita `TIMER,10,10#`, que também fecha: ver o e2e (11));
   - heartbeat ≤ 60 s, `HBT,60,60#` ou `HBT,1,1#` conforme a unidade do firmware (**obrigatório**: o status de corte é o único que confirma trava/destrava pelo `reported.travada`, e bit com mais de 90 s
     não vale para "já travada");
   - conferir: `STATUS#`, `PARAM#`, `WHERE#`.
3. Conferir no Traccar que o dispositivo aparece online e que a telemetria chega à API.

## Tarefas do dono

As tarefas físicas (comprar o kit e o chip M2M, confirmar a tensão de entrada ou usar conversor DC-DC 72 V → 12 V, teste de
bancada, instalação com o relé no fio da chave, teste na moto parada, limitador de 32 km/h no controlador) estão no
**Apêndice: tarefas do dono** da spec. Na bancada, confirmar também: Traccar ≥ 6.7.0 e que, com o J16 desligado, um
`engineStop` é recusado (não enfileirado); heartbeat do J16 ≤ 60 s; `GET /api/server` da imagem escolhida devolve `version` como
texto (se vier `null`, a ponte recusa todos os comandos de motor); **latência posição → delta** (do `fixTime` da posição parada
até o `engineStop` sair da ponte) **bem abaixo de 2 s** — a ponte só corta com posição de até 7 s (`CUT_FRESH_MS`), e um GPS
com o `fixTime` mais de ~7 s atrás da chegada impede o corte (o lock termina `failed`/`timeout`, seguro mas inútil); meça
também o atraso `fixTime` → `serverTime` no Traccar.

Checklist adicional (ver a entrada da Task 1 em `docs/decisoes.md`): J16 com posição a cada <= 10 s durante um lock e tensão
externa (0x94) no heartbeat (senão a bateria vira 0% após 5 min); corte em velocidade e bit de bloqueio no heartbeat; relé após
reinício; `noQueue` respeitado e dispositivo vinculado ao usuário da ponte. Produção: senha admin do Traccar fora do env da API,
`reconnectAt` por instância, SSL do RDS (`DATABASE_SSL`), APN privada.

## Emulador GT06 e conferência do e2e

- `pnpm emulator` (`GT06_HOST`, `GT06_PORT`, `GT06_IMEI`, `GT06_SCENARIO=parked|ride-then-stop`, `GT06_REPLY_STYLE=legacy|j16`, `GT06_HEARTBEAT_MS` - máximo 60 s). Logo após o login envia status (bit de corte) e a tensão externa (0x94, short com sinal em 0,01 V, sem subtipo em quadro 0x7878), e repete a cada heartbeat; a ponte segura a telemetria até receber os dois. A tensão segue o `BATTERY_MODEL` da ponte (48v/60v/72v, padrão 72v) em ~70 % da curva; `GT06_POWER_VOLTS` sobrescreve.
- Conferência (falha fechada): `mosquitto_sub -v -t "..." | node dist/e2e/check-timeline.js stamp > mqtt.log` (o modo `stamp` prefixa cada linha com a hora UTC ISO 8601 com milissegundos do recebimento; o `-F %I` do mosquitto só tem resolução de 1 s e é recusado), depois `node dist/e2e/check-timeline.js <thing> --emulator-log=emulador.log [--unlock-requested] < mqtt.log`. O log JSON do emulador é intercalado com as linhas pelo horário. Emulador, ponte e o `stamp` precisam rodar no mesmo host (ou com relógios sincronizados por NTP). Falha se: o emulador recebeu corte a >= 3 km/h; houve `desired travada:true` sem `gt06_cut`; `reported travada:true` saiu sem `gt06_status_sent` (não `stale`) ou `gt06_reply_sent` com `blocked:true` depois do corte e da última conexão (ou com mais de 90 s de idade); `reported travada:false` saiu com o aparelho dizendo `true`; houve `desired travada:false` não pedido; ou alguma linha tem hora só em segundos ("check skipped: linhas do mosquitto sem milissegundos"). Sem `--emulator-log` o CLI sai com código 2, a menos que se passe `--no-emulator-log` (então só as checagens do mosquitto rodam).
- `--unlock-requested`: use só quando o cenário do e2e pede um desbloqueio de propósito (ou o shadow nasce com `desired travada:false`); sem ele qualquer `travada:false` em desired ou delta é reprovado. A ponte e o emulador nunca publicam desired, então o fluxo padrão (corte e confirmação) não gera `travada:false`.
