# Correções da auditoria de segurança (run-1) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as 15 pistas `needs_validation` da auditoria e 3 itens adiados de segurança física, cada um com teste de regressão que hoje falha e passa após a correção.

**Architecture:** Estado de segurança que hoje vive na memória de uma task passa a ser lido do Redis (fonte única) ou propagado por um barramento de eventos entre instâncias sobre Redis pub/sub. Caminhos irmãos passam a reutilizar a mesma guarda do caminho principal (uma regra de "moto em uso", o pipeline de estorno, a regra de moto fixa). Infra/CI separam identidade de leitura (PR) de identidade de deploy.

**Tech Stack:** NestJS 10 + Prisma 5 + ioredis + EventEmitter2 + socket.io (API), AWS CDK 2 (infra), GitHub Actions, Flutter/Riverpod/Hive (app operador).

**Spec:** relatório da auditoria em `C:/Users/vinic/security-audit-skill/aluguel-moto/run-1/NEEDS-VALIDATION.md` (trace, evidência e teste proposto de cada item) e `REPORT.md` seção 7 (itens adiados). Cada tarefa cita o número do item.

## Global Constraints

- Limites físicos não negociáveis: nunca > 32 km/h; zonas 6 km/h (pedestre) e 20 km/h (ciclovia); nunca cortar motor em movimento; travar só abaixo de 3 km/h. Em dúvida, **falhar fechado** (limite mais restritivo, comando recusado).
- O contrato em `/packages/contracts/openapi.yaml` é a fonte da verdade. Não inventar endpoints. Se uma rota passa a devolver um status novo (ex.: 409), declarar a resposta no contrato da própria rota.
- Código e nomes em inglês; mensagens de erro/interface em pt-BR.
- Dinheiro em centavos inteiros; datas UTC ISO 8601.
- Nenhum segredo no código; logs JSON sem dados pessoais.
- Não usar Docker nem containers locais. Testes unitários (jest/vitest/flutter_test) rodam sem serviços externos (`REDIS_URL=memory`, Prisma mockado ou in-memory já usados nos specs existentes).
- Não editar `docs/decisoes.md` nem READMEs: o coordenador consolida no fim (Task 10). Anote no relatório final da tarefa o texto sugerido.
- TDD: escrever o teste de regressão, ver falhar pelo motivo esperado, implementar o mínimo, ver passar. Commits pequenos com mensagem em pt-BR no padrão `fix(api): ...`.
- Comandos: `pnpm --filter api test -- <padrão>`, `pnpm --filter api lint`, `pnpm --filter infra test`, `pnpm --filter infra build`, em `apps/operador`: `flutter test` e `flutter analyze`.

## Grupos de execução (worktrees isoladas, até 4 em paralelo)

| Grupo | Tarefas | Arquivos principais |
|---|---|---|
| A — IoT segurança | 3, 4, 5 | `modules/iot/**`, `modules/commands/**`, `modules/alerts/**`, `infra/lib/stacks/iot-stack.ts` |
| B — Tempo real e barramento | 1, 2 | `redis/redis-store.ts`, novo `common/cluster-events.ts`, `modules/realtime/**`, `modules/iot/adapters.ts` (só `PrismaRentalLookup`) |
| C — Regra de moto em uso e campo | 6 | `modules/vehicles/vehicles.service.ts`, `modules/field-tasks/**`, `modules/rentals/rentals.service.ts`, `common/vehicle-in-use.ts` |
| D — Dinheiro e dados | 7 | `modules/support/**`, `modules/customers/customers.controller.ts`, `modules/rentals/rental-start.service.ts` |
| E — CI e app operador | 8, 9 | `.github/workflows/infra.yml`, `infra/test/workflow.test.ts`, `apps/operador/lib/**` |

---

### Task 1: Barramento de eventos entre instâncias (base de 8, 10 e "zonas entre tasks")

