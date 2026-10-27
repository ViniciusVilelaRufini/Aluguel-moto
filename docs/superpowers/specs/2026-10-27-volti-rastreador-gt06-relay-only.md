# Spec: suporte a rastreador GT06 só com relé (Concox J16)

- **Status:** aprovada pelo dono (2026-10-27) para bancada e piloto.
- **Para:** agente de implementação. Leia antes: `CLAUDE.md`, `docs/adr-rastreador.md`, `docs/firmware-bloqueio-seguro.md`, `packages/contracts/mqtt.md`.
- **Branch sugerida:** `feat/tracker-gt06-relay-only`.

## 1. Contexto e decisão

O hardware comprado para o piloto é o **Concox J16 4G** (protocolo **GT06**, TCP, sem TLS, sem MQTT). Ele tem GPS, 4G com fallback 2G, entrada de ignição (ACC), bateria interna e **uma saída para relé de corte**. Ele **não** consegue limitar velocidade nem reduzir potência.

Decisão do dono do produto (registrar em `docs/decisoes.md`):

1. Rastreadores "só relé" são aceitos. Para eles, o produto oferece **rastreamento** e **bloqueio/liberação**, nada além disso.
2. **Bloqueio de rastreador só relé = esperar a moto parar e então cortar.** Não existe rampa.
3. **Limite por zona (6 e 20 km/h) não é imposto** em rastreador só relé. Vira aviso ao cliente e alerta no painel.
4. O **limite de 32 km/h** fica garantido pelo **controlador da moto** (configuração física). O software não promete impor esse limite em rastreador só relé.
5. O fluxo atual (rampa, `limite_kmh`, firmware F1–F12) **continua valendo** para rastreadores com controle de velocidade. As duas lógicas convivem na mesma frota.

Atualize o `CLAUDE.md` (seção RESTRIÇÕES) com uma linha deixando claro que as regras de rampa e limite por zona valem para rastreadores com controle de velocidade, e que rastreadores só relé seguem esta spec.

## 2. Escopo

Dentro:
- Capacidade do rastreador no contrato, no banco e na API.
- Fluxo de trava para rastreador só relé.
- Zonas em modo aviso para rastreador só relé.
- Ponte GT06: Traccar + serviço `services/traccar-bridge` que traduz para os **mesmos tópicos MQTT** do contrato.
- Ambiente local (docker-compose) e testes.
- CDK do Traccar e da ponte (pode ficar como proposta revisável se o deploy não for testável).

Fora:
- Firmware de rastreador.
- Mudanças nos apps Flutter além de exibir o novo aviso de zona, se já houver tela para `zone.notice`.
- Escolha do hardware de produção.

## 3. Contrato (`packages/contracts`) — propor e registrar em `docs/decisoes.md`

O contrato é a fonte da verdade. Proponha estas mudanças antes de codar:

1. **`Tracker.controlMode`**: enum `speed_control | relay_only` (padrão `speed_control`, para não mudar o comportamento atual).
2. **Exposição na API**: o recurso de veículo do painel ganha `trackerControlMode` (somente leitura), para o admin ver e para o painel esconder/desabilitar o comando de limite de velocidade.
3. **Comando `speed_limit` em `relay_only`**: rejeitado. Novo motivo de falha `unsupported_by_tracker` no enum de `failureReason` (hoje: `offline, timeout, did_not_stop, invalid_limit, locked_by_staff`).
4. **Novo tipo de alerta** `zone_speed_exceeded` (moto `relay_only` acima do limite da zona em que está).
5. **`lock` em `relay_only`**: mesmos estados (`pending`, `in_progress`, `confirmed`, `failed`), mas a explicação de `did_not_stop` passa a ser "a moto não parou em 120 s; nenhum corte foi enviado".
6. Regenere os clientes (`pnpm contracts:generate`).

## 4. Banco e provisionamento

