# Rastreador GT06 só com relé (Concox J16) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aceitar rastreadores "só relé" (Concox J16, protocolo GT06 via Traccar) na mesma frota dos rastreadores com controle de velocidade: capacidade no contrato/banco/API, bloqueio que só corta com a moto parada de forma confirmada, zonas em modo aviso, ponte Traccar → MQTT do contrato, ambiente local/dev e proposta de CDK.

**Architecture:** A API ganha uma segunda estratégia de trava (`RelayLockService`, estado no Redis como o `SafeLockService`) escolhida por `Tracker.controlMode`, que o `CommandsService` lê do banco e passa no `CommandRequest`; o fluxo `speed_control` (rampa, `limite_kmh`, F1–F12) não muda. Um processo novo, `services/traccar-bridge`, lê posições/eventos do Traccar (WebSocket + REST) e publica nos **mesmos tópicos MQTT** do contrato, e traduz o delta do shadow em `engineStop`/`engineResume` com uma segunda guarda própria (só corta com posição fresca < 3 km/h). Um emulador GT06 (TCP) dentro da ponte permite testar o caminho J16 → Traccar → ponte → API no dev single (profile `gt06`).

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL 16 (API), Redis, MQTT (`mqtt` 5.10.1), Node 24, Jest 29 + ts-jest, `fast-check` 3.23.2 (novo, devDependency da API), `ws` 8.21.3 (novo na ponte), `pg` 8.13.1, Traccar 6.5 (Docker), Docker Compose (dev single), AWS CDK v2 (proposta), Next.js 14 + Vitest (painel), OpenAPI 3.1 + openapi-typescript + openapi-generator (contrato).

**Spec:** `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md` (aprovada pelo dono em 2026-10-27; é a autoridade — em conflito, vale a spec, e a divergência vai para `docs/decisoes.md`).

## Global Constraints

Do `CLAUDE.md` (RESTRIÇÕES, CONVENÇÕES, DEFINIÇÃO DE PRONTO, DESENVOLVIMENTO LOCAL), copiado sem alteração:

- As motos são equipamentos autopropelidos (Resolução Contran 996/2023): até 1.000 W e até 32 km/h, sem placa e sem CNH. O software nunca pode permitir ultrapassar esses limites.
- Limites por zona: 6 km/h em áreas de pedestres, 20 km/h em ciclovias.
- Segurança física: nunca cortar o motor com a moto em movimento. Bloquear = reduzir a potência gradualmente e travar só abaixo de 3 km/h.
- LGPD: localização é dado pessoal. Rastrear o cliente só durante o aluguel e com consentimento; trajetos expiram após 90 dias; o cliente pode exportar e excluir seus dados.
- Dados de cartão nunca passam pelo backend (só tokens do gateway).
- O contrato em /packages/contracts é a fonte da verdade. Não invente endpoints: se precisar de um novo, proponha a mudança no contrato e registre em /docs/decisoes.md.
- Código e nomes em inglês; textos de interface em português do Brasil.
- Dinheiro em centavos (inteiro); datas em UTC ISO 8601; exibição no fuso America/Sao_Paulo.
- Nenhum segredo no código (Secrets Manager ou variáveis de ambiente).
- Logs estruturados em JSON, sem dados pessoais.
- Compila, lint sem erros, testes passando, README da pasta atualizado.
- Ao terminar, entregue: resumo do que foi feito, como rodar localmente, testes executados e pendências.
- IOT_MODE=local: Mosquitto (docker-compose) imitando os tópicos de shadow do IoT Core ($aws/things/{thingName}/shadow/update[/accepted|/delta|/documents]). IOT_MODE=aws usa o IoT Data Plane.
- Monorepo: pnpm workspaces para os pacotes TypeScript; apps Flutter usam dependências por path.
- Comunicação com o usuário em português do Brasil.

Da spec, copiado sem alteração:

- §1.2 **Bloqueio de rastreador só relé = esperar a moto parar e então cortar.** Não existe rampa.
- §1.3 **Limite por zona (6 e 20 km/h) não é imposto** em rastreador só relé. Vira aviso ao cliente e alerta no painel.
- §1.4 O **limite de 32 km/h** fica garantido pelo **controlador da moto** (configuração física). O software não promete impor esse limite em rastreador só relé.
- §1.5 O fluxo atual (rampa, `limite_kmh`, firmware F1–F12) **continua valendo** para rastreadores com controle de velocidade. As duas lógicas convivem na mesma frota.
- §5 Implementar como estratégia separada, escolhida por `Tracker.controlMode`. **Não** altere o `SafeLockService` atual além do necessário para a escolha da estratégia.
- §5.1 a moto precisa estar **parada de forma confirmada**: pelo menos **2 amostras frescas consecutivas** com `velocidade_kmh < 3`, cobrindo **pelo menos 10 s** entre a primeira e a última; todas fora da graça de reconexão e com as mesmas regras de frescor/ordem já existentes (`IOT_RECONNECT_GRACE_MS`, lacuna, atraso de fila, 10 s de frescor); velocidade desconhecida, velha ou na graça = **em movimento**.
- §5 Teste-chave (invariante): **em nenhuma sequência de amostras o fluxo `relay_only` grava `travada = true` com a última velocidade conhecida ≥ 3 km/h, desconhecida ou dentro da graça.** Use teste baseado em propriedades (sequências aleatórias), além dos casos fixos.
- §6.1 Para a API **nada muda**: mesmos tópicos, mesmos schemas, mesmo shadow.
- §6.2 `velocidade_kmh` ← `position.speed` — **Traccar usa nós: × 1,852**; `timestamp` ← `position.fixTime` (hora da medição, não do servidor).
- §6.5 Porta GT06 exposta só via NLB. API REST do Traccar **não** exposta à internet (só rede interna). Credenciais do Traccar e certificado da ponte em Secrets Manager / variáveis de ambiente. Logs JSON sem dados pessoais e sem IMEI completo (mascarar).
- §11 Compila, lint sem erros, todos os testes existentes passando.

Restrições da execução (do coordenador):

- O PC do dono **não tem Docker**: nada de Postgres/Traccar/Mosquitto locais nos testes. Testes que rodam no PC usam servidores falsos em processo (Traccar falso HTTP+WebSocket, broker MQTT em memória). O e2e com Traccar de verdade roda no dev single da AWS (passos marcados **[CONTROLADOR]** / **[DONO]**).
- Dev single = **t4g.small (2 GiB, arm64)**: a imagem do Traccar tem de ser arm64 e com memória limitada (`mem_limit` + `-Xmx`).
- `deploy/single`: manter o guarda do IMDS (só o container da API, 172.30.0.10, alcança o IMDS; nenhum serviço novo tem IP fixo nem precisa de IMDS) e as allowlists do `render-env.sh` (credenciais do Traccar pelos segredos gerados em `/volti/dev/secrets/*`, listados na allowlist).
- CDK (§8) entra como **proposta**: `cdk synth` + testes de asserção passando; **não** fazer deploy.
- Fluxo `speed_control` existente (`SafeLockService`, rampa, `limite_kmh`, firmware F1–F12) intocado, exceto a escolha da estratégia.

---

## File Structure

**Contrato e documentação (Task 1)**
- Modify `packages/contracts/openapi.yaml` — `TrackerControlMode`, `Vehicle.trackerControlMode`, `CommandStatusReason.unsupported_by_tracker`, `AlertType.zone_speed_exceeded`, descrição do `POST /vehicles/{id}/commands`.
- Modify `packages/contracts/mqtt.md`, `packages/contracts/realtime.md` — seção "Rastreador só relé" e `zone.notice.advisory`.
- Regenerate `packages/contracts/generated/ts/schema.d.ts`, `packages/contracts/generated/dart/**`.
- Modify `docs/decisoes.md`, `docs/adr-rastreador.md`, `CLAUDE.md`.
- Modify `apps/admin/src/lib/labels.ts` (só a chave nova de `ALERT_TYPE`, para o painel continuar compilando).

**Banco (Task 2)**
- Modify `services/api/prisma/schema.prisma`; Create `services/api/prisma/migrations/20261027100000_tracker_control_mode/migration.sql`, `services/api/prisma/migrations/20261027100100_relay_only_enum_values/migration.sql`.
- Modify `services/api/src/modules/vehicles/vehicles.mapper.ts`, `services/api/src/modules/vehicles/vehicles.service.ts` (include do tracker).

**Estratégia `relay_only` na API (Tasks 3–6)**
- Create `services/api/src/modules/iot/relay-lock.store.ts` — estado da trava só-relé (memória e Redis).
- Create `services/api/src/modules/iot/relay-lock.service.ts` — regras §5.
- Modify `services/api/src/ports/iot-gateway.port.ts` — `TrackerControlMode`, `CommandRequest.controlMode`, motivo `unsupported_by_tracker`.
- Modify `services/api/src/common/events.ts` — motivos, `GeofenceTransitionEvent.advisory`, `EV.ZONE_SPEED_EXCEEDED`.
- Modify `services/api/src/modules/iot/base-iot-gateway.ts` — escolha da estratégia, `onTelemetrySample`, `onReconnected`.
- Modify `services/api/src/modules/iot/telemetry.service.ts` — amostra para a trava só-relé, aviso de reconexão, monitor de velocidade por zona.
- Modify `services/api/src/modules/iot/iot.module.ts` — stores e serviços novos.
- Modify `services/api/src/modules/commands/commands.service.ts` — lê `controlMode`, recusa `speed_limit`/`horn`.
- Create `services/api/src/modules/iot/tracker-mode.ts` — `PrismaTrackerModeLookup`.
- Create `services/api/src/modules/iot/geofence/zone-speed-monitor.ts` — alerta `zone_speed_exceeded`.
- Modify `services/api/src/modules/iot/geofence/geofence.service.ts`, `services/api/src/modules/realtime/realtime.gateway.ts`, `services/api/src/modules/alerts/alerts.listeners.ts`.
- Tests: `relay-lock.store.spec.ts`, `relay-lock.service.spec.ts`, `base-iot-gateway.relay.spec.ts`, `relay-lock.property.spec.ts`, `tracker-mode.spec.ts`, `geofence/zone-speed-monitor.spec.ts`, mais casos em `commands.service.spec.ts`, `geofence.service.spec.ts`, `realtime.gateway.spec.ts`, `alerts.listeners.spec.ts`, `vehicles.mapper.spec.ts`.

**Provisionamento (Task 7)**
- Create `services/api/src/cli/provision-gt06.ts` (+ spec); Modify `services/api/scripts/provision-tracker.ts` (`--protocol gt06`).
- Modify `services/iot-sim/src/fleet-source.ts` (não simula `relay_only`).

**Ponte (Tasks 8–11)** — pacote novo `services/traccar-bridge`
- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.js`, `eslint.config.mjs`, `Dockerfile`, `README.md`.
- `src/log.ts`, `src/units.ts`, `src/contract.ts`, `src/traccar/types.ts`, `src/mapping.ts`, `src/delta.ts` (puros, Task 8).
- `src/config.ts`, `src/traccar/rest.ts`, `src/traccar/socket.ts`, `src/registry.ts`, `src/mqtt.ts`, `src/bridge.ts`, `src/main.ts` (Task 9).
- `src/gt06/codec.ts`, `src/gt06/emulator.ts`, `src/gt06/emulator-main.ts`, `src/e2e/check-timeline.ts` (Task 10).
- `test/fake-broker.ts`, `test/fake-traccar.ts`, `test/bridge.int.spec.ts`, `test/e2e/relay-lock.e2e.spec.ts` (Tasks 9 e 11).

**Ambientes (Tasks 12–14)**
- Modify `docker-compose.yml`; Create `infra/postgres/traccar-db.sql`; Create `infra/test/compose-gt06.test.ts`.
- Modify `deploy/single/compose.yml`, `deploy/single/render-env.sh`, `deploy/single/update.sh`, `deploy/single/cloudshell.md`; Create `deploy/single/gt06.sh`; Modify `infra/lib/stacks/single-dev-stack.ts`, `infra/lib/volti-app.ts`, `infra/bin/volti.ts`; Create `infra/test/single-gt06.test.ts`; Modify `infra/test/single-profile.test.ts`, `infra/test/single-profile-imds.test.ts`.
- Create `infra/lib/stacks/traccar-stack.ts`, `infra/test/traccar.test.ts`; Modify `infra/README.md`.

**Painel (Task 15)**
- Create `apps/admin/src/lib/tracker.ts`, `apps/admin/src/components/vehicles/RelayOnlyNotice.tsx`, `apps/admin/tests/tracker-relay.test.tsx`; Modify `apps/admin/src/lib/status.ts`, `apps/admin/src/components/VehicleSheet.tsx`, `apps/admin/src/components/vehicles/VehicleDetailPanel.tsx`.

**Fechamento (Task 16)**
- Modify `.github/workflows/infra.yml`, `infra/test/ci-and-scripts.test.ts`, `services/api/README.md`, `services/iot-sim/README.md`, `docs/decisoes.md` (status final).

## Rulings on spec ambiguities (aplicadas nas tasks; registradas em `docs/decisoes.md` na Task 1)

1. **Só telemetria conta como amostra parada.** A janela "2 amostras < 3 km/h em ≥ 10 s" usa só `motos/{t}/telemetria` aceita pelo `LiveStateStore` (tem hora da medição). `reported.velocidade_kmh` ≥ 3 zera a janela; < 3 nunca conta (não tem hora da medição; a ponte o tira da mesma posição).
2. **A janela começa no início do lock** (amostras anteriores ao comando não contam). O J16 deve ser configurado com intervalo fixo de 5 s (README da ponte).
3. **"Consecutivas"** = nenhuma amostra ≥ 3 km/h (inclusive uma mais velha que chegou atrasada), nenhuma amostra parada mais nova rejeitada (graça, velha, relógio no futuro) e nenhuma reconexão entre elas; amostra parada mais velha que a última vista é ignorada. Sem limite extra de intervalo entre amostras: as regras de lacuna existentes já reabrem a graça.
4. **Prazos:** fase "esperando parar" tem 120 s a partir do início (ou da reconexão, se começou offline); fase "corte enviado" tem 120 s próprios a partir do corte.
5. **`did_not_stop` em `relay_only` encerra a trava** (sem hold de limite 0, sem retomada automática); nada foi enviado ao rastreador.
6. **Redis fora do ar → lock `relay_only` falha (`timeout`) sem enviar nada** (não há trava local degradada como no `speed_control`: sem estado compartilhado não há como provar 2 amostras).
7. **`horn` em `relay_only` também falha com `unsupported_by_tracker`** (o J16 não tem buzina; antes ficaria `confirmed` sem efeito). Painel desabilita o botão.
8. **`unlock` em `relay_only` grava só `travada: false`** (sem `limite_kmh`, que a ponte ignora).
9. **Segunda guarda na ponte:** só envia `engineStop` com o dispositivo online no Traccar, posição válida de até 10 s com velocidade < 3 km/h, sem bit de corte já ativo e sem outro `engineStop` nos últimos 30 s; nunca reaplica `travada: true` vindo do `get` da reconexão.
10. **Telemetria só de posições válidas, não `outdated`, com `fixTime` crescente.** Heartbeats do GT06 (posições `outdated`) só atualizam `blocked`/ignição/sinal e o `reported`.
11. **`vibration` → `movimento_sem_aluguel` só com o bit de corte ativo** (vibração andando não é movimento sem aluguel).
12. **`bateria_pct`:** curva Li-ion por pack (48 V 13S, 60 V 16S, 72 V 20S, 3,0–4,2 V/célula); tensão fora da faixa (ex.: 12 V de um conversor DC-DC) = sem leitura → último valor válido, senão 0.
13. **Emulador GT06 dentro da ponte** (`src/gt06/`), não no `iot-sim`; o `iot-sim` deixa de simular motos com `Tracker.controlMode = relay_only`.
14. **Mapa IMEI → thingName pelo Postgres** com um papel só-leitura por coluna (`volti_bridge`), sem endpoint novo.
15. **`Vehicle.trackerControlMode` sem `Tracker` cadastrado = `speed_control`** (comportamento de hoje).
16. **IoT (aws):** a política da ponte enumera os thingNames `relay_only` passados ao CDK (`-c gt06Things=...`); provisionar um J16 novo em produção exige `cdk deploy` da stack do Traccar. Suposição a validar antes do deploy: shadow clássico funciona para thing não registrada (o script não cria thing para GT06).
17. **Traccar roda em uma única task** (min 0 % / max 100 %): duas instâncias dividiriam as conexões TCP e os comandos.
18. **Alerta `zone_speed_exceeded`:** prioridade `high` em zona ≤ 6 km/h, `medium` acima; episódio guardado no Redis (`geofence:zone-speed:{thing}`); a deduplicação de 10 min do `AlertsService` agrupa repetições.
19. **`zone.notice` em `relay_only`:** mesma mensagem pronta (`message`), com o texto da spec ("Área com limite de X km/h.") e campo aditivo `advisory: true`; o app do cliente já mostra `message`, sem mudança no Flutter.

---
### Task 1: Contrato, decisões e documentação (contract-first)

**Files:**
- Modify: `packages/contracts/openapi.yaml` (componentes `CommandStatusReason` ~linha 5514, `AlertType` ~5600, `Vehicle` ~5880; path `/vehicles/{id}/commands` ~899)
- Modify: `packages/contracts/mqtt.md` (seção nova antes de "## Produção: caminho das mensagens")
- Modify: `packages/contracts/realtime.md` (linhas 64, 74, 77, 98)
- Regenerate: `packages/contracts/generated/ts/schema.d.ts`, `packages/contracts/generated/dart/**`
- Modify: `docs/decisoes.md` (entrada nova no fim), `docs/adr-rastreador.md` (seção nova antes de "## Consequências"), `CLAUDE.md` (RESTRIÇÕES)
- Modify: `apps/admin/src/lib/labels.ts:73-87` (`ALERT_TYPE`)

**Interfaces:**
- Consumes: nada.
- Produces (contrato, usado por todas as tasks seguintes):
  - `components.schemas.TrackerControlMode = 'speed_control' | 'relay_only'`
  - `components.schemas.Vehicle.trackerControlMode?: TrackerControlMode` (staff, `readOnly`)
  - `components.schemas.CommandStatusReason` += `'unsupported_by_tracker'`
  - `components.schemas.AlertType` += `'zone_speed_exceeded'`
  - `zone.notice` (WebSocket) += `advisory?: true`

- [ ] **Step 1: Confirmar o estado de partida do contrato**

Run: `pnpm --filter @volti/contracts lint`
Expected: termina com `Woohoo! Your API description is valid. 🎉` (0 erros, 0 avisos).

- [ ] **Step 2: Editar `openapi.yaml` — enum novo e motivos**

Substituir o bloco `CommandStatusReason` por:

```yaml
    CommandStatusReason:
      type: string
      enum: [offline, timeout, did_not_stop, invalid_limit, locked_by_staff, unsupported_by_tracker]
      description: |
        Motivo do estado do comando (`CommandOutcome.reason` da porta IoT). No WebSocket `command.updated` aparece como `reason`.
        `locked_by_staff`: destravar pedido por cliente ou campo recusado (trava da equipe ou do sistema, limite segurado em 0 ou
        modo roubada); nada é publicado e só admin/operacao desfaz.
        `did_not_stop`: em rastreador `speed_control`, a moto não parou em 120 s e o limite fica segurado em 0; em `relay_only`,
        a moto não parou em 120 s e nenhum corte foi enviado.
        `unsupported_by_tracker`: comando que o rastreador não executa (`speed_limit` e `horn` em `relay_only`); o shadow não é tocado.
    TrackerControlMode:
      type: string
      enum: [speed_control, relay_only]
      description: |
        Capacidade do rastreador. `speed_control` (padrão): limita velocidade e faz o bloqueio seguro com rampa (firmware F1–F12).
        `relay_only` (ex.: Concox J16, protocolo GT06 via Traccar): só rastreia e corta pelo relé — o `lock` espera a moto parar
        (2 telemetrias frescas < 3 km/h cobrindo pelo menos 10 s) e então corta; limites de zona viram aviso ao cliente e alerta
        `zone_speed_exceeded`; o limite de 32 km/h fica com o controlador da moto.
```

Substituir a linha `enum:` de `AlertType` e acrescentar a linha na descrição:

```yaml
    AlertType:
      type: string
      enum: [out_of_operation_area, forbidden_zone_entered, fall_detected, tamper, battery_critical, movement_without_rental, vehicle_offline, command_failed, customer_not_ok, incident_reported, speed_limiter_noncompliant, battery_stock_low, payment_needs_review, zone_speed_exceeded]
      description: |
        `battery_stock_low`: baterias `charged` de um galpão abaixo de `Depot.minChargedBatteries` (um aberto por galpão, `depotId`).
        `payment_needs_review`: pagamento que exige revisão manual do financeiro (liquidação estacionada, estorno recusado em
        `needs_review`, cobrança tardia de assinatura sem estorno automático); `paymentId` aponta o pagamento (um aberto por pagamento).
        `zone_speed_exceeded`: moto com rastreador `relay_only` acima do limite da zona em que está por mais de 5 s (o rastreador não
        reduz a velocidade); repetições da mesma moto em 10 min são agrupadas no mesmo alerta.
```

- [ ] **Step 3: Editar `openapi.yaml` — campo da ficha da moto e descrição do comando**

Em `components.schemas.Vehicle.properties`, logo depois de `trackerId`, inserir:

```yaml
        trackerControlMode:
          $ref: '#/components/schemas/TrackerControlMode'
          readOnly: true
          description: staff. Tipo do rastreador (somente leitura; muda só pelo provisionamento). Sem rastreador cadastrado, `speed_control`.
```

No path `/vehicles/{id}/commands` `post.description`, trocar a linha `` `lock` é sempre bloqueio seguro (rampa de limite até parar; trava abaixo de 3 km/h). `` por:

```yaml
        `lock` é sempre bloqueio seguro: com rastreador `speed_control`, rampa de limite até parar e trava abaixo de 3 km/h; com
        `relay_only`, nada é enviado até a moto estar parada de forma confirmada (2 telemetrias < 3 km/h em pelo menos 10 s) e só
        então o relé corta (`in_progress` enquanto espera; 120 s sem parar → `failed`/`did_not_stop`, nenhum corte enviado).
        `speed_limit` e `horn` em `relay_only` → `failed`/`unsupported_by_tracker`.
```

- [ ] **Step 4: Rodar o lint do contrato**

Run: `pnpm --filter @volti/contracts lint`
Expected: `Woohoo! Your API description is valid. 🎉`

- [ ] **Step 5: `realtime.md` — `zone.notice` e motivos**

Linha 64 (tabela de eventos) passa a ser:

```md
| `zone.notice` | `rental:{id}` | `{ rentalId, zoneType: ZoneType, speedLimitKmh?, transition: 'ENTER' \| 'EXIT', message, advisory? }` |
```

Na linha 74 (`command.updated`), trocar `` (`CommandStatusReason`: `offline`, `timeout`, `did_not_stop`, `invalid_limit`) `` por `` (`CommandStatusReason`: `offline`, `timeout`, `did_not_stop`, `invalid_limit`, `locked_by_staff`, `unsupported_by_tracker`) ``.

No fim do item `zone.notice` (linha 77), acrescentar: `` Moto com rastreador `relay_only` (só relé, não reduz a velocidade): ENTER em `reduced_speed` vem com `advisory: true` e `message` "Área com limite de X km/h." — o limite não é imposto, é aviso. ``

No tipo TS (linha 98), trocar o payload por:

```ts
  'zone.notice': { rentalId: string; zoneType: S['ZoneType']; speedLimitKmh?: number; transition: 'ENTER' | 'EXIT'; message: string; advisory?: true };
```

- [ ] **Step 6: `mqtt.md` — seção do rastreador só relé**

Inserir antes de `## Produção: caminho das mensagens`:

```md
## Rastreadores só relé (`relay_only`, GT06 via Traccar)

Hardware sem controle de velocidade (ex.: Concox J16, protocolo GT06 sobre TCP sem TLS) entra por uma ponte:
`rastreador ──TCP 5023──► Traccar ──WebSocket /api/socket + REST──► services/traccar-bridge ──MQTT──► IoT Core / Mosquitto`.
Tópicos, schemas e shadow são os desta página. A API escolhe a estratégia por `Tracker.controlMode`
(`speed_control` | `relay_only`; no painel, `Vehicle.trackerControlMode`).

| Item | `speed_control` | `relay_only` |
|---|---|---|
| `lock` | rampa de `limite_kmh` e `travada: true` abaixo de 3 km/h | **sem rampa**: espera 2 telemetrias frescas e consecutivas < 3 km/h cobrindo ≥ 10 s (fora da graça, com as mesmas regras de frescor, ordem, lacuna e atraso de fila) e grava `travada: true` **uma única vez**; a ponte manda `engineStop` |
| sem parar em 120 s | `failed`/`did_not_stop`, limite 0 segurado | `failed`/`did_not_stop`, **nenhum corte enviado**, nada segurado |
| corte sem confirmação em 120 s | `failed`/`timeout`, desired `travada: false` + `limite_kmh: 0` | `failed`/`timeout`, desired `travada: false` (a ponte não reenvia o corte) |
| moto offline | `pending`/`offline`, rampa ao reconectar | `pending`/`offline`; ao reconectar, exige amostras novas (fora da graça) |
| `unlock` | `travada: false` + limite da zona | `travada: false` → `engineResume`; confirma por `reported.travada = false` em 30 s |
| `speed_limit`, `horn` | normais | `failed`/`unsupported_by_tracker`, shadow intocado |
| `stolen_mode` | `modo_roubada` | aceito; a ponte ecoa `reported.modo_roubada` (sem mudança de telemetria no GT06) |
| zona `reduced_speed` | ENTER grava `limite_kmh` | **aviso**: `zone.notice` "Área com limite de X km/h." (`advisory: true`); acima do limite por mais de 5 s → alerta `zone_speed_exceeded` |
| 32 km/h | firmware + controlador | só o controlador da moto (configuração física) |

O que a ponte faz (detalhes em `services/traccar-bridge/README.md`):
- telemetria só de posição válida e não `outdated`, com `fixTime` crescente: `velocidade_kmh = speed (nós) × 1,852`,
  `timestamp = fixTime` (hora da medição), `travada ← attributes.blocked`, `ignicao ← attributes.ignition`,
  `sinal ← attributes.rssi` (0–4 ou 0–31 → 0–5), `bateria_pct ← attributes.power` (curva aproximada por pack);
- eventos: `powerCut` → `violacao`, `lowBattery`/`lowPower` → `bateria_critica`, `vibration` com o corte ativo ou deslocamento
  > 20 m travada → `movimento_sem_aluguel`; outros alarmes são descartados com log;
- delta `travada: true` → `engineStop` **só** com o dispositivo online, posição de até 10 s com velocidade < 3 km/h e sem corte
  já ativo (segunda guarda); `travada: false` → `engineResume`; `limite_kmh` nunca vira comando (reported `limite_kmh: 32` fixo);
- `reported.travada` vem do bit `blocked` da primeira posição **depois** do comando, nunca do aceite do comando;
- reconexão (`deviceOnline`): presença `connected` (modo local), `reported` completo e `shadow/get`; do delta pendente só
  `travada: false` é reaplicado (um `travada: true` pendente nunca: a API recomeça o fluxo com amostras novas);
- `motos/{t}/comandos` (`buzina`) é ignorado com log.
```

- [ ] **Step 7: `docs/adr-rastreador.md` — decisão do dono e riscos**

Inserir antes de `## Consequências`:

```md
## Atualização 2026-10-27: rastreadores só relé (GT06) aceitos

Decisão do dono (spec `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`): o hardware do piloto é o
Concox J16 4G (GT06, TCP sem TLS, só relé). Rastreadores `relay_only` são aceitos com **rastreamento e bloqueio/liberação**:
o bloqueio espera a moto parar de forma confirmada e então corta (sem rampa); limites de zona viram aviso e alerta; os 32 km/h
ficam com o controlador da moto. A frase "o hardware não atende o requisito de rampa e não pode ser homologado" acima vale para
`speed_control`; `relay_only` segue a spec. A ponte é o serviço `services/traccar-bridge` (Traccar em ECS/NLB na proposta de CDK,
Traccar em container no dev single).

Riscos conhecidos (spec §12):
- **Janela residual:** entre a última amostra parada e a chegada do `engineStop`, a moto pode voltar a andar. A exigência de
  2 amostras em 10 s e a segunda guarda da ponte reduzem, mas não eliminam. Em produção, avaliar hardware com controle de velocidade.
- **Sem limite por zona imposto:** responsabilidade do condutor; refletir nos termos de uso (validar com jurídico).
- **32 km/h depende do controlador da moto:** verificar e documentar por modelo.
- **GT06 sem TLS:** exige APN privada em produção.
- **`bateria_pct` aproximado** (pela tensão; sem leitura se o J16 for alimentado por conversor DC-DC).
- **Comando enfileirado pelo Traccar:** se o dispositivo cair entre a checagem da ponte e o envio, o Traccar guarda o `engineStop`
  e o entrega na reconexão, em qualquer velocidade. A ponte só envia com o dispositivo online e registra `engine_stop_queued`
  (nível erro) quando o Traccar responde 202; verificar na bancada se o J16 recusa o corte acima de alguma velocidade.
```

- [ ] **Step 8: `CLAUDE.md` — linha nova em RESTRIÇÕES**

Logo depois da linha `- Segurança física: nunca cortar o motor com a moto em movimento. Bloquear = reduzir a potência gradualmente e travar só abaixo de 3 km/h.`, inserir:

```md
- Rampa de bloqueio, `limite_kmh` e limites por zona valem para rastreadores com controle de velocidade (`speed_control`). Rastreadores só relé (`relay_only`, ex.: GT06/Concox J16) seguem `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`: o corte só sai com a moto parada de forma confirmada, limites de zona viram aviso, e os 32 km/h ficam com o controlador da moto.
```

- [ ] **Step 9: `docs/decisoes.md` — entrada nova**

Acrescentar no fim:

```md
## 2026-10-27 · rastreador GT06 só com relé (Concox J16) — contrato, API, ponte Traccar (branch `feat/tracker-gt06-relay-only`, plano `2026-10-27-volti-rastreador-gt06-relay-only`) · status: proposta aplicada (contrato aditivo)

Spec aprovada pelo dono: `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`. Decisão do dono (spec §1):
rastreadores "só relé" são aceitos (rastreamento + bloqueio/liberação); bloqueio = esperar parar e cortar, sem rampa; limites de
zona não impostos (aviso + alerta); 32 km/h pelo controlador; o fluxo atual (rampa, `limite_kmh`, F1–F12) continua para
`speed_control`.

Contrato (aditivo):
1. `TrackerControlMode` (`speed_control` | `relay_only`) e `Vehicle.trackerControlMode` (staff, somente leitura; sem `Tracker`
   cadastrado = `speed_control`).
2. `CommandStatusReason.unsupported_by_tracker`: `speed_limit` **e `horn`** em `relay_only` falham sem tocar no shadow (o J16 não
   tem buzina; antes o `horn` ficaria `confirmed` sem efeito).
3. `AlertType.zone_speed_exceeded`: `relay_only` acima do limite da zona por mais de 5 s; prioridade `high` em zona ≤ 6 km/h,
   `medium` acima; a deduplicação de 10 min por moto agrupa repetições.
4. `did_not_stop` em `relay_only`: "a moto não parou em 120 s; nenhum corte foi enviado".
5. WebSocket `zone.notice` ganha `advisory?: true` (aditivo); `message` traz "Área com limite de X km/h." O app do cliente já mostra
   `message`; nenhuma mudança no Flutter.

Regras de implementação escolhidas onde a spec não decide (cada uma com teste):
6. Só telemetria aceita (hora da medição) conta como amostra parada; `reported.velocidade_kmh` ≥ 3 zera a janela, < 3 não conta.
7. A janela de 2 amostras/10 s começa no início do lock; "consecutivas" = sem amostra ≥ 3 (inclusive fora de ordem), sem amostra
   parada mais nova rejeitada e sem reconexão entre elas. O J16 deve mandar posição a cada 5 s fixos.
8. Prazos: 120 s para parar (desde o início ou a reconexão) e 120 s próprios para confirmar o corte. `did_not_stop` encerra a trava
   sem hold. Redis fora do ar → lock `relay_only` falha (`timeout`) sem enviar nada.
9. `unlock` em `relay_only` grava só `travada: false`.
10. A ponte só envia `engineStop` com o dispositivo online, posição de até 10 s abaixo de 3 km/h, sem corte ativo e sem outro
    `engineStop` nos últimos 30 s; nunca reaplica `travada: true` do `get` da reconexão. Telemetria só de posições válidas e não
    `outdated`; `vibration` vira `movimento_sem_aluguel` só com o corte ativo; `bateria_pct` por curva Li-ion (fora da faixa = último
    valor válido, senão 0).
11. Mapa IMEI → thingName lido do Postgres por um papel só-leitura (`volti_bridge`, GRANT por coluna em `Tracker`), sem endpoint novo.
12. Emulador GT06 dentro da ponte; o `iot-sim` deixa de simular motos `relay_only`.
13. CDK como proposta (sem deploy): Traccar em uma task Fargate ARM64 atrás de NLB TCP 5023, REST só para a ponte; a política IoT
    da ponte enumera os thingNames `relay_only` de `-c gt06Things=...`. Suposição a validar no primeiro deploy: shadow clássico de
    thing não registrada (o provisionamento GT06 não cria thing nem certificado).
14. Dev single: profile `gt06` ligado por `/volti/dev/config/GT06=on`; segredos gerados `TRACCAR_DB_PASSWORD`,
    `TRACCAR_ADMIN_PASSWORD`, `TRACCAR_BRIDGE_PASSWORD`, `BRIDGE_DB_PASSWORD` (allowlist); REST do Traccar só em 127.0.0.1; porta
    5023 publicada mas fechada no security group até `-c gt06Port=true`.

Riscos (spec §12) registrados em `docs/adr-rastreador.md`.
```

- [ ] **Step 10: Regenerar os clientes**

Run: `pnpm --filter @volti/contracts generate`
Expected: termina sem `Falhou`; `git status --short packages/contracts/generated` mostra `schema.d.ts` e arquivos Dart alterados (entre eles `lib/src/model/tracker_control_mode.dart`, `command_status_reason.dart`, `alert_type.dart`, `vehicle.dart`).

Run: `pnpm --filter @volti/contracts generate:dart`
Expected: termina sem `Falhou`; `git status --short packages/contracts/generated/dart` não ganha nada além do passo anterior (Dart em dia).

Run: `pnpm --filter @volti/contracts typecheck`
Expected: sai com código 0, sem saída de erro.

- [ ] **Step 11: Manter o painel compilando (chave nova de `ALERT_TYPE`)**

Run: `pnpm --filter admin lint`
Expected: FAIL com `Property 'zone_speed_exceeded' is missing in type` em `src/lib/labels.ts`.

Em `apps/admin/src/lib/labels.ts`, no objeto `ALERT_TYPE`, depois de `payment_needs_review`, acrescentar:

```ts
  zone_speed_exceeded: ['Acima do limite da zona (rastreador só relé)', 'Gauge'],
```

Run: `pnpm --filter admin lint`
Expected: sem erros (`✔ No ESLint warnings or errors` e `tsc` sem saída).

- [ ] **Step 12: Commit**

```bash
git add packages/contracts docs/decisoes.md docs/adr-rastreador.md CLAUDE.md apps/admin/src/lib/labels.ts
git commit -m "feat(contracts): rastreador só relé (TrackerControlMode, unsupported_by_tracker, zone_speed_exceeded)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Banco — `Tracker.controlMode`, `protocol`, IMEI único e enums novos

**Files:**
- Modify: `services/api/prisma/schema.prisma` (enums `CommandStatusReason` ~linha 91, `AlertType` ~232; `model Tracker` ~582)
- Create: `services/api/prisma/migrations/20261027100000_tracker_control_mode/migration.sql`
- Create: `services/api/prisma/migrations/20261027100100_relay_only_enum_values/migration.sql`
- Modify: `services/api/src/modules/vehicles/vehicles.mapper.ts:45` (tipo `VehicleRow`) e o `toVehicle` (bloco staff)
- Modify: `services/api/src/modules/vehicles/vehicles.service.ts:27` (`VEHICLE_INCLUDE`) e a assinatura de `enrich` (~linha 67)
- Test: `services/api/src/modules/vehicles/vehicles.mapper.spec.ts`

**Interfaces:**
- Consumes: contrato da Task 1 (`TrackerControlMode`).
- Produces:
  - Prisma: `enum TrackerControlMode { speed_control relay_only }`; `Tracker.controlMode TrackerControlMode @default(speed_control)`, `Tracker.protocol String?`, `Tracker.imei String? @unique`; `CommandStatusReason.unsupported_by_tracker`; `AlertType.zone_speed_exceeded`.
  - `toVehicle(...)` (staff) devolve `trackerControlMode: 'speed_control' | 'relay_only'`.

- [ ] **Step 1: Teste do mapper (falha)**

Acrescentar em `vehicles.mapper.spec.ts`:

```ts
describe('trackerControlMode (spec GT06 §3.2)', () => {
  it('staff vê o tipo do rastreador; sem Tracker cadastrado = speed_control', () => {
    expect(toVehicle(row({ tracker: { id: 't1', controlMode: 'relay_only' } }), { staff: true, now: NOW }).trackerControlMode).toBe('relay_only');
    expect(toVehicle(row({ tracker: { id: 't1', controlMode: 'speed_control' } }), { staff: true, now: NOW }).trackerControlMode).toBe('speed_control');
    expect(toVehicle(row({ tracker: null }), { staff: true, now: NOW }).trackerControlMode).toBe('speed_control');
  });

  it('cliente nunca recebe o tipo do rastreador', () => {
    expect(toVehicle(row({ tracker: { id: 't1', controlMode: 'relay_only' } }), { staff: false, now: NOW })).not.toHaveProperty('trackerControlMode');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api test -- vehicles.mapper.spec`
Expected: FAIL — `expect(received).toBe(expected) ... Received: undefined`.

- [ ] **Step 3: Schema Prisma**

Em `enum CommandStatusReason`, acrescentar `unsupported_by_tracker` depois de `locked_by_staff`. Em `enum AlertType`, acrescentar no fim:

```prisma
  /// Moto com rastreador `relay_only` acima do limite da zona por mais de 5 s (spec GT06 §10).
  zone_speed_exceeded
```

Acrescentar o enum (junto dos enums do contrato):

```prisma
/// Capacidade do rastreador (spec GT06 §3.1). `relay_only` = só rastreia e corta pelo relé (GT06/Concox J16 via Traccar).
enum TrackerControlMode {
  speed_control
  relay_only
}
```

Substituir `model Tracker` por:

```prisma
model Tracker {
  id              String             @id @default(uuid()) @db.Uuid
  vehicleId       String?            @unique @db.Uuid
  vehicle         Vehicle?           @relation(fields: [vehicleId], references: [id])
  thingName       String             @unique
  /// Chave do GT06 no Traccar (uniqueId); obrigatório em `relay_only` (CHECK na migração). Único quando preenchido.
  imei            String?            @unique
  firmwareVersion String?
  certificateArn  String?
  /// `speed_control` (padrão, comportamento de sempre) ou `relay_only` (spec GT06).
  controlMode     TrackerControlMode @default(speed_control)
  /// Protocolo de chegada quando não é MQTT direto (ex.: `gt06`).
  protocol        String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}
```

- [ ] **Step 4: Migrações**

`services/api/prisma/migrations/20261027100000_tracker_control_mode/migration.sql`:

```sql
-- Rastreador só relé (spec 2026-10-27, GT06/Concox J16): capacidade, protocolo e IMEI único.
CREATE TYPE "TrackerControlMode" AS ENUM ('speed_control', 'relay_only');
ALTER TABLE "Tracker" ADD COLUMN "controlMode" "TrackerControlMode" NOT NULL DEFAULT 'speed_control';
ALTER TABLE "Tracker" ADD COLUMN "protocol" TEXT;
-- Único quando preenchido (o Postgres aceita vários NULL num índice único).
CREATE UNIQUE INDEX "Tracker_imei_key" ON "Tracker"("imei");
-- relay_only exige IMEI: é a chave do dispositivo no Traccar.
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_relay_only_imei" CHECK ("controlMode" <> 'relay_only' OR "imei" IS NOT NULL);
```

`services/api/prisma/migrations/20261027100100_relay_only_enum_values/migration.sql`:

```sql
-- Valores novos de enum em migração própria (o Postgres não deixa usar um valor recém-adicionado na mesma transação).
ALTER TYPE "CommandStatusReason" ADD VALUE IF NOT EXISTS 'unsupported_by_tracker';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'zone_speed_exceeded';
```

- [ ] **Step 5: Validar o schema e gerar o client (sem banco)**

Run: `pnpm --filter api exec prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

Run: `pnpm --filter api exec prisma generate`
Expected: `✔ Generated Prisma Client`.

(As migrações rodam de verdade no dev single, pelo `update.sh` — Task 13.)

- [ ] **Step 6: Mapper e include**

Em `vehicles.mapper.ts`, trocar o tipo:

```ts
type VehicleRow = Vehicle & { tracker?: { id: string; controlMode?: TrackerControlMode } | null; vehicleModel?: VehicleModelRef | null };
```

com `import type { TrackerControlMode, Vehicle } from '@prisma/client';` (ajustando o import existente de `Vehicle`). No objeto do ramo staff de `toVehicle`, logo depois de `trackerId: v.tracker?.id,`:

```ts
    trackerControlMode: v.tracker?.controlMode ?? 'speed_control',
```

Em `vehicles.service.ts`, `VEHICLE_INCLUDE` passa a ser:

```ts
const VEHICLE_INCLUDE = { tracker: { select: { id: true, controlMode: true } }, vehicleModel: { select: VEHICLE_MODEL_SELECT } } as const;
```

e o genérico de `enrich` passa a aceitar o campo novo:

```ts
  private async enrich<T extends Vehicle & { tracker?: { id: string; controlMode?: TrackerControlMode } | null }>(rows: T[], staff: boolean, currentRental?: Map<string, string>, viewerCustomerId?: string) {
```

(com `TrackerControlMode` importado de `@prisma/client`).

- [ ] **Step 7: Rodar testes e lint da API**

Run: `pnpm --filter api test -- vehicles`
Expected: PASS (todos os specs de `src/modules/vehicles`).

Run: `pnpm --filter api lint`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add services/api/prisma services/api/src/modules/vehicles
git commit -m "feat(api): Tracker.controlMode/protocol, IMEI único e trackerControlMode na ficha da moto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Estratégia `relay_only` — estado e regras (`RelayLockService`)

**Files:**
- Create: `services/api/src/modules/iot/relay-lock.store.ts`
- Create: `services/api/src/modules/iot/relay-lock.service.ts`
- Test: `services/api/src/modules/iot/relay-lock.store.spec.ts`, `services/api/src/modules/iot/relay-lock.service.spec.ts`

**Interfaces:**
- Consumes (existentes): `Clock`, `TimerHandle`, `FakeClock` (`./clock`); `SPEED_FRESH_MS` (`./live-state.store`, 10 000); `SAFE_LOCK_SPEED_KMH` (`../../common/enums`, 3); `OutcomeSink`, `ReportedTimestamps` (`./safe-lock.service`); `CommandOutcome`, `CommandRequest` (`../../ports/iot-gateway.port`); `DesiredState`, `ReportedState` (`./shadow-transport`); `LocalMutex`, `RedisMutex`, `outsideLock` (`../../redis/redis-mutex`); `RedisStore`, `MemoryRedisStore` (`../../redis/redis-store`).
- Produces:
  - `type RelayLockPhase = 'waiting_online' | 'waiting_stop' | 'cutting'`
  - `interface RelayStillRun { firstAt: number; lastAt: number; count: number }`
  - `interface RelayLockState { id: string; thingName: string; commandIds: string[]; phase: RelayLockPhase; run?: RelayStillRun; newestDeviceTs?: number; startedAt?: number; deadlineAt?: number; cutAt?: number }`
  - `interface OrphanRelayLock { thingName: string; lockId: string; phase: RelayLockPhase; commandIds: string[] }`
  - `interface RelayLockStore { get; put; remove(thingName, lockId); scan(): Promise<{ active: string[]; orphans: OrphanRelayLock[] }>; clearOrphan(thingName, lockId); withLock<T>(thingName, fn) }`, `class MemoryRelayLockStore`, `class RedisRelayLockStore(redis: RedisStore, prefix = 'iot:relay-lock')`
  - `RELAY_STOP_TIMEOUT_MS = 120_000`, `RELAY_CONFIRM_TIMEOUT_MS = 120_000`, `RELAY_STILL_MIN_SAMPLES = 2`, `RELAY_STILL_MIN_SPAN_MS = 10_000`
  - `interface RelaySample { kmh: number; deviceTs: number; measuredAt: number; accepted: boolean }`
  - `interface RelayLockVehicleState { online: boolean }` (a trava só-relé nunca confirma pelo estado ao vivo — só por `reported.travada = true` da ponte)
  - `interface RelayLockOptions { knownSpeed(thingName): number | null; store?; stopTimeoutMs?; confirmTimeoutMs?; probe?(thingName): Promise<RelayLockVehicleState | null>; onLocalActivity?(thingName); onError?(entry) }`
  - `function stillConfirmed(run: RelayStillRun | undefined, now: number): boolean`
  - `class RelayLockService(clock: Clock, transport: { updateDesired(thingName: string, desired: DesiredState): Promise<void> }, sink: OutcomeSink, opts: RelayLockOptions)` com `isActive(t): boolean`, `start(req, state): Promise<CommandOutcome>`, `onSample(t, s: RelaySample)`, `onReported(t, reported: ReportedState, at?: ReportedTimestamps)`, `onReconnected(t)`, `onConnectivity(t, online, state: RelayLockVehicleState)`, `cancel(t)`, `sweep()`.

- [ ] **Step 1: Testes do store (falham)**

`services/api/src/modules/iot/relay-lock.store.spec.ts`:

```ts
import { MemoryRedisStore } from '../../redis/redis-store';
import { MemoryRelayLockStore, RedisRelayLockStore, type RelayLockState, type RelayLockStore } from './relay-lock.store';

const state = (over: Partial<RelayLockState> = {}): RelayLockState => ({ id: 'l1', thingName: 'moto-0901', commandIds: ['c1'], phase: 'waiting_stop', ...over });

describe.each<[string, () => RelayLockStore]>([
  ['memória', () => new MemoryRelayLockStore()],
  ['Redis', () => new RedisRelayLockStore(new MemoryRedisStore())],
])('RelayLockStore (%s)', (_name, make) => {
  it('put/get devolve uma cópia; remove só a trava com o mesmo id', async () => {
    const s = make();
    const st = state();
    await s.put(st);
    st.commandIds.push('mutado-depois');
    expect(await s.get('moto-0901')).toEqual(state());
    await s.remove('moto-0901', 'outra');
    expect(await s.get('moto-0901')).not.toBeNull();
    await s.remove('moto-0901', 'l1');
    expect(await s.get('moto-0901')).toBeNull();
    expect((await s.scan()).active).toEqual([]);
  });

  it('scan lista as travas ativas', async () => {
    const s = make();
    await s.put(state());
    await s.put(state({ id: 'l2', thingName: 'moto-0902' }));
    expect((await s.scan()).active.sort()).toEqual(['moto-0901', 'moto-0902']);
  });

  it('withLock serializa por moto', async () => {
    const s = make();
    const order: string[] = [];
    await Promise.all([
      s.withLock('moto-0901', async () => { order.push('a1'); await new Promise((r) => setTimeout(r, 5)); order.push('a2'); }),
      s.withLock('moto-0901', async () => { order.push('b1'); }),
    ]);
    expect(order).toEqual(['a1', 'a2', 'b1']);
  });
});

describe('RedisRelayLockStore órfãs', () => {
  it('estado sumiu e o índice ficou → órfã com fase e comandos; clearOrphan tira do índice', async () => {
    const redis = new MemoryRedisStore();
    const s = new RedisRelayLockStore(redis);
    await s.put(state({ phase: 'cutting', commandIds: ['c1', 'c2'] }));
    await redis.del('iot:relay-lock:moto-0901');
    expect(await s.scan()).toEqual({ active: [], orphans: [{ thingName: 'moto-0901', lockId: 'l1', phase: 'cutting', commandIds: ['c1', 'c2'] }] });
    await s.clearOrphan('moto-0901', 'l1');
    expect(await s.scan()).toEqual({ active: [], orphans: [] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api test -- relay-lock.store`
Expected: FAIL — `Cannot find module './relay-lock.store'`.

- [ ] **Step 3: Implementar o store**

`services/api/src/modules/iot/relay-lock.store.ts`:

```ts
import { LocalMutex, outsideLock, RedisMutex } from '../../redis/redis-mutex';
import type { RedisStore } from '../../redis/redis-store';

export type RelayLockPhase = 'waiting_online' | 'waiting_stop' | 'cutting';

/** Sequência de telemetrias paradas (< 3 km/h) aceitas e consecutivas; `firstAt`/`lastAt` = hora da medição limitada a agora. */
export interface RelayStillRun {
  firstAt: number;
  lastAt: number;
  count: number;
}

/**
 * Trava de rastreador só relé (spec GT06 §5). Tudo o que decide o próximo passo fica aqui (Redis em produção), para outra
 * instância — ou a mesma depois de um deploy — continuar: prazos são horários absolutos; timers locais só antecipam a varredura.
 */
export interface RelayLockState {
  id: string;
  thingName: string;
  commandIds: string[];
  phase: RelayLockPhase;
  run?: RelayStillRun;
  /** Maior `timestamp` bruto (relógio do rastreador) visto desde o início/última reconexão: amostra mais velha é ignorada. */
  newestDeviceTs?: number;
  /** Início da espera (fase `waiting_stop`): `reported.travada` mais antigo não confirma. */
  startedAt?: number;
  deadlineAt?: number;
  /** Quando `travada: true` foi gravado (fase `cutting`). */
  cutAt?: number;
}

/** No índice sem estado (failover que perdeu escritas): a varredura encerra os comandos e, se o corte saiu, grava `travada: false`. */
export interface OrphanRelayLock {
  thingName: string;
  lockId: string;
  phase: RelayLockPhase;
  commandIds: string[];
}

export interface RelayLockStore {
  get(thingName: string): Promise<RelayLockState | null>;
  put(state: RelayLockState): Promise<void>;
  /** Remove só se a trava guardada ainda for `lockId`. */
  remove(thingName: string, lockId: string): Promise<void>;
  scan(): Promise<{ active: string[]; orphans: OrphanRelayLock[] }>;
  /** Tira a órfã do índice (só se a entrada ainda for `lockId` e não houver estado). */
  clearOrphan(thingName: string, lockId: string): Promise<void>;
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T>;
}

export { outsideLock };

const clone = (s: RelayLockState): RelayLockState => JSON.parse(JSON.stringify(s)) as RelayLockState;

/** Um processo (testes). Guarda cópias, como o Redis: mexer no objeto devolvido não muda o guardado. */
export class MemoryRelayLockStore implements RelayLockStore {
  private readonly states = new Map<string, RelayLockState>();
  private readonly mutex = new LocalMutex();

  async get(thingName: string) {
    const s = this.states.get(thingName);
    return s ? clone(s) : null;
  }
  async put(state: RelayLockState) {
    this.states.set(state.thingName, clone(state));
  }
  async remove(thingName: string, lockId: string) {
    if (this.states.get(thingName)?.id === lockId) this.states.delete(thingName);
  }
  async scan() {
    return { active: [...this.states.keys()], orphans: [] as OrphanRelayLock[] };
  }
  async clearOrphan() {}
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(thingName, fn);
  }
}

/**
 * Redis (várias instâncias): estado em `iot:relay-lock:{thing}` (JSON, sem TTL; só o fim da trava apaga), índice
 * `iot:relay-lock:index` (hash thing → { lockId, phase, commandIds }) gravado junto, e lock por moto `iot:relay-lock:lock:{thing}`.
 * Erro do Redis propaga: quem chama não publica nada (falha fechada — nunca corta sem estado).
 */
export class RedisRelayLockStore implements RelayLockStore {
  private readonly mutex: RedisMutex;

  constructor(
    private readonly redis: RedisStore,
    private readonly prefix = 'iot:relay-lock',
  ) {
    this.mutex = new RedisMutex(redis, { ttlMs: 15_000, waitMs: 5_000 });
  }

  private key(thingName: string) {
    return `${this.prefix}:${thingName}`;
  }
  private get index() {
    return `${this.prefix}:index`;
  }

  async get(thingName: string): Promise<RelayLockState | null> {
    const raw = await this.redis.get(this.key(thingName));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RelayLockState;
    } catch {
      return null;
    }
  }

  async put(state: RelayLockState): Promise<void> {
    const entry = JSON.stringify({ lockId: state.id, phase: state.phase, commandIds: state.commandIds });
    await this.redis.setWithIndex(this.key(state.thingName), JSON.stringify(state), this.index, state.thingName, entry);
  }

  async remove(thingName: string, lockId: string): Promise<void> {
    const cur = await this.get(thingName);
    if (cur && cur.id !== lockId) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  async scan(): Promise<{ active: string[]; orphans: OrphanRelayLock[] }> {
    const entries = await this.redis.hgetall(this.index);
    const active: string[] = [];
    const orphans: OrphanRelayLock[] = [];
    for (const [thingName, raw] of Object.entries(entries)) {
      if (await this.redis.exists(this.key(thingName))) {
        active.push(thingName);
        continue;
      }
      try {
        const e = JSON.parse(raw) as { lockId: string; phase: RelayLockPhase; commandIds?: string[] };
        orphans.push({ thingName, lockId: e.lockId, phase: e.phase, commandIds: e.commandIds ?? [] });
      } catch {
        orphans.push({ thingName, lockId: '', phase: 'cutting', commandIds: [] }); // ilegível: trata como a pior fase
      }
    }
    return { active, orphans };
  }

  async clearOrphan(thingName: string, lockId: string): Promise<void> {
    if (await this.redis.exists(this.key(thingName))) return;
    const raw = (await this.redis.hgetall(this.index))[thingName];
    if (raw === undefined) return;
    let current = '';
    try {
      current = (JSON.parse(raw) as { lockId?: string }).lockId ?? '';
    } catch {
      current = '';
    }
    if (current !== lockId) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(`${this.prefix}:lock:${thingName}`, fn);
  }
}
```

- [ ] **Step 4: Rodar o teste do store**

Run: `pnpm --filter api test -- relay-lock.store`
Expected: PASS (7 testes).

- [ ] **Step 5: Testes do serviço (falham)**

`services/api/src/modules/iot/relay-lock.service.spec.ts`:

```ts
import type { CommandOutcome } from '../../ports/iot-gateway.port';
import { FakeClock } from './clock';
import { RelayLockService, stillConfirmed, type RelaySample } from './relay-lock.service';
import { MemoryRelayLockStore } from './relay-lock.store';
import type { DesiredState } from './shadow-transport';

const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');

function setup(opts: { online?: boolean } = {}) {
  const clock = new FakeClock(T0);
  const desired: Array<{ at: number; desired: DesiredState }> = [];
  const outcomes: CommandOutcome[] = [];
  const known = new Map<string, number | null>();
  const transport = { updateDesired: async (_t: string, d: DesiredState) => void desired.push({ at: clock.now(), desired: d }) };
  const store = new MemoryRelayLockStore();
  const svc = new RelayLockService(clock, transport, (o) => outcomes.push(o), { store, knownSpeed: (t) => known.get(t) ?? null });
  const state = { online: opts.online ?? true };
  /** Telemetria aceita pelo LiveStateStore medida agora (o gateway só manda `accepted: true` quando ela é fresca e fora da graça). */
  const sample = async (kmh: number, over: Partial<RelaySample> = {}) => {
    const s: RelaySample = { kmh, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true, ...over };
    if (s.accepted) known.set(T, kmh);
    await svc.onSample(T, s);
  };
  const cuts = () => desired.filter((d) => d.desired.travada === true);
  return { clock, desired, outcomes, known, svc, store, state, sample, cuts };
}

describe('stillConfirmed', () => {
  it('exige 2 amostras, 10 s entre a primeira e a última e a última fresca (≤ 10 s)', () => {
    expect(stillConfirmed(undefined, 0)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 1 }, 10_000)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 9_999, count: 3 }, 9_999)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 10_000)).toBe(true);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 20_000)).toBe(true);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 20_001)).toBe(false);
  });
});

describe('RelayLockService (spec GT06 §5)', () => {
  it('online e andando → in_progress e nada publicado; só corta com 2 amostras paradas cobrindo 10 s, uma única vez', async () => {
    const s = setup();
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.sample(18);
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(1.5);
    expect(s.desired).toEqual([]); // 2 amostras, mas só 5 s entre elas
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    expect(s.desired).toEqual([{ at: T0 + 15_000, desired: { travada: true } }]); // nunca limite_kmh (sem rampa)
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra ≥ 3 no meio zera a janela', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(3); // exatamente 3 = em movimento
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra mais nova rejeitada (graça, velha, relógio no futuro) zera; amostra mais velha é ignorada', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0, { accepted: false }); // ex.: dentro da graça
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.sample(0, { deviceTs: s.clock.now() - 60_000, measuredAt: s.clock.now() - 60_000, accepted: false }); // parada reordenada: ignorada
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra em movimento fora de ordem (medida entre as paradas, chegou atrasada) também zera a sequência', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(12, { deviceTs: s.clock.now() - 3_000, measuredAt: s.clock.now() - 3_000, accepted: false });
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('reconexão entre as amostras zera a janela', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.onReconnected(T);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('velocidade conhecida desconhecida ou ≥ 3 no instante da decisão → não corta', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    s.known.set(T, null);
    await s.svc.onSample(T, { kmh: 0, deviceTs: s.clock.now(), measuredAt: s.clock.now(), accepted: true });
    expect(s.cuts()).toEqual([]);
    s.known.set(T, 4);
    await s.clock.advance(1_000);
    await s.svc.onSample(T, { kmh: 0, deviceTs: s.clock.now(), measuredAt: s.clock.now(), accepted: true });
    expect(s.cuts()).toEqual([]);
  });

  it('reported.velocidade_kmh ≥ 3 zera; reported < 3 não conta como amostra parada', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.onReported(T, { velocidade_kmh: 12 });
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.svc.onReported(T, { velocidade_kmh: 0 });
    expect(s.cuts()).toEqual([]);
  });

  it('120 s sem parar → failed/did_not_stop e nenhum corte enviado', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    for (let i = 0; i < 24; i++) {
      await s.sample(15);
      await s.clock.advance(5_000);
    }
    await s.clock.advance(1_000);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'did_not_stop' }]);
    expect(s.desired).toEqual([]);
    expect(s.svc.isActive(T)).toBe(false);
  });

  it('corte confirmado por reported.travada = true não mais antigo que o corte', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    const cutAt = s.clock.now();
    await s.svc.onReported(T, { travada: true }, { travada: cutAt - 5_000 }); // anterior ao corte: não vale
    expect(s.outcomes).toEqual([]);
    await s.clock.advance(2_000);
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('corte sem confirmação em 120 s → failed/timeout e desired travada:false', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    await s.clock.advance(120_000);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
    expect(s.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
  });

  it('offline → pending/offline e nada publicado; ao reconectar recomeça e exige amostras novas', async () => {
    const s = setup({ online: false });
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    await s.sample(0); // amostra com a trava ainda esperando a moto: não conta
    await s.clock.advance(10_000);
    await s.svc.onConnectivity(T, true, { online: true });
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('nunca confirma pelo estado ao vivo: espera; reported.travada = true da ponte (moto já cortada) confirma sem publicar', async () => {
    const s = setup();
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.clock.advance(1_000);
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(s.desired).toEqual([]);
  });

  it('segundo lock entra na mesma trava; cancel encerra os dois como failed sem publicar', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    expect(await s.svc.start({ commandId: 'c2', thingName: T }, s.state)).toEqual({ commandId: 'c2', status: 'in_progress' });
    await s.svc.cancel(T);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed' }, { commandId: 'c2', status: 'failed' }]);
    expect(s.desired).toEqual([]);
  });

  it('órfã na fase de corte (estado perdido) → desired travada:false e comandos failed/timeout', async () => {
    const clock = new FakeClock(T0);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const store = new MemoryRelayLockStore();
    jest.spyOn(store, 'scan').mockResolvedValue({ active: [], orphans: [{ thingName: T, lockId: 'l1', phase: 'cutting', commandIds: ['c1'] }] });
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), { store, knownSpeed: () => null });
    await svc.sweep();
    expect(desired).toEqual([{ travada: false }]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter api test -- relay-lock.service`
Expected: FAIL — `Cannot find module './relay-lock.service'`.

- [ ] **Step 7: Implementar o serviço**

`services/api/src/modules/iot/relay-lock.service.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { SAFE_LOCK_SPEED_KMH } from '../../common/enums';
import type { CommandOutcome, CommandRequest } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import { SPEED_FRESH_MS } from './live-state.store';
import { MemoryRelayLockStore, outsideLock, type OrphanRelayLock, type RelayLockState, type RelayLockStore, type RelayStillRun } from './relay-lock.store';
import type { OutcomeSink, ReportedTimestamps } from './safe-lock.service';
import type { DesiredState, ReportedState } from './shadow-transport';

/** Prazo para a moto parar (desde o início da espera). */
export const RELAY_STOP_TIMEOUT_MS = 120_000;
/** Prazo para o rastreador confirmar o corte (desde a gravação de `travada: true`). */
export const RELAY_CONFIRM_TIMEOUT_MS = 120_000;
export const RELAY_STILL_MIN_SAMPLES = 2;
export const RELAY_STILL_MIN_SPAN_MS = 10_000;

/** Telemetria vista pelo `TelemetryService`: `accepted` = o `LiveStateStore` aceitou a velocidade (fresca, em ordem, fora da graça). */
export interface RelaySample {
  kmh: number;
  /** `timestamp` bruto do rastreador (ms). */
  deviceTs: number;
  /** Hora da medição limitada a agora (ms). */
  measuredAt: number;
  accepted: boolean;
}

/** Só a conectividade: o estado ao vivo da trava (`locked`) pode ser o padrão de uma moto ainda sem dados — nunca confirma. */
export interface RelayLockVehicleState {
  online: boolean;
}

export interface RelayLockOptions {
  /** Velocidade fresca do `LiveStateStore` (`null` = desconhecida): última conferência antes de gravar o corte. */
  knownSpeed: (thingName: string) => number | null;
  store?: RelayLockStore;
  stopTimeoutMs?: number;
  confirmTimeoutMs?: number;
  /** Estado relido (Redis) pela varredura: começa a espera de uma trava `waiting_online` cuja reconexão outra instância viu. */
  probe?: (thingName: string) => Promise<RelayLockVehicleState | null>;
  onLocalActivity?: (thingName: string) => void;
  onError?: (entry: Record<string, unknown>) => void;
}

/** Parada confirmada (spec §5.1): ≥ 2 amostras paradas consecutivas, ≥ 10 s entre a primeira e a última, a última fresca. */
export function stillConfirmed(run: RelayStillRun | undefined, now: number): boolean {
  if (!run || run.count < RELAY_STILL_MIN_SAMPLES) return false;
  if (run.lastAt - run.firstAt < RELAY_STILL_MIN_SPAN_MS) return false;
  return now - run.lastAt <= SPEED_FRESH_MS;
}

/**
 * Bloqueio de rastreador só relé (spec GT06 §5): não existe rampa. Enquanto a moto não estiver parada de forma confirmada, o
 * comando fica `in_progress` e nada é enviado; confirmada a parada, grava `desired.travada = true` uma única vez (a ponte manda
 * `engineStop`) e espera `reported.travada = true`. 120 s sem parar → `did_not_stop` sem corte; corte sem confirmação em 120 s →
 * `timeout` e `desired.travada = false`. Offline → `pending`; ao reconectar, recomeça (amostras novas, fora da graça).
 *
 * Invariante (testes fixos e de propriedade): `travada: true` só é gravado com a sequência parada confirmada e a velocidade
 * fresca conhecida < 3 km/h no instante da gravação.
 */
export class RelayLockService {
  private readonly store: RelayLockStore;
  private readonly local = new Set<string>();
  private readonly timers = new Map<string, { lockId: string; handle: TimerHandle }>();

  constructor(
    private readonly clock: Clock,
    private readonly transport: { updateDesired(thingName: string, desired: DesiredState): Promise<void> },
    private readonly sink: OutcomeSink,
    private readonly opts: RelayLockOptions,
  ) {
    this.store = opts.store ?? new MemoryRelayLockStore();
  }

  /** Trava conhecida por esta instância (síncrono; o gateway liga o polling do shadow no modo aws). */
  isActive(thingName: string): boolean {
    return this.local.has(thingName);
  }

  private async exists(thingName: string): Promise<boolean> {
    return this.local.has(thingName) || (await this.store.get(thingName)) !== null;
  }

  async start(req: CommandRequest, state: RelayLockVehicleState): Promise<CommandOutcome> {
    return this.store.withLock(req.thingName, async () => {
      const existing = await this.store.get(req.thingName);
      if (existing) {
        existing.commandIds.push(req.commandId);
        await this.save(existing);
        return existing.phase === 'waiting_online'
          ? { commandId: req.commandId, status: 'pending', reason: 'offline' }
          : { commandId: req.commandId, status: 'in_progress' };
      }
      const lock: RelayLockState = { id: randomUUID(), thingName: req.thingName, commandIds: [req.commandId], phase: 'waiting_online' };
      if (!state.online) {
        await this.save(lock);
        return { commandId: req.commandId, status: 'pending', reason: 'offline' };
      }
      await this.begin(lock);
      return { commandId: req.commandId, status: 'in_progress' };
    });
  }

  /** Toda telemetria da moto (aceita ou não). Só a fase `waiting_stop` usa. */
  async onSample(thingName: string, s: RelaySample): Promise<void> {
    if (!Number.isFinite(s.kmh) || !Number.isFinite(s.deviceTs) || !Number.isFinite(s.measuredAt)) return;
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || lock.phase !== 'waiting_stop') return;
      if (!(s.kmh < SAFE_LOCK_SPEED_KMH)) {
        // Em movimento — inclusive fora de ordem (medida entre as paradas e chegada atrasada): a sequência parada recomeça.
        lock.run = undefined;
        if (lock.newestDeviceTs === undefined || s.deviceTs > lock.newestDeviceTs) lock.newestDeviceTs = s.deviceTs;
        await this.save(lock);
        return;
      }
      if (lock.newestDeviceTs !== undefined && s.deviceTs <= lock.newestDeviceTs) return; // parada mais velha ou repetida: ignorada
      lock.newestDeviceTs = s.deviceTs;
      if (!s.accepted) {
        // Parada mas rejeitada (na graça, velha, relógio no futuro) = em movimento para a trava: a sequência recomeça.
        lock.run = undefined;
        await this.save(lock);
        return;
      }
      lock.run = lock.run ? { firstAt: lock.run.firstAt, lastAt: s.measuredAt, count: lock.run.count + 1 } : { firstAt: s.measuredAt, lastAt: s.measuredAt, count: 1 };
      await this.save(lock);
      await this.tryCut(lock);
    });
  }

  /** `reported` (velocidade já filtrada pelo gateway): ≥ 3 km/h zera a sequência; `travada: true` confirma. */
  async onReported(thingName: string, reported: ReportedState, at: ReportedTimestamps = {}): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || lock.phase === 'waiting_online') return;
      if (reported.travada === true) {
        const since = Math.floor((lock.cutAt ?? lock.startedAt ?? 0) / 1000) * 1000;
        if ((at.travada ?? this.clock.now()) >= since) {
          await this.finish(lock, { status: 'confirmed' });
          return;
        }
      }
      if (lock.phase === 'waiting_stop' && reported.velocidade_kmh !== undefined && !(reported.velocidade_kmh < SAFE_LOCK_SPEED_KMH) && lock.run) {
        lock.run = undefined;
        await this.save(lock);
      }
    });
  }

  /** Reconexão percebida (presença, lacuna, atraso de fila, volta de offline): a sequência parada e a ordem recomeçam. */
  async onReconnected(thingName: string): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || (lock.run === undefined && lock.newestDeviceTs === undefined)) return;
      lock.run = undefined;
      lock.newestDeviceTs = undefined;
      await this.save(lock);
    });
  }

  async onConnectivity(thingName: string, online: boolean, state: RelayLockVehicleState): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock) return;
      if (!online) {
        if (lock.phase === 'waiting_stop' && (lock.run || lock.newestDeviceTs !== undefined)) {
          lock.run = undefined;
          lock.newestDeviceTs = undefined;
          await this.save(lock);
        }
        return;
      }
      if (lock.phase !== 'waiting_online' || !state.online) return;
      await this.begin(lock);
    });
  }

  /** Destravar/comando conflitante: encerra a trava; os locks em curso terminam `failed`. Nada é publicado aqui. */
  async cancel(thingName: string): Promise<void> {
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (lock) await this.finish(lock, { status: 'failed' });
    });
  }

  /** Varredura (a cada ~1 s, todas as instâncias): prazos vencidos, esperas `waiting_online` reconectadas em outra instância, órfãs. */
  async sweep(): Promise<void> {
    const { active, orphans } = await this.store.scan();
    const set = new Set(active);
    for (const thingName of [...this.local]) if (!set.has(thingName)) this.forget(thingName);
    for (const thingName of active) {
      if (!this.local.has(thingName)) {
        this.local.add(thingName);
        this.opts.onLocalActivity?.(thingName);
      }
      await this.tick(thingName, true);
    }
    for (const orphan of orphans) await this.recoverOrphan(orphan);
  }

  private async tick(thingName: string, fromSweep = false): Promise<void> {
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock) return;
      if (lock.deadlineAt !== undefined && lock.deadlineAt <= this.clock.now()) {
        await this.onDeadline(lock);
        return;
      }
      if (fromSweep && lock.phase === 'waiting_online' && this.opts.probe) {
        const state = await this.opts.probe(thingName);
        if (state?.online) await this.begin(lock);
      }
    });
  }

  private async begin(lock: RelayLockState): Promise<void> {
    const now = this.clock.now();
    lock.phase = 'waiting_stop';
    lock.startedAt = now;
    lock.run = undefined;
    lock.newestDeviceTs = undefined;
    lock.deadlineAt = now + (this.opts.stopTimeoutMs ?? RELAY_STOP_TIMEOUT_MS);
    await this.save(lock);
    this.schedule(lock);
  }

  /** Grava o estado `cutting` **antes** de publicar: nenhuma outra instância grava o corte de novo. */
  private async tryCut(lock: RelayLockState): Promise<void> {
    const now = this.clock.now();
    if (!stillConfirmed(lock.run, now)) return;
    const speed = this.opts.knownSpeed(lock.thingName);
    if (speed === null || !(speed < SAFE_LOCK_SPEED_KMH)) return;
    lock.phase = 'cutting';
    lock.cutAt = now;
    lock.run = undefined;
    lock.deadlineAt = now + (this.opts.confirmTimeoutMs ?? RELAY_CONFIRM_TIMEOUT_MS);
    await this.save(lock);
    this.schedule(lock);
    await this.transport.updateDesired(lock.thingName, { travada: true });
  }

  private async onDeadline(lock: RelayLockState): Promise<void> {
    if (lock.phase === 'waiting_stop') {
      await this.finish(lock, { status: 'failed', reason: 'did_not_stop' });
      return;
    }
    if (lock.phase !== 'cutting') return;
    // Corte enviado e não confirmado: o desired volta a `travada: false` (a ponte não reenvia o corte ao reconectar). Se a
    // publicação falhar, o estado fica e a próxima varredura tenta de novo (o desfecho sai uma vez só).
    const commands = lock.commandIds;
    lock.commandIds = [];
    try {
      await this.transport.updateDesired(lock.thingName, { travada: false });
    } catch (err) {
      this.opts.onError?.({ msg: 'relay_lock_uncut_failed', thingName: lock.thingName, error: (err as Error).message });
      await this.save(lock);
      this.emit(commands, { status: 'failed', reason: 'timeout' });
      return;
    }
    await this.store.remove(lock.thingName, lock.id);
    this.forget(lock.thingName);
    this.emit(commands, { status: 'failed', reason: 'timeout' });
  }

  private async recoverOrphan(orphan: OrphanRelayLock): Promise<void> {
    await this.store.withLock(orphan.thingName, async () => {
      if ((await this.store.get(orphan.thingName)) !== null) return;
      this.opts.onError?.({ msg: 'relay_lock_state_lost', thingName: orphan.thingName, phase: orphan.phase, commands: orphan.commandIds.length });
      if (orphan.phase === 'cutting') {
        try {
          await this.transport.updateDesired(orphan.thingName, { travada: false });
        } catch (err) {
          this.opts.onError?.({ msg: 'relay_lock_uncut_failed', thingName: orphan.thingName, error: (err as Error).message });
          return; // fica no índice: a próxima varredura tenta de novo
        }
      }
      await this.store.clearOrphan(orphan.thingName, orphan.lockId);
      this.forget(orphan.thingName);
      this.emit(orphan.commandIds, { status: 'failed', reason: 'timeout' });
    });
  }

  private schedule(lock: RelayLockState): void {
    if (lock.deadlineAt === undefined) return;
    const prev = this.timers.get(lock.thingName);
    if (prev) this.clock.clearTimeout(prev.handle);
    const thingName = lock.thingName;
    const handle = this.clock.setTimeout(() => outsideLock(() => this.tick(thingName).catch(() => undefined)), Math.max(0, lock.deadlineAt - this.clock.now()));
    this.timers.set(thingName, { lockId: lock.id, handle });
  }

  private async save(lock: RelayLockState): Promise<void> {
    await this.store.put(lock);
    if (!this.local.has(lock.thingName)) {
      this.local.add(lock.thingName);
      this.opts.onLocalActivity?.(lock.thingName);
    }
  }

  private forget(thingName: string): void {
    const t = this.timers.get(thingName);
    if (t) this.clock.clearTimeout(t.handle);
    this.timers.delete(thingName);
    if (this.local.delete(thingName)) this.opts.onLocalActivity?.(thingName);
  }

  private async finish(lock: RelayLockState, outcome: Omit<CommandOutcome, 'commandId'>): Promise<void> {
    await this.store.remove(lock.thingName, lock.id);
    this.forget(lock.thingName);
    this.emit(lock.commandIds, outcome);
  }

  /** Fora da reentrância do lock: quem recebe o desfecho pode mandar outro comando para a mesma moto. */
  private emit(commandIds: string[], outcome: Omit<CommandOutcome, 'commandId'>): void {
    if (!commandIds.length) return;
    outsideLock(() => {
      for (const commandId of commandIds) this.sink({ commandId, ...outcome });
    });
  }
}
```

- [ ] **Step 8: Rodar os testes**

Run: `pnpm --filter api test -- relay-lock`
Expected: PASS (store + serviço, 22 testes).

- [ ] **Step 9: Lint**

Run: `pnpm --filter api lint`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add services/api/src/modules/iot/relay-lock.store.ts services/api/src/modules/iot/relay-lock.service.ts services/api/src/modules/iot/relay-lock.store.spec.ts services/api/src/modules/iot/relay-lock.service.spec.ts
git commit -m "feat(api): estratégia de trava relay_only (espera parar e corta uma vez, sem rampa)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Escolha da estratégia — porta IoT, gateway, telemetria e comandos

**Files:**
- Modify: `services/api/src/ports/iot-gateway.port.ts`
- Modify: `services/api/src/common/events.ts` (`IotCommandUpdatedEvent.reason`, `CommandChangedEvent.reason`)
- Modify: `services/api/src/modules/iot/base-iot-gateway.ts`
- Modify: `services/api/src/modules/iot/telemetry.service.ts`
- Modify: `services/api/src/modules/iot/iot.module.ts:54`
- Modify: `services/api/src/modules/commands/commands.service.ts:91-174`
- Test: `services/api/src/modules/iot/base-iot-gateway.relay.spec.ts` (novo), `services/api/src/modules/commands/commands.service.spec.ts` (casos novos)
- Modify: `services/api/README.md` (seção IoT)

**Interfaces:**
- Consumes (Task 3): `RelayLockService`, `RelaySample`, `RelayLockStore`, `RedisRelayLockStore`.
- Produces:
  - `iot-gateway.port.ts`: `export type TrackerControlMode = 'speed_control' | 'relay_only'`; `CommandRequest.controlMode?: TrackerControlMode` (ausente = `speed_control`); `CommandOutcome.reason` += `'unsupported_by_tracker'`; `export type CommandFailureReason = NonNullable<CommandOutcome['reason']>`.
  - `GatewayOptions` += `relayLockStore?: RelayLockStore; relayStopTimeoutMs?: number; relayConfirmTimeoutMs?: number`.
  - `BaseIotGateway.relayLock: RelayLockService`; `BaseIotGateway.onTelemetrySample(thingName: string, sample: RelaySample): Promise<void>`; `BaseIotGateway.onReconnected(thingName: string): Promise<void>`.
  - `CommandsService.dispatch` passa `controlMode: 'relay_only'` no `CommandRequest` quando `vehicle.tracker.controlMode === 'relay_only'` e responde `failed`/`unsupported_by_tracker` a `speed_limit`/`horn` sem chamar o gateway.

- [ ] **Step 1: Teste do gateway com a estratégia só-relé (falha)**

`services/api/src/modules/iot/base-iot-gateway.relay.spec.ts`:

```ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

class FakeTransport implements IotTransport {
  readonly desired: Array<{ at: number; desired: DesiredState }> = [];
  readonly commands: MomentaryCommand[] = [];
  constructor(private readonly clock: FakeClock) {}
  async updateDesired(_t: string, desired: DesiredState) {
    this.desired.push({ at: this.clock.now(), desired });
  }
  async publishCommand(_t: string, command: MomentaryCommand) {
    this.commands.push(command);
  }
  async start() {}
  async stop() {}
}
class TestGateway extends BaseIotGateway {}

const T = 'moto-0901';
const VEHICLE_ID = '99999999-9999-4999-8999-999999999999';

function setup() {
  const clock = new FakeClock(Date.parse('2026-10-27T12:00:00Z'));
  const transport = new FakeTransport(clock);
  const events = new EventEmitter2();
  const updates: IotCommandUpdatedEvent[] = [];
  events.on(EV.IOT_COMMAND_UPDATED, (e: IotCommandUpdatedEvent) => updates.push(e));
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: VEHICLE_ID }) }, trackPoint: { create: async () => ({}) } };
  const svc = new TelemetryService(gw, { onPosition: async () => undefined }, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  const sample = (kmh: number, over: Record<string, unknown> = {}) =>
    svc.telemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: kmh, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(clock.now()).toISOString(), ...over });
  const cuts = () => transport.desired.filter((d) => d.desired.travada === true);
  return { clock, transport, events, updates, live, gw, svc, sample, cuts };
}
type Setup = ReturnType<typeof setup>;

/** Conecta (presença) e passa a graça de 10 s andando (telemetria a cada 5 s). Termina em T0+15 s. */
async function online(s: Setup, kmh = 20): Promise<void> {
  await s.svc.presence(T, true);
  for (let i = 0; i < 3; i++) {
    await s.sample(kmh);
    await s.clock.advance(5_000);
  }
}

/** Lock `relay_only` pela porta IoT; a chamada responde depois de `confirmWaitMs` (3 s). */
async function lockRelay(s: Setup, commandId = 'c1') {
  const p = s.gw.lock({ commandId, thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' });
  await s.clock.advance(3_000);
  return p;
}

describe('BaseIotGateway com rastreador relay_only (spec GT06 §5)', () => {
  it('andando → in_progress e nada publicado (sem rampa); corta uma vez depois de 2 telemetrias paradas em 10 s; reported confirma', async () => {
    const s = setup();
    await online(s);
    expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.sample(20);
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.transport.desired).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    await s.gw.onReported(T, { travada: true });
    await s.clock.advance(1_000);
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
  });

  it('120 s sem parar → failed/did_not_stop e nenhum desired (nem limite_kmh)', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    for (let i = 0; i < 25; i++) {
      await s.sample(15);
      await s.clock.advance(5_000);
    }
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed', reason: 'did_not_stop' });
    expect(s.transport.desired).toEqual([]);
  });

  it('reconexão (presença) no meio: graça de 10 s e a sequência parada recomeça', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.presence(T, true);
    for (let i = 0; i < 4; i++) {
      await s.sample(0);
      await s.clock.advance(5_000);
    }
    expect(s.cuts()).toEqual([]);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('telemetria velha (> 10 s) no meio é "em movimento": zera a sequência', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0, { timestamp: new Date(s.clock.now() - 1).toISOString() });
    await s.clock.advance(5_000);
    await s.sample(0, { timestamp: new Date(s.clock.now() - 11_000).toISOString() });
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('moto offline → pending/offline; reconectada, só corta depois da graça e de 2 amostras paradas novas', async () => {
    const s = setup();
    expect(await s.gw.lock({ commandId: 'c1', thingName: T, controlMode: 'relay_only' })).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    await s.svc.presence(T, true);
    for (let i = 0; i < 4; i++) {
      await s.sample(0);
      await s.clock.advance(5_000);
    }
    expect(s.cuts()).toEqual([]);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('corte sem confirmação em 120 s → failed/timeout e desired travada:false', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    for (let i = 0; i < 25; i++) await s.clock.advance(5_000);
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed', reason: 'timeout' });
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
  });

  it('speed_limit e horn → failed/unsupported_by_tracker sem publicar nada', async () => {
    const s = setup();
    await online(s);
    expect(await s.gw.setSpeedLimit({ commandId: 'c1', thingName: T, controlMode: 'relay_only' }, 6)).toEqual({ commandId: 'c1', status: 'failed', reason: 'unsupported_by_tracker' });
    expect(await s.gw.horn({ commandId: 'c2', thingName: T, controlMode: 'relay_only' })).toEqual({ commandId: 'c2', status: 'failed', reason: 'unsupported_by_tracker' });
    expect(s.transport.desired).toEqual([]);
    expect(s.transport.commands).toEqual([]);
  });

  it('unlock (staff) → só travada:false (sem limite_kmh) e cancela a trava em curso; confirma por reported.travada=false', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    const p = s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' });
    await s.clock.advance(10);
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }]);
    await s.gw.onReported(T, { travada: false });
    expect(await p).toEqual({ commandId: 'u1', status: 'confirmed' });
    await s.clock.advance(1_000); // EMIT_GRACE_MS do desfecho do lock cancelado
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed' });
  });

  it('unlock de cliente depois de lock da equipe → locked_by_staff, nada publicado (autoridade inalterada)', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    expect(await s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'customer', controlMode: 'relay_only' })).toEqual({ commandId: 'u1', status: 'failed', reason: 'locked_by_staff' });
    expect(s.transport.desired).toEqual([]);
  });

  it('stolen_mode é aceito (desired modo_roubada) e não corta', async () => {
    const s = setup();
    await online(s);
    const p = s.gw.setStolenMode({ commandId: 's1', thingName: T, controlMode: 'relay_only' }, true);
    await s.gw.onReported(T, { modo_roubada: true });
    expect(await p).toEqual({ commandId: 's1', status: 'confirmed' });
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ modo_roubada: true }]);
  });

  it('sem controlMode o lock continua sendo a rampa (speed_control intocado)', async () => {
    const s = setup();
    await online(s);
    void s.gw.lock({ commandId: 'c1', thingName: T, authority: 'staff', lockOrigin: 'staff' });
    await s.clock.advance(10);
    expect(s.transport.desired[0].desired).toEqual({ limite_kmh: 15 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api test -- base-iot-gateway.relay`
Expected: FAIL — erro de tipo `Object literal may only specify known properties, and 'controlMode' does not exist in type 'CommandRequest'` (ts-jest) ou asserções falhando.

- [ ] **Step 3: Porta IoT e eventos**

Em `services/api/src/ports/iot-gateway.port.ts`, depois de `LockOrigin`:

```ts
/** Capacidade do rastreador (spec GT06): `relay_only` só rastreia e corta pelo relé — sem rampa nem limite de velocidade. */
export type TrackerControlMode = 'speed_control' | 'relay_only';
```

Em `CommandRequest`, acrescentar:

```ts
  /** Estratégia do rastreador, lida do `Tracker` pelo `CommandsService`. Ausente = `speed_control` (comportamento de sempre). */
  controlMode?: TrackerControlMode;
```

Em `CommandOutcome.reason`:

```ts
  /**
   * `locked_by_staff`: unlock de cliente/campo recusado (trava de equipe/sistema, hold em 0 ou modo roubada).
   * `unsupported_by_tracker`: `speed_limit`/`horn` em rastreador `relay_only` (nada é publicado).
   */
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit' | 'locked_by_staff' | 'unsupported_by_tracker';
```

e, no fim do arquivo:

```ts
export type CommandFailureReason = NonNullable<CommandOutcome['reason']>;
```

Em `services/api/src/common/events.ts`, importar `import type { CommandFailureReason } from '../ports/iot-gateway.port';` e trocar as duas uniões literais de `reason` (`IotCommandUpdatedEvent` e `CommandChangedEvent`) por `reason?: CommandFailureReason;`.

- [ ] **Step 4: Gateway — construção e roteamento**

Em `base-iot-gateway.ts`, imports novos:

```ts
import { RelayLockService, type RelaySample } from './relay-lock.service';
import type { RelayLockStore } from './relay-lock.store';
```

`GatewayOptions` ganha:

```ts
  /** Estado das travas de rastreadores só relé (produção: Redis; padrão: memória). */
  relayLockStore?: RelayLockStore;
  relayStopTimeoutMs?: number;
  relayConfirmTimeoutMs?: number;
```

Campo novo, junto de `safeLockLocal`:

```ts
  /** Trava de rastreador só relé (spec GT06 §5): sem rampa; corta uma vez com a moto parada de forma confirmada. */
  readonly relayLock: RelayLockService;
```

No fim do construtor (depois de criar `safeLockLocal`):

```ts
    this.relayLock = new RelayLockService(clock, { updateDesired: (t, d) => this.publishDesired(t, d) }, (o) => this.settle(o), {
      knownSpeed: (t) => this.live.knownSpeed(t),
      store: opts.relayLockStore,
      stopTimeoutMs: opts.relayStopTimeoutMs,
      confirmTimeoutMs: opts.relayConfirmTimeoutMs,
      probe: async (t) => {
        await this.live.refresh(t);
        return { online: this.live.isOnline(t) };
      },
      onLocalActivity: (t) => this.watch(t),
      onError: (entry) => this.logger.error(entry),
    });
```

Em `sweepSafeLock()`, antes de `await this.safeLock.sweep();`:

```ts
    await this.relayLock.sweep().catch((err: Error) => this.logger.error({ msg: 'relay_lock_sweep_failed', error: err.message }));
```

Em `lock()`, logo depois de `this.supersede(req.thingName, ['travada']);`:

```ts
    if (req.controlMode === 'relay_only') return this.lockRelayOnly(req);
```

Método novo (depois de `lock`):

```ts
  /** Rastreador só relé: espera a moto parar de forma confirmada e só então grava `travada: true` (sem rampa, sem limite). */
  private async lockRelayOnly(req: CommandRequest): Promise<CommandOutcome> {
    await this.live.load(req.thingName);
    const online = this.live.isOnline(req.thingName);
    const wait = this.registerWaiter(req.commandId);
    let initial: CommandOutcome;
    try {
      initial = await this.relayLock.start(req, { online });
    } catch (err) {
      // Redis fora do ar: sem estado compartilhado não há como provar 2 amostras paradas — falha sem enviar nada.
      this.waiters.delete(req.commandId);
      throw err;
    }
    this.watch(req.thingName);
    if (initial.status !== 'in_progress') {
      this.waiters.delete(req.commandId);
      if (initial.status === 'pending') this.returnedAt.set(req.commandId, this.clock.now());
      return initial;
    }
    return wait();
  }
```

Em `unlock()`, logo depois de `await this.safeLock.cancel(req.thingName);`:

```ts
    await this.relayLock.cancel(req.thingName);
```

e, logo depois de `await this.live.setHeld(req.thingName, false);`:

```ts
    // Só relé: não há limite a restaurar (a ponte ignora `limite_kmh`); `engineResume` pela ponte, confirmado pelo reported.
    if (req.controlMode === 'relay_only') return this.desiredCommand(req, { travada: false });
```

Primeira linha de `setSpeedLimit()` e de `horn()`:

```ts
    if (req.controlMode === 'relay_only') return { commandId: req.commandId, status: 'failed', reason: 'unsupported_by_tracker' };
```

Em `onReported()`, depois da linha `await this.safeLock.onReported(...)`:

```ts
    await this.relayLock.onReported(thingName, forLock, meta.timestamps ?? {}).catch((err: Error) => this.logger.error({ msg: 'relay_lock_reported_failed', thingName, error: err.message }));
```

Em `onConnectivity()`, logo depois de `const s = await this.live.setOnline(thingName, online);` (antes do `if (!online) return;`):

```ts
    await this.relayLock.onConnectivity(thingName, online, { online }).catch((err: Error) => this.logger.error({ msg: 'relay_lock_connectivity_failed', thingName, error: err.message }));
```

Métodos novos (depois de `onSpeed`):

```ts
  /** Toda telemetria, aceita ou não, para a trava só-relé (a rejeitada mais nova zera a sequência parada). */
  async onTelemetrySample(thingName: string, sample: RelaySample): Promise<void> {
    await this.relayLock.onSample(thingName, sample);
  }

  /** Reconexão percebida pelo `TelemetryService` (presença, volta de offline, lacuna, atraso de fila). */
  async onReconnected(thingName: string): Promise<void> {
    await this.relayLock.onReconnected(thingName);
  }
```

Em `isWatching()`, a primeira linha passa a ser:

```ts
    if (this.safeLock.isActive(thingName) || this.safeLockLocal.isActive(thingName) || this.relayLock.isActive(thingName)) return true;
```

- [ ] **Step 5: `TelemetryService` — amostras e reconexões**

Em `telemetry.service.ts`, método novo (depois de `drained`):

```ts
  /** Reconexão: a velocidade e a ordem recomeçam no estado ao vivo e a sequência parada da trava só-relé também. */
  private async reconnect(thingName: string, opts?: { keepDisplayOrder?: boolean }): Promise<void> {
    if (opts) this.gateway.live.markReconnected(thingName, opts);
    else this.gateway.live.markReconnected(thingName);
    await this.gateway.onReconnected(thingName).catch((err: Error) => this.logger.error({ msg: 'relay_lock_reconnect_failed', thingName, error: err.message }));
  }
```

Trocar as quatro chamadas `this.gateway.live.markReconnected(...)` por `await this.reconnect(...)` com os mesmos argumentos (`telemetry`: `{ keepDisplayOrder: wasOnline }`; `deviceEvent`, `reported` (dois pontos) e `presence`: sem opções).

Em `telemetry()`, logo depois do bloco `if (applied.speedAccepted) { ... }`:

```ts
      // Rastreador só relé (spec GT06 §5): toda telemetria vai para a trava; só a aceita (fresca, em ordem, fora da graça) conta parada.
      await this.gateway
        .onTelemetrySample(thingName, { kmh: msg.velocidade_kmh, deviceTs, measuredAt: Math.min(deviceTs, now), accepted: applied.speedAccepted })
        .catch((err: Error) => this.logger.error({ msg: 'relay_lock_sample_failed', thingName, error: err.message }));
```

- [ ] **Step 6: Módulo — store do Redis**

Em `iot.module.ts`, `import { RedisRelayLockStore } from './relay-lock.store';` e a linha das opções passa a ser:

```ts
        const opts = { confirmWaitMs: cfg.confirmWaitMs, commandTimeoutMs: cfg.commandTimeoutMs, safeLockStore: new RedisSafeLockStore(redis), relayLockStore: new RedisRelayLockStore(redis) };
```

- [ ] **Step 7: Rodar o teste do gateway**

Run: `pnpm --filter api test -- base-iot-gateway.relay`
Expected: PASS (11 testes).

- [ ] **Step 8: Casos novos no `CommandsService` (falham)**

Em `commands.service.spec.ts`, dentro de `describe('CommandsService.dispatch', ...)`, acrescentar:

```ts
    describe('rastreador relay_only (spec GT06 §3.3)', () => {
      const relayVehicle = { ...vehicle, tracker: { controlMode: 'relay_only' } };
      const system = { system: true as const, name: 'rental-end' };

      it.each([
        ['speed_limit', { speedLimitKmh: 6 }],
        ['horn', {}],
      ])('%s → failed/unsupported_by_tracker sem chamar o gateway', async (type, extra) => {
        h.prisma.vehicle.findUnique.mockResolvedValue(relayVehicle as any);
        const out = await service.dispatch({ vehicleId: VEHICLE_ID, type: type as any, reason: 'Teste relé', actor: operator, ...extra });
        expect(out).toMatchObject({ status: 'failed', statusReason: 'unsupported_by_tracker' });
        expect(iot.setSpeedLimit).not.toHaveBeenCalled();
        expect(iot.horn).not.toHaveBeenCalled();
      });

      it('lock (inclusive o do fim do aluguel) leva controlMode relay_only ao gateway', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue(relayVehicle as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Encerramento do aluguel', actor: system, context: { rentalId: 'r1', purpose: 'rental_end' } });
        expect(iot.lock).toHaveBeenCalledWith(expect.objectContaining({ thingName: 'moto-0001', controlMode: 'relay_only', authority: 'system', lockOrigin: null }));
      });

      it('sem Tracker (ou speed_control) o pedido não leva controlMode (comportamento de sempre)', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, tracker: { controlMode: 'speed_control' } } as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio manual', actor: operator });
        expect(iot.lock.mock.calls[0][0]).not.toHaveProperty('controlMode');
      });
    });
```

Run: `pnpm --filter api test -- commands.service`
Expected: FAIL — `statusReason` diferente de `unsupported_by_tracker` e `controlMode` ausente.

- [ ] **Step 9: `CommandsService`**

Em `dispatch()`, a leitura da moto passa a incluir o rastreador:

```ts
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: input.vehicleId }, include: { tracker: { select: { controlMode: true } } } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    const controlMode = vehicle.tracker?.controlMode ?? 'speed_control';
```

E o cálculo do desfecho:

```ts
    const authority = authorityOf(input.actor);
    // Rastreador só relé (spec GT06 §3.3): sem limite de velocidade nem buzina — recusado sem tocar no shadow.
    const unsupported = controlMode === 'relay_only' && (input.type === 'speed_limit' || input.type === 'horn');
    const outcome: CommandOutcome = unsupported
      ? { commandId: command.id, status: 'failed', reason: 'unsupported_by_tracker' }
      : input.type === 'unlock' && authority !== 'staff' && vehicle.stolenMode
        ? { commandId: command.id, status: 'failed', reason: 'locked_by_staff' }
        : await this.callGateway(command.id, vehicle.thingName, input, authority, controlMode);
```

`callGateway` ganha o parâmetro e só põe o campo quando for só relé:

```ts
  private async callGateway(commandId: string, thingName: string, input: DispatchInput, authority: CommandAuthority, controlMode: TrackerControlMode): Promise<CommandOutcome> {
    const req: CommandRequest = { commandId, thingName, authority };
    if (controlMode === 'relay_only') req.controlMode = 'relay_only';
```

(com `type TrackerControlMode` no import de `../../ports/iot-gateway.port`).

- [ ] **Step 10: Rodar a suíte da API e o lint**

Run: `pnpm --filter api test`
Expected: PASS (todos os specs; os existentes de `safe-lock*`, `base-iot-gateway.spec`, `telemetry.service.spec`, `unlock-authority.spec` e `commands.service.spec` continuam verdes).

Run: `pnpm --filter api lint`
Expected: sem erros.

- [ ] **Step 11: README da API**

Em `services/api/README.md`, na seção do módulo IoT, acrescentar o parágrafo:

```md
**Rastreadores só relé (`Tracker.controlMode = relay_only`, GT06 via Traccar).** O `CommandsService` lê o tipo do rastreador e o
passa ao gateway (`CommandRequest.controlMode`). `lock` usa o `RelayLockService` (estado no Redis, `iot:relay-lock:*`): sem rampa,
espera 2 telemetrias aceitas < 3 km/h cobrindo ≥ 10 s e grava `travada: true` uma vez; 120 s sem parar → `did_not_stop` sem corte;
corte sem confirmação em 120 s → `timeout` + `travada: false`. `speed_limit` e `horn` → `unsupported_by_tracker`. O fluxo
`speed_control` (`SafeLockService`) não muda. Spec: `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`.
```

- [ ] **Step 12: Commit**

```bash
git add services/api/src services/api/README.md
git commit -m "feat(api): escolha da estratégia de trava por Tracker.controlMode; speed_limit/horn recusados em relay_only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Invariante de segurança por propriedade (fast-check)

**Files:**
- Modify: `services/api/package.json` (devDependency `fast-check`)
- Create: `services/api/src/modules/iot/relay-lock.property.spec.ts`

**Interfaces:**
- Consumes: `BaseIotGateway` com `relayLock`, `TelemetryService`, `LiveStateStore`, `FakeClock`, `MemoryRedisStore` (Tasks 3–4); constantes `SPEED_FRESH_MS`, `DEFAULT_RECONNECT_GRACE_MS` de `./live-state.store`.
- Produces: nenhum código de produção; só o teste que trava o invariante da spec §5.

- [ ] **Step 1: Confirmar que o fast-check não existe no repositório**

Run: `git grep -n "fast-check" -- package.json "**/package.json" pnpm-lock.yaml`
Expected: nenhuma linha.

Run: `pnpm --filter api add -D fast-check@3.23.2`
Expected: `devDependencies: + fast-check 3.23.2`; `pnpm-lock.yaml` atualizado.

- [ ] **Step 2: Escrever o teste de propriedade**

`services/api/src/modules/iot/relay-lock.property.spec.ts`:

```ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import fc from 'fast-check';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { DEFAULT_RECONNECT_GRACE_MS, LiveStateStore, SPEED_FRESH_MS } from './live-state.store';
import { RELAY_STILL_MIN_SAMPLES, RELAY_STILL_MIN_SPAN_MS } from './relay-lock.service';
import type { DesiredState, IotTransport } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');

type Step =
  | { kind: 'sample'; afterMs: number; kmh: number; skewMs: number }
  | { kind: 'replay'; afterMs: number; kmh: number; ageMs: number }
  | { kind: 'presence'; afterMs: number }
  | { kind: 'offline'; afterMs: number }
  | { kind: 'silence'; afterMs: number };

const anySpeed = fc.oneof(fc.double({ min: 0, max: 2.99, noNaN: true }), fc.double({ min: 3, max: 45, noNaN: true }));
const step: fc.Arbitrary<Step> = fc.oneof(
  { weight: 10, arbitrary: fc.record({ kind: fc.constant('sample' as const), afterMs: fc.integer({ min: 500, max: 7_000 }), kmh: anySpeed, skewMs: fc.integer({ min: -2_000, max: 2_000 }) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('replay' as const), afterMs: fc.integer({ min: 0, max: 3_000 }), kmh: anySpeed, ageMs: fc.integer({ min: 1_000, max: 60_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('presence' as const), afterMs: fc.integer({ min: 0, max: 3_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('offline' as const), afterMs: fc.integer({ min: 0, max: 3_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('silence' as const), afterMs: fc.integer({ min: 10_000, max: 40_000 }) }) },
);

interface Delivered {
  arrival: number;
  deviceTs: number;
  kmh: number;
}

/**
 * Oráculo independente da implementação (spec §5): ao gravar `travada: true`, a última velocidade conhecida (a amostra entregue
 * com o maior `timestamp`) tem de ser < 3, fresca (≤ 10 s) e fora da graça da última reconexão explícita; e as amostras entregues
 * depois da graça, em ordem de `timestamp`, têm de terminar com ≥ 2 paradas cobrindo ≥ 10 s. Devolve o motivo da violação.
 */
function violation(log: Delivered[], at: number, reconnectAt: number): string | null {
  if (!log.length) return 'velocidade desconhecida';
  const newest = log.reduce((a, b) => (b.deviceTs > a.deviceTs ? b : a));
  if (!(newest.kmh < 3)) return `última velocidade conhecida ${newest.kmh.toFixed(2)} km/h`;
  if (at - Math.min(newest.deviceTs, newest.arrival) > SPEED_FRESH_MS) return 'última amostra velha';
  if (at - reconnectAt < DEFAULT_RECONNECT_GRACE_MS) return 'dentro da graça';
  const after = log.filter((s) => s.arrival >= reconnectAt + DEFAULT_RECONNECT_GRACE_MS).sort((a, b) => a.deviceTs - b.deviceTs);
  const run: Delivered[] = [];
  for (let i = after.length - 1; i >= 0 && after[i].kmh < 3; i--) run.unshift(after[i]);
  if (run.length < RELAY_STILL_MIN_SAMPLES) return `${run.length} amostra(s) parada(s) depois da graça`;
  const span = Math.min(run[run.length - 1].deviceTs, run[run.length - 1].arrival) - Math.min(run[0].deviceTs, run[0].arrival);
  if (span < RELAY_STILL_MIN_SPAN_MS) return `sequência parada de ${span} ms`;
  return null;
}

async function runScenario(steps: Step[], opts: { onlyMoving?: boolean } = {}): Promise<{ violations: string[]; cuts: number }> {
  const clock = new FakeClock(T0);
  const events = new EventEmitter2();
  const log: Delivered[] = [];
  let reconnectAt = T0;
  let offline = false;
  const violations: string[] = [];
  let cuts = 0;
  const transport: IotTransport = {
    updateDesired: async (_t: string, d: DesiredState) => {
      if (d.travada !== true) return;
      cuts++;
      const v = violation(log, clock.now(), reconnectAt);
      if (v) violations.push(v);
    },
    publishCommand: async () => undefined,
    start: async () => undefined,
    stop: async () => undefined,
  };
  class Gw extends BaseIotGateway {}
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new Gw(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: 'v1' }) }, trackPoint: { create: async () => ({}) } };
  const svc = new TelemetryService(gw, { onPosition: async () => undefined }, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  const deliver = async (kmh: number, deviceTs: number) => {
    const arrival = clock.now();
    if (offline) {
      reconnectAt = arrival; // primeira mensagem depois de offline = reconexão
      offline = false;
    }
    log.push({ arrival, deviceTs, kmh });
    await svc.telemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: kmh, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(deviceTs).toISOString() });
  };
  let n = 0;
  const relock = () => {
    if (gw.relayLock.isActive(T)) return;
    void gw.lock({ commandId: `c${++n}`, thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' }).catch(() => undefined);
  };
  await svc.presence(T, true);
  relock();
  for (const s of steps) {
    await clock.advance(s.afterMs);
    if (s.kind === 'sample') await deliver(opts.onlyMoving ? Math.max(3, s.kmh) : s.kmh, clock.now() + s.skewMs);
    if (s.kind === 'replay') await deliver(opts.onlyMoving ? Math.max(3, s.kmh) : s.kmh, clock.now() - s.ageMs);
    if (s.kind === 'presence') {
      await svc.presence(T, true);
      reconnectAt = clock.now();
      offline = false; // a presença já reconectou: a próxima telemetria não é "volta de offline"
    }
    if (s.kind === 'offline') {
      await svc.presence(T, false);
      offline = true;
    }
    relock();
  }
  return { violations, cuts };
}

describe('relay_only: invariante de segurança (spec GT06 §5, teste de propriedade)', () => {
  it('em nenhuma sequência grava travada=true com a última velocidade ≥ 3, desconhecida, velha ou dentro da graça', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 80 }), async (steps) => {
        const { violations } = await runScenario(steps);
        expect(violations).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });

  it('só amostras ≥ 3 km/h (e réplicas velhas) → nunca corta', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 80 }), async (steps) => {
        const { cuts } = await runScenario(steps, { onlyMoving: true });
        expect(cuts).toBe(0);
      }),
      { numRuns: 150 },
    );
  });

  it('sanidade do gerador: um cenário parado de verdade corta (o oráculo não é vazio)', async () => {
    const steps: Step[] = Array.from({ length: 8 }, () => ({ kind: 'sample' as const, afterMs: 5_000, kmh: 0, skewMs: 0 }));
    const { cuts, violations } = await runScenario(steps);
    expect(cuts).toBe(1);
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar**

Run: `pnpm --filter api test -- relay-lock.property`
Expected: PASS (3 testes). Se falhar, o fast-check imprime o contraexemplo mínimo (`Counterexample: [[...]]`) — investigar com superpowers:systematic-debugging antes de mexer no oráculo; o oráculo só pode ser afrouxado se a violação apontada não for uma violação da spec §5, e o motivo vai para `docs/decisoes.md`.

- [ ] **Step 4: Lint e commit**

Run: `pnpm --filter api lint`
Expected: sem erros.

```bash
git add services/api/package.json pnpm-lock.yaml services/api/src/modules/iot/relay-lock.property.spec.ts
git commit -m "test(api): invariante do relay_only por propriedade (fast-check)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Zonas em modo aviso e alerta `zone_speed_exceeded`

**Files:**
- Create: `services/api/src/modules/iot/tracker-mode.ts`, `services/api/src/modules/iot/tracker-mode.spec.ts`
- Create: `services/api/src/modules/iot/geofence/zone-speed-monitor.ts`, `services/api/src/modules/iot/geofence/zone-speed-monitor.spec.ts`
- Modify: `services/api/src/common/events.ts` (`EV.ZONE_SPEED_EXCEEDED`, `ZoneSpeedExceededEvent`, `GeofenceTransitionEvent.advisory`)
- Modify: `services/api/src/modules/iot/geofence/geofence.service.ts` (construtor, `evaluateLocked`, `emit`, `sortKeys`)
- Modify: `services/api/src/modules/iot/telemetry.service.ts` (construtor + chamada do monitor)
- Modify: `services/api/src/modules/iot/iot.module.ts`
- Modify: `services/api/src/modules/realtime/realtime.gateway.ts` (`zoneMessage`, `onGeofence`)
- Modify: `services/api/src/modules/alerts/alerts.listeners.ts`
- Test: `geofence.service.spec.ts`, `realtime.gateway.spec.ts`, `alerts.listeners.spec.ts` (casos novos)

**Interfaces:**
- Consumes: `TrackerControlMode` (Task 4, porta IoT); Prisma `Tracker.controlMode`, `AlertType.zone_speed_exceeded` (Task 2); `GeofenceService.effectiveLimit(thingName): Promise<number>` (existente).
- Produces:
  - `TRACKER_MODES` (symbol), `interface TrackerModeLookup { byVehicle(vehicleId: string): Promise<TrackerControlMode>; invalidate(vehicleId?: string): void }`, `class PrismaTrackerModeLookup(prisma: Pick<PrismaClient, 'tracker'>, clock: Clock, ttlMs = 60_000)`
  - `EV.ZONE_SPEED_EXCEEDED = 'zone.speed-exceeded'`, `interface ZoneSpeedExceededEvent { vehicleId: string; rentalId?: string; speedLimitKmh: number; speedKmh: number; ts: string }`
  - `GeofenceTransitionEvent.advisory?: boolean` (só `true` em `reduced_speed` de moto `relay_only`)
  - `ZONE_SPEED_EXCEEDED_AFTER_MS = 5_000`, `interface ZoneSpeedSample { vehicleId: string; thingName: string; speedKmh: number; measuredAt: number }`, `class ZoneSpeedMonitor(modes, limits: { effectiveLimit(thingName: string): Promise<number> }, redis: RedisStore, events: Pick<EventEmitter2, 'emit'>, rentals: Pick<RentalLookup, 'openRentalId'>)` com `onSample(s: ZoneSpeedSample): Promise<void>`
  - `GeofenceService` ganha o 10º parâmetro opcional `modes?: TrackerModeLookup`; `TelemetryService` ganha o 8º parâmetro opcional `zoneSpeed?: Pick<ZoneSpeedMonitor, 'onSample'>`.

- [ ] **Step 1: Testes (falham)**

`services/api/src/modules/iot/tracker-mode.spec.ts`:

```ts
import { FakeClock } from './clock';
import { PrismaTrackerModeLookup } from './tracker-mode';

describe('PrismaTrackerModeLookup', () => {
  it('lê o controlMode do Tracker da moto, guarda por 60 s; sem Tracker = speed_control', async () => {
    const clock = new FakeClock(0);
    const findUnique = jest.fn(async ({ where }: { where: { vehicleId: string } }) => (where.vehicleId === 'v-relay' ? { controlMode: 'relay_only' } : null));
    const modes = new PrismaTrackerModeLookup({ tracker: { findUnique } } as any, clock);
    expect(await modes.byVehicle('v-relay')).toBe('relay_only');
    expect(await modes.byVehicle('v-relay')).toBe('relay_only');
    expect(await modes.byVehicle('v-none')).toBe('speed_control');
    expect(findUnique).toHaveBeenCalledTimes(2);
    await clock.advance(60_000);
    await modes.byVehicle('v-relay');
    expect(findUnique).toHaveBeenCalledTimes(3);
    modes.invalidate('v-relay');
    await modes.byVehicle('v-relay');
    expect(findUnique).toHaveBeenCalledTimes(4);
  });
});
```

`services/api/src/modules/iot/geofence/zone-speed-monitor.spec.ts`:

```ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type ZoneSpeedExceededEvent } from '../../../common/events';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { ZoneSpeedMonitor } from './zone-speed-monitor';

const AT0 = Date.parse('2026-10-27T12:00:00Z');

function setup(mode: 'relay_only' | 'speed_control' = 'relay_only', limit = 6) {
  const events = new EventEmitter2();
  const got: ZoneSpeedExceededEvent[] = [];
  events.on(EV.ZONE_SPEED_EXCEEDED, (e: ZoneSpeedExceededEvent) => got.push(e));
  const modes = { byVehicle: jest.fn().mockResolvedValue(mode), invalidate: jest.fn() };
  const limits = { effectiveLimit: jest.fn().mockResolvedValue(limit) };
  const rentals = { openRentalId: jest.fn().mockResolvedValue('rent-1') };
  const monitor = new ZoneSpeedMonitor(modes, limits, new MemoryRedisStore(), events, rentals);
  const sample = (kmh: number, sec: number) => monitor.onSample({ vehicleId: 'veh-1', thingName: 'moto-0901', speedKmh: kmh, measuredAt: AT0 + sec * 1000 });
  return { got, sample, limits };
}

describe('ZoneSpeedMonitor (spec GT06 §10)', () => {
  it('acima do limite por mais de 5 s → um alerta por episódio; voltar ao limite encerra o episódio', async () => {
    const s = setup();
    await s.sample(10, 0);
    await s.sample(11, 3);
    await s.sample(12, 5);
    expect(s.got).toEqual([]);
    await s.sample(12, 6);
    expect(s.got).toEqual([{ vehicleId: 'veh-1', rentalId: 'rent-1', speedLimitKmh: 6, speedKmh: 12, ts: '2026-10-27T12:00:06.000Z' }]);
    await s.sample(14, 12);
    expect(s.got).toHaveLength(1);
    await s.sample(6, 15); // igual ao limite: dentro
    await s.sample(10, 16);
    await s.sample(10, 22);
    expect(s.got).toHaveLength(2);
  });

  it('amostra mais velha que o início do episódio é ignorada', async () => {
    const s = setup();
    await s.sample(10, 10);
    await s.sample(10, 2);
    await s.sample(10, 15);
    expect(s.got).toEqual([]);
    await s.sample(10, 16);
    expect(s.got).toHaveLength(1);
  });

  it('speed_control e fora de zona (limite 32) nunca alertam', async () => {
    const a = setup('speed_control');
    await a.sample(20, 0);
    await a.sample(20, 10);
    expect(a.got).toEqual([]);
    expect(a.limits.effectiveLimit).not.toHaveBeenCalled();
    const b = setup('relay_only', 32);
    await b.sample(35, 0);
    await b.sample(35, 10);
    expect(b.got).toEqual([]);
  });
});
```

Acrescentar em `geofence.service.spec.ts` (usa `setup`, `pos`, `OPERATION`, `PEDESTRIAN` do arquivo):

```ts
describe('GeofenceService com rastreador relay_only (spec GT06 §10)', () => {
  function setupRelay(mode: 'relay_only' | 'error' = 'relay_only') {
    const base = setup();
    const modes = { byVehicle: mode === 'error' ? jest.fn().mockRejectedValue(new Error('db fora')) : jest.fn().mockResolvedValue('relay_only'), invalidate: jest.fn() };
    const svc = new GeofenceService(base.engine, base.commander, base.rentals, base.events, base.clock, new MemoryRedisStore(), { outOfAreaLockMinutes: 5 }, undefined, undefined, modes);
    return { ...base, svc };
  }

  it('ENTER em reduced_speed: transição com advisory e nenhum comando de limite; o limite da zona continua conhecido', async () => {
    const { svc, engine, transitions, commander } = setupRelay();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [OPERATION, PEDESTRIAN];
    await svc.onPosition(pos('2026-10-21T15:00:05.000Z'));
    expect(transitions[transitions.length - 1]).toEqual({
      vehicleId: 'veh-1', rentalId: 'rent-1', zoneId: 'z-ped', zoneType: 'reduced_speed', speedLimitKmh: 6, transition: 'ENTER', advisory: true, ts: '2026-10-21T15:00:05.000Z',
    });
    expect(commander.setSpeedLimit).not.toHaveBeenCalled();
    expect(await svc.effectiveLimit('moto-0001')).toBe(6);
  });

  it('EXIT da área com aluguel: bloqueio pedido após 5 min, como hoje (a estratégia é do CommandsService)', async () => {
    const { svc, engine, clock, commander } = setupRelay();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [];
    await svc.onPosition(pos());
    await clock.advance(5 * 60_000);
    expect(commander.safeLock).toHaveBeenCalledWith('veh-1', { rentalId: 'rent-1', purpose: 'out_of_area' });
  });

  it('erro ao ler o tipo do rastreador → trata como speed_control (aplica o limite; nunca falha aberto)', async () => {
    const { svc, engine, commander, transitions } = setupRelay('error');
    engine.zones = [OPERATION, PEDESTRIAN];
    await svc.onPosition(pos());
    expect(commander.setSpeedLimit).toHaveBeenCalledWith('veh-1', 6, expect.anything());
    expect(transitions.some((t) => 'advisory' in t)).toBe(false);
  });
});
```

Acrescentar em `realtime.gateway.spec.ts`:

```ts
  it('zone.notice de rastreador só relé: texto da spec e advisory', async () => {
    const { gw, emit, to } = setup();
    expect(zoneMessage({ zoneType: 'reduced_speed', transition: 'ENTER', speedLimitKmh: 6, advisory: true })).toBe('Área com limite de 6 km/h.');
    await gw.onGeofence({ vehicleId: 'v1', rentalId: RENTAL_ID, zoneId: 'z', zoneType: 'reduced_speed', speedLimitKmh: 20, transition: 'ENTER', ts: '2026-10-27T12:00:00.000Z', advisory: true });
    expect(to).toHaveBeenCalledWith(`rental:${RENTAL_ID}`);
    expect(emit).toHaveBeenCalledWith('zone.notice', { rentalId: RENTAL_ID, zoneType: 'reduced_speed', transition: 'ENTER', message: 'Área com limite de 20 km/h.', speedLimitKmh: 20, advisory: true });
  });
```

Acrescentar em `alerts.listeners.spec.ts`:

```ts
describe('zone_speed_exceeded (spec GT06 §10)', () => {
  it('alerta high em zona de 6 km/h e medium em 20, com aluguel e posição da moto', async () => {
    const alerts = { create: jest.fn().mockResolvedValue({}) };
    const prisma = { vehicle: { findUnique: jest.fn().mockResolvedValue({ lat: -23.5, lng: -46.6 }) }, rental: { findFirst: jest.fn() } };
    const l = new AlertsListeners(alerts as never, prisma as never, { publish: jest.fn(), subscribe: jest.fn() } as never);
    await l.onZoneSpeedExceeded({ vehicleId: VEHICLE, rentalId: 'r1', speedLimitKmh: 6, speedKmh: 14.2, ts: '2026-10-27T12:00:06.000Z' });
    await l.onZoneSpeedExceeded({ vehicleId: VEHICLE, speedLimitKmh: 20, speedKmh: 26, ts: '2026-10-27T12:01:00.000Z' });
    expect(alerts.create).toHaveBeenNthCalledWith(1, {
      type: 'zone_speed_exceeded', priority: 'high', message: 'Acima do limite da zona (6 km/h): o rastreador só relé não reduz a velocidade.', vehicleId: VEHICLE, rentalId: 'r1', lat: -23.5, lng: -46.6,
    });
    expect(alerts.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'zone_speed_exceeded', priority: 'medium', rentalId: undefined }));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api test -- tracker-mode zone-speed-monitor geofence.service realtime.gateway alerts.listeners`
Expected: FAIL — módulos `./tracker-mode` e `./zone-speed-monitor` inexistentes; `onZoneSpeedExceeded` inexistente.

- [ ] **Step 3: Eventos**

Em `services/api/src/common/events.ts`: no objeto `EV`, acrescentar `ZONE_SPEED_EXCEEDED: 'zone.speed-exceeded',`; em `GeofenceTransitionEvent`, acrescentar:

```ts
  /** Moto com rastreador `relay_only`: o limite de `reduced_speed` não é imposto, é aviso (spec GT06 §10). */
  advisory?: boolean;
```

e a interface nova:

```ts
/** Moto `relay_only` acima do limite da zona por mais de 5 s (spec GT06 §10). Sem dado pessoal: só ids e velocidades. */
export interface ZoneSpeedExceededEvent {
  vehicleId: string;
  rentalId?: string;
  speedLimitKmh: number;
  speedKmh: number;
  ts: string;
}
```

- [ ] **Step 4: `tracker-mode.ts`**

```ts
import type { PrismaClient } from '@prisma/client';
import type { TrackerControlMode } from '../../ports/iot-gateway.port';
import type { Clock } from './clock';

export type { TrackerControlMode };
export const TRACKER_MODES = Symbol('TRACKER_MODES');

/** Tipo do rastreador da moto (cercas e monitor de velocidade por zona). Sem `Tracker` = `speed_control`. */
export interface TrackerModeLookup {
  byVehicle(vehicleId: string): Promise<TrackerControlMode>;
  invalidate(vehicleId?: string): void;
}

/** `Tracker.controlMode` com cache curto (muda só pelo provisionamento). Erro de leitura propaga: quem chama decide a falha segura. */
export class PrismaTrackerModeLookup implements TrackerModeLookup {
  private readonly cache = new Map<string, { mode: TrackerControlMode; at: number }>();

  constructor(
    private readonly prisma: Pick<PrismaClient, 'tracker'>,
    private readonly clock: Clock,
    private readonly ttlMs = 60_000,
  ) {}

  async byVehicle(vehicleId: string): Promise<TrackerControlMode> {
    const hit = this.cache.get(vehicleId);
    if (hit && this.clock.now() - hit.at < this.ttlMs) return hit.mode;
    const t = await this.prisma.tracker.findUnique({ where: { vehicleId }, select: { controlMode: true } });
    const mode: TrackerControlMode = t?.controlMode ?? 'speed_control';
    this.cache.set(vehicleId, { mode, at: this.clock.now() });
    return mode;
  }

  invalidate(vehicleId?: string): void {
    if (vehicleId) this.cache.delete(vehicleId);
    else this.cache.clear();
  }
}
```

- [ ] **Step 5: `zone-speed-monitor.ts`**

```ts
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, type ZoneSpeedExceededEvent } from '../../../common/events';
import type { RedisStore } from '../../../redis/redis-store';
import type { TrackerModeLookup } from '../tracker-mode';
import type { RentalLookup } from './geofence.service';

/** Acima do limite da zona por mais que isto → alerta (spec GT06 §10). */
export const ZONE_SPEED_EXCEEDED_AFTER_MS = 5_000;
/** Episódio sem amostra por mais que isto é esquecido. */
const EPISODE_TTL_MS = 60_000;

export interface ZoneSpeedSample {
  vehicleId: string;
  thingName: string;
  speedKmh: number;
  /** Hora da medição limitada a agora (ms). */
  measuredAt: number;
}

interface Episode {
  since: number;
  limit: number;
  alerted: boolean;
}

/**
 * Rastreador só relé não reduz a velocidade: acima do limite da zona em que está (o mesmo `effectiveLimit` do motor de cercas)
 * por mais de 5 s → `zone.speed-exceeded` (um por episódio; o `AlertsService` agrupa repetições da moto em 10 min). Episódio no
 * Redis (`geofence:zone-speed:{thing}`), lido por qualquer instância. Falha de leitura do tipo = `speed_control` (não alerta).
 */
export class ZoneSpeedMonitor {
  constructor(
    private readonly modes: TrackerModeLookup,
    private readonly limits: { effectiveLimit(thingName: string): Promise<number> },
    private readonly redis: RedisStore,
    private readonly events: Pick<EventEmitter2, 'emit'>,
    private readonly rentals: Pick<RentalLookup, 'openRentalId'>,
  ) {}

  private key(thingName: string): string {
    return `geofence:zone-speed:${thingName}`;
  }

  async onSample(s: ZoneSpeedSample): Promise<void> {
    const mode = await this.modes.byVehicle(s.vehicleId).catch(() => 'speed_control' as const);
    if (mode !== 'relay_only') return;
    const limit = await this.limits.effectiveLimit(s.thingName);
    if (limit >= MAX_SPEED_KMH || !(s.speedKmh > limit)) {
      await this.redis.del(this.key(s.thingName)).catch(() => undefined);
      return;
    }
    const ep = parseEpisode(await this.redis.get(this.key(s.thingName)).catch(() => null));
    if (ep && ep.limit === limit && s.measuredAt < ep.since) return; // mais velha que o episódio: ignorada
    if (!ep || ep.limit !== limit) {
      await this.save(s.thingName, { since: s.measuredAt, limit, alerted: false });
      return;
    }
    if (ep.alerted || s.measuredAt - ep.since <= ZONE_SPEED_EXCEEDED_AFTER_MS) {
      await this.save(s.thingName, ep);
      return;
    }
    await this.save(s.thingName, { ...ep, alerted: true });
    const ev: ZoneSpeedExceededEvent = { vehicleId: s.vehicleId, speedLimitKmh: limit, speedKmh: Math.round(s.speedKmh * 10) / 10, ts: new Date(s.measuredAt).toISOString() };
    const rentalId = await this.rentals.openRentalId(s.vehicleId).catch(() => undefined);
    if (rentalId) ev.rentalId = rentalId;
    this.events.emit(EV.ZONE_SPEED_EXCEEDED, ev);
  }

  private async save(thingName: string, ep: Episode): Promise<void> {
    await this.redis.set(this.key(thingName), JSON.stringify(ep), EPISODE_TTL_MS).catch(() => undefined);
  }
}

function parseEpisode(raw: string | null): Episode | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Episode>;
    return typeof v.since === 'number' && typeof v.limit === 'number' && typeof v.alerted === 'boolean' ? { since: v.since, limit: v.limit, alerted: v.alerted } : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: `GeofenceService`**

Import `import type { TrackerModeLookup } from '../tracker-mode';`. Construtor: depois de `private readonly live?: LiveVehicleSource,` acrescentar:

```ts
    /** Tipo do rastreador (spec GT06 §10): `relay_only` não recebe comando de limite; o ENTER vira aviso. */
    private readonly modes?: TrackerModeLookup,
```

Em `evaluateLocked`, logo depois de `const limit = zoneLimitOf(zones);`:

```ts
    // Rastreador só relé: o limite da zona continua gravado (unlock, monitor de velocidade), mas não vira comando. Erro de leitura
    // = speed_control (aplicar o limite nunca falha aberto).
    const relayOnly = (await this.modes?.byVehicle(p.vehicleId).catch(() => 'speed_control' as const)) === 'relay_only';
```

Trocar `const desired = await this.live?.desiredLimit(p.thingName).catch(() => null);` por:

```ts
    const desired = relayOnly ? null : await this.live?.desiredLimit(p.thingName).catch(() => null);
```

Trocar as chamadas de emissão por `this.emit(p, z, 'EXIT', rentalId, relayOnly)` e `this.emit(p, z, 'ENTER', rentalId, relayOnly)`. No bloco `if (limitChanged) { ... }`, trocar a chamada do `commander.setSpeedLimit` por:

```ts
      if (relayOnly) {
        this.logger.log({ msg: 'zone_speed_limit_advisory', vehicleId: p.vehicleId, limit });
      } else {
        await this.commander
          .setSpeedLimit(p.vehicleId, limit, { rentalId, purpose: 'zone_speed_limit' })
          .catch((err) => this.logger.error({ msg: 'zone_speed_limit_failed', vehicleId: p.vehicleId, error: (err as Error).message }));
      }
```

`emit` passa a ser:

```ts
  private emit(p: PositionInput, z: ZoneRef, transition: 'ENTER' | 'EXIT', rentalId?: string, relayOnly = false): void {
    const ev: GeofenceTransitionEvent = { vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition, ts: p.ts };
    if (rentalId) ev.rentalId = rentalId;
    if (z.speedLimitKmh !== null && z.speedLimitKmh !== undefined) ev.speedLimitKmh = z.speedLimitKmh;
    if (relayOnly && z.type === 'reduced_speed') ev.advisory = true;
    this.logger.log({ msg: 'geofence_transition', vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition });
    this.events.emit(EV.GEOFENCE_TRANSITION, sortKeys(ev));
  }
```

Em `sortKeys`, antes de `out.ts = ev.ts;`: `if (ev.advisory) out.advisory = true;`.

- [ ] **Step 7: `TelemetryService`, realtime e alertas**

`telemetry.service.ts`: `import type { ZoneSpeedMonitor } from './geofence/zone-speed-monitor';`; no construtor, depois de `private readonly opts: TelemetryOptions,`:

```ts
    /** Alerta `zone_speed_exceeded` de rastreador só relé (spec GT06 §10). */
    private readonly zoneSpeed?: Pick<ZoneSpeedMonitor, 'onSample'>,
```

Depois de `await this.geofence.onPosition({ vehicleId, thingName, lat: msg.lat, lng: msg.lng, ts });`:

```ts
      if (this.zoneSpeed && applied.newest) {
        await this.zoneSpeed
          .onSample({ vehicleId, thingName, speedKmh: msg.velocidade_kmh, measuredAt: Math.min(deviceTs, now) })
          .catch((err: Error) => this.logger.error({ msg: 'zone_speed_check_failed', thingName, error: err.message }));
      }
```

`realtime.gateway.ts`: a assinatura passa a `zoneMessage(ev: Pick<GeofenceTransitionEvent, 'zoneType' | 'transition' | 'speedLimitKmh' | 'advisory'>)` e o `case 'reduced_speed':` começa com:

```ts
      // Rastreador só relé (spec GT06 §10): o limite não é imposto — aviso com o texto da spec.
      if (enter && ev.advisory) return `Área com limite de ${ev.speedLimitKmh ?? 20} km/h.`;
```

Em `onGeofence`, depois de `if (ev.speedLimitKmh !== undefined) payload.speedLimitKmh = ev.speedLimitKmh;`: `if (ev.advisory) payload.advisory = true;`.

`alerts.listeners.ts`: importar `ZoneSpeedExceededEvent` de `../../common/events` e acrescentar:

```ts
  /** Moto `relay_only` acima do limite da zona por mais de 5 s (spec GT06 §10); a deduplicação de 10 min agrupa repetições. */
  @OnEvent(EV.ZONE_SPEED_EXCEEDED, { async: true, promisify: true })
  async onZoneSpeedExceeded(ev: ZoneSpeedExceededEvent): Promise<void> {
    await this.alerts.create({
      type: 'zone_speed_exceeded',
      priority: ev.speedLimitKmh <= 6 ? 'high' : 'medium',
      message: `Acima do limite da zona (${ev.speedLimitKmh} km/h): o rastreador só relé não reduz a velocidade.`,
      vehicleId: ev.vehicleId,
      rentalId: ev.rentalId,
      ...(await this.position(ev.vehicleId)),
    });
  }
```

- [ ] **Step 8: Módulo IoT**

Em `iot.module.ts`: imports `import { PrismaTrackerModeLookup, TRACKER_MODES, type TrackerModeLookup } from './tracker-mode';` e `import { ZoneSpeedMonitor } from './geofence/zone-speed-monitor';`. Providers:

```ts
    { provide: TRACKER_MODES, inject: [PrismaService, IOT_CLOCK], useFactory: (prisma: PrismaService, clock: Clock) => new PrismaTrackerModeLookup(prisma, clock) },
```

O provider do `GeofenceService` passa a injetar `TRACKER_MODES` por último e a criar `new GeofenceService(engine, commander, rentals, events, clock, redis, { outOfAreaLockMinutes: cfg.outOfAreaLockMinutes }, new PrismaZoneVehiclePositions(prisma), live, modes)` (com `modes: TrackerModeLookup` na lista de parâmetros da factory). Provider novo:

```ts
    {
      provide: ZoneSpeedMonitor,
      inject: [TRACKER_MODES, GeofenceService, REDIS_STORE, EventEmitter2, RENTAL_LOOKUP],
      useFactory: (modes: TrackerModeLookup, geofence: GeofenceService, redis: RedisStore, events: EventEmitter2, rentals: RentalLookup) => new ZoneSpeedMonitor(modes, geofence, redis, events, rentals),
    },
```

O provider do `TelemetryService` injeta `ZoneSpeedMonitor` por último e passa como 8º argumento: `new TelemetryService(gw, geofence, rentals, prisma, events, clock, { trackRetentionDays: app.trackRetentionDays, reconnectGapMs: cfg.reconnectGapMs, queueLagMs: cfg.queueLagMs }, zoneSpeed)`.

- [ ] **Step 9: Rodar**

Run: `pnpm --filter api test`
Expected: PASS (todos; os casos novos de cercas, realtime, alertas, monitor e lookup verdes; os existentes de `geofence.service.spec` inalterados).

Run: `pnpm --filter api lint`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add services/api/src
git commit -m "feat(api): zonas em modo aviso e alerta zone_speed_exceeded para rastreador relay_only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Provisionamento GT06 e simulador sem motos só-relé

**Files:**
- Create: `services/api/src/cli/provision-gt06.ts`, `services/api/src/cli/provision-gt06.spec.ts`
- Modify: `services/api/scripts/provision-tracker.ts` (opção `--protocol gt06`, comentário do topo)
- Modify: `services/iot-sim/src/fleet-source.ts:34-37` (`FLEET_SQL`); Create: `services/iot-sim/src/fleet-source.spec.ts`
- Modify: `services/iot-sim/README.md`

**Interfaces:**
- Consumes: Prisma `Tracker.controlMode`/`protocol`/`imei @unique` (Task 2).
- Produces (usados pelas Tasks 12–13):
  - `maskImei(imei: string): string` (só os 4 últimos dígitos à mostra)
  - `interface TraccarAdminApi { findDevice(uniqueId: string): Promise<{ id: number } | null>; createDevice(name: string, uniqueId: string): Promise<{ id: number }>; findUser(email: string): Promise<{ id: number } | null>; linkDevice(userId: number, deviceId: number): Promise<void> }`
  - `traccarAdminApi(baseUrl: string, email: string, password: string, fetchImpl?: typeof fetch): TraccarAdminApi` (Basic auth)
  - `provisionGt06(deps: { prisma; traccar: TraccarAdminApi; log(entry: Record<string, unknown>): void }, input: { vehicleCode: string; thingName: string; imei: string; bridgeEmail?: string; dryRun?: boolean }): Promise<{ deviceId: number | null; created: boolean }>`
  - `main(argv?: string[], env?: NodeJS.ProcessEnv): Promise<void>`; CLI compilado em `dist/cli/provision-gt06.js` (env `TRACCAR_URL`, `TRACCAR_ADMIN_EMAIL`, `TRACCAR_ADMIN_PASSWORD`, `TRACCAR_BRIDGE_EMAIL`, `DATABASE_URL`).

- [ ] **Step 1: Testes (falham)**

`services/api/src/cli/provision-gt06.spec.ts`:

```ts
import { maskImei, provisionGt06, traccarAdminApi, type TraccarAdminApi } from './provision-gt06';

const IMEI = '860000000000901';

function fakes(opts: { device?: { id: number } | null; imeiOwner?: string | null } = {}) {
  const tx = { vehicle: { update: jest.fn() }, tracker: { upsert: jest.fn(), updateMany: jest.fn() } };
  const prisma = {
    vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 'veh-1', thingName: 'moto-0901' }), findFirst: jest.fn().mockResolvedValue(null) },
    tracker: { findFirst: jest.fn().mockResolvedValue(opts.imeiOwner ? { thingName: opts.imeiOwner } : null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const traccar: jest.Mocked<TraccarAdminApi> = {
    findDevice: jest.fn().mockResolvedValue(opts.device ?? null),
    createDevice: jest.fn().mockResolvedValue({ id: 7 }),
    findUser: jest.fn().mockResolvedValue({ id: 3 }),
    linkDevice: jest.fn().mockResolvedValue(undefined),
  };
  const logs: Array<Record<string, unknown>> = [];
  return { tx, prisma, traccar, logs, deps: { prisma: prisma as any, traccar, log: (e: Record<string, unknown>) => void logs.push(e) } };
}
const input = { vehicleCode: 'VLT-0901', thingName: 'moto-0901', imei: IMEI, bridgeEmail: 'bridge@volti.local' };

describe('provisionGt06 (spec GT06 §4)', () => {
  it('maskImei mostra só os 4 últimos dígitos', () => {
    expect(maskImei(IMEI)).toBe('***********0901');
    expect(maskImei('12')).toBe('****');
  });

  it('novo: cria o dispositivo no Traccar (uniqueId = IMEI, nome = thingName), vincula à ponte e grava Tracker relay_only/gt06 sem certificado', async () => {
    const f = fakes();
    expect(await provisionGt06(f.deps, input)).toEqual({ deviceId: 7, created: true });
    expect(f.traccar.createDevice).toHaveBeenCalledWith('moto-0901', IMEI);
    expect(f.traccar.linkDevice).toHaveBeenCalledWith(3, 7);
    expect(f.tx.tracker.upsert).toHaveBeenCalledWith({
      where: { thingName: 'moto-0901' },
      create: { thingName: 'moto-0901', vehicleId: 'veh-1', imei: IMEI, controlMode: 'relay_only', protocol: 'gt06' },
      update: { vehicleId: 'veh-1', imei: IMEI, controlMode: 'relay_only', protocol: 'gt06', certificateArn: null },
    });
    expect(f.tx.tracker.updateMany).toHaveBeenCalledWith({ where: { vehicleId: 'veh-1', NOT: { thingName: 'moto-0901' } }, data: { vehicleId: null } });
  });

  it('idempotente: dispositivo já existe → não cria outro', async () => {
    const f = fakes({ device: { id: 5 } });
    expect(await provisionGt06(f.deps, input)).toEqual({ deviceId: 5, created: false });
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.tx.tracker.upsert).toHaveBeenCalled();
  });

  it('IMEI de outro rastreador → erro (IMEI mascarado) sem tocar em Traccar nem banco', async () => {
    const f = fakes({ imeiOwner: 'moto-0002' });
    await expect(provisionGt06(f.deps, input)).rejects.toThrow('IMEI ***********0901 já vinculado a moto-0002.');
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, imei: '86000' }, '--imei deve ter 15 dígitos'],
    [{ ...input, thingName: 'moto-x' }, '--thing moto-0000 obrigatório'],
    [{ ...input, vehicleCode: 'X-1' }, '--vehicle VLT-0000 obrigatório'],
  ])('entrada inválida %#', async (bad, msg) => {
    const f = fakes();
    await expect(provisionGt06(f.deps, bad)).rejects.toThrow(msg);
  });

  it('dry-run: só planeja; logs nunca trazem o IMEI completo', async () => {
    const f = fakes();
    expect(await provisionGt06(f.deps, { ...input, dryRun: true })).toEqual({ deviceId: null, created: false });
    expect(f.traccar.createDevice).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(f.logs)).not.toContain(IMEI);
    expect(f.logs[0]).toMatchObject({ msg: 'plan', protocol: 'gt06', thingName: 'moto-0901', imei: '***********0901', traccarDevice: 'create', dryRun: true });
  });
});

describe('traccarAdminApi', () => {
  it('Basic auth e caminhos da API REST do Traccar', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/api/users')) return new Response(JSON.stringify([{ id: 3, email: 'Bridge@volti.local' }]), { status: 200 });
      if (url.includes('/api/devices?')) return new Response('[]', { status: 200 });
      if (url.endsWith('/api/devices')) return new Response(JSON.stringify({ id: 9 }), { status: 200 });
      return new Response('', { status: 204 });
    }) as unknown as typeof fetch;
    const api = traccarAdminApi('http://traccar:8082', 'admin@volti.local', 'segredo', fetchImpl);
    expect(await api.findDevice(IMEI)).toBeNull();
    expect(await api.createDevice('moto-0901', IMEI)).toEqual({ id: 9 });
    expect(await api.findUser('bridge@volti.local')).toEqual({ id: 3, email: 'Bridge@volti.local' });
    await api.linkDevice(3, 9);
    expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
      `GET http://traccar:8082/api/devices?uniqueId=${IMEI}`,
      'POST http://traccar:8082/api/devices',
      'GET http://traccar:8082/api/users',
      'POST http://traccar:8082/api/permissions',
    ]);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('admin@volti.local:segredo').toString('base64')}`);
    expect(calls[1].init.body).toBe(JSON.stringify({ name: 'moto-0901', uniqueId: IMEI }));
  });
});
```

`services/iot-sim/src/fleet-source.spec.ts`:

```ts
import { FLEET_SQL } from './fleet-source';

describe('FLEET_SQL', () => {
  it('não simula motos com rastreador só relé (o J16 ou o emulador GT06 publica por elas)', () => {
    expect(FLEET_SQL).toMatch(/LEFT JOIN "Tracker" t ON t\."vehicleId" = v\."id"/);
    expect(FLEET_SQL).toMatch(/WHERE t\."controlMode" IS DISTINCT FROM 'relay_only'/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter api test -- provision-gt06`
Expected: FAIL — `Cannot find module './provision-gt06'`.

Run: `pnpm --filter iot-sim test -- fleet-source`
Expected: FAIL — `toMatch` sem `LEFT JOIN "Tracker"`.

- [ ] **Step 3: Implementar `provision-gt06.ts`**

```ts
/**
 * Provisionamento de rastreador GT06 só relé (spec GT06 §4): **sem** certificado nem thing no IoT Core. Marca o `Tracker` como
 * `relay_only`/`gt06` com o IMEI, vincula à moto (alinhando `Vehicle.thingName`) e cria o dispositivo no Traccar
 * (`POST /api/devices`, `uniqueId = IMEI`, nome = thingName — nada do cliente), dando acesso ao usuário da ponte.
 *
 *   node dist/cli/provision-gt06.js --vehicle VLT-0901 --thing moto-0901 --imei 860000000000901 [--dry-run]
 *   pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle VLT-0901 --thing moto-0901 --imei ...
 *
 * Ambiente: DATABASE_URL; TRACCAR_URL (padrão http://localhost:8082); TRACCAR_ADMIN_EMAIL (padrão admin@volti.local);
 * TRACCAR_ADMIN_PASSWORD (obrigatória); TRACCAR_BRIDGE_EMAIL (opcional). Idempotente. Logs JSON com o IMEI mascarado.
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';

const IMEI = /^\d{15}$/;
const THING_NAME = /^moto-\d{4,}$/;
const VEHICLE_CODE = /^VLT-\d{4,}$/;

/** IMEI em log/erro: só os 4 últimos dígitos (spec §6.5). */
export function maskImei(imei: string): string {
  return imei.length <= 4 ? '****' : `${'*'.repeat(imei.length - 4)}${imei.slice(-4)}`;
}

export interface TraccarAdminApi {
  findDevice(uniqueId: string): Promise<{ id: number } | null>;
  createDevice(name: string, uniqueId: string): Promise<{ id: number }>;
  findUser(email: string): Promise<{ id: number } | null>;
  linkDevice(userId: number, deviceId: number): Promise<void>;
}

/** API REST do Traccar com o usuário administrador (Basic auth). Só rede interna (spec §6.5). */
export function traccarAdminApi(baseUrl: string, email: string, password: string, fetchImpl: typeof fetch = fetch): TraccarAdminApi {
  const authorization = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
  const call = (method: string, path: string, body?: unknown) =>
    fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: authorization, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const ok = (res: Response, what: string): Response => {
    if (!res.ok) throw new Error(`Traccar ${what}: HTTP ${res.status}`);
    return res;
  };
  return {
    async findDevice(uniqueId) {
      const list = (await ok(await call('GET', `/api/devices?uniqueId=${encodeURIComponent(uniqueId)}`), 'listar dispositivos').json()) as Array<{ id: number }>;
      return list[0] ?? null;
    },
    async createDevice(name, uniqueId) {
      return (await ok(await call('POST', '/api/devices', { name, uniqueId }), 'criar dispositivo').json()) as { id: number };
    },
    async findUser(userEmail) {
      const list = (await ok(await call('GET', '/api/users'), 'listar usuários').json()) as Array<{ id: number; email: string }>;
      return list.find((u) => u.email.toLowerCase() === userEmail.toLowerCase()) ?? null;
    },
    async linkDevice(userId, deviceId) {
      const res = await call('POST', '/api/permissions', { userId, deviceId });
      // 400 = vínculo já existe (idempotente).
      if (!res.ok && res.status !== 400) throw new Error(`Traccar vincular dispositivo: HTTP ${res.status}`);
    },
  };
}

export interface Gt06ProvisionInput {
  vehicleCode: string;
  thingName: string;
  imei: string;
  /** Usuário (não admin) da ponte no Traccar, que passa a ver o dispositivo. Ausente = a ponte usa o admin (só local). */
  bridgeEmail?: string;
  dryRun?: boolean;
}

type ProvisionPrisma = Pick<PrismaClient, 'vehicle' | 'tracker' | '$transaction'>;

export async function provisionGt06(
  deps: { prisma: ProvisionPrisma; traccar: TraccarAdminApi; log: (entry: Record<string, unknown>) => void },
  input: Gt06ProvisionInput,
): Promise<{ deviceId: number | null; created: boolean }> {
  const { vehicleCode, thingName, imei } = input;
  if (!VEHICLE_CODE.test(vehicleCode)) throw new Error('--vehicle VLT-0000 obrigatório');
  if (!THING_NAME.test(thingName)) throw new Error('--thing moto-0000 obrigatório');
  if (!IMEI.test(imei)) throw new Error('--imei deve ter 15 dígitos');
  const vehicle = await deps.prisma.vehicle.findUnique({ where: { code: vehicleCode }, select: { id: true, thingName: true } });
  if (!vehicle) throw new Error(`Moto ${vehicleCode} não encontrada (cadastre com POST /vehicles).`);
  const clash = await deps.prisma.vehicle.findFirst({ where: { thingName, NOT: { id: vehicle.id } }, select: { code: true } });
  if (clash) throw new Error(`thingName ${thingName} já pertence a ${clash.code}.`);
  const imeiOwner = await deps.prisma.tracker.findFirst({ where: { imei, NOT: { thingName } }, select: { thingName: true } });
  if (imeiOwner) throw new Error(`IMEI ${maskImei(imei)} já vinculado a ${imeiOwner.thingName}.`);

  const existing = await deps.traccar.findDevice(imei);
  deps.log({ msg: 'plan', protocol: 'gt06', thingName, vehicleCode, imei: maskImei(imei), traccarDevice: existing ? 'exists' : 'create', dryRun: !!input.dryRun });
  if (input.dryRun) return { deviceId: existing?.id ?? null, created: false };

  const device = existing ?? (await deps.traccar.createDevice(thingName, imei));
  if (input.bridgeEmail) {
    const user = await deps.traccar.findUser(input.bridgeEmail);
    if (!user) throw new Error(`Usuário da ponte ${input.bridgeEmail} não existe no Traccar (rode deploy/single/gt06.sh init).`);
    await deps.traccar.linkDevice(user.id, device.id);
  }
  await deps.prisma.$transaction(async (tx) => {
    if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
    await tx.tracker.upsert({
      where: { thingName },
      create: { thingName, vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06' },
      update: { vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06', certificateArn: null },
    });
    // Um rastreador antigo da moto (outro thingName) é desvinculado.
    await tx.tracker.updateMany({ where: { vehicleId: vehicle.id, NOT: { thingName } }, data: { vehicleId: null } });
  });
  deps.log({ msg: 'tracker_linked', protocol: 'gt06', thingName, vehicleCode, traccarDevice: existing ? 'existing' : 'created' });
  return { deviceId: device.id, created: !existing };
}

function log(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), script: 'provision-gt06', ...entry })}\n`);
}

export async function main(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: { vehicle: { type: 'string' }, thing: { type: 'string' }, imei: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
  });
  const password = env.TRACCAR_ADMIN_PASSWORD;
  if (!password) throw new Error('TRACCAR_ADMIN_PASSWORD ausente');
  const traccar = traccarAdminApi(env.TRACCAR_URL || 'http://localhost:8082', env.TRACCAR_ADMIN_EMAIL || 'admin@volti.local', password);
  const prisma = new PrismaClient();
  try {
    await provisionGt06(
      { prisma, traccar, log },
      { vehicleCode: values.vehicle ?? '', thingName: values.thing ?? '', imei: values.imei ?? '', bridgeEmail: env.TRACCAR_BRIDGE_EMAIL || undefined, dryRun: values['dry-run'] },
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    log({ level: 'error', msg: 'provision_failed', error: (err as Error).message });
    process.exit(1);
  });
}
```

- [ ] **Step 4: `provision-tracker.ts --protocol gt06`**

No comentário do topo, acrescentar a linha:

```ts
 * GT06 só relé (spec 2026-10-27): --protocol gt06 --imei <15 dígitos> — sem thing nem certificado; Tracker relay_only e
 * dispositivo no Traccar (src/cli/provision-gt06.ts; env TRACCAR_URL, TRACCAR_ADMIN_EMAIL, TRACCAR_ADMIN_PASSWORD).
```

Import `import { main as provisionGt06Main } from '../src/cli/provision-gt06';`. Em `parseArgs.options`, acrescentar `protocol: { type: 'string' },`. Logo depois do `parseArgs`:

```ts
  if (values.protocol !== undefined && values.protocol !== 'gt06') throw new Error('--protocol aceita só gt06');
  if (values.protocol === 'gt06') {
    await provisionGt06Main(['--vehicle', values.vehicle ?? '', '--thing', values.thing ?? '', '--imei', values.imei ?? '', ...(values['dry-run'] ? ['--dry-run'] : [])]);
    return;
  }
```

- [ ] **Step 5: `iot-sim` sem motos só-relé**

Em `services/iot-sim/src/fleet-source.ts`, `FLEET_SQL` passa a ser:

```ts
export const FLEET_SQL = `SELECT v."thingName", v."status"::text AS "status", v."lat", v."lng", v."locked", v."speedLimitKmh", v."batteryPct",
  d."lat" AS "depotLat", d."lng" AS "depotLng"
FROM "Vehicle" v LEFT JOIN "Depot" d ON d."id" = v."depotId"
LEFT JOIN "Tracker" t ON t."vehicleId" = v."id"
WHERE t."controlMode" IS DISTINCT FROM 'relay_only'
ORDER BY v."thingName"`;
```

Em `services/iot-sim/README.md`, na seção da frota vinda do Postgres, acrescentar: `Motos com rastreador só relé (\`Tracker.controlMode = relay_only\`, GT06) não são simuladas: quem publica por elas é o J16 de verdade ou o emulador GT06 da ponte (\`services/traccar-bridge\`).`

- [ ] **Step 6: Rodar**

Run: `pnpm --filter api test -- provision-gt06`
Expected: PASS (9 testes).

Run: `pnpm --filter iot-sim test`
Expected: PASS (todos, inclusive `fleet-source.spec`).

Run: `pnpm --filter api lint` e `pnpm --filter iot-sim lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/cli services/api/scripts/provision-tracker.ts services/iot-sim
git commit -m "feat(api): provisionamento GT06 (Tracker relay_only + dispositivo no Traccar); iot-sim não simula relay_only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Ponte — pacote novo e mapeamento puro Traccar → contrato

**Files:**
- Create: `services/traccar-bridge/package.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.js`, `eslint.config.mjs`
- Create: `services/traccar-bridge/src/log.ts`, `src/units.ts`, `src/contract.ts`, `src/traccar/types.ts`, `src/mapping.ts`, `src/delta.ts`
- Test: `services/traccar-bridge/src/units.spec.ts`, `src/mapping.spec.ts`, `src/delta.spec.ts`, `src/log.spec.ts`

**Interfaces:**
- Consumes: JSON Schemas `packages/contracts/schemas/{telemetria,eventos,shadow-update}.schema.json` (só nos testes).
- Produces (usados pelas Tasks 9–11):
  - `log.ts`: `interface Logger { info(e: Record<string, unknown>): void; warn(...): void; error(...): void }`, `createLogger(service?: string, write?: (line: string) => void): Logger`, `silentLogger: Logger`, `maskImei(imei: string): string`
  - `units.ts`: `KNOT_TO_KMH = 1.852`, `knotsToKmh(kn: number): number` (1 casa), `rssiToSignal(rssi: number): number` (0–5), `type BatteryModel = '48v' | '60v' | '72v'`, `BATTERY_CURVES`, `voltageToPct(volts: number, model: BatteryModel): number | null`
  - `contract.ts`: `TOPICS` (telemetry, events, commands, shadowUpdate, shadowDelta, shadowGet, shadowGetAccepted, presenceConnected, presenceDisconnected), `FIXED_LIMIT_KMH = 32`, `type DeviceEventType`, `interface TelemetryMessage`, `interface DeviceEventMessage`, `interface ReportedState`, `interface DesiredDelta { travada?: boolean; limite_kmh?: number; modo_roubada?: boolean }`, `isValidTelemetry(t): boolean`, `thingOf(topic: string): string | null`
  - `traccar/types.ts`: `TraccarDevice { id; name; uniqueId; status?: 'online' | 'offline' | 'unknown'; model?: string | null }`, `TraccarPosition`, `TraccarEvent`, `TraccarSocketMessage { devices?; positions?; events? }`
  - `mapping.ts`: `interface DeviceMemory { blocked?; ignition?; signal?; batteryPct?; lastFixTime?; last?: { fixTime: number; speedKmh: number; lat: number; lng: number }; lockAnchor? }`, `MOVED_WHILE_LOCKED_M = 20`, `applyPosition(p, mem, battery): { telemetry: TelemetryMessage | null; invalid: boolean; movedWhileLocked: boolean; memory: DeviceMemory }`, `toDeviceEvents(e: TraccarEvent, mem: DeviceMemory, now: number): DeviceEventMessage[]`, `haversineM(a, b): number`
  - `delta.ts`: `type BridgeAction = { kind: 'engineStop' } | { kind: 'engineResume' } | { kind: 'report'; reported: ReportedState }`, `parseDelta(raw: unknown): DesiredDelta`, `planDelta(d: DesiredDelta): BridgeAction[]`, `planReconnect(d: DesiredDelta | undefined): BridgeAction[]`, `type CutRefusal = 'offline' | 'already_blocked' | 'recently_sent' | 'no_position' | 'stale' | 'moving'`, `CUT_FRESH_MS = 10_000`, `CUT_RESEND_MS = 30_000`, `cutRefusal(input: { online: boolean; mem: DeviceMemory; now: number; lastStopSentAt?: number }): CutRefusal | null`

- [ ] **Step 1: Pacote**

`services/traccar-bridge/package.json`:

```json
{
  "name": "traccar-bridge",
  "version": "0.1.0",
  "private": true,
  "description": "Ponte GT06 da Volti: Traccar (WebSocket + REST) → tópicos MQTT do contrato; inclui o emulador GT06 de testes.",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "dev": "tsx src/main.ts",
    "emulator": "tsx src/gt06/emulator-main.ts",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\" && tsc -p tsconfig.json --noEmit",
    "test": "jest --config jest.config.js"
  },
  "dependencies": {
    "mqtt": "5.10.1",
    "pg": "8.13.1",
    "ws": "8.21.3"
  },
  "devDependencies": {
    "@eslint/js": "9.17.0",
    "@types/jest": "29.5.14",
    "@types/node": "22.10.2",
    "@types/pg": "8.11.10",
    "@types/ws": "8.18.2",
    "ajv": "8.17.1",
    "ajv-formats": "3.0.1",
    "eslint": "9.17.0",
    "jest": "29.7.0",
    "ts-jest": "29.2.5",
    "tsx": "4.19.2",
    "typescript": "5.9.3",
    "typescript-eslint": "8.18.1"
  }
}
```

`services/traccar-bridge/tsconfig.json` (o e2e em processo importa código da API e fica fora do `tsc` desta pasta — só o ts-jest o transpila, Task 11):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "types": ["node", "jest"] },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["test/e2e/**"]
}
```

`services/traccar-bridge/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": ["node"] },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

`services/traccar-bridge/jest.config.js`:

```js
/** Testes da ponte (sem Docker): unidade em src/, integração e e2e em processo em test/. */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  testTimeout: 20000,
};
```

`services/traccar-bridge/eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
);
```

Run: `pnpm install`
Expected: termina sem erro; `pnpm-lock.yaml` ganha a seção `services/traccar-bridge` (com `ws 8.21.3` e `@types/ws 8.18.2`, que já estavam no lockfile como transitivas).

- [ ] **Step 2: Testes puros (falham)**

`services/traccar-bridge/src/units.spec.ts`:

```ts
import { knotsToKmh, rssiToSignal, voltageToPct } from './units';

describe('unidades', () => {
  it('nós → km/h (× 1,852, uma casa)', () => {
    expect(knotsToKmh(10.79914)).toBe(20);
    expect(knotsToKmh(2 / 1.852)).toBe(2);
    expect(knotsToKmh(0)).toBe(0);
  });
  it('rssi do Traccar (0–4 do GT06 ou 0–31 CSQ) → sinal 0–5 do contrato', () => {
    expect([0, 1, 2, 3, 4].map(rssiToSignal)).toEqual([0, 1, 3, 4, 5]);
    expect(rssiToSignal(31)).toBe(5);
    expect(rssiToSignal(15)).toBe(2);
    expect(rssiToSignal(-1)).toBe(0);
    expect(rssiToSignal(Number.NaN)).toBe(0);
  });
  it('tensão → % pela curva do pack (aproximado); fora da faixa (ex.: 12 V de DC-DC) = sem leitura', () => {
    expect(voltageToPct(84, '72v')).toBe(100);
    expect(voltageToPct(72, '72v')).toBe(50);
    expect(voltageToPct(60, '72v')).toBe(0);
    expect(voltageToPct(57, '60v')).toBe(47);
    expect(voltageToPct(12, '72v')).toBeNull();
    expect(voltageToPct(95, '72v')).toBeNull();
  });
});
```

`services/traccar-bridge/src/log.spec.ts`:

```ts
import { createLogger, maskImei } from './log';

describe('log', () => {
  it('JSON por linha, com nível e serviço; IMEI mascarado', () => {
    const lines: string[] = [];
    createLogger('traccar-bridge', (l) => void lines.push(l)).warn({ msg: 'x', imei: maskImei('860000000000901') });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: 'warn', service: 'traccar-bridge', msg: 'x', imei: '***********0901' });
    expect(lines[0]).not.toContain('860000000000901');
  });
});
```

`services/traccar-bridge/src/mapping.spec.ts`:

```ts
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyPosition, toDeviceEvents, type DeviceMemory } from './mapping';
import type { TraccarEvent, TraccarPosition } from './traccar/types';

const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));

const pos = (over: Partial<TraccarPosition> = {}): TraccarPosition => ({
  id: 1, deviceId: 1, protocol: 'gt06', serverTime: '2026-10-27T12:00:01.000Z', deviceTime: '2026-10-27T12:00:00.000Z', fixTime: '2026-10-27T12:00:00.000Z',
  outdated: false, valid: true, latitude: -23.5614, longitude: -46.6914, speed: 10.79914, course: 90,
  attributes: { ignition: true, blocked: false, rssi: 4, power: 72 }, ...over,
});

describe('applyPosition (spec GT06 §6.2)', () => {
  it('posição válida → telemetria do contrato: nós × 1,852, timestamp = fixTime, blocked/ignition/rssi/power', () => {
    const r = applyPosition(pos(), {}, '72v');
    expect(r.telemetry).toEqual({ lat: -23.5614, lng: -46.6914, velocidade_kmh: 20, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: '2026-10-27T12:00:00.000Z' });
    expect(validTelemetry(r.telemetry)).toBe(true);
    expect(r.memory.last).toEqual({ fixTime: Date.parse('2026-10-27T12:00:00.000Z'), speedKmh: 20, lat: -23.5614, lng: -46.6914 });
  });

  it('heartbeat (outdated) não vira telemetria, mas o bit de corte e a ignição valem para a próxima', () => {
    const hb = applyPosition(pos({ outdated: true, attributes: { blocked: true, ignition: false } }), {}, '72v');
    expect(hb.telemetry).toBeNull();
    expect(hb.memory).toMatchObject({ blocked: true, ignition: false });
    const next = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', speed: 0, attributes: {} }), hb.memory, '72v');
    expect(next.telemetry).toMatchObject({ travada: true, ignicao: false, velocidade_kmh: 0, sinal: 0, bateria_pct: 0 });
  });

  it('valid=false, fixTime repetido ou mais velho → sem telemetria', () => {
    expect(applyPosition(pos({ valid: false }), {}, '72v').telemetry).toBeNull();
    const first = applyPosition(pos(), {}, '72v');
    expect(applyPosition(pos(), first.memory, '72v').telemetry).toBeNull();
    expect(applyPosition(pos({ fixTime: '2026-10-27T11:59:59.000Z' }), first.memory, '72v').telemetry).toBeNull();
  });

  it('fora do schema (velocidade > 200 km/h) → invalid, sem telemetria e sem atualizar a última posição', () => {
    const r = applyPosition(pos({ speed: 200 }), {}, '72v');
    expect(r).toMatchObject({ telemetry: null, invalid: true });
    expect(r.memory.last).toBeUndefined();
  });

  it('tensão fora da curva (DC-DC 12 V) mantém o último % válido', () => {
    const a = applyPosition(pos(), {}, '72v');
    const b = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', attributes: { power: 12.1 } }), a.memory, '72v');
    expect(b.telemetry?.bateria_pct).toBe(50);
  });

  it('deslocamento > 20 m com o corte ativo → movedWhileLocked uma vez por âncora', () => {
    let mem: DeviceMemory = applyPosition(pos({ speed: 0, attributes: { blocked: true } }), {}, '72v').memory;
    const r1 = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', latitude: -23.5613, speed: 0, attributes: {} }), mem, '72v'); // ~11 m
    expect(r1.movedWhileLocked).toBe(false);
    mem = r1.memory;
    const r2 = applyPosition(pos({ fixTime: '2026-10-27T12:00:10.000Z', latitude: -23.5611, speed: 0, attributes: {} }), mem, '72v'); // ~33 m da âncora
    expect(r2.movedWhileLocked).toBe(true);
    const r3 = applyPosition(pos({ fixTime: '2026-10-27T12:00:15.000Z', latitude: -23.5611, speed: 0, attributes: {} }), r2.memory, '72v');
    expect(r3.movedWhileLocked).toBe(false);
  });
});

describe('toDeviceEvents (spec GT06 §6.3)', () => {
  const ev = (alarm: string): TraccarEvent => ({ id: 1, type: 'alarm', eventTime: '2026-10-27T12:00:00.000Z', deviceId: 1, attributes: { alarm } });
  const now = Date.parse('2026-10-27T12:00:30Z');

  it('powerCut → violacao; lowBattery/lowPower → bateria_critica; lista separada por vírgula sem repetir', () => {
    expect(toDeviceEvents(ev('powerCut'), {}, now)).toEqual([{ tipo: 'violacao', timestamp: '2026-10-27T12:00:00.000Z' }]);
    expect(toDeviceEvents(ev('lowPower,lowBattery'), {}, now)).toEqual([{ tipo: 'bateria_critica', timestamp: '2026-10-27T12:00:00.000Z' }]);
    for (const e of toDeviceEvents(ev('powerCut,lowBattery'), {}, now)) expect(validEvent(e)).toBe(true);
  });

  it('vibration só com o corte ativo vira movimento_sem_aluguel; sem correspondência → nada', () => {
    expect(toDeviceEvents(ev('vibration'), { blocked: false }, now)).toEqual([]);
    expect(toDeviceEvents(ev('vibration'), { blocked: true }, now)).toEqual([{ tipo: 'movimento_sem_aluguel', timestamp: '2026-10-27T12:00:00.000Z' }]);
    expect(toDeviceEvents(ev('sos'), {}, now)).toEqual([]);
    expect(toDeviceEvents({ ...ev('powerCut'), type: 'deviceMoving' }, {}, now)).toEqual([]);
  });
});
```

`services/traccar-bridge/src/delta.spec.ts`:

```ts
import { cutRefusal, parseDelta, planDelta, planReconnect } from './delta';

const now = Date.parse('2026-10-27T12:00:30Z');
const fresh = { last: { fixTime: now - 2_000, speedKmh: 0.5, lat: 0, lng: 0 } };

describe('delta do shadow → ações (spec GT06 §6.4)', () => {
  it('travada → engineStop/engineResume; limite_kmh nunca vira comando (reported 32 fixo); modo_roubada ecoado', () => {
    expect(planDelta({ travada: true })).toEqual([{ kind: 'engineStop' }]);
    expect(planDelta({ travada: false, limite_kmh: 0 })).toEqual([{ kind: 'engineResume' }, { kind: 'report', reported: { limite_kmh: 32 } }]);
    expect(planDelta({ limite_kmh: 6, modo_roubada: true })).toEqual([{ kind: 'report', reported: { limite_kmh: 32, modo_roubada: true } }]);
  });

  it('get da reconexão: só travada:false é reaplicado', () => {
    expect(planReconnect({ travada: true, limite_kmh: 6 })).toEqual([{ kind: 'report', reported: { limite_kmh: 32 } }]);
    expect(planReconnect({ travada: false })).toEqual([{ kind: 'engineResume' }]);
    expect(planReconnect(undefined)).toEqual([]);
  });

  it('parseDelta só aceita os campos do contrato com o tipo certo', () => {
    expect(parseDelta({ travada: 'sim', limite_kmh: 6, modo_roubada: true, x: 1 })).toEqual({ limite_kmh: 6, modo_roubada: true });
    expect(parseDelta(null)).toEqual({});
  });
});

describe('cutRefusal (segunda guarda da ponte)', () => {
  it('corta só online, sem corte ativo, sem envio recente e com posição de até 10 s abaixo de 3 km/h', () => {
    expect(cutRefusal({ online: true, mem: fresh, now })).toBeNull();
    expect(cutRefusal({ online: false, mem: fresh, now })).toBe('offline');
    expect(cutRefusal({ online: true, mem: { ...fresh, blocked: true }, now })).toBe('already_blocked');
    expect(cutRefusal({ online: true, mem: fresh, now, lastStopSentAt: now - 29_999 })).toBe('recently_sent');
    expect(cutRefusal({ online: true, mem: fresh, now, lastStopSentAt: now - 30_000 })).toBeNull();
    expect(cutRefusal({ online: true, mem: {}, now })).toBe('no_position');
    expect(cutRefusal({ online: true, mem: { last: { ...fresh.last, fixTime: now - 10_001 } }, now })).toBe('stale');
    expect(cutRefusal({ online: true, mem: { last: { ...fresh.last, speedKmh: 3 } }, now })).toBe('moving');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter traccar-bridge test`
Expected: FAIL — `Cannot find module './units'` (e os demais).

- [ ] **Step 4: `log.ts`, `units.ts`, `contract.ts`, `traccar/types.ts`**

`src/log.ts`:

```ts
/** Logs JSON por linha, sem dado pessoal; IMEI só mascarado (spec GT06 §6.5). */
export interface Logger {
  info(entry: Record<string, unknown>): void;
  warn(entry: Record<string, unknown>): void;
  error(entry: Record<string, unknown>): void;
}

export function maskImei(imei: string): string {
  return imei.length <= 4 ? '****' : `${'*'.repeat(imei.length - 4)}${imei.slice(-4)}`;
}

export function createLogger(service = 'traccar-bridge', write: (line: string) => void = (l) => void process.stdout.write(l)): Logger {
  const at = (level: 'info' | 'warn' | 'error') => (entry: Record<string, unknown>) => write(`${JSON.stringify({ ts: new Date().toISOString(), level, service, ...entry })}\n`);
  return { info: at('info'), warn: at('warn'), error: at('error') };
}

export const silentLogger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
```

`src/units.ts`:

```ts
/** O Traccar guarda a velocidade em nós (spec GT06 §6.2). */
export const KNOT_TO_KMH = 1.852;

export function knotsToKmh(knots: number): number {
  return Math.round(knots * KNOT_TO_KMH * 10) / 10;
}

/** `attributes.rssi` do Traccar: 0–4 no GT06 (força GSM) ou 0–31 (CSQ) em outros protocolos → `sinal` 0–5 do contrato. */
export function rssiToSignal(rssi: number): number {
  if (!Number.isFinite(rssi) || rssi <= 0) return 0;
  const scale = rssi <= 4 ? 4 : 31;
  return Math.max(0, Math.min(5, Math.round((rssi / scale) * 5)));
}

export type BatteryModel = '48v' | '60v' | '72v';

/** Pack Li-ion 13S/16S/20S, de 3,0 V (vazio) a 4,2 V (cheio) por célula. Aproximado: tensão sem carga, sem compensação. */
export const BATTERY_CURVES: Record<BatteryModel, { emptyV: number; fullV: number }> = {
  '48v': { emptyV: 39, fullV: 54.6 },
  '60v': { emptyV: 48, fullV: 67.2 },
  '72v': { emptyV: 60, fullV: 84 },
};

/** `null` = tensão fora da faixa plausível do pack (ex.: 12 V de um conversor DC-DC): sem leitura de bateria. */
export function voltageToPct(volts: number, model: BatteryModel): number | null {
  const { emptyV, fullV } = BATTERY_CURVES[model];
  if (!Number.isFinite(volts) || volts < emptyV * 0.8 || volts > fullV * 1.1) return null;
  return Math.max(0, Math.min(100, Math.round(((volts - emptyV) / (fullV - emptyV)) * 100)));
}
```

`src/contract.ts`:

```ts
/** Contrato MQTT (packages/contracts/mqtt.md e schemas/): o que a ponte publica e assina. Para a API nada muda (spec §6.1). */
export const TOPICS = {
  telemetry: (t: string) => `motos/${t}/telemetria`,
  events: (t: string) => `motos/${t}/eventos`,
  commands: (t: string) => `motos/${t}/comandos`,
  shadowUpdate: (t: string) => `$aws/things/${t}/shadow/update`,
  shadowDelta: (t: string) => `$aws/things/${t}/shadow/update/delta`,
  shadowGet: (t: string) => `$aws/things/${t}/shadow/get`,
  shadowGetAccepted: (t: string) => `$aws/things/${t}/shadow/get/accepted`,
  presenceConnected: (t: string) => `$aws/events/presence/connected/${t}`,
  presenceDisconnected: (t: string) => `$aws/events/presence/disconnected/${t}`,
} as const;

/** GT06 não limita velocidade: o reported traz o máximo legal, garantido pelo controlador da moto (spec §1.4). */
export const FIXED_LIMIT_KMH = 32;

export type DeviceEventType = 'queda' | 'violacao' | 'bateria_critica' | 'movimento_sem_aluguel';

export interface TelemetryMessage {
  lat: number;
  lng: number;
  velocidade_kmh: number;
  bateria_pct: number;
  travada: boolean;
  ignicao: boolean;
  sinal: number;
  timestamp: string;
}

export interface DeviceEventMessage {
  tipo: DeviceEventType;
  timestamp: string;
}

export interface ReportedState {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
  firmware?: string;
  velocidade_kmh?: number;
}

export interface DesiredDelta {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
}

const inRange = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;

/** Espelha `telemetria.schema.json` (a API descarta o que não passar, com log `telemetry_invalid`). */
export function isValidTelemetry(t: TelemetryMessage): boolean {
  return (
    inRange(t.lat, -90, 90) &&
    inRange(t.lng, -180, 180) &&
    inRange(t.velocidade_kmh, 0, 200) &&
    inRange(t.bateria_pct, 0, 100) &&
    typeof t.travada === 'boolean' &&
    typeof t.ignicao === 'boolean' &&
    Number.isInteger(t.sinal) &&
    inRange(t.sinal, 0, 5) &&
    !Number.isNaN(Date.parse(t.timestamp))
  );
}

export function thingOf(topic: string): string | null {
  const p = topic.split('/');
  if (p[0] === 'motos' && p.length === 3) return p[1] || null;
  if (p[0] === '$aws' && p[1] === 'things' && p.length >= 4) return p[2] || null;
  return null;
}
```

`src/traccar/types.ts`:

```ts
/** Formatos da API do Traccar 6 (REST `/api/devices` e mensagens do WebSocket `/api/socket`). Só os campos usados. */
export interface TraccarDevice {
  id: number;
  name: string;
  /** IMEI no GT06. */
  uniqueId: string;
  status?: 'online' | 'offline' | 'unknown';
  model?: string | null;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol?: string;
  serverTime: string;
  deviceTime: string;
  /** Hora da medição (GPS), UTC. */
  fixTime: string;
  /** Posição repetida da última conhecida (heartbeat/status do GT06), não uma medição nova. */
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  /** Nós. */
  speed: number;
  course?: number;
  attributes: { blocked?: boolean; ignition?: boolean; rssi?: number; power?: number; [k: string]: unknown };
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  attributes: { alarm?: string; [k: string]: unknown };
}

export interface TraccarSocketMessage {
  devices?: TraccarDevice[];
  positions?: TraccarPosition[];
  events?: TraccarEvent[];
}
```

- [ ] **Step 5: `mapping.ts` e `delta.ts`**

`src/mapping.ts`:

```ts
import { isValidTelemetry, type DeviceEventMessage, type DeviceEventType, type TelemetryMessage } from './contract';
import type { TraccarEvent, TraccarPosition } from './traccar/types';
import { knotsToKmh, rssiToSignal, voltageToPct, type BatteryModel } from './units';

/** Estado por moto mantido pela ponte (só a moto: nada do cliente). */
export interface DeviceMemory {
  blocked?: boolean;
  ignition?: boolean;
  signal?: number;
  batteryPct?: number;
  /** `fixTime` (ms) da última telemetria publicada: só sai telemetria mais nova. */
  lastFixTime?: number;
  /** Última posição válida publicada: base da segunda guarda do corte e do `reported.velocidade_kmh`. */
  last?: { fixTime: number; speedKmh: number; lat: number; lng: number };
  /** Onde a moto estava quando o corte foi visto (deslocamento > 20 m travada → `movimento_sem_aluguel`). */
  lockAnchor?: { lat: number; lng: number };
}

export const MOVED_WHILE_LOCKED_M = 20;

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Posição do Traccar → telemetria do contrato (spec §6.2). Todo atributo conhecido atualiza a memória (inclusive de heartbeat);
 * só posição válida, não `outdated` e com `fixTime` mais novo que a última publicada vira telemetria.
 */
export function applyPosition(
  p: TraccarPosition,
  mem: DeviceMemory,
  battery: BatteryModel,
): { telemetry: TelemetryMessage | null; invalid: boolean; movedWhileLocked: boolean; memory: DeviceMemory } {
  const next: DeviceMemory = { ...mem };
  const a = p.attributes ?? {};
  if (typeof a.blocked === 'boolean') next.blocked = a.blocked;
  if (typeof a.ignition === 'boolean') next.ignition = a.ignition;
  if (typeof a.rssi === 'number') next.signal = rssiToSignal(a.rssi);
  if (typeof a.power === 'number') {
    const pct = voltageToPct(a.power, battery);
    if (pct !== null) next.batteryPct = pct;
  }
  if (next.blocked !== true) next.lockAnchor = undefined;
  const none = { telemetry: null, invalid: false, movedWhileLocked: false, memory: next };
  const fixTime = Date.parse(p.fixTime);
  if (!p.valid || p.outdated || !Number.isFinite(fixTime)) return none;
  if (next.lastFixTime !== undefined && fixTime <= next.lastFixTime) return none;
  const speedKmh = knotsToKmh(p.speed);
  const telemetry: TelemetryMessage = {
    lat: p.latitude,
    lng: p.longitude,
    velocidade_kmh: speedKmh,
    bateria_pct: next.batteryPct ?? 0,
    travada: next.blocked ?? false,
    ignicao: next.ignition ?? false,
    sinal: next.signal ?? 0,
    timestamp: new Date(fixTime).toISOString(),
  };
  if (!isValidTelemetry(telemetry)) return { ...none, invalid: true };
  next.lastFixTime = fixTime;
  next.last = { fixTime, speedKmh, lat: p.latitude, lng: p.longitude };
  let movedWhileLocked = false;
  if (next.blocked === true) {
    const here = { lat: p.latitude, lng: p.longitude };
    if (!next.lockAnchor) next.lockAnchor = here;
    else if (haversineM(next.lockAnchor, here) > MOVED_WHILE_LOCKED_M) {
      movedWhileLocked = true;
      next.lockAnchor = here;
    }
  }
  return { telemetry, invalid: false, movedWhileLocked, memory: next };
}

const ALARMS: Record<string, DeviceEventType> = {
  powerCut: 'violacao',
  lowBattery: 'bateria_critica',
  lowPower: 'bateria_critica',
  vibration: 'movimento_sem_aluguel',
};

/** Alarme do Traccar → eventos do contrato (spec §6.3). `vibration` só com o corte ativo; sem correspondência → nada. */
export function toDeviceEvents(e: TraccarEvent, mem: DeviceMemory, now: number): DeviceEventMessage[] {
  if (e.type !== 'alarm') return [];
  const at = Date.parse(e.eventTime);
  const timestamp = new Date(Number.isFinite(at) ? at : now).toISOString();
  const tipos = new Set<DeviceEventType>();
  for (const alarm of String(e.attributes?.alarm ?? '').split(',')) {
    const tipo = ALARMS[alarm.trim()];
    if (!tipo || (tipo === 'movimento_sem_aluguel' && mem.blocked !== true)) continue;
    tipos.add(tipo);
  }
  return [...tipos].map((tipo) => ({ tipo, timestamp }));
}
```

`src/delta.ts`:

```ts
import { FIXED_LIMIT_KMH, type DesiredDelta, type ReportedState } from './contract';
import type { DeviceMemory } from './mapping';

export type BridgeAction = { kind: 'engineStop' } | { kind: 'engineResume' } | { kind: 'report'; reported: ReportedState };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseDelta(raw: unknown): DesiredDelta {
  if (!isObj(raw)) return {};
  const out: DesiredDelta = {};
  if (typeof raw.travada === 'boolean') out.travada = raw.travada;
  if (typeof raw.limite_kmh === 'number' && Number.isFinite(raw.limite_kmh)) out.limite_kmh = raw.limite_kmh;
  if (typeof raw.modo_roubada === 'boolean') out.modo_roubada = raw.modo_roubada;
  return out;
}

/** Delta do shadow → ações (spec §6.4). `limite_kmh` nunca vira comando: só o reported com o limite fixo. */
export function planDelta(d: DesiredDelta): BridgeAction[] {
  const out: BridgeAction[] = [];
  if (d.travada === true) out.push({ kind: 'engineStop' });
  if (d.travada === false) out.push({ kind: 'engineResume' });
  const reported: ReportedState = {};
  if (d.limite_kmh !== undefined) reported.limite_kmh = FIXED_LIMIT_KMH;
  if (d.modo_roubada !== undefined) reported.modo_roubada = d.modo_roubada;
  if (Object.keys(reported).length) out.push({ kind: 'report', reported });
  return out;
}

/** `get/accepted` da reconexão: só `travada: false` pendente é reaplicado; `true` nunca (a API recomeça o fluxo, §5.7). */
export function planReconnect(d: DesiredDelta | undefined): BridgeAction[] {
  if (!d) return [];
  const { travada, ...rest } = d;
  return planDelta(travada === false ? { ...rest, travada } : rest);
}

export type CutRefusal = 'offline' | 'already_blocked' | 'recently_sent' | 'no_position' | 'stale' | 'moving';
export const CUT_FRESH_MS = 10_000;
export const CUT_RESEND_MS = 30_000;

/**
 * Segunda guarda (a primeira é a API): `engineStop` só com o dispositivo online no Traccar, sem corte ativo, sem outro
 * `engineStop` nos últimos 30 s e com a posição mais recente de até 10 s abaixo de 3 km/h. `null` = pode cortar.
 */
export function cutRefusal(input: { online: boolean; mem: DeviceMemory; now: number; lastStopSentAt?: number }): CutRefusal | null {
  if (!input.online) return 'offline';
  if (input.mem.blocked === true) return 'already_blocked';
  if (input.lastStopSentAt !== undefined && input.now - input.lastStopSentAt < CUT_RESEND_MS) return 'recently_sent';
  const last = input.mem.last;
  if (!last) return 'no_position';
  if (input.now - Math.min(last.fixTime, input.now) > CUT_FRESH_MS) return 'stale';
  if (!(last.speedKmh < 3)) return 'moving';
  return null;
}
```

- [ ] **Step 6: Rodar**

Run: `pnpm --filter traccar-bridge test`
Expected: PASS (units 3, log 1, mapping 8, delta 4).

Run: `pnpm --filter traccar-bridge lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add services/traccar-bridge pnpm-lock.yaml
git commit -m "feat(traccar-bridge): pacote da ponte GT06 e mapeamento Traccar → contrato MQTT

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ponte — Traccar (REST/WebSocket), registro, MQTT e orquestração

**Files:**
- Create: `services/traccar-bridge/src/config.ts`, `src/traccar/rest.ts`, `src/traccar/socket.ts`, `src/registry.ts`, `src/mqtt.ts`, `src/bridge.ts`, `src/main.ts`
- Create: `services/traccar-bridge/Dockerfile`, `services/traccar-bridge/README.md`
- Test: `services/traccar-bridge/src/config.spec.ts`, `src/registry.spec.ts`, `test/wait.ts`, `test/fake-broker.ts`, `test/fake-traccar.ts`, `test/bridge.int.spec.ts`

**Interfaces:**
- Consumes (Task 8): `TOPICS`, `thingOf`, `ReportedState`, `applyPosition`, `toDeviceEvents`, `DeviceMemory`, `parseDelta`, `planDelta`, `planReconnect`, `cutRefusal`, `CUT_FRESH_MS`, `Logger`, `maskImei`, `silentLogger`, tipos do Traccar.
- Produces (Tasks 10–14):
  - `config.ts`: `interface BridgeConfig { iotMode: 'local' | 'aws'; mqttUrl: string; mqttClientId: string; mqttCertPem?: string; mqttKeyPem?: string; traccarUrl: string; traccarEmail: string; traccarPassword: string; traccarBootstrapAdmin: boolean; database: PoolConfigLike; battery: BatteryModel; registryRefreshMs: number }`, `type PoolConfigLike`, `loadConfig(env?): BridgeConfig`
  - `traccar/rest.ts`: `class TraccarRest(baseUrl, email, password, fetchImpl?)` com `login(): Promise<string>` (cookie `JSESSIONID=...`), `devices(): Promise<TraccarDevice[]>`, `sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'>`, `bootstrapFirstUser(name: string): Promise<boolean>`
  - `traccar/socket.ts`: `class TraccarSocket(baseUrl, rest: Pick<TraccarRest, 'login'>, onMessage: (m: TraccarSocketMessage) => void, log: Logger, onOpen?: () => void)` com `connect(): Promise<void>`, `close(): void`
  - `registry.ts`: `REGISTRY_SQL`, `type Query`, `class PgRegistry(query: Query)` com `things(): Promise<Map<string, string>>` (IMEI → thingName), `pgQuery(cfg: PoolConfigLike): Query`
  - `mqtt.ts`: `interface MqttLike { publishAsync(topic, payload, opts?); subscribeAsync(topics, opts?); on(event: 'message', cb); on(event: 'connect', cb); endAsync(force?) }`, `connectMqtt(cfg: BridgeConfig): MqttLike`
  - `bridge.ts`: `interface TraccarApi { devices(); sendCommand(deviceId, type) }`, `interface Registry { things(): Promise<Map<string, string>> }`, `interface BridgeOptions { iotMode: 'local' | 'aws'; battery: BatteryModel; now?: () => number; log?: Logger }`, `class Bridge(mqtt: MqttLike, traccar: TraccarApi, registry: Registry, opts: BridgeOptions)` com `start()`, `refreshDevices()`, `refreshRegistry()`, `resubscribe()`, `enqueue(msg: TraccarSocketMessage): Promise<void>`, `onTraccar(msg): Promise<void>`
  - `test/fake-broker.ts`: `class FakeBroker { log: Array<{ from: string; topic: string; payload: string }>; client(id: string): FakeMqttClient }`, `topicMatches(filter, topic)`; `test/fake-traccar.ts`: `class FakeTraccar { url; devices; commands; queueCommands; start(); push(msg); stop() }`, `position(over): TraccarPosition`; `test/wait.ts`: `waitFor(cond: () => boolean, timeoutMs?: number): Promise<void>`

- [ ] **Step 1: Utilitários de teste (servidores falsos em processo, sem Docker)**

`services/traccar-bridge/test/wait.ts`:

```ts
/** Espera (tempo real) até `cond` valer; falha com timeout. Para I/O em processo (WebSocket, TCP, broker falso). */
export async function waitFor(cond: () => boolean, timeoutMs = 3_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > until) throw new Error('waitFor: timeout');
    await new Promise((r) => setTimeout(r, 5));
  }
}
```

`services/traccar-bridge/test/fake-broker.ts`:

```ts
/** Broker MQTT em memória (curingas + e #), na ordem de publicação. Serve à ponte e ao LocalMqttTransport da API. */
export function topicMatches(filter: string, topic: string): boolean {
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length || (f[i] !== '+' && f[i] !== t[i])) return false;
  }
  return f.length === t.length;
}

export class FakeMqttClient {
  connected = true;
  private readonly filters = new Set<string>();
  private readonly handlers: Record<string, Array<(...args: any[]) => void>> = {};

  constructor(
    private readonly broker: FakeBroker,
    readonly id: string,
  ) {}

  on(event: string, cb: (...args: any[]) => void): this {
    (this.handlers[event] ??= []).push(cb);
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.handlers[event] ?? []) cb(...args);
  }
  matches(topic: string): boolean {
    return [...this.filters].some((f) => topicMatches(f, topic));
  }
  async publishAsync(topic: string, payload: string): Promise<void> {
    this.broker.deliver(this.id, topic, payload);
  }
  async subscribeAsync(topics: string[]): Promise<void> {
    for (const t of topics) this.filters.add(t);
  }
  async endAsync(): Promise<void> {
    this.connected = false;
  }
}

export class FakeBroker {
  readonly log: Array<{ from: string; topic: string; payload: string }> = [];
  private readonly clients = new Set<FakeMqttClient>();

  client(id: string): FakeMqttClient {
    const c = new FakeMqttClient(this, id);
    this.clients.add(c);
    queueMicrotask(() => c.emit('connect'));
    return c;
  }

  deliver(from: string, topic: string, payload: string): void {
    this.log.push({ from, topic, payload });
    for (const c of this.clients) if (c.id !== from && c.connected && c.matches(topic)) queueMicrotask(() => c.emit('message', topic, Buffer.from(payload)));
  }
}
```

`services/traccar-bridge/test/fake-traccar.ts`:

```ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import type { TraccarDevice, TraccarPosition, TraccarSocketMessage } from '../src/traccar/types';

const SESSION = 'JSESSIONID=fake-session';

/** Traccar falso (HTTP + WebSocket em 127.0.0.1, porta aleatória): sessão, dispositivos, comandos e o /api/socket. */
export class FakeTraccar {
  url = '';
  devices: TraccarDevice[] = [];
  readonly commands: Array<{ deviceId: number; type: string }> = [];
  /** `true` = responde 202 (comando enfileirado para dispositivo offline). */
  queueCommands = false;
  private server?: Server;
  private wss?: WebSocketServer;
  private readonly sockets = new Set<WebSocket>();

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    this.wss = new WebSocketServer({ noServer: true });
    this.server.on('upgrade', (req, socket, head) => {
      if (req.url !== '/api/socket' || !(req.headers.cookie ?? '').includes(SESSION)) {
        socket.destroy();
        return;
      }
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.sockets.add(ws);
        ws.on('close', () => this.sockets.delete(ws));
        ws.send(JSON.stringify({ devices: this.devices }));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
    });
    const json = (status: number, v: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(v));
    if (req.method === 'POST' && req.url === '/api/session') {
      const p = new URLSearchParams(body);
      if (p.get('email') !== 'bridge@volti.local' || p.get('password') !== 'secret') return void res.writeHead(401).end();
      return void res.writeHead(200, { 'Set-Cookie': `${SESSION}; Path=/; HttpOnly`, 'Content-Type': 'application/json' }).end('{}');
    }
    if (!(req.headers.cookie ?? '').includes(SESSION)) return void res.writeHead(401).end();
    if (req.method === 'GET' && req.url === '/api/devices') return json(200, this.devices);
    if (req.method === 'POST' && req.url === '/api/commands/send') {
      const c = JSON.parse(body) as { deviceId: number; type: string };
      this.commands.push({ deviceId: c.deviceId, type: c.type });
      return json(this.queueCommands ? 202 : 200, c);
    }
    res.writeHead(404).end();
  }

  /** Mensagem do WebSocket do Traccar para todos os clientes conectados. */
  push(msg: TraccarSocketMessage): void {
    for (const ws of this.sockets) ws.send(JSON.stringify(msg));
  }

  async stop(): Promise<void> {
    for (const ws of this.sockets) ws.terminate();
    this.wss?.close();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
  }
}

export function position(over: Partial<TraccarPosition> & { deviceId: number; fixTime: string }): TraccarPosition {
  return {
    id: 1, protocol: 'gt06', serverTime: over.fixTime, deviceTime: over.fixTime, outdated: false, valid: true,
    latitude: -23.5614, longitude: -46.6914, speed: 0, course: 0, attributes: { ignition: true, blocked: false, rssi: 4, power: 72 },
    ...over,
  };
}
```

- [ ] **Step 2: Teste de integração da ponte (falha)**

`services/traccar-bridge/test/bridge.int.spec.ts`:

```ts
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bridge } from '../src/bridge';
import { silentLogger, type Logger } from '../src/log';
import { TraccarRest } from '../src/traccar/rest';
import { TraccarSocket } from '../src/traccar/socket';
import { FakeBroker, type FakeMqttClient } from './fake-broker';
import { FakeTraccar, position } from './fake-traccar';
import { waitFor } from './wait';

const IMEI = '860000000000901';
const OTHER_IMEI = '860000000000999';
const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));
const validUpdate = ajv.compile(schema('shadow-update.schema.json'));

interface Ctx { traccar: FakeTraccar; broker: FakeBroker; api: FakeMqttClient; socket: TraccarSocket; now: { value: number }; logs: Array<Record<string, unknown>> }

async function start(iotMode: 'local' | 'aws' = 'local'): Promise<Ctx> {
  const traccar = new FakeTraccar();
  await traccar.start();
  traccar.devices = [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }, { id: 2, name: 'outro', uniqueId: OTHER_IMEI, status: 'online' }];
  const broker = new FakeBroker();
  const api = broker.client('api'); // faz o papel da API e do shadow: vê tudo o que a ponte publica
  await api.subscribeAsync(['#']);
  const now = { value: T0 };
  const logs: Array<Record<string, unknown>> = [];
  const log: Logger = { info: (e) => void logs.push({ level: 'info', ...e }), warn: (e) => void logs.push({ level: 'warn', ...e }), error: (e) => void logs.push({ level: 'error', ...e }) };
  const rest = new TraccarRest(traccar.url, 'bridge@volti.local', 'secret');
  const bridge = new Bridge(broker.client('bridge'), rest, { things: async () => new Map([[IMEI, T]]) }, { iotMode, battery: '72v', now: () => now.value, log });
  await bridge.start();
  const socket = new TraccarSocket(traccar.url, rest, (m) => void bridge.enqueue(m), silentLogger);
  await socket.connect();
  return { traccar, broker, api, socket, now, logs };
}

const out = (c: Ctx, topic: string) => c.broker.log.filter((m) => m.from === 'bridge' && m.topic === topic).map((m) => JSON.parse(m.payload));
const sendDelta = (c: Ctx, state: Record<string, unknown>) => c.api.publishAsync(`$aws/things/${T}/shadow/update/delta`, JSON.stringify({ state, version: 1, timestamp: 1 }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Bridge (Traccar falso + broker em memória)', () => {
  let c: Ctx;
  afterEach(async () => {
    c.socket.close();
    await c.traccar.stop();
  });

  it('posição → motos/{t}/telemetria no schema do contrato (nós × 1,852, timestamp = fixTime)', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 10, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 10.79914 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const [t] = out(c, `motos/${T}/telemetria`);
    expect(t).toEqual({ lat: -23.5614, lng: -46.6914, velocidade_kmh: 20, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: iso(T0 - 1_000) });
    expect(validTelemetry(t)).toBe(true);
  });

  it('inválida/outdated não vira telemetria; dispositivo fora do registro é descartado e o log não tem o IMEI completo', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 11, deviceId: 1, fixTime: iso(T0), valid: false }), position({ id: 12, deviceId: 1, fixTime: iso(T0 + 1), outdated: true }), position({ id: 13, deviceId: 2, fixTime: iso(T0) })] });
    await waitFor(() => c.logs.some((l) => l.msg === 'traccar_unknown_device'));
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
    expect(JSON.stringify(c.logs)).not.toContain(OTHER_IMEI);
  });

  it('alarmes: powerCut → violacao, lowPower → bateria_critica; desconhecido descartado com log', async () => {
    c = await start();
    c.traccar.push({
      events: [
        { id: 1, type: 'alarm', deviceId: 1, eventTime: iso(T0), attributes: { alarm: 'powerCut' } },
        { id: 2, type: 'alarm', deviceId: 1, eventTime: iso(T0 + 1_000), attributes: { alarm: 'lowPower' } },
        { id: 3, type: 'alarm', deviceId: 1, eventTime: iso(T0 + 2_000), attributes: { alarm: 'sos' } },
      ],
    });
    await waitFor(() => out(c, `motos/${T}/eventos`).length === 2 && c.logs.some((l) => l.msg === 'alarm_ignored'));
    expect(out(c, `motos/${T}/eventos`)).toEqual([{ tipo: 'violacao', timestamp: iso(T0) }, { tipo: 'bateria_critica', timestamp: iso(T0 + 1_000) }]);
    for (const e of out(c, `motos/${T}/eventos`)) expect(validEvent(e)).toBe(true);
  });

  it('delta travada:true com posição fresca parada → engineStop uma vez; reported só com o bit blocked da posição seguinte', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 20, deviceId: 1, fixTime: iso(T0 - 2_000), serverTime: iso(T0 - 1_000), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const reportedBefore = out(c, `$aws/things/${T}/shadow/update`).length;
    await sendDelta(c, { travada: true });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    await sendDelta(c, { travada: true, modo_roubada: false }); // delta repetido (outro campo): não reenvia em 30 s
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'recently_sent'));
    expect(c.traccar.commands).toHaveLength(1);
    expect(out(c, `$aws/things/${T}/shadow/update`).filter((u) => u.state.reported.travada === true)).toEqual([]); // aceite ≠ corte
    c.now.value = T0 + 3_000;
    c.traccar.push({ positions: [position({ id: 21, deviceId: 1, fixTime: iso(T0 - 2_000), serverTime: iso(T0 + 3_000), outdated: true, attributes: { blocked: true, ignition: true } })] });
    await waitFor(() => out(c, `$aws/things/${T}/shadow/update`).some((u) => u.state.reported.travada === true));
    const last = out(c, `$aws/things/${T}/shadow/update`).pop();
    expect(last).toEqual({ state: { reported: { travada: true, velocidade_kmh: 0 } } });
    expect(validUpdate(last)).toBe(true);
    expect(out(c, `$aws/things/${T}/shadow/update`).length).toBeGreaterThan(reportedBefore);
  });

  it.each([
    ['andando (15 km/h)', 8.1, T0 - 1_000, 'moving'],
    ['com posição velha (11 s)', 0, T0 - 11_000, 'stale'],
  ])('delta travada:true %s → recusa da segunda guarda e nenhum comando', async (_name, knots, fixTime, reason) => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 30, deviceId: 1, fixTime: iso(fixTime), serverTime: iso(T0), speed: knots })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === reason));
    expect(c.traccar.commands).toEqual([]);
  });

  it('dispositivo offline no Traccar → presença disconnected e corte recusado (offline)', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 40, deviceId: 1, fixTime: iso(T0 - 1_000), speed: 0 })] });
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }] });
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'offline'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('delta limite_kmh → nenhum comando, reported 32; travada:false → engineResume; modo_roubada ecoado', async () => {
    c = await start();
    await sendDelta(c, { travada: false, limite_kmh: 6, modo_roubada: true });
    await waitFor(() => c.traccar.commands.length === 1 && out(c, `$aws/things/${T}/shadow/update`).length >= 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
    expect(out(c, `$aws/things/${T}/shadow/update`)).toContainEqual({ state: { reported: { limite_kmh: 32, modo_roubada: true } } });
  });

  it('reconexão: presença connected, reported completo e get; do get só travada:false é reaplicado', async () => {
    c = await start();
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }] });
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    c.traccar.push({ events: [{ id: 5, type: 'deviceOnline', deviceId: 1, eventTime: iso(T0), attributes: {} }] });
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
    expect(out(c, `$aws/events/presence/connected/${T}`)).toHaveLength(1);
    expect(out(c, `$aws/things/${T}/shadow/update`)).toContainEqual({ state: { reported: { travada: false, limite_kmh: 32, modo_roubada: false, firmware: 'gt06' } } });
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: true }, reported: {}, delta: { travada: true } }, version: 3 }));
    await sleep(50);
    expect(c.traccar.commands).toEqual([]);
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }] });
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }] });
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 2);
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: false }, reported: { travada: true }, delta: { travada: false } }, version: 4 }));
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
  });

  it('buzina em motos/{t}/comandos é ignorada com log', async () => {
    c = await start();
    await c.api.publishAsync(`motos/${T}/comandos`, JSON.stringify({ comando_id: 'h1', acao: 'buzina' }));
    await waitFor(() => c.logs.some((l) => l.msg === 'command_ignored_no_horn'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('modo aws: sem tópicos de presença (o IoT Core gera os eventos de ciclo de vida)', async () => {
    c = await start('aws');
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }] });
    c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }] });
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
    expect(c.broker.log.filter((m) => m.topic.startsWith('$aws/events/presence/'))).toEqual([]);
  });
});
```

`services/traccar-bridge/src/config.spec.ts`:

```ts
import { loadConfig } from './config';

const base = { TRACCAR_URL: 'http://traccar:8082', TRACCAR_EMAIL: 'bridge@volti.local', TRACCAR_PASSWORD: 'x', DATABASE_URL: 'postgresql://volti_bridge:y@postgres:5432/volti' };

describe('loadConfig', () => {
  it('local: Mosquitto sem TLS, bateria 72v e registro a cada 60 s por padrão', () => {
    expect(loadConfig(base)).toMatchObject({ iotMode: 'local', mqttUrl: 'mqtt://localhost:1883', mqttClientId: 'traccar-bridge', battery: '72v', registryRefreshMs: 60_000, traccarBootstrapAdmin: false, database: { connectionString: base.DATABASE_URL } });
  });
  it('aws: mqtts no endpoint do IoT Core e certificado de serviço obrigatório; banco por partes com SSL', () => {
    expect(() => loadConfig({ ...base, IOT_MODE: 'aws', IOT_ENDPOINT: 'abc-ats.iot.sa-east-1.amazonaws.com' })).toThrow('MQTT_CERT_PEM');
    const cfg = loadConfig({ ...base, DATABASE_URL: undefined, IOT_MODE: 'aws', IOT_ENDPOINT: 'https://abc-ats.iot.sa-east-1.amazonaws.com', MQTT_CERT_PEM: 'c', MQTT_KEY_PEM: 'k', MQTT_CLIENT_ID: 'traccar-bridge-dev', DATABASE_HOST: 'db', DATABASE_USER: 'volti_bridge', DATABASE_PASSWORD: 'p', DATABASE_SSL: 'require' });
    expect(cfg).toMatchObject({ mqttUrl: 'mqtts://abc-ats.iot.sa-east-1.amazonaws.com:8883', mqttClientId: 'traccar-bridge-dev', database: { host: 'db', port: 5432, database: 'volti', user: 'volti_bridge', password: 'p', ssl: { rejectUnauthorized: false } } });
  });
  it('erros de configuração', () => {
    expect(() => loadConfig({ ...base, TRACCAR_PASSWORD: undefined })).toThrow('TRACCAR_PASSWORD ausente');
    expect(() => loadConfig({ ...base, IOT_MODE: 'stub' })).toThrow('IOT_MODE deve ser local ou aws');
    expect(() => loadConfig({ ...base, BATTERY_MODEL: '36v' })).toThrow('BATTERY_MODEL deve ser 48v, 60v ou 72v');
  });
});
```

`services/traccar-bridge/src/registry.spec.ts`:

```ts
import { PgRegistry, REGISTRY_SQL } from './registry';

describe('PgRegistry', () => {
  it('IMEI → thingName só de rastreadores relay_only com IMEI; lê só as colunas liberadas ao papel volti_bridge', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ imei: '860000000000901', thingName: 'moto-0901' }] });
    expect(await new PgRegistry(query).things()).toEqual(new Map([['860000000000901', 'moto-0901']]));
    expect(query).toHaveBeenCalledWith(REGISTRY_SQL);
    expect(REGISTRY_SQL).toBe(`SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`);
  });
});
```

Run: `pnpm --filter traccar-bridge test`
Expected: FAIL — `Cannot find module '../src/bridge'` (e `./config`, `./registry`).

- [ ] **Step 3: `config.ts`, `registry.ts`, `mqtt.ts`**

`src/config.ts`:

```ts
import type { BatteryModel } from './units';

export type PoolConfigLike =
  | { connectionString: string }
  | { host: string; port: number; database: string; user: string; password: string; ssl?: { rejectUnauthorized: boolean } };

export interface BridgeConfig {
  iotMode: 'local' | 'aws';
  mqttUrl: string;
  mqttClientId: string;
  mqttCertPem?: string;
  mqttKeyPem?: string;
  traccarUrl: string;
  traccarEmail: string;
  traccarPassword: string;
  /** Só no docker-compose local: cria o primeiro usuário do Traccar (vira admin) com estas credenciais. */
  traccarBootstrapAdmin: boolean;
  database: PoolConfigLike;
  battery: BatteryModel;
  registryRefreshMs: number;
}

const BATTERIES: BatteryModel[] = ['48v', '60v', '72v'];

/** Variáveis de ambiente (nenhum segredo no código: senhas e certificado vêm do ambiente / Secrets Manager). */
export function loadConfig(env: Record<string, string | undefined> = process.env): BridgeConfig {
  const need = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`${k} ausente`);
    return v;
  };
  const mode = env.IOT_MODE ?? 'local';
  if (mode !== 'local' && mode !== 'aws') throw new Error('IOT_MODE deve ser local ou aws');
  const battery = (env.BATTERY_MODEL ?? '72v') as BatteryModel;
  if (!BATTERIES.includes(battery)) throw new Error('BATTERY_MODEL deve ser 48v, 60v ou 72v');
  if (mode === 'aws' && (!env.MQTT_CERT_PEM || !env.MQTT_KEY_PEM)) throw new Error('IOT_MODE=aws exige MQTT_CERT_PEM e MQTT_KEY_PEM (certificado de serviço da ponte)');
  const mqttUrl = env.MQTT_URL || (mode === 'aws' ? `mqtts://${need('IOT_ENDPOINT').replace(/^https?:\/\//, '')}:8883` : 'mqtt://localhost:1883');
  const database: PoolConfigLike = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: need('DATABASE_HOST'),
        port: Number(env.DATABASE_PORT ?? 5432),
        database: env.DATABASE_NAME ?? 'volti',
        user: need('DATABASE_USER'),
        password: need('DATABASE_PASSWORD'),
        // Cifrado; a verificação da CA da RDS fica como pendência antes de produção (docs/decisoes.md).
        ...(env.DATABASE_SSL === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
      };
  return {
    iotMode: mode,
    mqttUrl,
    mqttClientId: env.MQTT_CLIENT_ID || 'traccar-bridge',
    mqttCertPem: env.MQTT_CERT_PEM,
    mqttKeyPem: env.MQTT_KEY_PEM,
    traccarUrl: need('TRACCAR_URL').replace(/\/$/, ''),
    traccarEmail: need('TRACCAR_EMAIL'),
    traccarPassword: need('TRACCAR_PASSWORD'),
    traccarBootstrapAdmin: env.TRACCAR_BOOTSTRAP_ADMIN === 'true',
    database,
    battery,
    registryRefreshMs: Number(env.REGISTRY_REFRESH_MS ?? 60_000),
  };
}
```

`src/registry.ts`:

```ts
import { Pool } from 'pg';
import type { PoolConfigLike } from './config';

/** Só SELECT nas colunas liberadas ao papel `volti_bridge` (deploy/single/gt06.sh init). */
export const REGISTRY_SQL = `SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`;

export type Query = (sql: string) => Promise<{ rows: Array<{ imei: string; thingName: string }> }>;

/** Mapa IMEI → thingName dos rastreadores só relé (spec §6.1); a ponte relê a cada `REGISTRY_REFRESH_MS`. */
export class PgRegistry {
  constructor(private readonly query: Query) {}

  async things(): Promise<Map<string, string>> {
    const { rows } = await this.query(REGISTRY_SQL);
    return new Map(rows.map((r) => [r.imei, r.thingName]));
  }
}

export function pgQuery(cfg: PoolConfigLike): Query {
  const pool = new Pool({ ...cfg, max: 2 });
  return (sql) => pool.query<{ imei: string; thingName: string }>(sql);
}
```

`src/mqtt.ts`:

```ts
import { connect, type IClientOptions } from 'mqtt';
import type { BridgeConfig } from './config';

/** Subconjunto do cliente `mqtt` v5 usado pela ponte (o broker falso dos testes implementa o mesmo). */
export interface MqttLike {
  publishAsync(topic: string, payload: string, opts?: { qos?: 0 | 1 }): Promise<unknown>;
  subscribeAsync(topics: string[], opts?: { qos?: 0 | 1 }): Promise<unknown>;
  on(event: 'message', cb: (topic: string, payload: Buffer) => void): unknown;
  on(event: 'connect', cb: () => void): unknown;
  endAsync(force?: boolean): Promise<unknown>;
}

/** local: Mosquitto sem TLS; aws: IoT Core (mqtts 8883) com o certificado de serviço da ponte. Sessão limpa. */
export function connectMqtt(cfg: BridgeConfig): MqttLike {
  const opts: IClientOptions = { clientId: cfg.mqttClientId, clean: true, keepalive: 30, reconnectPeriod: 2_000, connectTimeout: 10_000 };
  if (cfg.iotMode === 'aws') Object.assign(opts, { cert: cfg.mqttCertPem, key: cfg.mqttKeyPem, rejectUnauthorized: true });
  return connect(cfg.mqttUrl, opts) as unknown as MqttLike;
}
```

- [ ] **Step 4: `traccar/rest.ts` e `traccar/socket.ts`**

`src/traccar/rest.ts`:

```ts
import type { TraccarDevice } from './types';

/** API REST do Traccar (só rede interna, spec §6.5), com a sessão do usuário da ponte (cookie também usado no WebSocket). */
export class TraccarRest {
  private cookie?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly email: string,
    private readonly password: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async login(): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: this.email, password: this.password }).toString(),
    });
    if (!res.ok) throw new Error(`traccar_login_failed_${res.status}`);
    const m = /JSESSIONID=([^;]+)/.exec(res.headers.get('set-cookie') ?? '');
    if (!m) throw new Error('traccar_login_no_session');
    this.cookie = `JSESSIONID=${m[1]}`;
    return this.cookie;
  }

  private async request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const cookie = this.cookie ?? (await this.login());
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers: { ...((init.headers as Record<string, string>) ?? {}), Cookie: cookie } });
    if (res.status === 401 && retry) {
      this.cookie = undefined;
      return this.request(path, init, false);
    }
    return res;
  }

  async devices(): Promise<TraccarDevice[]> {
    const res = await this.request('/api/devices');
    if (!res.ok) throw new Error(`traccar_devices_failed_${res.status}`);
    return (await res.json()) as TraccarDevice[];
  }

  /** 200 = enviado ao dispositivo; 202 = o Traccar enfileirou (dispositivo offline) — quem chama registra como erro. */
  async sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'> {
    const res = await this.request('/api/commands/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, type }) });
    if (res.status === 202) return 'queued';
    if (!res.ok) throw new Error(`traccar_command_failed_${res.status}`);
    return 'sent';
  }

  /** Só no compose local: o primeiro usuário de um Traccar vazio vira administrador. `false` se já houver usuários. */
  async bootstrapFirstUser(name: string): Promise<boolean> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: this.email, password: this.password }),
    });
    return res.ok;
  }
}
```

`src/traccar/socket.ts`:

```ts
import WebSocket from 'ws';
import type { Logger } from '../log';
import type { TraccarRest } from './rest';
import type { TraccarSocketMessage } from './types';

/** WebSocket `/api/socket` do Traccar (devices/positions/events), com a sessão da REST e reconexão com backoff (1 s → 30 s). */
export class TraccarSocket {
  private ws?: WebSocket;
  private stopped = false;
  private backoffMs = 1_000;

  constructor(
    private readonly baseUrl: string,
    private readonly rest: Pick<TraccarRest, 'login'>,
    private readonly onMessage: (m: TraccarSocketMessage) => void,
    private readonly log: Logger,
    private readonly onOpen?: () => void,
  ) {}

  async connect(): Promise<void> {
    const cookie = await this.rest.login();
    const url = `${this.baseUrl.replace(/^http/, 'ws')}/api/socket`;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, { headers: { Cookie: cookie } });
      let opened = false;
      this.ws = ws;
      ws.on('open', () => {
        opened = true;
        this.backoffMs = 1_000;
        this.log.info({ msg: 'traccar_socket_open' });
        this.onOpen?.();
        resolve();
      });
      ws.on('error', (err) => {
        if (!opened) reject(err);
      });
      ws.on('message', (data) => {
        try {
          this.onMessage(JSON.parse(data.toString()) as TraccarSocketMessage);
        } catch {
          this.log.warn({ msg: 'traccar_socket_invalid_json' });
        }
      });
      ws.on('close', () => {
        if (!opened || this.stopped) return;
        this.log.warn({ msg: 'traccar_socket_closed' });
        this.scheduleReconnect();
      });
    });
  }

  private scheduleReconnect(): void {
    const wait = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    const t = setTimeout(() => {
      if (this.stopped) return;
      this.connect().catch((err: Error) => {
        this.log.error({ msg: 'traccar_socket_reconnect_failed', error: err.message });
        this.scheduleReconnect();
      });
    }, wait);
    t.unref?.();
  }

  close(): void {
    this.stopped = true;
    this.ws?.close();
  }
}
```

- [ ] **Step 5: `bridge.ts`**

```ts
import { FIXED_LIMIT_KMH, TOPICS, thingOf, type ReportedState } from './contract';
import { CUT_FRESH_MS, cutRefusal, parseDelta, planDelta, planReconnect, type BridgeAction } from './delta';
import { maskImei, silentLogger, type Logger } from './log';
import { applyPosition, toDeviceEvents, type DeviceMemory } from './mapping';
import type { MqttLike } from './mqtt';
import type { TraccarDevice, TraccarEvent, TraccarPosition, TraccarSocketMessage } from './traccar/types';
import type { BatteryModel } from './units';

export interface TraccarApi {
  devices(): Promise<TraccarDevice[]>;
  sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'>;
}

export interface Registry {
  /** IMEI → thingName dos rastreadores `relay_only`. */
  things(): Promise<Map<string, string>>;
}

export interface BridgeOptions {
  iotMode: 'local' | 'aws';
  battery: BatteryModel;
  now?: () => number;
  log?: Logger;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Ponte GT06 (spec §6): posições/eventos do Traccar → `motos/{t}/telemetria|eventos` e `reported` do shadow; delta do shadow →
 * `engineStop`/`engineResume` (com a segunda guarda: só corta com posição fresca < 3 km/h). Para a API nada muda (mesmos tópicos).
 * Processamento em ordem por moto. Logs sem dado pessoal e sem IMEI completo.
 */
export class Bridge {
  private readonly devices = new Map<number, TraccarDevice>();
  private readonly memory = new Map<string, DeviceMemory>();
  private readonly stolen = new Map<string, boolean>();
  private readonly stopSentAt = new Map<string, number>();
  /** Envio do último comando de motor: a primeira posição depois dele com `blocked` vira `reported.travada`. */
  private readonly echoAfter = new Map<string, number>();
  private readonly awaitingGet = new Set<string>();
  private readonly subscribed = new Set<string>();
  private readonly chains = new Map<string, Promise<void>>();
  private imeiToThing = new Map<string, string>();
  private thingToImei = new Map<string, string>();
  private inbound: Promise<void> = Promise.resolve();
  private listening = false;
  private lastMissRefresh = 0;
  private readonly log: Logger;
  private readonly now: () => number;

  constructor(
    private readonly mqtt: MqttLike,
    private readonly traccar: TraccarApi,
    private readonly registry: Registry,
    private readonly opts: BridgeOptions,
  ) {
    this.log = opts.log ?? silentLogger;
    this.now = opts.now ?? Date.now;
  }

  async start(): Promise<void> {
    if (!this.listening) {
      this.mqtt.on('message', (topic: string, payload: Buffer) => {
        void this.onMqtt(topic, payload).catch((err: Error) => this.log.error({ msg: 'mqtt_message_failed', error: err.message }));
      });
      this.listening = true;
    }
    await this.refreshDevices();
    await this.refreshRegistry();
  }

  /** Lista de dispositivos do Traccar; mudança de status de um já conhecido dispara presença/reconexão. */
  async refreshDevices(): Promise<void> {
    for (const d of await this.traccar.devices()) await this.updateDevice(d);
  }

  async refreshRegistry(): Promise<void> {
    this.imeiToThing = await this.registry.things();
    this.thingToImei = new Map([...this.imeiToThing].map(([imei, thing]) => [thing, imei]));
    await this.subscribe([...this.thingToImei.keys()].filter((t) => !this.subscribed.has(t)));
  }

  /** Sessão MQTT limpa a cada (re)conexão: assina tudo de novo. */
  async resubscribe(): Promise<void> {
    this.subscribed.clear();
    await this.subscribe([...this.thingToImei.keys()]);
  }

  /** Mensagens do WebSocket processadas uma de cada vez, na ordem de chegada. */
  enqueue(msg: TraccarSocketMessage): Promise<void> {
    this.inbound = this.inbound.then(() => this.onTraccar(msg)).catch((err: Error) => this.log.error({ msg: 'traccar_message_failed', error: err.message }));
    return this.inbound;
  }

  async onTraccar(msg: TraccarSocketMessage): Promise<void> {
    for (const d of msg.devices ?? []) await this.updateDevice(d);
    for (const p of msg.positions ?? []) {
      const thing = await this.thingOfDevice(p.deviceId);
      if (thing) await this.serial(thing, () => this.onPosition(thing, p));
    }
    for (const e of msg.events ?? []) {
      if (e.type === 'deviceOnline' || e.type === 'deviceOffline' || e.type === 'deviceUnknown') {
        await this.setStatus(e.deviceId, e.type === 'deviceOnline' ? 'online' : 'offline');
        continue;
      }
      const thing = await this.thingOfDevice(e.deviceId);
      if (thing) await this.serial(thing, () => this.onAlarm(thing, e));
    }
  }

  private async subscribe(things: string[]): Promise<void> {
    if (!things.length) return;
    await this.mqtt.subscribeAsync(things.flatMap((t) => [TOPICS.shadowDelta(t), TOPICS.shadowGetAccepted(t), TOPICS.commands(t)]), { qos: 1 });
    for (const t of things) this.subscribed.add(t);
  }

  private async updateDevice(d: TraccarDevice): Promise<void> {
    const prev = this.devices.get(d.id);
    this.devices.set(d.id, { ...prev, ...d });
    if (prev && d.status && prev.status !== d.status) await this.onStatusChange(d.id, d.status);
  }

  private async setStatus(deviceId: number, status: 'online' | 'offline'): Promise<void> {
    if (!this.devices.has(deviceId)) await this.refreshDevices();
    const d = this.devices.get(deviceId);
    if (!d || d.status === status) return;
    d.status = status;
    await this.onStatusChange(deviceId, status);
  }

  private async onStatusChange(deviceId: number, status: TraccarDevice['status']): Promise<void> {
    const thing = await this.thingOfDevice(deviceId);
    if (!thing) return;
    await this.serial(thing, async () => {
      if (status === 'online') {
        if (this.opts.iotMode === 'local') await this.publish(TOPICS.presenceConnected(thing), {}, 1);
        await this.report(thing, this.fullReported(thing));
        this.awaitingGet.add(thing);
        await this.publish(TOPICS.shadowGet(thing), {}, 1);
        this.log.info({ msg: 'device_online', thingName: thing });
        return;
      }
      if (this.opts.iotMode === 'local') await this.publish(TOPICS.presenceDisconnected(thing), {}, 1);
      this.log.info({ msg: 'device_offline', thingName: thing });
    });
  }

  private async thingOfDevice(deviceId: number): Promise<string | null> {
    if (!this.devices.has(deviceId)) await this.refreshDevices();
    const d = this.devices.get(deviceId);
    if (!d) return null;
    let thing = this.imeiToThing.get(d.uniqueId);
    if (!thing && this.now() - this.lastMissRefresh > 10_000) {
      // Provisionado há pouco (antes da próxima leitura periódica): relê o registro no máximo a cada 10 s.
      this.lastMissRefresh = this.now();
      await this.refreshRegistry();
      thing = this.imeiToThing.get(d.uniqueId);
    }
    if (!thing) {
      this.log.warn({ msg: 'traccar_unknown_device', imei: maskImei(d.uniqueId) });
      return null;
    }
    return thing;
  }

  private deviceOf(thing: string): TraccarDevice | undefined {
    const imei = this.thingToImei.get(thing);
    return [...this.devices.values()].find((d) => d.uniqueId === imei);
  }

  private mem(thing: string): DeviceMemory {
    return this.memory.get(thing) ?? {};
  }

  private async onPosition(thing: string, p: TraccarPosition): Promise<void> {
    const before = this.mem(thing);
    const r = applyPosition(p, before, this.opts.battery);
    this.memory.set(thing, r.memory);
    if (r.invalid) this.log.warn({ msg: 'telemetry_invalid', thingName: thing });
    if (r.telemetry) await this.publish(TOPICS.telemetry(thing), r.telemetry, 0);
    if (r.movedWhileLocked && r.telemetry) await this.publish(TOPICS.events(thing), { tipo: 'movimento_sem_aluguel', timestamp: r.telemetry.timestamp }, 1);
    const blocked = p.attributes?.blocked;
    if (typeof blocked !== 'boolean') return;
    // `reported.travada` vem do bit de corte de uma posição posterior ao comando, nunca do aceite do comando (spec §6.4).
    const echo = this.echoAfter.get(thing);
    const afterCommand = echo !== undefined && Date.parse(p.serverTime) >= echo;
    if (afterCommand) this.echoAfter.delete(thing);
    if (afterCommand || blocked !== before.blocked) await this.report(thing, { travada: blocked, ...this.freshSpeed(thing) });
  }

  private async onAlarm(thing: string, e: TraccarEvent): Promise<void> {
    if (e.type !== 'alarm') return;
    const events = toDeviceEvents(e, this.mem(thing), this.now());
    if (!events.length) {
      this.log.info({ msg: 'alarm_ignored', thingName: thing, alarm: String(e.attributes?.alarm ?? '') });
      return;
    }
    for (const ev of events) await this.publish(TOPICS.events(thing), ev, 1);
  }

  private async onMqtt(topic: string, payload: Buffer): Promise<void> {
    const thing = thingOf(topic);
    if (!thing || !this.thingToImei.has(thing)) return;
    if (topic === TOPICS.commands(thing)) {
      this.log.info({ msg: 'command_ignored_no_horn', thingName: thing });
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(payload.toString('utf8'));
    } catch {
      this.log.warn({ msg: 'mqtt_invalid_json', thingName: thing });
      return;
    }
    const state = isObj(body) && isObj(body.state) ? body.state : undefined;
    if (topic === TOPICS.shadowDelta(thing)) {
      await this.serial(thing, () => this.execute(thing, planDelta(parseDelta(state))));
      return;
    }
    if (topic === TOPICS.shadowGetAccepted(thing) && this.awaitingGet.delete(thing)) {
      await this.serial(thing, () => this.execute(thing, planReconnect(state && isObj(state.delta) ? parseDelta(state.delta) : undefined)));
    }
  }

  private async execute(thing: string, actions: BridgeAction[]): Promise<void> {
    for (const a of actions) {
      if (a.kind === 'report') {
        if (a.reported.modo_roubada !== undefined) this.stolen.set(thing, a.reported.modo_roubada);
        await this.report(thing, a.reported);
        continue;
      }
      const device = this.deviceOf(thing);
      if (!device) {
        this.log.warn({ msg: 'command_unknown_device', thingName: thing });
        continue;
      }
      const online = device.status === 'online';
      if (a.kind === 'engineStop') {
        const refusal = cutRefusal({ online, mem: this.mem(thing), now: this.now(), lastStopSentAt: this.stopSentAt.get(thing) });
        if (refusal === 'already_blocked') {
          await this.report(thing, { travada: true, ...this.freshSpeed(thing) });
          continue;
        }
        if (refusal) {
          this.log.warn({ msg: 'engine_stop_refused', thingName: thing, reason: refusal });
          continue;
        }
        const sent = await this.traccar.sendCommand(device.id, 'engineStop');
        this.stopSentAt.set(thing, this.now());
        this.echoAfter.set(thing, this.now());
        if (sent === 'queued') this.log.error({ msg: 'engine_stop_queued', thingName: thing });
        else this.log.info({ msg: 'engine_stop_sent', thingName: thing });
        continue;
      }
      if (!online) {
        this.log.info({ msg: 'engine_resume_deferred_offline', thingName: thing });
        continue;
      }
      await this.traccar.sendCommand(device.id, 'engineResume');
      this.stopSentAt.delete(thing);
      this.echoAfter.set(thing, this.now());
      this.log.info({ msg: 'engine_resume_sent', thingName: thing });
      if (this.mem(thing).blocked === false) await this.report(thing, { travada: false });
    }
  }

  private freshSpeed(thing: string): { velocidade_kmh?: number } {
    const last = this.mem(thing).last;
    if (!last || this.now() - Math.min(last.fixTime, this.now()) > CUT_FRESH_MS) return {};
    return { velocidade_kmh: last.speedKmh };
  }

  private fullReported(thing: string): ReportedState {
    const model = this.deviceOf(thing)?.model;
    return {
      travada: this.mem(thing).blocked ?? false,
      limite_kmh: FIXED_LIMIT_KMH,
      modo_roubada: this.stolen.get(thing) ?? false,
      firmware: (model ? `gt06/${model}` : 'gt06').slice(0, 64),
      ...this.freshSpeed(thing),
    };
  }

  private async report(thing: string, reported: ReportedState): Promise<void> {
    await this.publish(TOPICS.shadowUpdate(thing), { state: { reported } }, 1);
  }

  private async publish(topic: string, payload: unknown, qos: 0 | 1): Promise<void> {
    await this.mqtt.publishAsync(topic, JSON.stringify(payload), { qos });
  }

  private serial(key: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(fn).catch((err: Error) => this.log.error({ msg: 'bridge_step_failed', thingName: key, error: err.message }));
    this.chains.set(key, next);
    void next.then(() => {
      if (this.chains.get(key) === next) this.chains.delete(key);
    });
    return next;
  }
}
```

- [ ] **Step 6: `main.ts`**

```ts
import { Bridge } from './bridge';
import { loadConfig } from './config';
import { createLogger } from './log';
import { connectMqtt } from './mqtt';
import { PgRegistry, pgQuery } from './registry';
import { TraccarRest } from './traccar/rest';
import { TraccarSocket } from './traccar/socket';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const cfg = loadConfig();
  const log = createLogger('traccar-bridge');
  const rest = new TraccarRest(cfg.traccarUrl, cfg.traccarEmail, cfg.traccarPassword);
  const mqtt = connectMqtt(cfg);
  const bridge = new Bridge(mqtt, rest, new PgRegistry(pgQuery(cfg.database)), { iotMode: cfg.iotMode, battery: cfg.battery, log });
  mqtt.on('connect', () => void bridge.resubscribe().catch((err: Error) => log.error({ msg: 'mqtt_resubscribe_failed', error: err.message })));
  // Traccar e banco podem subir depois da ponte: tenta até conseguir.
  for (let attempt = 1; ; attempt++) {
    try {
      if (cfg.traccarBootstrapAdmin && (await rest.bootstrapFirstUser('Volti dev'))) log.info({ msg: 'traccar_first_user_created' });
      await bridge.start();
      break;
    } catch (err) {
      log.warn({ msg: 'bridge_start_retry', attempt, error: (err as Error).message });
      await sleep(5_000);
    }
  }
  const socket = new TraccarSocket(cfg.traccarUrl, rest, (m) => void bridge.enqueue(m), log, () => void bridge.refreshDevices().catch((err: Error) => log.error({ msg: 'traccar_devices_refresh_failed', error: err.message })));
  for (let attempt = 1; ; attempt++) {
    try {
      await socket.connect();
      break;
    } catch (err) {
      log.warn({ msg: 'traccar_socket_connect_retry', attempt, error: (err as Error).message });
      await sleep(5_000);
    }
  }
  setInterval(() => void bridge.refreshRegistry().catch((err: Error) => log.error({ msg: 'registry_refresh_failed', error: err.message })), cfg.registryRefreshMs).unref();
  log.info({ msg: 'bridge_started', iotMode: cfg.iotMode });
  const stop = async () => {
    socket.close();
    await mqtt.endAsync(true).catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
}

main().catch((err) => {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), level: 'error', service: 'traccar-bridge', msg: 'bridge_failed', error: (err as Error).message })}\n`);
  process.exit(1);
});
```

- [ ] **Step 7: Rodar os testes**

Run: `pnpm --filter traccar-bridge test`
Expected: PASS (unidade da Task 8 + config 3 + registry 1 + integração 10).

Run: `pnpm --filter traccar-bridge lint` e `pnpm --filter traccar-bridge build`
Expected: sem erros; `services/traccar-bridge/dist/main.js` gerado.

- [ ] **Step 8: Dockerfile (amd64 e arm64: base `node:24-alpine` multi-arquitetura)**

`services/traccar-bridge/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1
# Ponte GT06 (Traccar → MQTT) e emulador GT06 (node dist/gt06/emulator-main.js). Build a partir da raiz do monorepo:
#   docker build -f services/traccar-bridge/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY services/traccar-bridge/package.json services/traccar-bridge/package.json
RUN pnpm install --frozen-lockfile --filter traccar-bridge...
COPY services/traccar-bridge services/traccar-bridge
RUN pnpm --filter traccar-bridge build \
 && pnpm --filter traccar-bridge deploy --prod /out \
 && cp -r services/traccar-bridge/dist /out/

FROM node:24-alpine AS runtime
RUN addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=volti:volti /out ./
USER volti
CMD ["node", "dist/main.js"]
```

- [ ] **Step 9: README da ponte**

`services/traccar-bridge/README.md`:

````md
# traccar-bridge

Ponte dos rastreadores **só relé** (Concox J16, protocolo GT06) para o contrato MQTT da Volti. Spec:
`docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`.

```
J16 ──TCP 5023 (GT06)──► Traccar ──(WebSocket /api/socket + REST)──► traccar-bridge ──MQTT──► IoT Core / Mosquitto
                                                                       ▲
                       shadow delta / motos/+/comandos ────────────────┘
```

Para a API nada muda: mesmos tópicos (`packages/contracts/mqtt.md`), mesmos schemas, mesmo shadow. O que a ponte faz:

- **Telemetria** (`motos/{t}/telemetria`) de cada posição válida, não `outdated`, com `fixTime` crescente: `velocidade_kmh = speed × 1,852`
  (o Traccar usa nós), `timestamp = fixTime`, `travada ← blocked`, `ignicao ← ignition`, `sinal ← rssi` (0–5), `bateria_pct ←
  power` pela curva do pack (`BATTERY_MODEL`; aproximado; fora da faixa — ex.: J16 alimentado por conversor DC-DC — mantém o último
  valor válido, senão 0). Heartbeats do GT06 só atualizam o estado (corte, ignição, sinal).
- **Eventos** (`motos/{t}/eventos`): `powerCut` → `violacao`, `lowBattery`/`lowPower` → `bateria_critica`, `vibration` com o corte
  ativo ou deslocamento > 20 m travada → `movimento_sem_aluguel`. Outros alarmes: log `alarm_ignored`.
- **Shadow**: delta `travada: true` → `engineStop` **só** com o dispositivo online, posição de até 10 s abaixo de 3 km/h, sem corte
  ativo e sem outro `engineStop` em 30 s (segunda guarda; a primeira é a API, que exige 2 amostras paradas em 10 s); `travada: false`
  → `engineResume`; `limite_kmh` nunca vira comando (reported `limite_kmh: 32`). `reported.travada` vem do bit de corte da primeira
  posição **depois** do comando. Na reconexão: presença `connected` (local), reported completo, `shadow/get`; só `travada: false`
  pendente é reaplicado. `motos/{t}/comandos` (buzina) é ignorado.
- **Registro** IMEI → thingName: `Tracker` com `controlMode = relay_only` (papel `volti_bridge`, só SELECT em 3 colunas), relido a
  cada `REGISTRY_REFRESH_MS`.
- Logs JSON sem dado pessoal; IMEI sempre mascarado (`***********0901`).

## Variáveis

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
| `REGISTRY_REFRESH_MS` | `60000` | releitura do registro |

## Rodar e testar

```bash
pnpm --filter traccar-bridge test     # unidade + integração (Traccar falso e broker em memória) + e2e em processo com a API
pnpm --filter traccar-bridge lint
pnpm --filter traccar-bridge build
```

Local com Docker (`docker compose --profile gt06 ...`, raiz do repositório) e no dev single (`deploy/single/gt06.sh`): ver
`docker-compose.yml`, `deploy/single/cloudshell.md` e o README raiz.

## Emulador GT06

`node dist/gt06/emulator-main.js` (ou `pnpm --filter traccar-bridge emulator`): login, posições a cada `GT06_INTERVAL_MS` (5 s),
heartbeat com o bit de corte, alarmes; `Relay,1#`/`DYD` liga o corte e `Relay,0#`/`HFYD` desliga, com resposta `0x15`. Variáveis:
`GT06_HOST`, `GT06_PORT` (5023), `GT06_IMEI`, `GT06_SCENARIO` (`parked` ou `ride-then-stop`), `GT06_RIDE_KMH` (20),
`GT06_RIDE_SECONDS` (60), `GT06_START_LAT`, `GT06_START_LNG`. Cada corte registra `gt06_cut` com a velocidade do emulador no instante.

## Provisionar um J16 de verdade

1. Cadastrar a moto (`POST /vehicles`) e rodar `pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle
   VLT-0000 --thing moto-0000 --imei <15 dígitos>` (no dev single: `deploy/single/gt06.sh provision ...`). Não cria certificado:
   marca o `Tracker` como `relay_only`/`gt06` e cria o dispositivo no Traccar (`uniqueId = IMEI`).
2. Configurar o aparelho por SMS para o chip M2M. **Sintaxe a confirmar no manual do aparelho** (varia por firmware Concox):
   - APN: `APN,<apn>,<usuário>,<senha>#` (bancada: APN do chip M2M; produção: **APN privada**, requisito da ADR);
   - servidor: `SERVER,1,<domínio>,5023,0#` (domínio) ou `SERVER,0,<ip>,5023,0#` (IP);
   - fuso UTC: `GMT,E,0,0#`;
   - intervalo de posição fixo de 5 s (com e sem ACC), p.ex. `TIMER,5,5#` — a trava só-relé exige 2 posições paradas em 10 s;
   - conferir: `STATUS#`, `PARAM#`, `WHERE#`.
3. Conferir no Traccar que o dispositivo aparece online e que a telemetria chega à API.

## Tarefas do dono

As tarefas físicas (comprar o kit e o chip M2M, confirmar a tensão de entrada ou usar conversor DC-DC 72 V → 12 V, teste de
bancada, instalação com o relé no fio da chave, teste na moto parada, limitador de 32 km/h no controlador) estão no
**Apêndice: tarefas do dono** da spec (`docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`).
````

- [ ] **Step 10: Commit**

```bash
git add services/traccar-bridge
git commit -m "feat(traccar-bridge): ponte Traccar → MQTT com segunda guarda do corte, Dockerfile e README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Emulador GT06 (codec testado byte a byte) e conferência da linha do tempo do e2e

**Files:**
- Create: `services/traccar-bridge/src/gt06/codec.ts`, `src/gt06/emulator.ts`, `src/gt06/emulator-main.ts`, `src/e2e/check-timeline.ts`
- Test: `services/traccar-bridge/src/gt06/codec.spec.ts`, `src/gt06/emulator.spec.ts`, `src/e2e/check-timeline.spec.ts`

**Interfaces:**
- Consumes: `Logger`, `createLogger`, `maskImei` (Task 8); `waitFor` (`test/wait.ts`, Task 9).
- Produces (Tasks 12–13):
  - `codec.ts`: `PROTO = { login: 0x01, location: 0x12, status: 0x13, stringInfo: 0x15, alarm: 0x16, serverCommand: 0x80 }`, `crcItu(data: Uint8Array): number`, `frame(protocol: number, content: Buffer, serial: number): Buffer`, `loginPacket(imei: string, serial: number)`, `interface Gt06Fix { at: Date; lat: number; lng: number; speedKmh: number; courseDeg: number; satellites: number; valid: boolean }`, `locationPacket(fix, serial)`, `interface Gt06Status { blocked: boolean; ignition: boolean; charging: boolean; voltageLevel: number; gsmSignal: number }`, `statusPacket(s, serial)`, `alarmPacket(fix, s, kind: 'powerCut' | 'vibration', serial)`, `stringReplyPacket(text, serial)`, `serverCommandPacket(text, serial)`, `interface Gt06Frame { protocol: number; content: Buffer; serial: number }`, `parseFrames(buf: Buffer): { frames: Gt06Frame[]; rest: Buffer }`, `commandText(f: Gt06Frame): string | null`
  - `emulator.ts`: `class Gt06Emulator(opts: { host; port; imei; intervalMs?; heartbeatMs?; start?: { lat; lng }; log?: Logger })` com `speedKmh`, `blocked`, `ignition`, `cuts: Array<{ text: string; speedKmhAtCut: number }>`, `closed: Promise<void>`, `start()`, `stop()`, `setSpeed(kmh)`, `setIgnition(on)`, `sendAlarm(kind)`
  - `check-timeline.ts`: `checkTimeline(lines: string[], thing: string): { ok: boolean; problems: string[] }` e CLI `node dist/e2e/check-timeline.js <thing>` (stdin = saída de `mosquitto_sub -v`)

- [ ] **Step 1: Testes do codec (falham)**

`services/traccar-bridge/src/gt06/codec.spec.ts`:

```ts
import { alarmPacket, commandText, crcItu, frame, locationPacket, loginPacket, parseFrames, PROTO, serverCommandPacket, statusPacket } from './codec';

const fix = { at: new Date('2026-10-27T12:34:56Z'), lat: -23.5614, lng: -46.6914, speedKmh: 20, courseDeg: 90, satellites: 9, valid: true };
const status = { blocked: true, ignition: true, charging: true, voltageLevel: 6, gsmSignal: 4 };

describe('codec GT06', () => {
  it('CRC-ITU (CRC-16/X-25) do vetor padrão "123456789" = 0x906E', () => {
    expect(crcItu(Buffer.from('123456789'))).toBe(0x906e);
  });

  it('login do manual do protocolo: 78 78 0D 01 01 23 45 67 89 01 23 45 00 01 8C DD 0D 0A', () => {
    expect(loginPacket('123456789012345', 1).toString('hex')).toBe('78780d01012345678901234500018cdd0d0a');
  });

  it('resposta do servidor ao login: 78 78 05 01 00 01 D9 DC 0D 0A', () => {
    expect(frame(PROTO.login, Buffer.alloc(0), 1).toString('hex')).toBe('787805010001d9dc0d0a');
  });

  it('localização 0x12: tamanho 0x1F, data UTC, lat/lng × 1.800.000, velocidade em km/h, posicionado, sul e oeste', () => {
    const pkt = locationPacket(fix, 2);
    expect(pkt[2]).toBe(0x1f);
    expect(pkt[3]).toBe(PROTO.location);
    const c = pkt.subarray(4);
    expect([...c.subarray(0, 6)]).toEqual([26, 10, 27, 12, 34, 56]);
    expect(c[6]).toBe(0xc9);
    expect(c.readUInt32BE(7)).toBe(Math.round(23.5614 * 1_800_000));
    expect(c.readUInt32BE(11)).toBe(Math.round(46.6914 * 1_800_000));
    expect(c[15]).toBe(20);
    const flags = c.readUInt16BE(16);
    expect(flags & 0x3ff).toBe(90);
    expect((flags >> 12) & 1).toBe(1); // posicionado
    expect((flags >> 11) & 1).toBe(1); // oeste
    expect((flags >> 10) & 1).toBe(0); // sul
    const { frames, rest } = parseFrames(pkt);
    expect(rest.length).toBe(0);
    expect(frames[0]).toMatchObject({ protocol: PROTO.location, serial: 2 });
  });

  it('heartbeat 0x13: bit 7 = corte, bit 6 = GPS, bit 2 = carregando, bit 1 = ACC', () => {
    const pkt = statusPacket(status, 3);
    expect(pkt[2]).toBe(0x0a);
    expect([...pkt.subarray(4, 9)]).toEqual([0xc6, 6, 4, 0x00, 0x02]);
    expect(statusPacket({ ...status, blocked: false, ignition: false }, 4)[4]).toBe(0x44);
  });

  it('alarme 0x16: tamanho 0x25 e código no fim (powerCut 0x02, vibration 0x03)', () => {
    const pkt = alarmPacket(fix, status, 'powerCut', 5);
    expect(pkt[2]).toBe(0x25);
    expect(pkt[3]).toBe(PROTO.alarm);
    expect(pkt[4 + 30]).toBe(0x02);
    expect(alarmPacket(fix, status, 'vibration', 6)[4 + 30]).toBe(0x03);
  });

  it('parseFrames junta pedaços, descarta lixo e quadro com CRC errado', () => {
    const a = loginPacket('860000000000901', 1);
    const b = statusPacket(status, 2);
    const bad = Buffer.from(b);
    bad[bad.length - 3] ^= 0xff;
    const first = parseFrames(Buffer.concat([Buffer.from([0x00, 0x13]), a, b.subarray(0, 5)]));
    expect(first.frames.map((f) => f.protocol)).toEqual([PROTO.login]);
    const second = parseFrames(Buffer.concat([first.rest, b.subarray(5), bad]));
    expect(second.frames.map((f) => f.serial)).toEqual([2]);
  });

  it('comando do servidor 0x80 (layout do encoder do Traccar) → texto', () => {
    const f = parseFrames(serverCommandPacket('Relay,1#', 7)).frames[0];
    expect(f).toMatchObject({ protocol: PROTO.serverCommand, serial: 7 });
    expect(commandText(f)).toBe('Relay,1#');
    expect(commandText(parseFrames(statusPacket(status, 1)).frames[0])).toBeNull();
  });
});
```

Run: `pnpm --filter traccar-bridge test -- codec`
Expected: FAIL — `Cannot find module './codec'`.

- [ ] **Step 2: Implementar o codec**

`services/traccar-bridge/src/gt06/codec.ts`:

```ts
/**
 * Protocolo GT06 (Concox) — só o necessário para o emulador de testes: quadro `78 78 | tamanho | protocolo | conteúdo | série |
 * CRC-ITU | 0D 0A`, com tamanho = 1 + conteúdo + 2 + 2 e CRC calculado do byte de tamanho até a série.
 */
export const PROTO = { login: 0x01, location: 0x12, status: 0x13, stringInfo: 0x15, alarm: 0x16, serverCommand: 0x80 } as const;
const START = Buffer.from([0x78, 0x78]);
const STOP = Buffer.from([0x0d, 0x0a]);

/** CRC-ITU = CRC-16/X-25 (polinômio refletido 0x8408, início 0xFFFF, saída invertida). */
export function crcItu(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
  }
  return (crc ^ 0xffff) & 0xffff;
}

export function frame(protocol: number, content: Buffer, serial: number): Buffer {
  const body = Buffer.alloc(2 + content.length + 2);
  body.writeUInt8(1 + content.length + 2 + 2, 0);
  body.writeUInt8(protocol, 1);
  content.copy(body, 2);
  body.writeUInt16BE(serial & 0xffff, 2 + content.length);
  const crc = Buffer.alloc(2);
  crc.writeUInt16BE(crcItu(body), 0);
  return Buffer.concat([START, body, crc, STOP]);
}

/** IMEI de 15 dígitos em BCD com um zero à esquerda (8 bytes). */
export function loginPacket(imei: string, serial: number): Buffer {
  if (!/^\d{15}$/.test(imei)) throw new Error('IMEI deve ter 15 dígitos');
  return frame(PROTO.login, Buffer.from(`0${imei}`, 'hex'), serial);
}

export interface Gt06Fix {
  at: Date;
  lat: number;
  lng: number;
  speedKmh: number;
  courseDeg: number;
  satellites: number;
  valid: boolean;
}

function gpsBlock(f: Gt06Fix): Buffer {
  const b = Buffer.alloc(18);
  b.writeUInt8(f.at.getUTCFullYear() % 100, 0);
  b.writeUInt8(f.at.getUTCMonth() + 1, 1);
  b.writeUInt8(f.at.getUTCDate(), 2);
  b.writeUInt8(f.at.getUTCHours(), 3);
  b.writeUInt8(f.at.getUTCMinutes(), 4);
  b.writeUInt8(f.at.getUTCSeconds(), 5);
  b.writeUInt8((12 << 4) | Math.min(15, Math.max(0, f.satellites)), 6);
  b.writeUInt32BE(Math.round(Math.abs(f.lat) * 1_800_000), 7);
  b.writeUInt32BE(Math.round(Math.abs(f.lng) * 1_800_000), 11);
  b.writeUInt8(Math.max(0, Math.min(255, Math.round(f.speedKmh))), 15);
  let flags = Math.round(f.courseDeg) & 0x3ff;
  if (f.valid) flags |= 1 << 12;
  if (f.lng < 0) flags |= 1 << 11; // oeste
  if (f.lat >= 0) flags |= 1 << 10; // norte
  b.writeUInt16BE(flags, 16);
  return b;
}

/** Célula fixa (MCC 724 = Brasil): MCC 2, MNC 1, LAC 2, Cell ID 3 bytes; com o byte de tamanho no alarme. */
function lbsBlock(withLength: boolean): Buffer {
  const lbs = Buffer.from([0x02, 0xd4, 0x05, 0x12, 0x34, 0x00, 0xab, 0xcd]);
  return withLength ? Buffer.concat([Buffer.from([0x09]), lbs]) : lbs;
}

export function locationPacket(f: Gt06Fix, serial: number): Buffer {
  return frame(PROTO.location, Buffer.concat([gpsBlock(f), lbsBlock(false)]), serial);
}

export interface Gt06Status {
  blocked: boolean;
  ignition: boolean;
  charging: boolean;
  /** 0–6 */
  voltageLevel: number;
  /** 0–4 */
  gsmSignal: number;
}

function terminalInfo(s: Gt06Status): number {
  return (s.blocked ? 0x80 : 0) | 0x40 | (s.charging ? 0x04 : 0) | (s.ignition ? 0x02 : 0);
}

export function statusPacket(s: Gt06Status, serial: number): Buffer {
  return frame(PROTO.status, Buffer.from([terminalInfo(s), s.voltageLevel, s.gsmSignal, 0x00, 0x02]), serial);
}

const ALARM_CODE = { powerCut: 0x02, vibration: 0x03 } as const;

export function alarmPacket(f: Gt06Fix, s: Gt06Status, kind: keyof typeof ALARM_CODE, serial: number): Buffer {
  const status = Buffer.from([terminalInfo(s), s.voltageLevel, s.gsmSignal, ALARM_CODE[kind], 0x02]);
  return frame(PROTO.alarm, Buffer.concat([gpsBlock(f), lbsBlock(true), status]), serial);
}

/** Resposta de texto a um comando: tamanho, 4 bytes de flag do servidor, ASCII, idioma (0x0002 = inglês). */
export function stringReplyPacket(text: string, serial: number): Buffer {
  const ascii = Buffer.from(text, 'ascii');
  return frame(PROTO.stringInfo, Buffer.concat([Buffer.from([4 + ascii.length, 0, 0, 0, 0]), ascii, Buffer.from([0x00, 0x02])]), serial);
}

/** Comando do servidor no layout do encoder GT06 do Traccar (para testes): tamanho, flag de 4 bytes, ASCII, idioma. */
export function serverCommandPacket(text: string, serial: number): Buffer {
  const ascii = Buffer.from(text, 'ascii');
  return frame(PROTO.serverCommand, Buffer.concat([Buffer.from([4 + ascii.length, 0, 0, 0, 0]), ascii, Buffer.from([0x00, 0x02])]), serial);
}

export interface Gt06Frame {
  protocol: number;
  content: Buffer;
  serial: number;
}

/** Extrai os quadros completos e válidos (CRC e fim conferidos); devolve o resto incompleto para juntar com o próximo pedaço. */
export function parseFrames(buf: Buffer): { frames: Gt06Frame[]; rest: Buffer } {
  const frames: Gt06Frame[] = [];
  let i = 0;
  while (i + 3 <= buf.length) {
    if (buf[i] !== 0x78 || buf[i + 1] !== 0x78) {
      i++;
      continue;
    }
    const len = buf[i + 2];
    const total = len + 5;
    if (i + total > buf.length) break;
    const body = buf.subarray(i + 2, i + 2 + len - 1);
    const crc = buf.readUInt16BE(i + 1 + len);
    const okStop = buf[i + len + 3] === 0x0d && buf[i + len + 4] === 0x0a;
    if (len < 5 || !okStop || crcItu(body) !== crc) {
      i++;
      continue;
    }
    frames.push({ protocol: body[1], content: Buffer.from(body.subarray(2, body.length - 2)), serial: body.readUInt16BE(body.length - 2) });
    i += total;
  }
  return { frames, rest: Buffer.from(buf.subarray(i)) };
}

export function commandText(f: Gt06Frame): string | null {
  if (f.protocol !== PROTO.serverCommand || f.content.length < 5) return null;
  const len = f.content[0];
  return f.content.subarray(5, Math.min(f.content.length, 1 + len)).toString('ascii');
}
```

Run: `pnpm --filter traccar-bridge test -- codec`
Expected: PASS (8 testes).

- [ ] **Step 3: Teste do emulador (falha)**

`services/traccar-bridge/src/gt06/emulator.spec.ts`:

```ts
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { waitFor } from '../../test/wait';
import { frame, parseFrames, PROTO, serverCommandPacket, type Gt06Frame } from './codec';
import { Gt06Emulator } from './emulator';

describe('Gt06Emulator (contra um "Traccar" TCP em processo)', () => {
  it('login, posições e heartbeat; Relay,1# liga o corte (registra a velocidade do instante) e Relay,0# desliga', async () => {
    const frames: Gt06Frame[] = [];
    let sock: Socket | undefined;
    const server = createServer((s) => {
      sock = s;
      let buf = Buffer.alloc(0);
      s.on('data', (d) => {
        const r = parseFrames(Buffer.concat([buf, d]));
        buf = r.rest;
        for (const f of r.frames) {
          frames.push(f);
          if (f.protocol === PROTO.login) s.write(frame(PROTO.login, Buffer.alloc(0), f.serial));
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const emu = new Gt06Emulator({ host: '127.0.0.1', port: (server.address() as AddressInfo).port, imei: '860000000000901', intervalMs: 50, heartbeatMs: 1_000 });
    try {
      await emu.start();
      expect(frames[0].protocol).toBe(PROTO.login);
      emu.setSpeed(20);
      await waitFor(() => frames.filter((f) => f.protocol === PROTO.location && f.content[15] === 20).length >= 2);
      sock!.write(serverCommandPacket('Relay,1#', 9));
      await waitFor(() => frames.some((f) => f.protocol === PROTO.stringInfo));
      await waitFor(() => frames.some((f) => f.protocol === PROTO.status && (f.content[0] & 0x80) !== 0));
      expect(emu.blocked).toBe(true);
      expect(emu.speedKmh).toBe(0);
      expect(emu.cuts).toEqual([{ text: 'Relay,1#', speedKmhAtCut: 20 }]);
      emu.setSpeed(15);
      expect(emu.speedKmh).toBe(0); // relé cortado: a moto não anda
      sock!.write(serverCommandPacket('Relay,0#', 10));
      await waitFor(() => !emu.blocked);
    } finally {
      emu.stop();
      server.close();
    }
  });
});
```

Run: `pnpm --filter traccar-bridge test -- emulator`
Expected: FAIL — `Cannot find module './emulator'`.

- [ ] **Step 4: Implementar o emulador e a CLI**

`services/traccar-bridge/src/gt06/emulator.ts`:

```ts
import { connect as netConnect, type Socket } from 'node:net';
import { maskImei, silentLogger, type Logger } from '../log';
import { alarmPacket, commandText, locationPacket, loginPacket, parseFrames, PROTO, statusPacket, stringReplyPacket, type Gt06Fix, type Gt06Status } from './codec';

export interface EmulatorOptions {
  host: string;
  port: number;
  imei: string;
  intervalMs?: number;
  heartbeatMs?: number;
  start?: { lat: number; lng: number };
  log?: Logger;
}

/**
 * J16 de mentira para testes (spec GT06 §7): login, posição a cada `intervalMs`, heartbeat com o bit de corte, alarmes; responde
 * a `Relay,1#`/`DYD` (corta) e `Relay,0#`/`HFYD` (libera) com `0x15` e um heartbeat novo. Com o corte, a moto não anda (relé).
 * `cuts` registra a velocidade do emulador no instante de cada corte (o e2e do dev single confere que foi < 3 km/h).
 */
export class Gt06Emulator {
  speedKmh = 0;
  blocked = false;
  ignition = false;
  readonly cuts: Array<{ text: string; speedKmhAtCut: number }> = [];
  readonly closed: Promise<void>;
  private resolveClosed!: () => void;
  private socket?: Socket;
  private serial = 0;
  private rest = Buffer.alloc(0);
  private readonly timers: NodeJS.Timeout[] = [];
  private position: { lat: number; lng: number };
  private loggedIn?: () => void;
  private readonly log: Logger;

  constructor(
    private readonly opts: EmulatorOptions,
    private readonly connectFn: typeof netConnect = netConnect,
  ) {
    this.position = opts.start ?? { lat: -23.5614, lng: -46.6914 };
    this.log = opts.log ?? silentLogger;
    this.closed = new Promise((resolve) => (this.resolveClosed = resolve));
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const s = this.connectFn({ host: this.opts.host, port: this.opts.port }, () => resolve());
      this.socket = s;
      s.once('error', reject);
      s.on('error', (err) => this.log.warn({ msg: 'gt06_socket_error', error: err.message }));
      s.on('data', (d) => this.onData(d));
      s.on('close', () => {
        this.clearTimers();
        this.resolveClosed();
      });
    });
    const acked = new Promise<void>((resolve) => (this.loggedIn = resolve));
    this.write(loginPacket(this.opts.imei, this.nextSerial()));
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('gt06_login_timeout')), 10_000);
    });
    try {
      await Promise.race([acked, timeout]);
    } finally {
      clearTimeout(timer); // a promessa do prazo nunca rejeita depois do login
    }
    this.log.info({ msg: 'gt06_logged_in', imei: maskImei(this.opts.imei) });
    this.sendLocation();
    this.sendStatus();
    this.timers.push(setInterval(() => this.tick(), this.opts.intervalMs ?? 5_000));
    this.timers.push(setInterval(() => this.sendStatus(), this.opts.heartbeatMs ?? 30_000));
  }

  stop(): void {
    this.clearTimers();
    this.socket?.destroy();
  }

  setSpeed(kmh: number): void {
    this.speedKmh = this.blocked ? 0 : Math.max(0, Math.round(kmh));
  }

  setIgnition(on: boolean): void {
    this.ignition = on;
  }

  sendAlarm(kind: 'powerCut' | 'vibration'): void {
    this.write(alarmPacket(this.fix(), this.status(), kind, this.nextSerial()));
  }

  private tick(): void {
    // Anda para leste na velocidade atual (graus aproximados; só para a posição mudar).
    const km = (this.speedKmh * (this.opts.intervalMs ?? 5_000)) / 3_600_000;
    this.position = { lat: this.position.lat, lng: this.position.lng + km / 102 };
    this.sendLocation();
  }

  private fix(): Gt06Fix {
    return { at: new Date(), lat: this.position.lat, lng: this.position.lng, speedKmh: this.speedKmh, courseDeg: 90, satellites: 9, valid: true };
  }

  private status(): Gt06Status {
    return { blocked: this.blocked, ignition: this.ignition, charging: true, voltageLevel: 6, gsmSignal: 4 };
  }

  private sendLocation(): void {
    this.write(locationPacket(this.fix(), this.nextSerial()));
  }

  private sendStatus(): void {
    this.write(statusPacket(this.status(), this.nextSerial()));
  }

  private onData(d: Buffer): void {
    const parsed = parseFrames(Buffer.concat([this.rest, d]));
    this.rest = parsed.rest;
    for (const f of parsed.frames) {
      if (f.protocol === PROTO.login) this.loggedIn?.();
      const text = commandText(f);
      if (text === null) continue;
      const cut = /relay\s*,\s*1|dyd/i.test(text);
      const resume = /relay\s*,\s*0|hfyd/i.test(text);
      if (cut) {
        this.cuts.push({ text, speedKmhAtCut: this.speedKmh });
        this.log.info({ msg: 'gt06_cut', speedKmhAtCut: this.speedKmh });
        this.blocked = true;
        this.speedKmh = 0;
      }
      if (resume) {
        this.log.info({ msg: 'gt06_resume' });
        this.blocked = false;
      }
      this.write(stringReplyPacket(cut ? 'Cut off the fuel supply: Success!' : resume ? 'Restore fuel supply: Success!' : 'Unknown command', f.serial));
      this.sendStatus();
      this.sendLocation();
    }
  }

  private nextSerial(): number {
    this.serial = (this.serial + 1) & 0xffff;
    return this.serial;
  }

  private write(b: Buffer): void {
    if (this.socket && !this.socket.destroyed) this.socket.write(b);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers.length = 0;
  }
}
```

`services/traccar-bridge/src/gt06/emulator-main.ts`:

```ts
import { createLogger, maskImei } from '../log';
import { Gt06Emulator } from './emulator';

const env = process.env;
const log = createLogger('gt06-emulator');
const num = (k: string, d: number) => (env[k] ? Number(env[k]) : d);
const imei = env.GT06_IMEI ?? '860000000000901';
if (!/^\d{15}$/.test(imei)) throw new Error('GT06_IMEI deve ter 15 dígitos');
const scenario = env.GT06_SCENARIO ?? 'parked';
if (scenario !== 'parked' && scenario !== 'ride-then-stop') throw new Error('GT06_SCENARIO deve ser parked ou ride-then-stop');
const rideKmh = num('GT06_RIDE_KMH', 20);
const rideMs = num('GT06_RIDE_SECONDS', 60) * 1000;
const startedAt = Date.now();
const start = { lat: num('GT06_START_LAT', -23.5614), lng: num('GT06_START_LNG', -46.6914) };

/** Cenário pela hora desde que o processo subiu (sobrevive a reconexões): anda `GT06_RIDE_SECONDS` e para com a ignição ligada. */
function speedNow(): number {
  return scenario === 'ride-then-stop' && Date.now() - startedAt < rideMs ? rideKmh : 0;
}

async function run(): Promise<void> {
  for (;;) {
    const emu = new Gt06Emulator({ host: env.GT06_HOST ?? 'localhost', port: num('GT06_PORT', 5023), imei, intervalMs: num('GT06_INTERVAL_MS', 5_000), heartbeatMs: num('GT06_HEARTBEAT_MS', 30_000), start, log });
    try {
      emu.setIgnition(scenario === 'ride-then-stop');
      emu.setSpeed(speedNow());
      await emu.start();
      log.info({ msg: 'gt06_emulator_started', imei: maskImei(imei), scenario });
      const t = setInterval(() => emu.setSpeed(speedNow()), 1_000);
      await emu.closed;
      clearInterval(t);
    } catch (err) {
      log.warn({ msg: 'gt06_emulator_connect_failed', error: (err as Error).message });
    }
    emu.stop();
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

void run();
```

Run: `pnpm --filter traccar-bridge test -- emulator`
Expected: PASS (1 teste).

- [ ] **Step 5: Conferência da linha do tempo do e2e do dev single (teste → implementação)**

`services/traccar-bridge/src/e2e/check-timeline.spec.ts`:

```ts
import { checkTimeline } from './check-timeline';

const T = 'moto-0901';
const tel = (sec: number, kmh: number) => `motos/${T}/telemetria ${JSON.stringify({ lat: -23.5, lng: -46.6, velocidade_kmh: kmh, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: new Date(Date.UTC(2026, 9, 27, 12, 0, sec)).toISOString() })}`;
const cut = `$aws/things/${T}/shadow/update/delta ${JSON.stringify({ state: { travada: true }, version: 9, timestamp: 1 })}`;
const locked = `$aws/things/${T}/shadow/update ${JSON.stringify({ state: { reported: { travada: true, velocidade_kmh: 0 } } })}`;

describe('checkTimeline (e2e do dev single)', () => {
  it('ok: corte depois de ≥ 2 telemetrias paradas cobrindo ≥ 10 s, uma vez, e reported travada:true depois', () => {
    expect(checkTimeline([tel(0, 20), tel(5, 20), tel(10, 0), tel(15, 0), tel(20, 0), cut, locked], T)).toEqual({ ok: true, problems: [] });
  });

  it('falhas: corte com a moto andando, com < 10 s parada, repetido ou sem confirmação', () => {
    expect(checkTimeline([tel(0, 20), cut, locked], T).problems).toEqual(['corte com 0 amostra(s) parada(s) antes', 'corte com a última velocidade >= 3 km/h']);
    expect(checkTimeline([tel(0, 0), tel(5, 0), cut, locked], T).problems).toEqual(['corte com amostras paradas cobrindo menos de 10 s']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut, cut, locked], T).problems).toEqual(['travada:true gravado 2 vezes']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut], T).problems).toEqual(['sem reported travada:true depois do corte']);
    expect(checkTimeline([tel(0, 0)], T).problems).toEqual(['nenhum desired travada:true observado']);
  });
});
```

Run: `pnpm --filter traccar-bridge test -- check-timeline`
Expected: FAIL — `Cannot find module './check-timeline'`.

`services/traccar-bridge/src/e2e/check-timeline.ts`:

```ts
import { createInterface } from 'node:readline';

/**
 * Confere o tráfego MQTT do e2e do dev single (`mosquitto_sub -v`: "tópico payload" por linha, na ordem de chegada) contra a
 * spec GT06 §5: o primeiro `desired travada:true` só depois de ≥ 2 telemetrias < 3 km/h consecutivas cobrindo ≥ 10 s, uma única
 * vez, e um `reported travada:true` depois dele.
 */
export function checkTimeline(lines: string[], thing: string): { ok: boolean; problems: string[] } {
  const telemetry = `motos/${thing}/telemetria`;
  const delta = `$aws/things/${thing}/shadow/update/delta`;
  const update = `$aws/things/${thing}/shadow/update`;
  const samples: Array<{ kmh: number; ts: number }> = [];
  const problems: string[] = [];
  let cuts = 0;
  let confirmed = false;
  for (const line of lines) {
    const sp = line.indexOf(' ');
    if (sp < 0) continue;
    const topic = line.slice(0, sp);
    let body: any;
    try {
      body = JSON.parse(line.slice(sp + 1));
    } catch {
      continue;
    }
    if (topic === telemetry && cuts === 0) samples.push({ kmh: Number(body.velocidade_kmh), ts: Date.parse(body.timestamp) });
    if (topic === delta && body?.state?.travada === true) {
      cuts++;
      if (cuts > 1) continue;
      const tail: Array<{ kmh: number; ts: number }> = [];
      for (let k = samples.length - 1; k >= 0 && samples[k].kmh < 3; k--) tail.unshift(samples[k]);
      if (tail.length < 2) problems.push(`corte com ${tail.length} amostra(s) parada(s) antes`);
      else if (tail[tail.length - 1].ts - tail[0].ts < 10_000) problems.push('corte com amostras paradas cobrindo menos de 10 s');
      if (samples.length && !(samples[samples.length - 1].kmh < 3)) problems.push('corte com a última velocidade >= 3 km/h');
    }
    if (topic === update && cuts > 0 && body?.state?.reported?.travada === true) confirmed = true;
  }
  if (cuts === 0) problems.push('nenhum desired travada:true observado');
  else {
    if (cuts > 1) problems.push(`travada:true gravado ${cuts} vezes`);
    if (!confirmed) problems.push('sem reported travada:true depois do corte');
  }
  return { ok: problems.length === 0, problems };
}

if (require.main === module) {
  const thing = process.argv[2];
  if (!thing) {
    process.stderr.write('uso: node dist/e2e/check-timeline.js <thingName> < saida-do-mosquitto_sub\n');
    process.exit(2);
  }
  const lines: string[] = [];
  createInterface({ input: process.stdin })
    .on('line', (l) => lines.push(l))
    .on('close', () => {
      const r = checkTimeline(lines, thing);
      process.stdout.write(`${JSON.stringify(r)}\n`);
      process.exit(r.ok ? 0 : 1);
    });
}
```

Run: `pnpm --filter traccar-bridge test`
Expected: PASS (todos da ponte, inclusive codec 8, emulador 1, check-timeline 2).

Run: `pnpm --filter traccar-bridge lint` e `pnpm --filter traccar-bridge build`
Expected: sem erros; `dist/gt06/emulator-main.js` e `dist/e2e/check-timeline.js` gerados.

- [ ] **Step 6: Commit**

```bash
git add services/traccar-bridge/src/gt06 services/traccar-bridge/src/e2e
git commit -m "feat(traccar-bridge): emulador GT06 (login, posição, heartbeat, alarme, corte) e conferência da linha do tempo do e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: e2e em processo — Traccar falso → ponte → broker → API (lock só depois de 2 amostras paradas)

**Files:**
- Create: `services/traccar-bridge/test/e2e/relay-lock.e2e.spec.ts`

**Interfaces:**
- Consumes: `Bridge`, `TraccarRest`, `TraccarSocket`, `silentLogger` (Task 9); `FakeBroker`, `FakeTraccar`, `position`, `waitFor` (Task 9); da API, por caminho relativo (o ts-jest só transpila; o `tsc` da ponte exclui `test/e2e`): `BaseIotGateway`, `FakeClock`, `LiveStateStore`, `LocalMqttTransport`, `LocalShadowStore`, `TelemetryService`, `MemoryRedisStore`, `EV`.
- Produces: o e2e local exigido pela spec §11 ("`lock` termina `confirmed` só depois de 2 amostras paradas"), sem Docker.

- [ ] **Step 1: Escrever o e2e**

`services/traccar-bridge/test/e2e/relay-lock.e2e.spec.ts`:

```ts
import { EventEmitter } from 'node:events';
import { EV } from '../../../api/src/common/events';
import { BaseIotGateway } from '../../../api/src/modules/iot/base-iot-gateway';
import { FakeClock } from '../../../api/src/modules/iot/clock';
import { LiveStateStore } from '../../../api/src/modules/iot/live-state.store';
import { LocalMqttTransport } from '../../../api/src/modules/iot/local-mqtt.transport';
import { LocalShadowStore } from '../../../api/src/modules/iot/local-shadow';
import { TelemetryService } from '../../../api/src/modules/iot/telemetry.service';
import { MemoryRedisStore } from '../../../api/src/redis/redis-store';
import { Bridge } from '../../src/bridge';
import { silentLogger } from '../../src/log';
import { TraccarRest } from '../../src/traccar/rest';
import { TraccarSocket } from '../../src/traccar/socket';
import { FakeBroker } from '../fake-broker';
import { FakeTraccar, position } from '../fake-traccar';
import { waitFor } from '../wait';

const IMEI = '860000000000901';
const T = 'moto-0901';

/** API real (gateway, telemetria, shadow local) + ponte real, ligadas pelo broker em memória; Traccar falso; relógio falso. */
async function world() {
  const clock = new FakeClock(Date.parse('2026-10-27T12:00:00Z'));
  const redis = new MemoryRedisStore();
  const broker = new FakeBroker();
  const events = new EventEmitter();
  const updates: Array<{ commandId: string; status: string; reason?: string }> = [];
  let telemetrySeen = 0;
  events.on(EV.IOT_COMMAND_UPDATED, (e) => updates.push(e));
  events.on(EV.IOT_TELEMETRY, () => telemetrySeen++);
  class Gateway extends BaseIotGateway {}
  const transport = new LocalMqttTransport(() => broker.client('api') as any, new LocalShadowStore(redis, () => clock.now()));
  const gateway = new Gateway(transport, new LiveStateStore(redis, clock), clock, events as any, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: 'veh-0901' }) }, trackPoint: { create: async () => ({}) } };
  const telemetry = new TelemetryService(gateway, { onPosition: async () => undefined }, rentals, prisma as any, events as any, clock, { trackRetentionDays: 90 });
  await transport.start(telemetry);

  const traccar = new FakeTraccar();
  await traccar.start();
  traccar.devices = [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }];
  const rest = new TraccarRest(traccar.url, 'bridge@volti.local', 'secret');
  const bridge = new Bridge(broker.client('bridge'), rest, { things: async () => new Map([[IMEI, T]]) }, { iotMode: 'local', battery: '72v', now: () => clock.now(), log: silentLogger });
  await bridge.start();
  const socket = new TraccarSocket(traccar.url, rest, (m) => void bridge.enqueue(m), silentLogger);
  await socket.connect();

  let seq = 0;
  const iso = () => new Date(clock.now()).toISOString();
  /** Posição do J16 medida agora; espera a API processar a telemetria (quando ela vira telemetria). */
  const ride = async (kmh: number) => {
    const before = telemetrySeen;
    traccar.push({ positions: [position({ id: ++seq, deviceId: 1, fixTime: iso(), serverTime: iso(), speed: kmh / 1.852, attributes: { ignition: true, blocked: false, rssi: 4, power: 72 } })] });
    await waitFor(() => telemetrySeen === before + 1);
  };
  const stop = async () => {
    socket.close();
    await traccar.stop();
    await transport.stop();
  };
  return { clock, broker, traccar, gateway, updates, ride, iso, stop, next: () => ++seq };
}

describe('e2e em processo: J16 (Traccar falso) → ponte → MQTT → API → ponte → engineStop', () => {
  let w: Awaited<ReturnType<typeof world>>;
  afterEach(async () => w.stop());

  it('lock relay_only fica in_progress andando, corta só depois de 2 posições paradas cobrindo 10 s e confirma pelo bit de corte', async () => {
    w = await world();
    w.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }] });
    await waitFor(() => w.broker.log.some((m) => m.topic === `$aws/events/presence/connected/${T}`));
    for (let i = 0; i < 4; i++) {
      await w.ride(20); // t = 0, 5, 10, 15 s (as duas primeiras caem na graça)
      await w.clock.advance(5_000);
    }
    const p = w.gateway.lock({ commandId: 'c1', thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' });
    await w.clock.advance(3_000);
    expect(await p).toEqual({ commandId: 'c1', status: 'in_progress' });
    await w.ride(20);
    await w.clock.advance(5_000);
    await w.ride(0);
    await w.clock.advance(5_000);
    await w.ride(0); // 2 paradas, 5 s
    await new Promise((r) => setTimeout(r, 50));
    expect(w.traccar.commands).toEqual([]);
    expect(w.broker.log.filter((m) => m.topic === `$aws/things/${T}/shadow/update/delta` && JSON.parse(m.payload).state.travada === true)).toEqual([]);
    await w.clock.advance(5_000);
    await w.ride(0); // 3 paradas, 10 s
    await waitFor(() => w.traccar.commands.length === 1);
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    expect(w.updates.filter((u) => u.commandId === 'c1' && u.status === 'confirmed')).toEqual([]); // aceite do comando não confirma
    // Heartbeat do J16 depois do comando, com o bit de corte.
    w.traccar.push({ positions: [position({ id: w.next(), deviceId: 1, fixTime: w.iso(), serverTime: w.iso(), outdated: true, attributes: { blocked: true, ignition: true } })] });
    await w.clock.advance(1_000);
    await waitFor(() => w.updates.some((u) => u.commandId === 'c1' && u.status === 'confirmed'));
  });

  it('moto que volta a andar antes de completar 10 s parada: nenhum corte; 120 s → did_not_stop sem engineStop', async () => {
    w = await world();
    w.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }] });
    await waitFor(() => w.broker.log.some((m) => m.topic === `$aws/events/presence/connected/${T}`));
    for (let i = 0; i < 3; i++) {
      await w.ride(20);
      await w.clock.advance(5_000);
    }
    const p = w.gateway.lock({ commandId: 'c2', thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' });
    await w.clock.advance(3_000);
    await p;
    for (let i = 0; i < 25; i++) {
      await w.ride(i % 3 === 2 ? 12 : 0); // para 2 vezes (5 s) e anda de novo, sempre
      await w.clock.advance(5_000);
    }
    await waitFor(() => w.updates.some((u) => u.commandId === 'c2' && u.status === 'failed'));
    expect(w.updates).toContainEqual({ commandId: 'c2', status: 'failed', reason: 'did_not_stop' });
    expect(w.traccar.commands).toEqual([]);
  });

  it('segunda guarda: desired travada:true escrito por fora com a moto andando → a ponte não corta', async () => {
    w = await world();
    w.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }] });
    await waitFor(() => w.broker.log.some((m) => m.topic === `$aws/events/presence/connected/${T}`));
    await w.ride(25);
    await w.gateway.transport.updateDesired(T, { travada: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(w.traccar.commands).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar**

Run: `pnpm --filter traccar-bridge test -- relay-lock.e2e`
Expected: PASS (3 testes). Se falhar com `Cannot find module '@nestjs/common'`, conferir que `pnpm install` rodou na raiz (a resolução parte de `services/api/src`, que encontra `services/api/node_modules`).

- [ ] **Step 3: Lint e commit**

Run: `pnpm --filter traccar-bridge lint`
Expected: sem erros (o ESLint cobre `test/e2e`; o `tsc` da ponte o exclui por importar código da API).

```bash
git add services/traccar-bridge/test/e2e
git commit -m "test(traccar-bridge): e2e em processo J16 → Traccar falso → ponte → API (corta só parada, confirma pelo bit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Ambiente local — `docker-compose.yml` profile `gt06`

**Files:**
- Modify: `docker-compose.yml` (volume do `postgres`; serviços novos depois de `iot-sim`)
- Create: `infra/postgres/traccar-db.sql`
- Create: `infra/test/compose-gt06.test.ts`
- Modify: `services/traccar-bridge/README.md` (seção "Rodar e testar")

**Interfaces:**
- Consumes: imagem da ponte (`services/traccar-bridge/Dockerfile`, Task 9), CLI do emulador (`dist/gt06/emulator-main.js`, Task 10), `TRACCAR_BOOTSTRAP_ADMIN` (Task 9), `provision-tracker.ts --protocol gt06` (Task 7).
- Produces: `docker compose --profile gt06 up -d traccar traccar-bridge gt06-emulator` (spec §7). Não roda no PC do dono (sem Docker): o teste é estático; a execução real é a do dev single (Task 13).

- [ ] **Step 1: Teste estático (falha)**

`infra/test/compose-gt06.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');
const compose = readFileSync(join(REPO, 'docker-compose.yml'), 'utf8');

/** Bloco de um serviço (até o próximo serviço de 2 espaços ou a próxima chave de topo). */
function service(c: string, name: string): string {
  const start = c.indexOf(`\n  ${name}:`);
  if (start < 0) throw new Error(`serviço ${name} ausente`);
  const rest = c.slice(start + 1);
  const next = rest.search(/\n( {2}[a-z][a-z0-9-]*:|[a-z]+:)/);
  return next < 0 ? rest : rest.slice(0, next);
}

describe('docker-compose.yml: profile gt06 (spec GT06 §7)', () => {
  it('traccar, traccar-bridge e gt06-emulator existem só no profile gt06', () => {
    for (const s of ['traccar', 'traccar-bridge', 'gt06-emulator']) expect(service(compose, s)).toContain('profiles: ["gt06"]');
  });

  it('Traccar: imagem fixada, banco "traccar" separado, só o protocolo GT06, portas só em localhost, memória limitada', () => {
    const t = service(compose, 'traccar');
    expect(t).toMatch(/image: traccar\/traccar:\d+\.\d+-ubuntu/);
    expect(t).toContain('DATABASE_URL: jdbc:postgresql://postgres:5432/traccar');
    expect(t).toContain('PROTOCOLS_ENABLE: gt06');
    expect(t).toContain('ports: ["127.0.0.1:5023:5023", "127.0.0.1:8082:8082"]');
    expect(t).toMatch(/-Xmx\d+m/);
    expect(t).toMatch(/mem_limit: \d+m/);
  });

  it('o Postgres local cria o banco traccar na primeira subida do volume', () => {
    expect(service(compose, 'postgres')).toContain('./infra/postgres/traccar-db.sql:/docker-entrypoint-initdb.d/20-traccar.sql:ro');
    expect(readFileSync(join(REPO, 'infra', 'postgres', 'traccar-db.sql'), 'utf8')).toMatch(/CREATE DATABASE traccar;/);
  });

  it('ponte: Mosquitto local, Traccar pela rede do compose, sem credenciais da AWS; cria o primeiro usuário do Traccar', () => {
    const b = service(compose, 'traccar-bridge');
    expect(b).toContain('dockerfile: services/traccar-bridge/Dockerfile');
    expect(b).toContain('IOT_MODE: local');
    expect(b).toContain('MQTT_URL: mqtt://mosquitto:1883');
    expect(b).toContain('TRACCAR_URL: http://traccar:8082');
    expect(b).toContain('TRACCAR_BOOTSTRAP_ADMIN: "true"');
    expect(b).not.toMatch(/AWS_|ports:/);
  });

  it('emulador: imagem da ponte, aponta para traccar:5023, cenário por variável', () => {
    const e = service(compose, 'gt06-emulator');
    expect(e).toContain('command: ["node", "dist/gt06/emulator-main.js"]');
    expect(e).toContain('GT06_HOST: traccar');
    expect(e).toContain('GT06_SCENARIO: ${GT06_SCENARIO:-parked}');
  });
});
```

Run: `pnpm --filter infra test -- compose-gt06`
Expected: FAIL — `serviço traccar ausente`.

- [ ] **Step 2: `docker-compose.yml` e o init do banco**

`infra/postgres/traccar-db.sql`:

```sql
-- Banco separado do Traccar (spec GT06 §7). Roda só na primeira subida do volume pgdata; com volume antigo:
--   docker compose exec postgres createdb -U volti traccar
CREATE DATABASE traccar;
```

No serviço `postgres` do `docker-compose.yml`, a linha `volumes:` passa a ser:

```yaml
    volumes: [pgdata:/var/lib/postgresql/data, ./infra/postgres/traccar-db.sql:/docker-entrypoint-initdb.d/20-traccar.sql:ro]
```

Depois do serviço `iot-sim` (antes de `volumes:` do topo), acrescentar:

```yaml
  # Rastreador GT06 só relé (docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md):
  #   docker compose --profile gt06 up -d traccar traccar-bridge gt06-emulator
  # Banco "traccar" separado no mesmo Postgres. Portas só em localhost: 5023 (GT06) e 8082 (painel/REST do Traccar).
  traccar:
    profiles: ["gt06"]
    image: traccar/traccar:6.5-ubuntu
    mem_limit: 768m
    entrypoint: ["java", "-Xms128m", "-Xmx512m", "-Djava.net.preferIPv4Stack=true"]
    command: ["-jar", "tracker-server.jar", "conf/traccar.xml"]
    environment:
      CONFIG_USE_ENVIRONMENT_VARIABLES: "true"
      DATABASE_DRIVER: org.postgresql.Driver
      DATABASE_URL: jdbc:postgresql://postgres:5432/traccar
      DATABASE_USER: volti
      DATABASE_PASSWORD: volti
      PROTOCOLS_ENABLE: gt06
      GT06_PORT: "5023"
      WEB_PORT: "8082"
    ports: ["127.0.0.1:5023:5023", "127.0.0.1:8082:8082"]
    depends_on:
      postgres:
        condition: service_healthy
  # Ponte Traccar → MQTT; no local ela cria o primeiro usuário do Traccar (admin) com estas credenciais.
  traccar-bridge:
    profiles: ["gt06"]
    build:
      context: .
      dockerfile: services/traccar-bridge/Dockerfile
    image: volti/traccar-bridge:local
    environment:
      IOT_MODE: local
      MQTT_URL: mqtt://mosquitto:1883
      TRACCAR_URL: http://traccar:8082
      TRACCAR_EMAIL: ${TRACCAR_EMAIL:-admin@volti.local}
      TRACCAR_PASSWORD: ${TRACCAR_PASSWORD:-volti-dev-traccar}
      TRACCAR_BOOTSTRAP_ADMIN: "true"
      DATABASE_URL: postgresql://volti:volti@postgres:5432/volti
      BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}
    depends_on:
      postgres:
        condition: service_healthy
      mosquitto:
        condition: service_started
      traccar:
        condition: service_started
  # Emulador GT06 (mesma imagem da ponte): GT06_SCENARIO=parked (padrão) ou ride-then-stop.
  gt06-emulator:
    profiles: ["gt06"]
    build:
      context: .
      dockerfile: services/traccar-bridge/Dockerfile
    image: volti/traccar-bridge:local
    command: ["node", "dist/gt06/emulator-main.js"]
    environment:
      GT06_HOST: traccar
      GT06_PORT: "5023"
      GT06_IMEI: ${GT06_EMULATOR_IMEI:-860000000000901}
      GT06_SCENARIO: ${GT06_SCENARIO:-parked}
    depends_on:
      traccar:
        condition: service_started
```

- [ ] **Step 3: Rodar**

Run: `pnpm --filter infra test -- compose-gt06`
Expected: PASS (5 testes).

- [ ] **Step 4: README da ponte — passo a passo local (máquina com Docker)**

Em `services/traccar-bridge/README.md`, trocar o parágrafo "Local com Docker (...)" por:

````md
Local, numa máquina com Docker (o PC do dono não tem; lá valem os testes acima e o e2e do dev single):

```bash
docker compose up -d postgres redis mosquitto api
docker compose --profile gt06 up -d traccar traccar-bridge gt06-emulator   # a ponte cria o admin do Traccar
TRACCAR_ADMIN_PASSWORD=volti-dev-traccar DATABASE_URL=postgresql://volti:volti@localhost:5432/volti \
  pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle VLT-0001 --thing moto-0001 --imei 860000000000901
docker compose --profile gt06 logs -f traccar-bridge gt06-emulator
```

Volume do Postgres criado antes do profile: `docker compose exec postgres createdb -U volti traccar`. Painel do Traccar em
`http://localhost:8082` (admin@volti.local). Para ver o lock: `GT06_SCENARIO=ride-then-stop docker compose --profile gt06 up -d --force-recreate gt06-emulator`.
````

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml infra/postgres/traccar-db.sql infra/test/compose-gt06.test.ts services/traccar-bridge/README.md
git commit -m "feat(local): profile gt06 no docker-compose (Traccar, ponte e emulador)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Dev single (AWS) — profile `gt06`, segredos, `gt06.sh` e o e2e com Traccar de verdade

**Files:**
- Modify: `deploy/single/compose.yml` (3 serviços novos entre `caddy` e o bloco do `iot-sim`)
- Modify: `deploy/single/render-env.sh` (segredos gerados e allowlists)
- Modify: `deploy/single/update.sh` (toggle `GT06`, `gt06.sh init` depois das migrações)
- Create: `deploy/single/gt06.sh`
- Modify: `deploy/single/cloudshell.md` (seção "Rastreador GT06 (Traccar)")
- Modify: `infra/lib/stacks/single-dev-stack.ts` (prop `gt06Port`), `infra/lib/volti-app.ts` (`createSingleDevApp`), `infra/bin/volti.ts`
- Create: `infra/test/single-gt06.test.ts`
- Modify: `infra/test/single-profile.test.ts:404-427` (portas), `infra/test/single-profile-imds.test.ts:80-95` (lista de serviços sem NET_RAW)

**Interfaces:**
- Consumes: imagem/CLIs da ponte (Tasks 9–10); `dist/cli/provision-gt06.js` na imagem da API (Task 7); `FLEET_SQL` sem `relay_only` (Task 7); migrações da Task 2.
- Produces: `gt06.sh init|provision|deprovision|e2e`; parâmetros opcionais `/volti/dev/config/GT06` (`on`|`off`) e `/volti/dev/config/GT06_BATTERY_MODEL`; segredos gerados `TRACCAR_DB_PASSWORD`, `TRACCAR_ADMIN_PASSWORD`, `TRACCAR_BRIDGE_PASSWORD`, `BRIDGE_DB_PASSWORD`; segredo manual do dono `/volti/dev/secrets/E2E_STAFF_TOKEN` (fora da allowlist: nunca entra no `.env`); `SingleDevStackProps.gt06Port?: boolean` (`-c gt06Port=true`).

- [ ] **Step 1: Confirmar que a imagem do Traccar tem arm64 (t4g.small é Graviton)**

Run: `curl -s https://hub.docker.com/v2/namespaces/traccar/repositories/traccar/tags/6.5-ubuntu | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).images.map(i=>i.architecture).join(',')))"`
Expected: a lista contém `arm64` (ex.: `amd64,arm64`).

Se **não** contiver `arm64`: criar `deploy/single/traccar/Dockerfile` com o conteúdo abaixo e, no serviço `traccar` do Step 3, trocar `image: traccar/traccar:6.5-ubuntu` por `build: ./traccar` + `image: volti/traccar:6.5` (e incluir `traccar` no `build` do `update.sh`); registrar a troca em `docs/decisoes.md`.

```dockerfile
# Traccar 6.5 em arm64 (Graviton): a tag oficial não publica arm64. JRE multi-arquitetura + pacote "other" do Traccar.
FROM eclipse-temurin:17-jre-jammy
ARG TRACCAR_VERSION=6.5
RUN apt-get update && apt-get install -y --no-install-recommends unzip wget ca-certificates && rm -rf /var/lib/apt/lists/* \
 && wget -q -O /tmp/traccar.zip "https://github.com/traccar/traccar/releases/download/v${TRACCAR_VERSION}/traccar-other-${TRACCAR_VERSION}.zip" \
 && mkdir -p /opt/traccar && unzip -q /tmp/traccar.zip -d /opt/traccar && rm /tmp/traccar.zip
WORKDIR /opt/traccar
ENTRYPOINT ["java", "-Xms128m", "-Xmx320m", "-Djava.net.preferIPv4Stack=true"]
CMD ["-jar", "tracker-server.jar", "conf/traccar.xml"]
```

- [ ] **Step 2: Testes (falham)**

`infra/test/single-gt06.test.ts`:

```ts
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Template } from 'aws-cdk-lib/assertions';
import { createSingleDevApp } from '../lib/volti-app';

const REPO = join(__dirname, '..', '..');
const file = (name: string) => readFileSync(join(REPO, 'deploy', 'single', name), 'utf8');

function service(c: string, name: string): string {
  const start = c.indexOf(`\n  ${name}:`);
  if (start < 0) throw new Error(`serviço ${name} ausente`);
  const rest = c.slice(start + 1);
  const next = rest.search(/\n( {2}[a-z][a-z0-9-]*:|[a-z]+:)/);
  return next < 0 ? rest : rest.slice(0, next);
}

/** Git Bash no Windows; `bash` nos outros. Sem bash, o teste de shell é pulado (como em single-profile-imds.test.ts). */
function findBash(): string | null {
  if (process.env.VOLTI_TEST_BASH) return process.env.VOLTI_TEST_BASH;
  if (process.platform === 'win32') {
    for (const p of ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe']) if (existsSync(p)) return p;
    return null;
  }
  return spawnSync('bash', ['--version']).status === 0 ? 'bash' : null;
}
const BASH = findBash();
const itBash = BASH ? it : it.skip;

describe('dev single: rastreador GT06 (spec GT06 §7, plano Task 13)', () => {
  const c = file('compose.yml');

  it('três serviços no profile gt06, sem IP fixo (sem IMDS), sem NET_RAW, sem o .env inteiro e com memória limitada', () => {
    for (const s of ['traccar', 'traccar-bridge', 'gt06-emulator']) {
      const block = service(c, s);
      expect(block).toContain('profiles: ["gt06"]');
      expect(block).toContain('cap_drop: [NET_RAW]');
      expect(block).toMatch(/mem_limit: \d+m/);
      expect(block).not.toMatch(/ipv4_address|env_file/);
    }
  });

  it('Traccar: arm64 fixado, heap pequeno, banco e papel próprios, REST só em 127.0.0.1, GT06 na 5023', () => {
    const t = service(c, 'traccar');
    expect(t).toMatch(/image: (traccar\/traccar:\d+\.\d+-ubuntu|volti\/traccar:\d+\.\d+)/);
    expect(t).toMatch(/-Xmx(3[0-9]{2}|[12][0-9]{2})m/);
    expect(t).toContain('DATABASE_URL: jdbc:postgresql://postgres:5432/traccar');
    expect(t).toContain('DATABASE_USER: traccar');
    expect(t).toContain('DATABASE_PASSWORD: ${TRACCAR_DB_PASSWORD:?');
    expect(t).toContain('ports: ["5023:5023", "127.0.0.1:8082:8082"]');
  });

  it('ponte: papel volti_bridge e usuário próprio do Traccar; nada do DB_PASSWORD da API', () => {
    const b = service(c, 'traccar-bridge');
    expect(b).toContain('DATABASE_URL: postgresql://volti_bridge:${BRIDGE_DB_PASSWORD:?');
    expect(b).toContain('TRACCAR_EMAIL: bridge@volti.local');
    expect(b).toContain('TRACCAR_PASSWORD: ${TRACCAR_BRIDGE_PASSWORD:?');
    expect(b).not.toContain('DB_PASSWORD}');
    expect(b).not.toMatch(/ports:/);
  });

  it('render-env.sh gera e libera os quatro segredos novos e as configs GT06', () => {
    const env = file('render-env.sh');
    const list = (name: string) => env.match(new RegExp(`^${name}=\\(([^)]*)\\)`, 'm'))![1].trim().split(/\s+/);
    const generated = env.match(/^for name in ([A-Z_ ]+); do/m)![1].split(' ');
    for (const n of ['TRACCAR_DB_PASSWORD', 'TRACCAR_ADMIN_PASSWORD', 'TRACCAR_BRIDGE_PASSWORD', 'BRIDGE_DB_PASSWORD']) {
      expect(generated).toContain(n);
      expect(list('SECRET_NAMES')).toContain(n);
    }
    expect(list('CONFIG_NAMES')).toEqual(expect.arrayContaining(['GT06', 'GT06_BATTERY_MODEL']));
    expect(list('SECRET_NAMES')).not.toContain('E2E_STAFF_TOKEN');
  });

  it('update.sh: GT06 desligado por padrão; ligado, o init roda depois das migrações e antes de subir os containers', () => {
    const u = file('update.sh');
    expect(u).toMatch(/grep -E '\^GT06='/);
    expect(u).toMatch(/case "\$\{gt06_flag:-off\}" in/);
    const migrate = u.indexOf('prisma migrate deploy');
    const init = u.indexOf('bash deploy/single/gt06.sh init');
    const up = u.indexOf('up -d --remove-orphans');
    expect(migrate).toBeGreaterThan(-1);
    expect(init).toBeGreaterThan(migrate);
    expect(up).toBeGreaterThan(init);
    expect(u).toMatch(/rm -sf traccar traccar-bridge gt06-emulator/);
  });

  it('gt06.sh: senhas e token nunca na linha de comando; token do e2e só do SSM; papel da ponte só com SELECT em 3 colunas', () => {
    const g = file('gt06.sh');
    expect(g).not.toMatch(/curl[^\n]*\s-u\s/);
    expect(g).toMatch(/curl -fsS -X "\$1" -K -/);
    expect(g).toMatch(/\$VOLTI_SECRETS_PREFIX\/E2E_STAFF_TOKEN/);
    expect(g).toMatch(/GRANT SELECT \("imei", "thingName", "controlMode"\) ON "Tracker" TO volti_bridge;/);
    expect(g).not.toMatch(/echo "\$token"|printf '%s' "\$token"/);
  });

  itBash('gt06.sh valida a ação e os argumentos antes de tocar no Docker (sai 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'volti-gt06-'));
    const inst = join(dir, 'instance.env');
    writeFileSync(inst, `VOLTI_REGION=sa-east-1\nVOLTI_REPO_DIR=${dir.replace(/\\/g, '/')}\nVOLTI_SECRETS_PREFIX=/volti/dev/secrets\n`);
    const run = (...args: string[]) => spawnSync(BASH!, [join(REPO, 'deploy', 'single', 'gt06.sh').replace(/\\/g, '/'), ...args], { env: { ...process.env, VOLTI_INSTANCE_ENV: inst.replace(/\\/g, '/') }, encoding: 'utf8' });
    expect(run('qualquer').status).toBe(2);
    expect(run('provision', 'VLT-0901', 'moto-0901', '123').status).toBe(2);
    expect(run('provision', 'VLT-0901', "moto-0901'; DROP", '860000000000901').status).toBe(2);
    expect(run('e2e', 'VLT-0901').status).toBe(2);
  });

  it('security group: 5023 só com -c gt06Port=true', () => {
    const s = createSingleDevApp({ gt06Port: true, outdir: mkdtempSync(join(tmpdir(), 'volti-gt06-cdk-')) });
    const sg = Object.values(Template.fromStack(s.single).findResources('AWS::EC2::SecurityGroup'))[0] as any;
    const ingress = sg.Properties.SecurityGroupIngress.map((r: any) => [r.IpProtocol, r.FromPort, r.CidrIp]);
    expect(ingress).toContainEqual(['tcp', 5023, '0.0.0.0/0']);
  });
});
```

Em `infra/test/single-profile.test.ts`, no teste `compose runs API (...)`, trocar `expect(c.match(/^\s+ports:/gm)).toHaveLength(1);` por:

```ts
      // Caddy (80/443) e o Traccar do profile gt06 (5023 pública, REST só em 127.0.0.1).
      expect(c.match(/^\s+ports:/gm)).toHaveLength(2);
      expect(c).toContain('ports: ["5023:5023", "127.0.0.1:8082:8082"]');
```

Em `infra/test/single-profile-imds.test.ts`, no teste `compose: one network (...)`, a lista passa a ser:

```ts
    for (const svc of ['postgres', 'redis', 'mosquitto', 'caddy', 'traccar', 'traccar-bridge', 'gt06-emulator', 'iot-sim', 'api-migrate']) {
```

Run: `pnpm --filter infra test -- single`
Expected: FAIL — `serviço traccar ausente`, contagem de `ports:` = 1 e `gt06Port` desconhecido.

- [ ] **Step 3: `compose.yml` do dev single**

Inserir depois do serviço `caddy` (antes do comentário `# Simulador de rastreadores ...`):

```yaml
  # Rastreador GT06 só relé (profile "gt06", ligado por /volti/dev/config/GT06=on; spec 2026-10-27). Banco e papel próprios
  # (deploy/single/gt06.sh init). REST só em 127.0.0.1 (SSM port forwarding); GT06 na 5023, que o security group só abre com
  # -c gt06Port=true. t4g.small (2 GiB, arm64): memória limitada e heap fixo. Sem IP fixo (cai no DROP do imds-guard.sh).
  traccar:
    profiles: ["gt06"]
    image: traccar/traccar:6.5-ubuntu
    restart: unless-stopped
    cap_drop: [NET_RAW]
    mem_limit: 640m
    entrypoint: ["java", "-Xms128m", "-Xmx320m", "-Djava.net.preferIPv4Stack=true"]
    command: ["-jar", "tracker-server.jar", "conf/traccar.xml"]
    environment:
      CONFIG_USE_ENVIRONMENT_VARIABLES: "true"
      DATABASE_DRIVER: org.postgresql.Driver
      DATABASE_URL: jdbc:postgresql://postgres:5432/traccar
      DATABASE_USER: traccar
      DATABASE_PASSWORD: ${TRACCAR_DB_PASSWORD:?TRACCAR_DB_PASSWORD ausente (rode render-env.sh)}
      PROTOCOLS_ENABLE: gt06
      GT06_PORT: "5023"
      WEB_PORT: "8082"
    ports: ["5023:5023", "127.0.0.1:8082:8082"]
    depends_on:
      postgres:
        condition: service_healthy

  # Ponte Traccar → MQTT (services/traccar-bridge): Mosquitto, Traccar (rede interna) e Postgres com o papel volti_bridge
  # (SELECT em 3 colunas de "Tracker"). Recebe só as duas senhas dela, não o .env inteiro.
  traccar-bridge:
    profiles: ["gt06"]
    build:
      context: ../..
      dockerfile: services/traccar-bridge/Dockerfile
    image: volti/traccar-bridge:dev
    restart: unless-stopped
    cap_drop: [NET_RAW]
    mem_limit: 160m
    environment:
      IOT_MODE: local
      MQTT_URL: mqtt://mosquitto:1883
      TRACCAR_URL: http://traccar:8082
      TRACCAR_EMAIL: bridge@volti.local
      TRACCAR_PASSWORD: ${TRACCAR_BRIDGE_PASSWORD:?TRACCAR_BRIDGE_PASSWORD ausente (rode render-env.sh)}
      DATABASE_URL: postgresql://volti_bridge:${BRIDGE_DB_PASSWORD:?BRIDGE_DB_PASSWORD ausente (rode render-env.sh)}@postgres:5432/volti
      BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}
    depends_on:
      postgres:
        condition: service_healthy
      mosquitto:
        condition: service_started
      traccar:
        condition: service_started

  # Emulador GT06 (imagem da ponte) para o e2e: GT06_SCENARIO=parked (padrão) ou ride-then-stop (gt06.sh e2e).
  gt06-emulator:
    profiles: ["gt06"]
    image: volti/traccar-bridge:dev
    restart: unless-stopped
    cap_drop: [NET_RAW]
    mem_limit: 96m
    command: ["node", "dist/gt06/emulator-main.js"]
    environment:
      GT06_HOST: traccar
      GT06_PORT: "5023"
      GT06_IMEI: ${GT06_EMULATOR_IMEI:-860000000000901}
      GT06_SCENARIO: ${GT06_SCENARIO:-parked}
    depends_on:
      traccar:
        condition: service_started
```

- [ ] **Step 4: `render-env.sh`**

Trocar a linha do laço de segredos gerados por:

```bash
for name in DB_PASSWORD STATION_QR_SECRET FRAUD_HASH_SECRET PICKUP_CODE_SECRET MERCADOPAGO_WEBHOOK_SECRET TRACCAR_DB_PASSWORD TRACCAR_ADMIN_PASSWORD TRACCAR_BRIDGE_PASSWORD BRIDGE_DB_PASSWORD; do
```

e o comentário acima dele ganha a linha: `# Os quatro do GT06 (Traccar e ponte) nascem mesmo com GT06=off: o compose.yml os exige em qualquer profile.`

`CONFIG_NAMES`: na linha `IOT_SIM SIM_RIDE_ON_UNLOCK`, acrescentar `GT06 GT06_BATTERY_MODEL`. `SECRET_NAMES` passa a ser:

```bash
SECRET_NAMES=(DB_PASSWORD STATION_QR_SECRET FRAUD_HASH_SECRET PICKUP_CODE_SECRET MERCADOPAGO_WEBHOOK_SECRET MERCADOPAGO_ACCESS_TOKEN TRACCAR_DB_PASSWORD TRACCAR_ADMIN_PASSWORD TRACCAR_BRIDGE_PASSWORD BRIDGE_DB_PASSWORD)
```

- [ ] **Step 5: `update.sh`**

Depois do bloco `case "${iot_sim:-on}" in ... esac`:

```bash
# Rastreador GT06 só relé (Traccar + ponte + emulador, spec 2026-10-27): GT06=on liga o profile "gt06" (padrão off: a
# t4g.small tem 2 GiB). Ligado, o gt06.sh init (papéis, banco e usuários do Traccar; idempotente) roda depois das migrações.
gt06_flag="$(grep -E '^GT06=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
case "${gt06_flag:-off}" in
  on|true|1) gt06=(--profile gt06) ; gt06_services=(traccar-bridge) ; echo "rastreador GT06 (Traccar + ponte + emulador): ligado" ;;
  *) gt06=() ; gt06_services=() ; echo "rastreador GT06: desligado (GT06=${gt06_flag:-off})" ;;
esac
```

Trocar `dc "${sim[@]}" build api postgres "${sim_services[@]}"` por `dc "${sim[@]}" "${gt06[@]}" build api postgres "${sim_services[@]}" "${gt06_services[@]}"`. Depois da linha `dc --profile migrate run --rm api-migrate npx prisma migrate deploy`:

```bash
if [ ${#gt06[@]} -gt 0 ]; then bash deploy/single/gt06.sh init; fi
```

Trocar `dc "${sim[@]}" up -d --remove-orphans` por `dc "${sim[@]}" "${gt06[@]}" up -d --remove-orphans`; depois da linha que remove o `iot-sim` desligado:

```bash
if [ ${#gt06[@]} -eq 0 ]; then dc --profile gt06 rm -sf traccar traccar-bridge gt06-emulator >/dev/null 2>&1 || true; fi
```

e a última linha passa a `dc "${sim[@]}" "${gt06[@]}" ps`.

No teste `tracker simulator: iot-sim (...)` de `infra/test/single-profile.test.ts`, trocar `expect(update).toMatch(/dc "\$\{sim\[@\]\}" up -d --remove-orphans/);` por `expect(update).toMatch(/dc "\$\{sim\[@\]\}" "\$\{gt06\[@\]\}" up -d --remove-orphans/);`.

- [ ] **Step 6: `deploy/single/gt06.sh`**

```bash
#!/usr/bin/env bash
# Rastreador GT06 só relé no dev single (spec docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md, §7):
#   gt06.sh init                                      papéis/banco do Traccar e da ponte e usuários do Traccar (idempotente;
#                                                     o update.sh chama com GT06=on, depois das migrações)
#   gt06.sh provision <VLT-0000> <moto-0000> <imei>   Tracker relay_only + dispositivo no Traccar (provision-gt06 da API)
#   gt06.sh deprovision <moto-0000>                   apaga o Tracker relay_only (o iot-sim volta a simular a moto)
#   gt06.sh e2e <VLT-0000> <moto-0000>                emulador anda e para; lock pela API com o token de staff do DONO
#                                                     (/volti/dev/secrets/E2E_STAFF_TOKEN); confere a linha do tempo MQTT
# Senhas e token nunca vão para a linha de comando (curl -K - e SQL pelo stdin) nem para a saída.
set -euo pipefail
source "${VOLTI_INSTANCE_ENV:-/etc/volti/instance.env}"
export AWS_DEFAULT_REGION="$VOLTI_REGION"

usage() { sed -n '2,10p' "$0" >&2; exit 2; }
action="${1:-}"
case "$action" in
  init) ;;
  provision) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ && "${4:-}" =~ ^[0-9]{15}$ ]] || usage ;;
  deprovision) [[ "${2:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  e2e) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  *) usage ;;
esac

cd "$VOLTI_REPO_DIR"
ENV_FILE="${VOLTI_ENV_FILE:-/opt/volti/.env}"
TRACCAR_ADMIN_EMAIL=admin@volti.local
TRACCAR_BRIDGE_EMAIL=bridge@volti.local
TRACCAR_LOCAL=http://127.0.0.1:8082
envval() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; }
dc() { docker compose -f deploy/single/compose.yml --env-file "$ENV_FILE" --profile gt06 "$@"; }
sql() { dc exec -T postgres psql -v ON_ERROR_STOP=1 -U volti -d volti -tA; }
# traccar_admin <método> <caminho> [json]: credenciais e corpo pelo stdin do curl (-K -).
traccar_admin() {
  {
    printf 'user = "%s:%s"\n' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)"
    if [ -n "${3:-}" ]; then printf 'header = "Content-Type: application/json"\ndata = "%s"\n' "${3//\"/\\\"}"; fi
  } | curl -fsS -X "$1" -K - "$TRACCAR_LOCAL$2"
}

case "$action" in
  init)
    # Senhas em hex (geradas pelo render-env.sh): seguras entre aspas simples; o SQL vai pelo stdin do psql.
    sql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'traccar') THEN CREATE ROLE traccar LOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'volti_bridge') THEN CREATE ROLE volti_bridge LOGIN; END IF;
END \$\$;
ALTER ROLE traccar PASSWORD '$(envval TRACCAR_DB_PASSWORD)';
ALTER ROLE volti_bridge PASSWORD '$(envval BRIDGE_DB_PASSWORD)';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM volti_bridge;
GRANT CONNECT ON DATABASE volti TO volti_bridge;
GRANT USAGE ON SCHEMA public TO volti_bridge;
GRANT SELECT ("imei", "thingName", "controlMode") ON "Tracker" TO volti_bridge;
SQL
    if [ -z "$(echo "SELECT 1 FROM pg_database WHERE datname = 'traccar'" | sql)" ]; then
      echo "CREATE DATABASE traccar OWNER traccar" | sql >/dev/null
      echo "banco traccar criado"
    fi
    dc up -d traccar
    for _ in $(seq 1 60); do curl -fsS "$TRACCAR_LOCAL/api/server" >/dev/null 2>&1 && break; sleep 3; done
    curl -fsS "$TRACCAR_LOCAL/api/server" >/dev/null || { echo "o Traccar não respondeu em 180 s" >&2; exit 1; }
    if ! traccar_admin GET /api/users >/dev/null 2>&1; then
      # Traccar vazio: o primeiro usuário vira administrador. Corpo pelo stdin.
      printf '{"name":"Volti admin","email":"%s","password":"%s"}' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)" |
        curl -fsS -X POST -H 'Content-Type: application/json' --data @- "$TRACCAR_LOCAL/api/users" >/dev/null
      echo "administrador do Traccar criado"
    fi
    if ! traccar_admin GET /api/users | grep -q "\"email\":\"$TRACCAR_BRIDGE_EMAIL\""; then
      traccar_admin POST /api/users "$(printf '{"name":"traccar-bridge","email":"%s","password":"%s"}' "$TRACCAR_BRIDGE_EMAIL" "$(envval TRACCAR_BRIDGE_PASSWORD)")" >/dev/null
      echo "usuário da ponte criado no Traccar"
    fi
    echo "GT06 pronto (Traccar, papéis traccar e volti_bridge)"
    ;;
  provision)
    # A senha do admin do Traccar já está no ambiente da API (env_file); só valores públicos aqui.
    dc exec -T -e TRACCAR_URL=http://traccar:8082 -e TRACCAR_ADMIN_EMAIL="$TRACCAR_ADMIN_EMAIL" -e TRACCAR_BRIDGE_EMAIL="$TRACCAR_BRIDGE_EMAIL" \
      api node dist/cli/provision-gt06.js --vehicle "$2" --thing "$3" --imei "$4"
    ;;
  deprovision)
    echo "DELETE FROM \"Tracker\" WHERE \"thingName\" = '$2' AND \"controlMode\" = 'relay_only'" | sql
    echo "Tracker relay_only de $2 removido (o iot-sim volta a simular a moto no próximo ciclo)"
    ;;
  e2e)
    code="$2" thing="$3"
    host="$(envval PUBLIC_HOST)"
    vid="$(echo "SELECT id FROM \"Vehicle\" WHERE code = '$code'" | sql)"
    [ -n "$vid" ] || { echo "moto $code não encontrada" >&2; exit 1; }
    imei="$(echo "SELECT imei FROM \"Tracker\" WHERE \"thingName\" = '$thing' AND \"controlMode\" = 'relay_only'" | sql)"
    [ -n "$imei" ] || { echo "$thing não está provisionada como GT06 (gt06.sh provision)" >&2; exit 1; }
    token="$(aws ssm get-parameter --name "$VOLTI_SECRETS_PREFIX/E2E_STAFF_TOKEN" --with-decryption --query Parameter.Value --output text)"
    api() {
      {
        printf 'header = "Authorization: Bearer %s"\n' "$token"
        if [ -n "${3:-}" ]; then printf 'header = "Content-Type: application/json"\ndata = "%s"\n' "${3//\"/\\\"}"; fi
      } | curl -fsS -X "$1" -K - "https://$host$2"
    }
    log=/var/tmp/gt06-e2e.log
    : >"$log"
    # Tráfego MQTT da moto (telemetria, delta e reported); -W encerra o mosquitto_sub sozinho.
    dc exec -T mosquitto mosquitto_sub -W 360 -v -t "motos/$thing/telemetria" -t "\$aws/things/$thing/shadow/update/delta" -t "\$aws/things/$thing/shadow/update" >"$log" &
    sub=$!
    trap 'kill "$sub" 2>/dev/null || true' EXIT
    GT06_SCENARIO=ride-then-stop GT06_EMULATOR_IMEI="$imei" dc up -d --force-recreate gt06-emulator
    sleep 25 # andando a 20 km/h, fora da graça de 10 s
    cid="$(api POST "/vehicles/$vid/commands" '{"type":"lock","reason":"e2e GT06 relay-only"}' | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)"
    status=""
    for _ in $(seq 1 60); do
      status="$(api GET "/commands/$cid" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4)"
      case "$status" in confirmed|failed) break ;; esac
      sleep 5
    done
    sleep 3
    kill "$sub" 2>/dev/null || true
    echo "comando $cid: $status"
    result=0
    dc run --rm --no-deps -T traccar-bridge node dist/e2e/check-timeline.js "$thing" <"$log" || result=1
    cuts="$(dc logs --no-color gt06-emulator | grep -o '"msg":"gt06_cut","speedKmhAtCut":[0-9.]*' || true)"
    echo "cortes no emulador: ${cuts:-nenhum}"
    if printf '%s' "$cuts" | grep -Eq 'speedKmhAtCut":([3-9]|[1-9][0-9])'; then echo "FALHA: corte com o emulador a 3 km/h ou mais" >&2; result=1; fi
    [ "$status" = "confirmed" ] || { echo "FALHA: o lock terminou '$status'" >&2; result=1; }
    GT06_SCENARIO=parked GT06_EMULATOR_IMEI="$imei" dc up -d --force-recreate gt06-emulator >/dev/null
    if [ "$result" -eq 0 ]; then echo "e2e GT06: OK"; else echo "e2e GT06: FALHOU" >&2; fi
    exit "$result"
    ;;
esac
```

- [ ] **Step 7: `gt06Port` no CDK do dev single**

`infra/lib/stacks/single-dev-stack.ts`: em `SingleDevStackProps`, acrescentar:

```ts
  /** Abre a 5023 (GT06 → Traccar do profile gt06) para um J16 de bancada com chip M2M comum (sem faixa fixa). Padrão: fechada. */
  gt06Port?: boolean;
```

Depois das duas `addIngressRule` (80 e 443):

```ts
    if (props.gt06Port) this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5023), 'GT06 (Traccar do profile gt06) para o J16 de bancada');
```

`infra/lib/volti-app.ts`: `SingleDevAppOptions` ganha `gt06Port?: boolean;` e o `new SingleDevStack(...)` recebe `gt06Port: opts.gt06Port`. `infra/bin/volti.ts`: no `createSingleDevApp({...})`, acrescentar `gt06Port: get('gt06Port') === 'true',`.

- [ ] **Step 8: `cloudshell.md`**

Acrescentar a seção:

````md
## Rastreador GT06 (Traccar + ponte + emulador)

Spec `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`. Desligado por padrão (a t4g.small tem 2 GiB;
o profile soma ~900 MB de limite). Conferir `free -m` na instância antes; se faltar memória, desligar o `IOT_SIM`.

```bash
aws ssm put-parameter --name /volti/dev/config/GT06 --type String --value on --tags Key=Projeto,Value=Volti
aws ssm send-command --instance-ids $IID --document-name volti-dev-update --query Command.CommandId --output text
```

O update gera `TRACCAR_DB_PASSWORD`, `TRACCAR_ADMIN_PASSWORD`, `TRACCAR_BRIDGE_PASSWORD` e `BRIDGE_DB_PASSWORD` em
`/volti/dev/secrets/`, cria o banco `traccar`, os papéis `traccar` e `volti_bridge` (só SELECT em `imei`, `thingName`,
`controlMode` de `"Tracker"`) e os usuários do Traccar. Painel do Traccar (só em 127.0.0.1:8082 na instância):
`aws ssm start-session --target $IID --document-name AWS-StartPortForwardingSession --parameters portNumber=8082,localPortNumber=8082`.

Provisionar a moto do emulador (ou um J16) e rodar o e2e:

```bash
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh provision VLT-0060 moto-0060 860000000000901"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
# DONO: token de staff (admin/operacao) de uma sessão do painel — DevTools → Rede → qualquer chamada à API → valor depois de "Bearer ".
# Vale ~1 h; fica fora da allowlist (nunca entra no .env).
aws ssm put-parameter --name /volti/dev/secrets/E2E_STAFF_TOKEN --type SecureString --key-id alias/volti-dev --overwrite --value '<token>'
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript --timeout-seconds 600 \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh e2e VLT-0060 moto-0060"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
```

Esperado no fim: `{"ok":true,"problems":[]}`, `cortes no emulador: "msg":"gt06_cut","speedKmhAtCut":0` e `e2e GT06: OK`.
`gt06.sh deprovision moto-0060` devolve a moto ao `iot-sim`. J16 de bancada: `cdk deploy` da stack com `-c gt06Port=true`
abre a 5023 (DONO); depois `SERVER,0,<ip-da-instância>,5023,0#` por SMS (README da ponte).
````

- [ ] **Step 9: Rodar os testes de infra**

Run: `pnpm --filter infra test`
Expected: PASS (todos, inclusive `single-gt06`, `single-profile`, `single-profile-imds` e `compose-gt06`; os testes de shell rodam com Git Bash no Windows).

Run: `pnpm --filter infra build` e `pnpm --filter infra lint`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add deploy/single infra/lib/stacks/single-dev-stack.ts infra/lib/volti-app.ts infra/bin/volti.ts infra/test
git commit -m "feat(deploy): profile gt06 no dev single (Traccar arm64, ponte, emulador), gt06.sh e e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11: [CONTROLADOR] Deploy no dev single e e2e com Traccar de verdade**

Não executável pelo implementador sem acesso à conta. O controlador:
1. Faz a instância seguir este código (merge na branch que o dev single acompanha, `VOLTI_BRANCH` em `/etc/volti/instance.env`) e liga `GT06=on` (comandos do Step 8).
2. Roda `volti-dev-update` e confere no output: `rastreador GT06 (Traccar + ponte + emulador): ligado`, `GT06 pronto (...)` e os containers `traccar`, `traccar-bridge`, `gt06-emulator` `running`.
3. Roda `gt06.sh provision VLT-0060 moto-0060 860000000000901` (ou outra moto livre do seed; a do emulador usa o IMEI padrão).
4. **[DONO]** grava o `E2E_STAFF_TOKEN` (Step 8).
5. Roda `gt06.sh e2e VLT-0060 moto-0060`. Esperado: `e2e GT06: OK`. Falhou → `docker compose ... logs traccar traccar-bridge gt06-emulator api` pelo Session Manager e superpowers:systematic-debugging; decodificação do GT06 diferente do esperado no Traccar (heartbeat sem `blocked`, alarme com outro nome) vira ajuste no emulador/ponte + decisão registrada.
6. Volta `gt06.sh deprovision moto-0060` e, se quiser economizar memória, `GT06=off`.

---

### Task 14: CDK do Traccar e da ponte (proposta: synth + asserções, sem deploy)

**Files:**
- Create: `infra/lib/stacks/traccar-stack.ts`
- Modify: `infra/lib/volti-app.ts` (opção `traccar`, stack opcional), `infra/bin/volti.ts` (`-c gt06Things`, `-c apnCidrs`, `-c bridgeImageTag`)
- Create: `infra/test/traccar.test.ts`
- Modify: `infra/README.md`

**Interfaces:**
- Consumes: `DataStack.db`, `DataStack.dbName`, `IotStack.endpointParam`, `apiSubnetType(cfg)`, `EnvConfig` (`name`, `disposable`, `logRetentionDays`, `ecrMaxImages`).
- Produces: `GT06_PORT = 5023`, `TRACCAR_WEB_PORT = 8082`, `TRACCAR_IMAGE = 'traccar/traccar:6.5-ubuntu'`, `buildBridgePolicyDocument(region, account, env, things: string[])`, `class TraccarStack` (`nlb`, `traccarService`, `bridgeService`, `bridgeRepository`), `VoltiAppOptions.traccar?: { gt06Things: string[]; apnCidrs?: string[]; bridgeImageTag?: string }`, `VoltiStacks.traccar?: TraccarStack`.

- [ ] **Step 1: Testes (falham)**

`infra/test/traccar.test.ts`:

```ts
import { Match, Template } from 'aws-cdk-lib/assertions';
import { buildBridgePolicyDocument, GT06_PORT, TRACCAR_IMAGE, TRACCAR_WEB_PORT } from '../lib/stacks/traccar-stack';
import { createVoltiApp } from '../lib/volti-app';
import { stacksFor } from './helpers';

const envOf = (c: any): Record<string, unknown> => Object.fromEntries((c.Environment ?? []).map((e: any) => [e.Name, e.Value]));

describe('TraccarStack (proposta, opt-in por -c gt06Things)', () => {
  const s = createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['moto-0901', 'moto-0902'] } });
  const t = Template.fromStack(s.traccar!);
  const tasks = () => Object.values(t.findResources('AWS::ECS::TaskDefinition')) as any[];
  const container = (name: string) => tasks().map((td) => td.Properties.ContainerDefinitions[0]).find((c: any) => c.Name === name);

  it('não existe sem gt06Things: dev e prod de hoje intactos', () => {
    expect(stacksFor('dev').traccar).toBeUndefined();
    expect(stacksFor('prod').traccar).toBeUndefined();
  });

  it('NLB internet-facing só com TCP 5023; a REST 8082 nunca passa pelo NLB', () => {
    t.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Type: 'network', Scheme: 'internet-facing' });
    const listeners = Object.values(t.findResources('AWS::ElasticLoadBalancingV2::Listener')) as any[];
    expect(listeners.map((l) => [l.Properties.Port, l.Properties.Protocol])).toEqual([[GT06_PORT, 'TCP']]);
  });

  it('8082 só a partir do security group da ponte; sem faixa da APN, 5023 aberta (bancada) e health check pela VPC', () => {
    const rules = Object.values(t.findResources('AWS::EC2::SecurityGroupIngress')) as any[];
    const web = rules.filter((r) => r.Properties.FromPort === TRACCAR_WEB_PORT);
    expect(web).toHaveLength(1);
    expect(web[0].Properties.SourceSecurityGroupId).toBeDefined();
    const inline = (Object.values(t.findResources('AWS::EC2::SecurityGroup')) as any[]).flatMap((sg) => sg.Properties.SecurityGroupIngress ?? []);
    expect(inline.some((r: any) => r.FromPort === TRACCAR_WEB_PORT)).toBe(false);
    expect(inline.filter((r: any) => r.FromPort === GT06_PORT).map((r: any) => r.CidrIp)).toContain('0.0.0.0/0');
  });

  it('com apnCidrs, a 5023 só dessas faixas (além da VPC para o health check)', () => {
    const withApn = createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['moto-0901'], apnCidrs: ['10.200.0.0/16'] } });
    const inline = (Object.values(Template.fromStack(withApn.traccar!).findResources('AWS::EC2::SecurityGroup')) as any[]).flatMap((sg) => sg.Properties.SecurityGroupIngress ?? []);
    const gt06 = inline.filter((r: any) => r.FromPort === GT06_PORT).map((r: any) => r.CidrIp);
    expect(gt06).toContain('10.200.0.0/16');
    expect(gt06).not.toContain('0.0.0.0/0');
  });

  it('Traccar: ARM64, imagem fixada, uma task por vez, banco traccar, senha só por segredo', () => {
    for (const td of tasks()) expect(td.Properties.RuntimePlatform).toEqual({ CpuArchitecture: 'ARM64', OperatingSystemFamily: 'LINUX' });
    const traccar = container('traccar');
    expect(traccar.Image).toBe(TRACCAR_IMAGE);
    expect(TRACCAR_IMAGE).not.toMatch(/:latest$/);
    expect(envOf(traccar)).toMatchObject({ DATABASE_USER: 'traccar', PROTOCOLS_ENABLE: 'gt06', GT06_PORT: '5023', CONFIG_USE_ENVIRONMENT_VARIABLES: 'true' });
    expect(JSON.stringify(envOf(traccar).DATABASE_URL)).toContain(':5432/traccar');
    expect(traccar.Secrets.map((x: any) => x.Name)).toEqual(['DATABASE_PASSWORD']);
    t.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar', DesiredCount: 0, DeploymentConfiguration: Match.objectLike({ MinimumHealthyPercent: 0, MaximumPercent: 100 }) });
  });

  it('ponte: IoT Core com certificado de serviço, Traccar pela rede interna, senhas e certificado só por segredo', () => {
    const bridge = container('bridge');
    expect(envOf(bridge)).toMatchObject({ IOT_MODE: 'aws', MQTT_CLIENT_ID: 'traccar-bridge-dev', TRACCAR_URL: 'http://traccar.traccar.volti-dev.internal:8082', TRACCAR_EMAIL: 'bridge@volti.local', DATABASE_USER: 'volti_bridge', DATABASE_SSL: 'require' });
    expect(bridge.Secrets.map((x: any) => x.Name).sort()).toEqual(['DATABASE_PASSWORD', 'MQTT_CERT_PEM', 'MQTT_KEY_PEM', 'TRACCAR_PASSWORD']);
    expect(Object.keys(envOf(bridge)).some((k) => /PASSWORD|PEM/.test(k))).toBe(false);
    t.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar-bridge', DesiredCount: 0 });
  });

  it('política IoT da ponte: só os things relay_only listados (sem curinga de thing)', () => {
    const doc = buildBridgePolicyDocument('sa-east-1', '000000000000', 'dev', ['moto-0901']);
    const all = doc.Statement.flatMap((st) => (Array.isArray(st.Resource) ? st.Resource : [st.Resource]));
    expect(all.every((r) => !r.includes('*') && !r.includes('+'))).toBe(true);
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:client/traccar-bridge-dev');
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:topic/$aws/things/moto-0901/shadow/update');
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:topicfilter/$aws/things/moto-0901/shadow/update/delta');
    t.hasResourceProperties('AWS::IoT::Policy', { PolicyName: 'volti-dev-traccar-bridge-policy' });
  });

  it('validações: thing inválido; prod sem apnCidrs (GT06 sem TLS só por APN privada)', () => {
    expect(() => createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['VLT-1'] } })).toThrow('gt06Things');
    expect(() => createVoltiApp({ envName: 'prod', apiDomainName: 'api.volti.example', traccar: { gt06Things: ['moto-0901'] } })).toThrow('apnCidrs');
  });
});
```

Run: `pnpm --filter infra test -- traccar`
Expected: FAIL — `Cannot find module '../lib/stacks/traccar-stack'`.

- [ ] **Step 2: `traccar-stack.ts`**

```ts
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { DataStack } from './data-stack';
import { IotStack } from './iot-stack';
import { apiSubnetType } from './network-stack';

export const GT06_PORT = 5023;
export const TRACCAR_WEB_PORT = 8082;
/** Imagem oficial fixada (multi-arquitetura; arm64 conferido no plano GT06, Task 13 Step 1). */
export const TRACCAR_IMAGE = 'traccar/traccar:6.5-ubuntu';
const THING_NAME = /^moto-\d{4,}$/;

export interface TraccarStackProps extends StackProps {
  cfg: EnvConfig;
  vpc: ec2.IVpc;
  data: DataStack;
  iot: IotStack;
  /** thingNames `relay_only` que a ponte pode atualizar (a política IoT os enumera: J16 novo em prod exige deploy). */
  gt06Things: string[];
  /** Faixas da APN privada. Vazio = 5023 aberta (só bancada; prod recusa). */
  apnCidrs?: string[];
  bridgeImageTag?: string;
}

/** Política do certificado de serviço da ponte: telemetria/eventos e o shadow só dos things listados. */
export function buildBridgePolicyDocument(region: string, account: string, env: string, things: string[]) {
  const arn = (kind: 'client' | 'topic' | 'topicfilter', name: string) => `arn:aws:iot:${region}:${account}:${kind}/${name}`;
  return {
    Version: '2012-10-17',
    Statement: [
      { Effect: 'Allow', Action: 'iot:Connect', Resource: [arn('client', `traccar-bridge-${env}`)] },
      {
        Effect: 'Allow',
        Action: 'iot:Publish',
        Resource: things.flatMap((t) => [arn('topic', `motos/${t}/telemetria`), arn('topic', `motos/${t}/eventos`), arn('topic', `$aws/things/${t}/shadow/update`), arn('topic', `$aws/things/${t}/shadow/get`)]),
      },
      {
        Effect: 'Allow',
        Action: 'iot:Subscribe',
        Resource: things.flatMap((t) => [arn('topicfilter', `$aws/things/${t}/shadow/update/delta`), arn('topicfilter', `$aws/things/${t}/shadow/get/accepted`), arn('topicfilter', `motos/${t}/comandos`)]),
      },
      {
        Effect: 'Allow',
        Action: 'iot:Receive',
        Resource: things.flatMap((t) => [arn('topic', `$aws/things/${t}/shadow/update/delta`), arn('topic', `$aws/things/${t}/shadow/get/accepted`), arn('topic', `motos/${t}/comandos`)]),
      },
    ],
  };
}

/**
 * Proposta (spec GT06 §8; sem deploy validado): Traccar em uma task Fargate ARM64 atrás de um NLB TCP 5023 (o NLB preserva o
 * IP de origem; o security group restringe às faixas da APN), REST 8082 só para a ponte (Cloud Map), banco `traccar` no RDS
 * existente; a ponte em Fargate publica no IoT Core com certificado de serviço. Ações manuais do dono no infra/README.md.
 */
export class TraccarStack extends Stack {
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly traccarService: ecs.FargateService;
  public readonly bridgeService: ecs.FargateService;
  public readonly bridgeRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: TraccarStackProps) {
    super(scope, id, props);
    const { cfg, vpc, data } = props;
    const env = cfg.name;
    if (!props.gt06Things.length || props.gt06Things.some((t) => !THING_NAME.test(t))) throw new Error('gt06Things: informe os thingNames relay_only (moto-0000), separados por vírgula.');
    if (env === 'prod' && !props.apnCidrs?.length) throw new Error('prod exige apnCidrs: o GT06 não tem TLS e só entra por APN privada (spec GT06 §6.5).');
    const removal = cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;
    const subnetType = apiSubnetType(cfg);
    const assignPublicIp = subnetType === ec2.SubnetType.PUBLIC;
    const runtimePlatform = { cpuArchitecture: ecs.CpuArchitecture.ARM64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX };

    const cluster = new ecs.Cluster(this, 'Cluster', { clusterName: `volti-${env}-traccar`, vpc });
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', { name: `traccar.volti-${env}.internal`, vpc });
    const logGroup = new logs.LogGroup(this, 'Logs', { logGroupName: `/volti/${env}/traccar`, retention: cfg.logRetentionDays as logs.RetentionDays, removalPolicy: removal });
    const secret = (key: string, name: string, description: string) =>
      new secretsmanager.Secret(this, key, { secretName: `volti/${env}/${name}`, description, generateSecretString: { passwordLength: 40, excludePunctuation: true }, removalPolicy: removal });
    const traccarDb = secret('TraccarDbSecret', 'traccar-db', 'Senha do papel traccar (database traccar no RDS)');
    secret('TraccarAdminSecret', 'traccar-admin', 'Senha de admin@volti.local no Traccar (provisionamento)');
    const bridgeUser = secret('BridgeUserSecret', 'traccar-bridge-user', 'Senha de bridge@volti.local no Traccar');
    const bridgeDb = secret('BridgeDbSecret', 'traccar-bridge-db', 'Senha do papel volti_bridge (SELECT em 3 colunas de "Tracker")');
    const bridgeCert = new secretsmanager.Secret(this, 'BridgeIotCert', {
      secretName: `volti/${env}/traccar-bridge-iot`,
      description: 'Certificado de serviço da ponte no IoT Core: colar certificatePem e privateKey (aws iot create-keys-and-certificate)',
      generateSecretString: { secretStringTemplate: JSON.stringify({ certificatePem: 'CHANGE_ME' }), generateStringKey: 'privateKey', excludePunctuation: true },
      removalPolicy: removal,
    });

    const traccarSg = new ec2.SecurityGroup(this, 'TraccarSg', { vpc, description: 'Traccar: GT06 5023 (APN via NLB), REST 8082 so da ponte', allowAllOutbound: true });
    const bridgeSg = new ec2.SecurityGroup(this, 'BridgeSg', { vpc, description: 'traccar-bridge', allowAllOutbound: true });
    const sources = props.apnCidrs?.length ? props.apnCidrs.map((c) => ec2.Peer.ipv4(c)) : [ec2.Peer.anyIpv4()];
    for (const p of sources) traccarSg.addIngressRule(p, ec2.Port.tcp(GT06_PORT), 'GT06 (o NLB preserva o IP de origem)');
    traccarSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(GT06_PORT), 'Health check do NLB');
    traccarSg.addIngressRule(bridgeSg, ec2.Port.tcp(TRACCAR_WEB_PORT), 'REST/WebSocket do Traccar so para a ponte');

    const traccarTask = new ecs.FargateTaskDefinition(this, 'TraccarTask', { cpu: 512, memoryLimitMiB: 1024, runtimePlatform });
    traccarTask.addContainer('traccar', {
      image: ecs.ContainerImage.fromRegistry(TRACCAR_IMAGE),
      entryPoint: ['java', '-Xms256m', '-Xmx640m', '-Djava.net.preferIPv4Stack=true'],
      command: ['-jar', 'tracker-server.jar', 'conf/traccar.xml'],
      environment: {
        CONFIG_USE_ENVIRONMENT_VARIABLES: 'true',
        DATABASE_DRIVER: 'org.postgresql.Driver',
        DATABASE_URL: `jdbc:postgresql://${data.db.dbInstanceEndpointAddress}:5432/traccar`,
        DATABASE_USER: 'traccar',
        PROTOCOLS_ENABLE: 'gt06',
        GT06_PORT: String(GT06_PORT),
        WEB_PORT: String(TRACCAR_WEB_PORT),
      },
      secrets: { DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(traccarDb) },
      portMappings: [{ containerPort: GT06_PORT }, { containerPort: TRACCAR_WEB_PORT }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'traccar', logGroup }),
    });
    // Uma task por vez: duas dividiriam as conexões TCP dos rastreadores e os comandos.
    this.traccarService = new ecs.FargateService(this, 'Traccar', {
      serviceName: `volti-${env}-traccar`,
      cluster,
      taskDefinition: traccarTask,
      desiredCount: 0,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      securityGroups: [traccarSg],
      assignPublicIp,
      vpcSubnets: { subnetType },
      cloudMapOptions: { name: 'traccar', cloudMapNamespace: namespace },
    });

    this.nlb = new elbv2.NetworkLoadBalancer(this, 'Gt06Nlb', { loadBalancerName: `volti-${env}-gt06`, vpc, internetFacing: true, vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC } });
    this.nlb.addListener('Gt06', { port: GT06_PORT, protocol: elbv2.Protocol.TCP }).addTargets('Traccar', {
      port: GT06_PORT,
      protocol: elbv2.Protocol.TCP,
      preserveClientIp: true,
      targets: [this.traccarService.loadBalancerTarget({ containerName: 'traccar', containerPort: GT06_PORT })],
      healthCheck: { protocol: elbv2.Protocol.TCP },
    });

    this.bridgeRepository = new ecr.Repository(this, 'BridgeRepo', {
      repositoryName: `volti-${env}-traccar-bridge`,
      imageScanOnPush: true,
      removalPolicy: removal,
      emptyOnDelete: cfg.disposable,
      lifecycleRules: [{ maxImageCount: cfg.ecrMaxImages }],
    });
    const bridgeTask = new ecs.FargateTaskDefinition(this, 'BridgeTask', { cpu: 256, memoryLimitMiB: 512, runtimePlatform });
    bridgeTask.addContainer('bridge', {
      image: ecs.ContainerImage.fromEcrRepository(this.bridgeRepository, props.bridgeImageTag ?? 'latest'),
      environment: {
        IOT_MODE: 'aws',
        IOT_ENDPOINT: props.iot.endpointParam.stringValue,
        MQTT_CLIENT_ID: `traccar-bridge-${env}`,
        TRACCAR_URL: `http://traccar.${namespace.namespaceName}:${TRACCAR_WEB_PORT}`,
        TRACCAR_EMAIL: 'bridge@volti.local',
        DATABASE_HOST: data.db.dbInstanceEndpointAddress,
        DATABASE_NAME: data.dbName,
        DATABASE_USER: 'volti_bridge',
        DATABASE_SSL: 'require',
        BATTERY_MODEL: '72v',
      },
      secrets: {
        TRACCAR_PASSWORD: ecs.Secret.fromSecretsManager(bridgeUser),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(bridgeDb),
        MQTT_CERT_PEM: ecs.Secret.fromSecretsManager(bridgeCert, 'certificatePem'),
        MQTT_KEY_PEM: ecs.Secret.fromSecretsManager(bridgeCert, 'privateKey'),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'bridge', logGroup }),
    });
    this.bridgeService = new ecs.FargateService(this, 'Bridge', {
      serviceName: `volti-${env}-traccar-bridge`,
      cluster,
      taskDefinition: bridgeTask,
      desiredCount: 0,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      securityGroups: [bridgeSg],
      assignPublicIp,
      vpcSubnets: { subnetType },
    });

    new iot.CfnPolicy(this, 'BridgePolicy', { policyName: `volti-${env}-traccar-bridge-policy`, policyDocument: buildBridgePolicyDocument(this.region, this.account, env, props.gt06Things) });
  }
}
```

- [ ] **Step 3: `volti-app.ts` e `bin/volti.ts`**

`infra/lib/volti-app.ts`: `import { TraccarStack } from './stacks/traccar-stack';`. Em `VoltiAppOptions`:

```ts
  /** Proposta GT06 (spec 2026-10-27 §8): Traccar + ponte. Só com a lista de thingNames relay_only. */
  traccar?: { gt06Things: string[]; apnCidrs?: string[]; bridgeImageTag?: string };
```

Em `VoltiStacks`: `traccar?: TraccarStack;`. Depois de criar `api`:

```ts
  const traccar = opts.traccar ? new TraccarStack(app, `${prefix}-traccar`, { ...common, cfg, vpc: network.vpc, data, iot, ...opts.traccar }) : undefined;
```

e o `return` inclui `traccar`. `infra/bin/volti.ts`, no `createVoltiApp({...})`:

```ts
        traccar: get('gt06Things') ? { gt06Things: get('gt06Things')!.split(','), apnCidrs: get('apnCidrs')?.split(','), bridgeImageTag: get('bridgeImageTag') } : undefined,
```

- [ ] **Step 4: Rodar testes e synth**

Run: `pnpm --filter infra test`
Expected: PASS (todos, inclusive `traccar.test.ts` com 8 testes; `prod-fingerprint` e `iot.test` inalterados).

Run: `pnpm --filter infra exec cdk synth -c env=dev -c gt06Things=moto-0901 -q`
Expected: sai com código 0 (só warnings do CDK, se houver), sem deploy.

Run: `pnpm --filter infra build` e `pnpm --filter infra lint`
Expected: sem erros.

- [ ] **Step 5: `infra/README.md`**

Acrescentar a seção:

```md
## Proposta: Traccar + ponte GT06 (spec 2026-10-27 §8) — não implantada

`cdk synth -c env=<env> -c gt06Things=moto-0901,moto-0902 [-c apnCidrs=10.x.0.0/16] [-c bridgeImageTag=<sha>]` cria a stack
`volti-<env>-traccar`: Traccar 6.5 em Fargate ARM64 (1 task; `desiredCount` 0 até o primeiro deploy) atrás de um NLB TCP 5023,
REST 8082 só para a ponte (Cloud Map `traccar.traccar.volti-<env>.internal`), ponte em Fargate publicando no IoT Core com
certificado de serviço e política `volti-<env>-traccar-bridge-policy` restrita aos thingNames listados. Prod exige `apnCidrs`.

Antes do primeiro deploy (DONO): validar que `UpdateThingShadow` funciona para um thing não registrado (o provisionamento GT06 não
cria thing); criar no RDS o banco `traccar` (dono `traccar`) e os papéis `traccar` e `volti_bridge` com as senhas dos segredos
`volti/<env>/traccar-db` e `volti/<env>/traccar-bridge-db` (mesmo SQL de `deploy/single/gt06.sh init`); emitir o certificado da ponte
(`aws iot create-keys-and-certificate --set-as-active`), anexar a política e colar `certificatePem`/`privateKey` em
`volti/<env>/traccar-bridge-iot`; publicar a imagem da ponte no ECR `volti-<env>-traccar-bridge`; trocar `DATABASE_SSL=require`
(cifrado, sem verificar a CA) por verificação com o bundle da RDS. Um J16 novo em produção = `cdk deploy` com o thing na lista.
```

- [ ] **Step 6: Commit**

```bash
git add infra/lib infra/bin infra/test/traccar.test.ts infra/README.md
git commit -m "feat(infra): proposta de CDK do Traccar (NLB 5023) e da ponte GT06 (synth + asserções, sem deploy)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