**Files:**
- Modify: `services/api/src/redis/redis-store.ts` (interface `RedisStore`, `IoRedisStore`, `MemoryRedisStore`)
- Create: `services/api/src/common/cluster-events.ts`
- Test: `services/api/src/common/cluster-events.spec.ts`
- Modify: módulo que registra providers globais (`services/api/src/core.module.ts`) para prover `ClusterEventsBridge`

**Interfaces:**
- Produces:
  - `RedisStore.publish(channel: string, message: string): Promise<void>`
  - `RedisStore.subscribe(channel: string, handler: (message: string) => void): void`
  - `MemoryRedisStore`: publish entrega síncrono (via `queueMicrotask`) a todos os handlers do mesmo objeto store — duas "instâncias" em teste que compartilham o mesmo `MemoryRedisStore` se veem.
  - `IoRedisStore`: usa uma conexão `duplicate()` dedicada a `subscribe` (não reutilizar a de `psubscribe` de expiração se isso complicar; pode ser outra).
  - `ClusterEventsBridge` (Injectable, `OnModuleInit`): `instanceId = randomUUID()`; canal `volti:cluster-events`; eventos replicados: `EV.PRINCIPAL_REVOKED`, `EV.RENTAL_CHANGED`, `EV.ZONE_CHANGED`, `EV.CUSTOMER_CONSENT_CHANGED`. Para cada um, ao receber o evento local publica `{ origin, event, payload }`; ao receber mensagem de outra `origin`, re-emite localmente com `emitter.emit(event, payload)` **sem** republicar (marcar o payload re-emitido num `WeakSet` e ignorar no listener de publicação). Mensagem malformada é descartada com log `cluster_event_invalid` (sem payload no log).

- [ ] **Step 1:** Escrever `cluster-events.spec.ts`: dois `EventEmitter2` + duas `ClusterEventsBridge` sobre o mesmo `MemoryRedisStore`. Casos: (a) `emitterA.emit(EV.PRINCIPAL_REVOKED, {pool:'staff',userId:'u1'})` → listener em B recebe uma vez; (b) A não recebe eco do próprio evento (listener de A chamado exatamente 1 vez); (c) não há laço: após (a) o total de mensagens publicadas é 1; (d) evento fora da lista não é replicado; (e) JSON inválido no canal não lança.
- [ ] **Step 2:** `pnpm --filter api test -- cluster-events` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `publish/subscribe` nos dois stores e a bridge; registrar a bridge no `CoreModule`.
- [ ] **Step 4:** Rodar o spec → PASS; rodar `pnpm --filter api test -- redis` e os specs que usam `MemoryRedisStore` → PASS.
- [ ] **Step 5:** Commit `fix(api): barramento de eventos entre instâncias via Redis pub/sub`.

### Task 2: WebSocket — expiração do token, revogação e cache de sala entre tasks (itens 8 e 10)

**Files:**
- Modify: `services/api/src/modules/realtime/realtime.gateway.ts`
- Modify: `services/api/src/modules/iot/adapters.ts` (somente `PrismaRentalLookup`)
- Test: `services/api/src/modules/realtime/realtime.gateway.spec.ts` (estender) e `services/api/src/modules/iot/adapters.spec.ts` (criar se não existir)

**Interfaces:**
- Consumes: `ClusterEventsBridge` da Task 1 (garante que `PRINCIPAL_REVOKED` e `RENTAL_CHANGED` chegam a todas as instâncias — nada a chamar diretamente).
- Produces: nenhum.