- Prisma: `Tracker.controlMode TrackerControlMode @default(speed_control)` e `Tracker.protocol String?` (ex.: `gt06`). Migração nova.
- `Tracker.imei` passa a ser obrigatório para `relay_only` (é a chave do GT06). Índice único no IMEI quando não nulo.
- `services/api/scripts/provision-tracker.ts`: novo modo `--protocol gt06 --imei <imei>` que **não** cria certificado, marca `controlMode = relay_only`, vincula ao `Vehicle` e cria o dispositivo no Traccar via API (`POST /api/devices` com `uniqueId = imei`).

## 5. Fluxo de trava `relay_only` (API, `modules/iot`)

Implementar como estratégia separada, escolhida por `Tracker.controlMode`. **Não** altere o `SafeLockService` atual além do necessário para a escolha da estratégia.

Regras (todas obrigatórias e cobertas por teste):

1. **Pré-condição para mandar o corte** (`desired.travada = true`): a moto precisa estar **parada de forma confirmada**:
   - pelo menos **2 amostras frescas consecutivas** com `velocidade_kmh < 3`, cobrindo **pelo menos 10 s** entre a primeira e a última;
   - todas fora da graça de reconexão e com as mesmas regras de frescor/ordem já existentes (`IOT_RECONNECT_GRACE_MS`, lacuna, atraso de fila, 10 s de frescor);
   - velocidade desconhecida, velha ou na graça = **em movimento**.
2. Enquanto a pré-condição não for atendida, o comando fica `in_progress` e **nada é enviado ao rastreador**. Não existe degrau de `limite_kmh`.
3. Atendida a pré-condição, grava `desired.travada = true` **uma única vez**. A ponte traduz para `engineStop` no Traccar.
4. Confirmação: `reported.travada = true` vindo da ponte (ver §6.4).
5. Sem parar em **120 s** → `failed`/`did_not_stop`, **nenhum corte enviado**, alerta `command_failed` (prioridade alta).
6. Corte enviado e não confirmado em 120 s → `failed`/`timeout`; grava `desired.travada = false` (para a ponte não reenviar `engineStop` ao reconectar).
7. **Moto offline** → `pending`/`offline`; ao reconectar, recomeça do passo 1 (nunca manda corte sem amostras novas).
8. **Fim do aluguel** em `relay_only` segue o mesmo fluxo: o encerramento só confirma a trava com a moto parada.
9. `unlock` → `desired.travada = false` → `engineResume`. Confirma por `reported.travada = false`. Prazo 30 s.
10. `speed_limit` → `failed`/`unsupported_by_tracker`, sem tocar no shadow.
11. `stolen_mode` → aceito (só muda frequência de telemetria se o protocolo permitir; senão só marca no backend). Não envia corte sozinho.
12. Holds de equipe/sistema e autoridade de destravamento existentes continuam valendo igual.

Teste-chave (invariante): **em nenhuma sequência de amostras o fluxo `relay_only` grava `travada = true` com a última velocidade conhecida ≥ 3 km/h, desconhecida ou dentro da graça.** Use teste baseado em propriedades (sequências aleatórias), além dos casos fixos.

## 6. Ponte GT06 (`services/traccar-bridge`, TypeScript)

### 6.1 Arquitetura

```
J16 ──TCP 5023 (GT06)──► Traccar ──(WebSocket /api/socket + REST)──► traccar-bridge ──MQTT──► IoT Core / Mosquitto
                                                                       ▲
                       shadow delta / motos/+/comandos ────────────────┘
```

- A ponte é um processo Node separado. Para a API **nada muda**: mesmos tópicos, mesmos schemas, mesmo shadow.
- Mapa IMEI ↔ `thingName` vem da tabela `Tracker` (leitura) ou de um endpoint interno; cache com expiração curta.
- Modos: `IOT_MODE=local` publica no Mosquitto (sem TLS); `IOT_MODE=aws` publica no IoT Core com **certificado de serviço** e política que só permite os tópicos `motos/+/*` e os shadows dos things `relay_only`.

