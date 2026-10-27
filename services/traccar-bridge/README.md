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
  10 s abaixo de 3 km/h, sem corte ativo (bit recebido há ≤ 90 s) e sem outro `engineStop` em 30 s (a primeira guarda é a API, que exige 2 amostras paradas
  em 10 s); recusa = log `engine_stop_refused` com o motivo. Lock numa moto já travada → eco `reported.travada: true`.
  `travada: false` → `engineResume`; `travada` null/ausente não vira comando; `limite_kmh` nunca vira comando (reported
  `limite_kmh: 32`).
- **Comandos sem fila:** `engineStop`/`engineResume` vão com `attributes.noQueue`; se o dispositivo caiu entre a checagem e o
  envio o Traccar recusa (log `engine_stop_not_sent`, erro) em vez de guardar o corte para entregar na reconexão em qualquer
  velocidade. Um Traccar que ignore `noQueue` e responda 202 gera `engine_stop_queued` (erro, alertar).
- **`reported.travada`** sai de status/heartbeat com o bit de corte, sempre do bit atual (`currentBlocked`), nunca do
  "comando aceito" nem de memória anterior à reconexão: na mudança, ou no máximo 1/min se igual. O eco do lock numa moto já
  travada sai sempre. Bit recebido há mais de 90 s não vale para "já travada" nem para o eco (sessão TCP nova do J16 pode não
  aparecer no Traccar; **heartbeat do J16 ≤ 60 s é obrigatório**).
- **MQTT fora:** telemetria (QoS 0) é descartada e `reported` não vai para a fila offline; na reconexão a ponte reassina e
  republica `reported.travada` do estado atual. Publicação sem conclusão em 10 s é abandonada (log `mqtt_publish_timeout`).
- **Reconexão:** dispositivo online de novo no Traccar → esquece o bit de corte, presença `connected` (só local), reported completo
  (sem `travada` até chegar status novo) e `shadow/get`; do get só `travada: false` pendente é reaplicado (nunca `true`: a API
  recomeça o fluxo). WebSocket da ponte reaberto → esquece o bit de corte de todas as motos e ignora o `blocked` do replay de
  últimas posições que o Traccar manda ao conectar. Watchdog do WebSocket: sem mensagem (o Traccar manda keepalive `{}` a cada
  55 s) por 130 s, derruba e reconecta.
- `motos/{t}/comandos` (buzina) é ignorado (log `command_ignored_no_horn`).
- **Registro** IMEI → thingName: `Tracker` com `controlMode = relay_only` (papel `volti_bridge`, só SELECT em 3 colunas), relido a
  cada `REGISTRY_REFRESH_MS` e, para IMEI desconhecido, no máximo a cada 10 s (log `traccar_unknown_device` 1/min por IMEI). Thing
  com IMEI trocado, removido ou devolvido recomeça sem memória (bit de corte, envio recente, `modo_roubada`).
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

## Rodar e testar

```bash
pnpm --filter traccar-bridge test     # unidade + integração (Traccar falso HTTP/WebSocket e broker MQTT em memória, sem Docker)
pnpm --filter traccar-bridge lint
pnpm --filter traccar-bridge build    # dist/main.js
pnpm --filter traccar-bridge dev      # local, com as variáveis acima (Traccar, Postgres e MQTT acessíveis)
```

Imagem: `docker build -f services/traccar-bridge/Dockerfile .` (da raiz; usuário `volti`, sem root). O profile `gt06` do
`docker-compose.yml` e o `deploy/single/gt06.sh` entram nas próximas tarefas do plano.

## Provisionar um J16 de verdade

1. Cadastrar a moto (`POST /vehicles`) e rodar `pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle
   VLT-0000 --thing moto-0000 --imei <15 dígitos>`. Não cria certificado: marca o `Tracker` como `relay_only`/`gt06` e cria o
   dispositivo no Traccar (`uniqueId = IMEI`). Todo dispositivo GT06 precisa estar **vinculado ao usuário da ponte** no Traccar
   (o `provision-gt06` faz isso): ser admin não basta para receber os pushes do `/api/socket`.
2. Configurar o aparelho por SMS para o chip M2M. **Sintaxe a confirmar no manual do aparelho** (varia por firmware Concox):
   - APN: `APN,<apn>,<usuário>,<senha>#` (bancada: APN do chip M2M; produção: **APN privada**, requisito da ADR);
   - servidor: `SERVER,1,<domínio>,5023,0#` (domínio) ou `SERVER,0,<ip>,5023,0#` (IP);
   - fuso UTC: `GMT,E,0,0#`;
   - intervalo de posição fixo de 5 s (com e sem ACC), p.ex. `TIMER,5,5#` — a trava só-relé exige 2 posições paradas em 10 s;
   - heartbeat ≤ 60 s (**obrigatório**: o status de corte libera a telemetria retida depois de reconectar, e bit com mais de 90 s
     não vale para "já travada");
   - conferir: `STATUS#`, `PARAM#`, `WHERE#`.
3. Conferir no Traccar que o dispositivo aparece online e que a telemetria chega à API.

## Tarefas do dono

As tarefas físicas (comprar o kit e o chip M2M, confirmar a tensão de entrada ou usar conversor DC-DC 72 V → 12 V, teste de
bancada, instalação com o relé no fio da chave, teste na moto parada, limitador de 32 km/h no controlador) estão no
**Apêndice: tarefas do dono** da spec. Na bancada, confirmar também: Traccar ≥ 6.7.0 e que, com o J16 desligado, um
`engineStop` é recusado (não enfileirado); heartbeat do J16 ≤ 60 s; `GET /api/server` da imagem escolhida devolve `version` como
texto (se vier `null`, a ponte recusa todos os comandos de motor).

## Emulador GT06 e conferência do e2e

- `pnpm emulator` (`GT06_HOST`, `GT06_PORT`, `GT06_IMEI`, `GT06_SCENARIO=parked|ride-then-stop`, `GT06_HEARTBEAT_MS` — máximo 60 s, `GT06_POWER_VOLTS` — tensão enviada em 0x94, padrão 52 V; ajuste ao modelo de bateria da ponte). Logo após o login envia status (bit de corte) e tensão, e repete a cada heartbeat; a ponte segura a telemetria até receber os dois.
- `node dist/e2e/check-timeline.js <thing> [--emulator-log=arquivo] [--unlock-requested] < saida-do-mosquitto_sub`: confere a linha do tempo do corte; com o log do emulador também falha se o emulador recebeu corte a >= 3 km/h, se houve `reported travada:true` sem status depois da última conexão (logs JSON do emulador intercalados nas linhas) ou `desired travada:false` não pedido.