**Invariantes:**
1. Um socket nunca recebe eventos depois do `exp` do token do handshake: guardar `exp` (o verificador devolve claims; se não devolver, decodificar após verificar) em `socket.data` e agendar `setTimeout` que desconecta no `exp` (limpar no `disconnect`). Token sem `exp` é recusado.
2. `onTelemetry` só emite para `rental:{id}` se o aluguel do cache ainda estiver aberto: reduzir o TTL do cache veículo→aluguel para no máximo 5 s **e** invalidar no `RENTAL_CHANGED` (que agora chega de todas as tasks). Ao receber `RENTAL_CHANGED` com status de encerramento, `socketsLeave` da sala em todas as instâncias (já acontece porque o evento chega a todas).
3. `PrismaRentalLookup` também é invalidado por `RENTAL_CHANGED` vindo de outra task (verificar que o listener existente em `iot.runtime.ts:70-72` é suficiente com a bridge; se o lookup tiver cache próprio sem listener, adicionar).

- [ ] **Step 1:** Testes que falham hoje: (a) token com `exp = agora+2s`, fake timers, avançar 3 s → socket desconectado; (b) duas instâncias do gateway com a bridge sobre o mesmo `MemoryRedisStore`: `PRINCIPAL_REVOKED` emitido em A desconecta o socket conectado em B; (c) cache preenchido em B para veículo V/aluguel X, `RENTAL_CHANGED{status:'ended'}` emitido só em A, telemetria em B → **não** emite para `rental:X`.
- [ ] **Step 2:** Rodar → FAIL nos três.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `pnpm --filter api test -- realtime adapters` → PASS.
- [ ] **Step 5:** Commit `fix(api): realtime respeita exp do token e revogação/aluguel entre tasks`.

### Task 3: Limite de zona e hold em 0 km/h lidos do estado compartilhado (itens 1 e 2, e "zonas entre tasks")

**Files:**
- Modify: `services/api/src/modules/iot/geofence/geofence.service.ts`
- Modify: `services/api/src/modules/iot/live-state.store.ts`
- Modify: `services/api/src/modules/iot/base-iot-gateway.ts`
- Modify: `services/api/src/modules/iot/iot.runtime.ts` (resolver assíncrono, se necessário)
- Test: `services/api/src/modules/iot/geofence/geofence.multi-instance.spec.ts`, `services/api/src/modules/iot/live-state.store.spec.ts` (estender)

**Interfaces:**
- Produces: `GeofenceService.effectiveLimit(thingName: string): Promise<number>` (passa a ser assíncrono) e `BaseIotGateway.setLimitResolver((thing: string) => Promise<number>)`.

**Invariantes:**
1. O limite usado em `unlock` e no teto do `speed_limit` manual é o limite da zona onde a moto está, **independentemente da task**. Persistir o limite efetivo por veículo no Redis junto do estado que o geofence já persiste (`geofence:inside:{vehicleId}` tem `appliedLimit`) e ler de lá. Se não houver estado persistido, avaliar a última posição conhecida (estado ao vivo) contra as zonas; se nem isso existir, usar o **mais restritivo** entre 32 e o limite de qualquer zona `reduced_speed` que contenha a última posição — e, sem posição alguma, 32 (o teto legal), registrando log `zone_limit_unknown`.
2. Depois de um unlock que publicou limite diferente do da zona, o geofence volta a enviar o limite correto na próxima posição (não deduplicar contra `appliedLimit` quando o `limite_kmh` reportado/desejado diverge).
3. `LiveStateStore.isHeld` lê o Redis em toda chamada (sem memo permanente). Em erro de Redis, devolve `true` (falha fechada) e loga `held_read_failed`.
4. `ZONE_CHANGED` (agora replicado pela Task 1) dispara a reavaliação em todas as tasks; nada a fazer além de confirmar com teste.