### 6.2 Telemetria (`motos/{thingName}/telemetria`, schema existente)

| Campo do contrato | Origem no Traccar | Observação |
|---|---|---|
| `lat`, `lng` | `position.latitude/longitude` | |
| `velocidade_kmh` | `position.speed` | **Traccar usa nós: × 1,852** |
| `timestamp` | `position.fixTime` (UTC ISO) | hora da medição, não do servidor |
| `ignicao` | `attributes.ignition` | fio ACC |
| `travada` | `attributes.blocked` | bit de corte do GT06 |
| `sinal` | `attributes.rssi` | normalizar para a escala do schema |
| `bateria_pct` | `attributes.power` (tensão externa) | curva tensão → % por modelo de moto (48/60/72 V), configurável; documentar que é aproximado |

Posição inválida (`valid = false`) não vira telemetria. Mensagens que não passarem no schema são descartadas com log `telemetry_invalid` (sem payload).

Configurar o intervalo do rastreador o mais próximo possível de F7 (5 s em aluguel, 60 s parado). Se o GT06 não permitir mudar em tempo real, usar 5 s fixo e documentar.

### 6.3 Eventos (`motos/{thingName}/eventos`)

| Alarme Traccar | Evento do contrato |
|---|---|
| `powerCut` | `violacao` |
| `lowBattery` / `lowPower` | `bateria_critica` |
| `vibration` ou deslocamento > 20 m com `travada = true` | `movimento_sem_aluguel` |

Alarmes sem correspondência: log e descarte.

### 6.4 Shadow e comandos

- A ponte assina `$aws/things/+/shadow/update/delta` (só things `relay_only`) e traduz:
  - `travada: true` → `POST /api/commands/send` `{ type: "engineStop" }`
  - `travada: false` → `{ type: "engineResume" }`
  - `limite_kmh` → **ignora** e reporta o limite fixo (ver abaixo); nunca envia comando.
- Reported publicado pela ponte: `travada` (de `attributes.blocked` da posição seguinte ao comando, **não** do simples "comando aceito"), `limite_kmh: 32` fixo, `modo_roubada`, `firmware` (modelo/versão do Traccar), `velocidade_kmh` (só da posição mais recente e fresca).
- Ao reconectar o dispositivo (Traccar `deviceOnline`): publicar reported completo e reaplicar o desired pendente **somente** se for `travada: false`. Um `travada: true` pendente **não** é reaplicado pela ponte: a API recomeça o fluxo (§5.7).
- `motos/+/comandos` (`buzina`): ignorar com log (J16 não tem buzina).
- Presença: `deviceOnline/deviceOffline` do Traccar → mesmos sinais de presença do modo local.

### 6.5 Segurança

- Porta GT06 exposta só via NLB. API REST do Traccar **não** exposta à internet (só rede interna).
- Credenciais do Traccar e certificado da ponte em Secrets Manager / variáveis de ambiente.
- Produção: tráfego dos chips por **APN privada** (requisito da ADR). Para bancada, chip M2M comum.
- Logs JSON sem dados pessoais e sem IMEI completo (mascarar).

## 7. Ambiente local

- `docker-compose.yml`: profile `gt06` com `traccar/traccar` (porta 5023 e 8082 só em localhost) usando um banco `traccar` separado no Postgres local, e o serviço `traccar-bridge`.
- Emulador GT06 para testes (no `services/iot-sim` com `SIM_PROTOCOL=gt06`, ou utilitário dentro da ponte): pacotes de login, posição, heartbeat e alarme; responde a `engineStop/engineResume` alterando o bit `blocked`.
- README da ponte com: como subir, como provisionar um J16 de verdade e os comandos SMS de configuração (APN e `SERVER,...`), marcados como "confirmar no manual do aparelho".

## 8. Infra (CDK)

