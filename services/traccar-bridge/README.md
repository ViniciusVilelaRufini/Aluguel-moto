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
  power` pela curva do pack (`BATTERY_MODEL`; aproximado). Heartbeats do GT06 só atualizam o estado (corte, ignição, sinal).
- **Retenção:** sem o bit de corte atual (depois de cada (re)conexão) ou sem bateria conhecida a telemetria fica retida (log
  `telemetry_held` com o motivo, no máximo 1/min por moto). Com o corte conhecido e a bateria ainda desconhecida há 5 min (ex.:
  J16 alimentado por conversor DC-DC), a telemetria sai com `bateria_pct: 0` (log `battery_unknown`).
- **Eventos** (`motos/{t}/eventos`): `powerCut` → `violacao`, `lowBattery`/`lowPower` → `bateria_critica`, `vibration` com o corte
  ativo ou deslocamento > 20 m travada → `movimento_sem_aluguel` (este sai mesmo com a telemetria retida). Outros alarmes:
  log `alarm_ignored`. Os alarmes vêm de `position.attributes.alarm` (sem Notification no Traccar o WebSocket não traz
  `events`); se houver Notification, o mesmo alarme por `events` é deduplicado pelo id da posição. Replay de conexão não gera alarme.
- **Shadow:** todo delta passa pela segunda guarda. `travada: true` → `engineStop` **só** com o dispositivo online, posição de até
  10 s abaixo de 3 km/h, sem corte ativo (bit recebido há ≤ 90 s, contado do `serverTime` do Traccar) e sem outro `engineStop` em 30 s (a primeira guarda é a API, que exige 2 amostras paradas
  em 10 s); recusa = log `engine_stop_refused` com o motivo. A guarda é **refeita imediatamente antes do envio** (depois da
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
  aparecer no Traccar; **heartbeat do J16 ≤ 60 s é obrigatório**).
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
- `motos/{t}/comandos` (buzina) é ignorado (log `command_ignored_no_horn`).
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
`test/e2e`, o ESLint cobre). Cenários: o `lock` só termina `confirmed` depois de 2+ paradas cobrindo 10 s e do bit de corte de
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
- `gt06-emulator`: mesma imagem; `GT06_SCENARIO=parked` (padrão) ou `ride-then-stop`; a tensão segue `GT06_BATTERY_MODEL` (padrão `72v`,
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
   - intervalo de posição fixo de 5 s (com e sem ACC), p.ex. `TIMER,5,5#` — a trava só-relé exige 2 posições paradas em 10 s;
   - heartbeat ≤ 60 s, `HBT,60,60#` ou `HBT,1,1#` conforme a unidade do firmware (**obrigatório**: o status de corte libera a telemetria retida depois de reconectar, e bit com mais de 90 s
     não vale para "já travada");
   - conferir: `STATUS#`, `PARAM#`, `WHERE#`.
3. Conferir no Traccar que o dispositivo aparece online e que a telemetria chega à API.

## Tarefas do dono

As tarefas físicas (comprar o kit e o chip M2M, confirmar a tensão de entrada ou usar conversor DC-DC 72 V → 12 V, teste de
bancada, instalação com o relé no fio da chave, teste na moto parada, limitador de 32 km/h no controlador) estão no
**Apêndice: tarefas do dono** da spec. Na bancada, confirmar também: Traccar ≥ 6.7.0 e que, com o J16 desligado, um
`engineStop` é recusado (não enfileirado); heartbeat do J16 ≤ 60 s; `GET /api/server` da imagem escolhida devolve `version` como
texto (se vier `null`, a ponte recusa todos os comandos de motor).

Checklist adicional (ver a entrada da Task 1 em `docs/decisoes.md`): J16 com posição a cada <= 10 s durante um lock e tensão
externa (0x94) no heartbeat (senão a bateria vira 0% após 5 min); corte em velocidade e bit de bloqueio no heartbeat; relé após
reinício; `noQueue` respeitado e dispositivo vinculado ao usuário da ponte. Produção: senha admin do Traccar fora do env da API,
`reconnectAt` por instância, SSL do RDS (`DATABASE_SSL`), APN privada.

## Emulador GT06 e conferência do e2e

- `pnpm emulator` (`GT06_HOST`, `GT06_PORT`, `GT06_IMEI`, `GT06_SCENARIO=parked|ride-then-stop`, `GT06_HEARTBEAT_MS` - máximo 60 s). Logo após o login envia status (bit de corte) e a tensão externa (0x94, short com sinal em 0,01 V, sem subtipo em quadro 0x7878), e repete a cada heartbeat; a ponte segura a telemetria até receber os dois. A tensão segue o `BATTERY_MODEL` da ponte (48v/60v/72v, padrão 72v) em ~70 % da curva; `GT06_POWER_VOLTS` sobrescreve.
- Conferência (falha fechada): `mosquitto_sub -v -t "..." | node dist/e2e/check-timeline.js stamp > mqtt.log` (o modo `stamp` prefixa cada linha com a hora UTC ISO 8601 com milissegundos do recebimento; o `-F %I` do mosquitto só tem resolução de 1 s e é recusado), depois `node dist/e2e/check-timeline.js <thing> --emulator-log=emulador.log [--unlock-requested] < mqtt.log`. O log JSON do emulador é intercalado com as linhas pelo horário. Emulador, ponte e o `stamp` precisam rodar no mesmo host (ou com relógios sincronizados por NTP). Falha se: o emulador recebeu corte a >= 3 km/h; houve `desired travada:true` sem `gt06_cut`; `reported travada:true` saiu sem `gt06_status_sent` com `blocked:true` depois do corte e da última conexão (ou com mais de 90 s de idade); houve `desired travada:false` não pedido; ou alguma linha tem hora só em segundos ("check skipped: linhas do mosquitto sem milissegundos"). Sem `--emulator-log` o CLI sai com código 2, a menos que se passe `--no-emulator-log` (então só as checagens do mosquitto rodam).
- `--unlock-requested`: use só quando o cenário do e2e pede um desbloqueio de propósito (ou o shadow nasce com `desired travada:false`); sem ele qualquer `travada:false` em desired ou delta é reprovado. A ponte e o emulador nunca publicam desired, então o fluxo padrão (corte e confirmação) não gera `travada:false`.