- [ ] **Step 1:** Testes que falham hoje (seguir `NEEDS-VALIDATION.md` itens 1 e 2): (a) dois `GeofenceService` sobre o mesmo store; B avalia posição em zona de 6; gateway com resolver de A faz `unlock` → `updateDesired` recebe `limite_kmh: 6` (hoje 32); (b) mesmo cenário, `setSpeedLimit(32)` manual → recusado `invalid_limit`; (c) nova posição em B dentro da mesma zona após unlock com 32 → reenvia 6; (d) dois `LiveStateStore`: A `isHeld` → false, B `setHeld(true)`, `setSpeedLimit(20)` via gateway sobre A → `failed`; (e) store cujo `get` lança → `isHeld` = true.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar. Ajustar chamadores do resolver para `await`.
- [ ] **Step 4:** `pnpm --filter api test -- iot geofence safe-lock speed-limit commands` → PASS (incluindo `safe-lock.regression.spec.ts`).
- [ ] **Step 5:** Commit `fix(api): limite de zona e hold em 0 compartilhados entre tasks`.

### Task 4: Destravar não pode desfazer trava de equipe, do sistema ou o hold (item adiado 1)

**Files:**
- Modify: `services/api/src/modules/iot/base-iot-gateway.ts`, `services/api/src/modules/commands/commands.service.ts`, `services/api/src/modules/iot/live-state.store.ts`
- Modify (mínimo): `services/api/src/modules/rentals/rentals.service.ts` **apenas** em `resume` para traduzir a recusa em 409 pt-BR
- Test: `services/api/src/modules/iot/unlock-authority.spec.ts`

**Interfaces:**
- Consumes: `isHeld` da Task 3.
- Produces: `LiveStateStore.setLockOrigin(thing: string, origin: 'customer' | 'staff' | 'system' | null): Promise<void>` e `getLockOrigin(thing: string): Promise<'customer'|'staff'|'system'|null>` (Redis `iot:lock-origin:{thing}`). `CommandsService.dispatch` passa ao gateway a autoridade do ator: `'customer'` (pool customer), `'field'` (staff só-campo), `'staff'` (admin/operacao), `'system'` (geofence/safe-lock).

**Invariantes:**
1. Ao travar, gravar a origem: pausa do cliente → `customer`; comando admin/operacao → `staff`; geofence fora da área, safe-lock automático, hold → `system`.
2. `unlock` com autoridade `customer` ou `field` é recusado (`status: 'failed'`, `reason: 'locked_by_staff'`) se a origem for `staff`/`system`, se `isHeld` for true, se a rampa de safe-lock estiver ativa iniciada por `staff`/`system`, ou se `vehicle.stolenMode` (ou equivalente existente no schema) estiver ligado. Somente `staff` (admin/operacao) desfaz essas travas.
3. `resume` do cliente com recusa → `409` com mensagem "A moto foi bloqueada pela equipe. Fale com o suporte." e o aluguel continua `paused`.
4. Unlock bem-sucedido limpa a origem.

- [ ] **Step 1:** Testes: (a) geofence trava (system) → cliente `pause`+`resume` → resume 409, nenhum `travada:false` publicado; (b) admin trava → service-unlock por campo → recusado; (c) hold após `did_not_stop` → resume recusado; (d) cliente pausa → cliente resume → permitido; (e) admin desfaz trava system → permitido.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `pnpm --filter api test -- iot commands rentals` → PASS. Declarar o 409 de `POST /rentals/{id}/resume` no contrato se ausente.
- [ ] **Step 5:** Commit `fix(api): destravar por cliente/campo não desfaz trava de equipe nem hold`.

### Task 5: Identidade da moto na regra IoT e alertas de dispositivo em modo aws (item 4 e item adiado "alertas perdidos")

**Files:**
- Modify: `infra/lib/stacks/iot-stack.ts`, `infra/test/iot.test.ts`
- Modify: `services/api/src/modules/iot/aws-iot.transport.ts`, `services/api/src/modules/alerts/alerts.listeners.ts`
- Test: `services/api/src/modules/iot/aws-iot.transport.spec.ts` (estender)