- Serviço ECS Fargate do Traccar + NLB TCP 5023, security group de entrada restrito quando houver faixa da APN.
- Banco: database `traccar` separado no RDS existente.
- Serviço ECS da ponte com acesso ao Traccar (rede interna) e ao IoT Core (certificado de serviço).
- Se não for possível validar o deploy, entregar como proposta com `cdk synth` passando e testes de snapshot.

## 9. Painel admin

- Mostrar o tipo de rastreador na ficha da moto ("Só relé" / "Controle de velocidade").
- Em `relay_only`: esconder ou desabilitar o comando de limite de velocidade com o texto "Este rastreador não controla velocidade".
- Mensagem do comando de bloqueio em andamento: "Aguardando a moto parar para bloquear".
- Alerta `zone_speed_exceeded` na lista de alertas.

## 10. Zonas em `relay_only`

- ENTER em `reduced_speed`: não grava `limite_kmh`. Envia `zone.notice` ao cliente ("Área com limite de X km/h").
- Velocidade acima do limite da zona por mais de 5 s: alerta `zone_speed_exceeded` (agrupar para não gerar um por amostra).
- EXIT da zona `operation` durante aluguel: alerta e notificação iguais aos de hoje; o bloqueio após `OUT_OF_AREA_LOCK_MINUTES` usa o fluxo §5 (só corta parada).

## 11. Definição de pronto

- Compila, lint sem erros, todos os testes existentes passando.
- Testes novos: estratégia `relay_only` (casos fixos + propriedade do §5), mapeamento Traccar → telemetria/eventos (incluindo nós → km/h), tradução delta → comandos, rejeição de `speed_limit`, zonas em modo aviso, e2e local com emulador GT06 → Traccar → ponte → API (`lock` termina `confirmed` só depois de 2 amostras paradas).
- `docs/decisoes.md`, `docs/adr-rastreador.md`, `CLAUDE.md`, `packages/contracts/mqtt.md` e READMEs atualizados.
- Entrega: resumo, como rodar local, testes executados e pendências.

## 12. Riscos conhecidos (deixar escritos na ADR)

- **Janela residual:** entre a última amostra parada e a chegada do `engineStop`, a moto pode voltar a andar. A exigência de 2 amostras em 10 s reduz, mas não elimina. Em produção, avaliar hardware com controle de velocidade.
- **Sem limite por zona imposto:** responsabilidade do condutor; refletir nos termos de uso (validar com jurídico).
- **32 km/h depende do controlador da moto:** verificar e documentar por modelo.
- **GT06 sem TLS:** exige APN privada em produção.
- **`bateria_pct` aproximado** (pela tensão).

## Apêndice: tarefas do dono (fora do escopo do agente)

Checklist físico para o J16 funcionar com o sistema. O agente não executa estes itens, mas pode citá-los no README da ponte.

1. **Comprar** o kit J16 4G desbloqueado + relé + chicote e **um chip M2M de dados** (o kit não traz chip).
2. **Confirmar a tensão** com o vendedor: o J16 aceita 60–72 V direto? Se não aceitar ou não houver resposta, usar um **conversor DC-DC step-down 72 V → 12 V** (entrada até pelo menos 80 V). Nunca ligar direto na bateria sem essa confirmação.
3. **Teste de bancada** (fonte de 12 V, antes de instalar na moto), depois que a ponte estiver implementada e o Traccar no ar:
   1. inserir o chip e enviar por SMS o APN e o `SERVER` (sintaxe conforme o manual do aparelho);
   2. conferir se o dispositivo aparece online no Traccar e se a telemetria chega à API;
   3. testar bloqueio e desbloqueio pelo painel e confirmar que o relé atua.
4. **Instalar na moto** com o relé no fio da chave (sinal do controlador), nunca no cabo de potência da bateria; com o relé em repouso, a moto deve ficar bloqueada.
5. **Teste na moto parada**, em local fechado: liberar, ligar, bloquear; conferir que o sistema só envia o corte com a moto parada.
6. Confirmar que o **controlador da moto está limitado a 32 km/h**.