**Invariantes:**
1. As regras passam a ser `SELECT topic(2) AS thingName, timestamp() AS ingestedAt, * AS payload FROM 'motos/+/telemetria'` (idem `eventos`). Se a sintaxe `* AS payload` não for aceita pela versão SQL `2016-03-23`, usar `SELECT topic(2) AS thingName, timestamp() AS ingestedAt, get(*, ...)`/projeção explícita dos campos do contrato (`packages/contracts/schemas`) — o essencial é que nenhum campo do corpo do dispositivo fique no mesmo nível de `thingName`.
2. `AwsIotTransport` lê `thingName` do topo e o corpo **somente** de `payload`; mensagem com `payload` ausente ou não-objeto é descartada.
3. Eventos de dispositivo em modo aws seguem o mesmo caminho do modo local: `parseDeviceEvent` (contrato) → `inbound.deviceEvent(thingName, ...)`. O listener `alertas` deixa de espalhar o corpo em `prisma.alert.create`: ou a regra de eventos passa a alimentar o transport (fila de telemetria com discriminador, ou a fila `alertas` consumida pelo transport), ou o listener valida com `parseDeviceEvent` e chama o mesmo serviço que o modo local usa. Escolher o caminho com menor mudança e documentar no relatório da tarefa.
4. Teste de infra afirma o novo SQL das duas regras.

- [ ] **Step 1:** Testes: (a) mensagem `{thingName:'moto-0001', payload:{thingName:'moto-9999', lat:..}}` → telemetria atribuída a `moto-0001`; (b) mensagem sem `payload` descartada; (c) evento `violacao` do formato da regra nova cria alerta pelo caminho de evento de dispositivo (hoje falha no Prisma); (d) `infra/test/iot.test.ts` com o SQL novo.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `pnpm --filter api test -- iot alerts` e `pnpm --filter infra test` → PASS.
- [ ] **Step 5:** Commit `fix(iot): identidade do tópico separada do payload e eventos de dispositivo em modo aws`.

### Task 6: Uma regra de "moto em uso" + campo + swap (itens 5, 7, 11, 13 e 15)

**Files:**
- Create: `services/api/src/common/vehicle-in-use.ts` (+ `vehicle-in-use.spec.ts`)
- Modify: `services/api/src/modules/vehicles/vehicles.service.ts` (`serviceUnlock`)
- Modify: `services/api/src/modules/field-tasks/field-tasks.service.ts`, `field-tasks.controller.ts`
- Modify: `services/api/src/modules/rentals/rentals.service.ts` (`swap`)
- Modify: `services/api/src/modules/rentals/rental-start.service.ts` **apenas** na checagem de disponibilidade (aluguel aberto da moto)
- Test: specs dos módulos acima

**Interfaces:**
- Produces: `assertVehicleNotInUse(tx: Prisma.TransactionClient | PrismaService, vehicleId: string): Promise<void>` — lança `409 vehicle-unavailable` ("A moto está em uso por um cliente.") se houver `Rental` em `OPEN_RENTAL_STATUSES` ou `Reservation` ativa para a moto, **independentemente de `vehicle.status`**.

**Invariantes:**
1. (item 5) `serviceUnlock` chama `assertVehicleNotInUse`; se `fieldTaskId` vier, a tarefa deve ter `vehicleId === id` e, para usuário só-campo, `assigneeId === user.userId`.
2. (item 7) `complete` com `vehicleStatus` só altera a moto se `assertVehicleNotInUse` passar **e** o status atual for `free`/`maintenance` (mesma guarda de `setStatus`); senão 409. `rental-start` recusa moto com aluguel aberto (defesa adicional).
3. (item 13 — decisão: só as próprias) extrair `assertTaskActor(user, task)` com a regra de `start` (admin/operacao passam; só-campo precisa ser o responsável) e aplicar em `complete`, `submitInspection`, `submitBatterySwap` e `get` (o controller passa o principal); em `list`, usuário só-campo sempre filtra `assigneeId = user.userId` (ignora o parâmetro).
4. (item 11) `swap` chama `assertNotFixedForOther` para o alvo e checa que o alvo está online (mesma regra de `rental-start`).
5. (item 15 — decisão: recusar mais caro) `swap` recusa alvo cujo `vehicleModel.pricePerMinuteCents` seja maior que o do snapshot do aluguel (`409`, "Só é possível trocar por uma moto de mesmo preço ou mais barata."). Planos não-minuto: comparar pelo preço do modelo mesmo assim.
6. (hardening do swap) a troca do `vehicleId` do aluguel vira `updateMany` condicional (`status in ['active','paused']` e `vehicleId` atual) exigindo `count === 1`.

- [ ] **Step 1:** Testes que falham hoje, um por invariante (usar os cenários de `NEEDS-VALIDATION.md` itens 5, 7, 11, 13, 15).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `pnpm --filter api test -- vehicles field-tasks rentals vehicle-in-use` → PASS. Declarar 409 novos no contrato das rotas afetadas se ausentes; rodar `pnpm --filter api test -- contract`.
- [ ] **Step 5:** Commits por item, ex.: `fix(api): service-unlock consulta aluguel aberto, não o status`.

### Task 7: Dinheiro e dados (itens 6, 9 e 14)

**Files:**
- Modify: `services/api/src/modules/support/support.service.ts` (+ módulo para injetar `PaymentsService`)
- Modify: `services/api/src/modules/customers/customers.controller.ts`
- Modify: `services/api/src/modules/rentals/rental-start.service.ts` (só o incremento do cupom)
- Test: `support.service.spec.ts`, `customers.controller.spec.ts`, `rental-start.service.spec.ts`

**Invariantes:**
1. (item 6) `resolveDispute` com `accepted` + `refundAmountCents` delega a `PaymentsService.refund(actor, paymentId, { amountCents, reason: dto.resolution }, \`dispute:${disputeId}\`)` — mesmo pipeline (transição, teto capturado, um estorno aberto, `PaymentRefund`, gateway/carteira, idempotência). Só marca a disputa como `accepted` se o estorno for reservado; se o pipeline recusar, devolve o mesmo erro e a disputa continua `open`. A atualização da disputa é condicional (`status: 'open'`), fechando a corrida. Autorização: o contrato já permite suporte resolver disputa; manter, e o coordenador registra em `docs/decisoes.md` que suporte estorna **somente** via disputa.
2. (item 9) Para não-admin, a busca por CPF só casa por igualdade com 11 dígitos (`where.cpf = digits` quando `digits.length === 11`), nunca `contains`. Admin mantém o comportamento atual.
3. (item 14) Na transação de criação do aluguel, o incremento do cupom vira `tx.coupon.updateMany({ where: { id, OR: [{ maxRedemptions: null }, { redemptions: { lt: <maxRedemptions> } }] }, data: { redemptions: { increment: 1 } } })` exigindo `count === 1`; senão lança "Cupom esgotado." e a compensação existente (relock, liberação de caução, cancelamento de apólice) roda.

- [ ] **Step 1:** Testes que falham hoje (cenários de `NEEDS-VALIDATION.md` itens 6, 9, 14).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `pnpm --filter api test -- support customers rental-start payments` → PASS.
- [ ] **Step 5:** Commits por item.

### Task 8: CI — PR com papel só-leitura (item 3)

**Files:**
- Modify: `.github/workflows/infra.yml`
- Create: `infra/test/workflow.test.ts` (usar o parser YAML já presente no lockfile; se não houver, `yaml`/`js-yaml` já instalado em algum workspace — **não** adicionar dependência nova sem necessidade; se precisar, usar a já existente do monorepo)
- Modify (texto proposto no relatório da tarefa, não aplicar): seção de OIDC do `infra/README.md`

**Invariantes:**
1. `permissions` no nível do workflow: só `contents: read`. `id-token: write` apenas nos jobs `diff` e `deploy-dev`.
2. Job `diff` assume `vars.AWS_LOOKUP_ROLE_ARN_DEV` (novo papel só-leitura). Se a variável não existir, o job pula o `cdk diff` com aviso (não falha o PR).
3. Job `deploy-dev` continua com `vars.AWS_DEPLOY_ROLE_ARN_DEV` e `environment: dev`.
4. Corrigir o contexto do build da imagem: `docker build -f services/api/Dockerfile .` (hardening confirmado pelo caçador).
5. Fixar actions por SHA de commit é desejável, mas só se o SHA puder ser obtido sem rede; senão deixar como nota no relatório.
6. Teste estático: nenhum job alcançável por `pull_request` usa `AWS_DEPLOY_ROLE_ARN_DEV`; `id-token: write` não está no topo; todo job que usa o papel de deploy declara `environment`.

- [ ] **Step 1:** Escrever `workflow.test.ts` → FAIL com o YAML atual. **Step 2:** alterar o workflow → PASS (`pnpm --filter infra test`). **Step 3:** Commit `fix(ci): cdk diff de PR com papel só-leitura e id-token por job`.
- [ ] No relatório: passos para o dono criar o papel (confiança `repo:<owner>/<repo>:pull_request`, permissão só `sts:AssumeRole` no `cdk-*-lookup-role-*` e leitura de CloudFormation) e restringir o `sub` do papel de deploy a `repo:<owner>/<repo>:environment:dev`.

### Task 9: App operador — fila offline amarrada ao operador (item 12)

**Files:**
- Modify: `apps/operador/lib/data/models.dart` (`QueuedJob` ganha `ownerSub`), `offline_queue.dart`, `sync.dart`, `features/auth/auth.dart`, `tasks_provider.dart`
- Test: `apps/operador/test/sync_account_switch_test.dart`

**Invariantes:**
1. Todo job enfileirado grava `ownerSub` (sub do Cognito/dev da sessão atual). Jobs antigos sem dono (migração do Hive) são tratados como de dono desconhecido: não são enviados automaticamente; aparecem como "pendente de outro operador" e só podem ser descartados.
2. `SyncController` só envia jobs cujo `ownerSub` seja o da sessão atual; os demais ficam retidos para quando o dono voltar.
3. A lista de pendências/falhas mostra apenas jobs do operador atual.
4. O cache de tarefas (`operator_meta`) é chaveado por `ownerSub`; no logout, o cache do operador que saiu é limpo.
5. Textos novos em pt-BR via o arquivo de l10n existente.

- [ ] **Step 1:** Teste (cenário de `NEEDS-VALIDATION.md` item 12): A enfileira offline, sai, B entra online → repositório fake **não** recebe o job; A volta → recebe. **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `flutter test` e `flutter analyze` em `apps/operador` → PASS.
- [ ] **Step 5:** Commit `fix(operador): fila offline e cache por operador em aparelho compartilhado`.

### Task 10: Consolidação (coordenador)

- [ ] Mesclar os branches dos grupos em `fix/auditoria-seguranca`, resolvendo conflitos.
- [ ] Registrar em `docs/decisoes.md`: barramento entre instâncias; limite de zona/hold falha fechada; autoridade de destravamento; regra de moto em uso; campo só nas próprias tarefas; swap só para mesmo preço ou mais barato; suporte estorna só via disputa pelo pipeline; busca de CPF por igualdade para não-admin; papel só-leitura no PR; fila offline por operador.
- [ ] Atualizar READMEs das pastas tocadas (`services/api`, `infra`, `apps/operador`).
- [ ] Rodar tudo: `pnpm --filter api lint`, `pnpm --filter api test`, `pnpm --filter infra build`, `pnpm --filter infra test`, `pnpm --filter @volti/contracts test` (se offline), `flutter test`/`flutter analyze` em `apps/operador`.
- [ ] Relatório final: itens corrigidos × teste que prova; o que exige ação do dono na AWS (papel de lookup, trust policy do deploy).
