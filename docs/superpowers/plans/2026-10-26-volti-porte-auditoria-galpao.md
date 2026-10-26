# Porte da auditoria para o galpão + achados run-2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o `feat/galpao` com todas as correções da auditoria de segurança (run-1) e sem os 4 achados da auditoria do galpão (run-2), com as 6 coberturas adiadas auditadas, e publicar no dev.

**Architecture:** Trabalho no branch `feat/galpao-correcoes` (worktree `C:/Users/vinic/Desktop/volti-wt/galpao-correcoes`), que já tem o merge `3364476` de `fix/auditoria-seguranca` sobre `0731d93` e 5 commits de invariantes no galpão. Primeiro fecha o trabalho em aberto, depois traz o `feat/galpao` atual (`3f6afab`), depois corrige os achados run-2, audita as coberturas adiadas e corrige o que sair. No fim, avanço rápido do `feat/galpao`, push e `volti-dev-update`.

**Tech Stack:** NestJS + Prisma (services/api, jest), Flutter (apps/cliente, apps/operador), Next.js (apps/admin, vitest/playwright mock), AWS CDK (infra, jest), GitHub Actions, shell (deploy/single).

**Spec:** Fonte de verdade dos requisitos:
- Run-1 (já implementado em `fix/auditoria-seguranca`): `docs/superpowers/plans/2026-10-26-volti-correcoes-auditoria.md` e ledger `.superpowers/sdd/2026-10-26-volti-correcoes-auditoria/progress.md` (no checkout principal `C:/Users/vinic/Desktop/Aluguel-moto`).
- Run-2: `C:/Users/vinic/security-audit-skill/aluguel-moto/run-2/findings.json`, `NEEDS-VALIDATION.md`, `REPORT.md`, `coverage-ledger.json` (6 unidades `deferred`).

## Global Constraints

- CLAUDE.md do repo vale integralmente: contrato em `packages/contracts` é a fonte da verdade (mudança de contrato → `docs/decisoes.md`); código em inglês, textos de interface em pt-BR; dinheiro em centavos inteiros; datas UTC ISO 8601; logs JSON sem dados pessoais; nenhum segredo no código.
- Segurança física: nunca cortar o motor em movimento; trava = redução gradual e travar só abaixo de 3 km/h; limites 32 km/h, 20 km/h ciclovia, 6 km/h pedestres — nenhuma tarefa pode afrouxar isso.
- LGPD: localização só durante aluguel com consentimento; trajetos expiram em 90 dias.
- Sem Docker local; não subir containers. Testes que exigem Postgres/Docker (e2e/contract) não rodam; cobrir com testes de unidade/serviço.
- TDD: teste vermelho antes da correção, com a falha registrada no relatório.
- Não fazer push/merge/deploy dentro das tarefas; isso é só da Tarefa final.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Atalhos de teste (`ALLOW_TEST_HANDOVER`, `test-handover`, `test-end`, pagamento fake reidratado) devem continuar funcionando e travados como hoje.

---

### Task 1: Fechar o trabalho em aberto do porte e validar a base

**Files:**
- Modify (em aberto, sem commit): `infra/lib/stacks/iot-stack.ts`, `infra/test/iot.test.ts`, `infra/test/fixtures/prod-templates.sha256.json`, `services/api/src/modules/station-swaps/station-gateways.ts`, `services/api/src/modules/station-swaps/station-gateways.spec.ts`

**Interfaces:**
- Produces: branch `feat/galpao-correcoes` limpo, com todas as suítes verdes, base para a Tarefa 2.

- [ ] **Step 1:** `git diff` do trabalho em aberto e entender a intenção. A hipótese é aplicar a correção run-1 "regra IoT `SELECT *, topic(2) AS thing` com colisão de identidade" às regras das estações (`estacoes/{thing}/eventos`): a identidade do tópico não pode ser sobrescrita pelo payload.
- [ ] **Step 2:** Se a intenção estiver certa, garantir um teste que falhe sem a mudança: payload de estação com campo `thing`/`stationThing` diferente do tópico deve ser atribuído ao thing do tópico. Rodar e ver a falha revertendo só o código (`git stash push -m porte-wip-check -- <arquivo de código>`, rodar, `git stash apply`).
- [ ] **Step 3:** Completar a mudança, atualizar o hash do template se o teste de infra exigir (seguir o README de `infra/test/fixtures`).
- [ ] **Step 4:** Rodar tudo: `services/api` (`npx prisma generate`; `npx jest`; `pnpm lint`), `infra` (`pnpm test`), `apps/admin` (`pnpm test` + `pnpm lint`), `apps/cliente` e `apps/operador` (`flutter analyze`; `flutter test`), `packages/contracts` (`pnpm test`). Esperado: tudo verde.
- [ ] **Step 5:** Commit `fix(iot): estação usa a identidade do tópico, não a do payload`.

### Task 2: Trazer o `feat/galpao` atual (3f6afab) para o porte

**Files:** conflitos esperados em `services/api/src/modules/rentals/rental-end.service.ts`, `services/api/src/modules/payments/rental-billing.service.ts`, `services/api/src/modules/handovers/*`, `services/api/src/config/env.ts`, `apps/cliente/lib/features/{pickup,reservation,return_flow,home}/*`, `packages/contracts/openapi.yaml`, `packages/contracts/generated/**`, `docs/decisoes.md`.

**Interfaces:**
- Consumes: Tarefa 1.
- Produces: `feat/galpao-correcoes` contém `3f6afab`; `git merge-base --is-ancestor 3f6afab HEAD` verdadeiro.

- [ ] **Step 1:** `git merge feat/galpao` (sem squash). Resolver cada conflito preservando os dois lados: o comportamento novo de hoje (atalhos de teste, cobrança estacionada vira dívida, caução resolvida antes, avisos no topo, fake reidratado) e as invariantes da auditoria (trava da equipe/sistema não desfeita por cliente/campo, zone.changed no cluster, realtime revogação, eventos via Redis, operador só-campo nas próprias tarefas, pipeline de estorno, cupom condicional, CPF por igualdade).
- [ ] **Step 2:** Contrato: se `openapi.yaml` conflitar, unir as operações; regenerar TS e Dart (`pnpm --filter @volti/contracts generate`, `generate:dart`), nunca editar gerado à mão; ajustar a contagem de operações em `contract-security.spec.ts`.
- [ ] **Step 3:** Verificar as invariantes da auditoria nos caminhos de hoje e escrever teste para cada lacuna:
  - `POST /reservations/{id}/test-handover`: aceitar a entrega simulada não pode destravar uma moto com trava da equipe/sistema. O aceite usa `start()` → a regra "início respeita a trava da equipe" (commit `6aeda31`) precisa valer.
  - `POST /rentals/{id}/test-end`: precisa passar pela mesma regra de "fim do aluguel respeita a trava da equipe" e pelo estado de cerca compartilhado.
  - `parkedAsDebt`/`retryParkedAsDebt`: o cliente inadimplente continua bloqueado pela elegibilidade compartilhada.
- [ ] **Step 4:** Rodar todas as suítes da Tarefa 1, passo 4. Esperado: verde.
- [ ] **Step 5:** Commit do merge `merge: feat/galpao (3f6afab) no porte da auditoria` e commits separados para cada teste ou correção do passo 3.

### Task 3: Run-2 — `return_depot` não burla o encerramento forçado

**Files:**
- Modify: `services/api/src/modules/handovers/handovers.service.ts` (`createReturn` ~:224, chamada a `endAtDepot` ~:284)
- Modify: `services/api/src/modules/rentals/rental-end.service.ts` (`endAtDepot` ~:204)
- Test: `services/api/src/modules/handovers/handovers.service.spec.ts` (ou o spec existente do serviço)
- Docs: `docs/decisoes.md`, `services/api/README.md`

**Política (decisão já tomada):**
- `return_depot` só encerra se a posição viva da moto (`positionOf`, a mesma fonte usada por `end()`) estiver a até `DEPOT_RETURN_RADIUS_M = 150` m do galpão da devolução. Fora disso, responde 422 com o slug `vehicle-not-at-depot` e não muda o estado.
- Sem posição viva (rastreador mudo): também 422 `vehicle-not-at-depot`. Para isso existe o encerramento forçado do admin, com taxa e auditoria.
- O `depotId` da devolução é obrigatório e precisa ser um galpão ativo.
- Grava `AuditLog` com `action = 'rental.return_depot'`, `actorId` do operador, `rentalId`, `depotId` e distância. Sem dados pessoais.
- A trava continua passando por `requestLock` (já é assim), sem taxa (devolução legítima no galpão).
- A regra não muda a rota de admin `force-end`.

- [ ] **Step 1:** Testes vermelhos:
  - (a) campo com moto a 2 km do galpão → 422 `vehicle-not-at-depot`, aluguel continua ativo, nenhum `requestLock`;
  - (b) moto a 80 m → encerra e grava o AuditLog;
  - (c) sem posição viva → 422;
  - (d) `depotId` de outro galpão inexistente ou inativo → 404/422 como o serviço já faz.
- [ ] **Step 2:** Rodar e confirmar que (a) e (c) falham hoje.
- [ ] **Step 3:** Implementar a checagem em `createReturn` antes de qualquer escrita: reaproveitar `positionOf`, calcular a distância com o helper geo existente (procurar `haversine`/`distanceM` em `services/api/src`) e só criar um novo se não houver.
- [ ] **Step 4:** Atualizar o contrato se o 422 `vehicle-not-at-depot` não estiver documentado em `POST /handovers`. Regenerar os clientes; o app do operador precisa mostrar a mensagem em pt-BR ("A moto não está no galpão. Use o encerramento forçado pelo suporte.") — ajustar `apps/operador` (texto + teste de widget) se ele trata slugs.
- [ ] **Step 5:** Rodar API jest + lint, flutter test do operador. Commit.

### Task 4: Run-2 — caução não é reaproveitada entre reserva e aluguel de rua

**Files:**
- Modify: `services/api/src/modules/rentals/rental-start.service.ts` (~:247 validação da caução, ~:296 transação final)
- Modify: `services/api/src/modules/payments/rental-billing.service.ts` (~:269-286, guarda do release)
- Modify: `services/api/src/modules/reservations/reservations.service.ts` (~:219 cancelamento que libera a caução)
- Test: specs dos três serviços

**Regras:**
1. `start()` com `depositId` recusa (409 `deposit-in-use`) uma caução referenciada por uma `Reservation` em `active` ou `handover`, a menos que o início venha do aceite dessa mesma reserva (`fromHandover` com a reserva dona da caução).
2. A guarda de liberação da caução (cancelamento ou expiração da reserva) trata como "em uso" também a caução presente num marcador `RentalStart` em andamento, não só num `Rental` com aquele `depositId`.
3. A transação final do `start()` relê a caução com bloqueio condicional: `status = held` e sem `DepositRelease`, senão aborta com 409 `deposit-in-use`. Reaproveitar o padrão de `updateMany` condicional usado no serviço.

- [ ] **Step 1:** Testes vermelhos:
  - (a) start de rua com o `depositId` da reserva ativa → 409;
  - (b) reserva cancelada durante o unlock lento de um start que usa a caução → a caução não é liberada;
  - (c) liberação concluída antes da transação final → o start aborta com 409 e a moto volta (seguir o rollback existente de `vehicle-offline`).
- [ ] **Step 2:** Confirmar as falhas. **Step 3:** Implementar. **Step 4:** API jest + lint. **Step 5:** Commit.

### Task 5: Run-2 — papel da instância single-dev fora do alcance dos containers

**Files:**
- Modify: `deploy/single/compose.yml` (rede com IP fixo da API)
- Modify: `deploy/single/update.sh` (regra `DOCKER-USER`)
- Modify: `deploy/single/render-env.sh` (allowlist de segredos)
- Modify: `deploy/single/admin.sh` (container do publish-panel)
- Modify/Test: `infra/lib/stacks/single-dev-stack.ts`, `infra/test/single-profile*.test.ts`, teste de shell se o repo tiver (procurar `*.bats` ou `deploy/single/test`)
- Docs: `deploy/single/cloudshell.md`, `infra/README.md`, `docs/decisoes.md`

**Decisões:**
- O hop limit 2 fica: a API usa o papel para S3 e Cognito. Mas só o container da API alcança o IMDS:
  - o `compose.yml` dá à API um IP fixo numa sub-rede própria (ex.: `172.30.0.10` em `172.30.0.0/24`);
  - o `update.sh` instala de forma idempotente as regras `iptables -I DOCKER-USER -d 169.254.169.254 -j DROP` e, antes dela, `-s 172.30.0.10 -d 169.254.169.254 -j RETURN`;
  - assim iot-sim, postgres, redis, mosquitto, caddy e os containers efêmeros do `admin.sh` ficam sem IMDS.
- `render-env.sh`: em `secrets/*` só aceita nomes de uma allowlist explícita (os segredos que a stack gera e os manuais documentados em `cloudshell.md`, como `MERCADOPAGO_ACCESS_TOKEN`). Nome desconhecido é ignorado e gera um aviso no stderr sem o valor. Em `config/*`, a mesma allowlist mais as chaves de configuração conhecidas, ou documentar por que não.
- `admin.sh publish-panel`: o container de build roda sem acesso ao IMDS (a regra acima já cobre a rede bridge padrão) e sem credenciais da AWS no ambiente.
- Testes CDK:
  - o template continua com `HttpPutResponseHopLimit: 2`;
  - o user-data ou o script carrega a regra `DOCKER-USER`;
  - teste do `render-env.sh` com um `aws` falso que devolve um nome desconhecido em `secrets/`, conferindo que ele não aparece no `.env`. Usar o harness de shell que existir; se não houver, um teste jest que roda o script com `bash` e um `PATH` falso, pulado no Windows sem bash, com registro no relatório.

- [ ] Steps: teste vermelho → confirmar → implementar → `infra` `pnpm test` → commit. Não fazer deploy de CDK nesta tarefa.

### Task 6: Run-2 — chave da App Store Connect só existe no passo que a usa

**Files:**
- Modify: `.github/workflows/ios-testflight.yml`
- Test: `infra/test` ou o teste de workflows que existir (procurar testes que leem `.github/workflows`); senão, criar `infra/test/workflows.test.ts` que faz o parse do YAML (dependência `yaml` já presente? conferir) e verifica a ordem.

**Regras:**
- A gravação de `AuthKey_*.p8` acontece num passo imediatamente antes do primeiro passo que usa a chave (export/upload), depois de `flutter pub get`, `flutter test`, `flutter build ios --config-only` e qualquer `pod install` ou archive que não precise dela.
  - Se o archive precisar da chave para assinatura automática, o archive fica depois da gravação, e o teste documenta isso. Mesmo assim, `pub get`, test e config-only ficam antes.
- Um passo final `if: always()` apaga `$RUNNER_TEMP/asc`.
- Gatilho: a tag `cliente-v*` só publica se o commit da tag estiver em `feat/galpao` ou `main`. O passo inicial roda `git branch -r --contains $GITHUB_SHA` e falha se não estiver.
- Actions de terceiros desse workflow fixadas por SHA, com comentário da versão.
- Teste: a posição do passo que grava a chave é maior que a de `flutter test` e `pub get`; existe a limpeza `always()`; as actions `uses:` são `@<40 hex>`.

- [ ] Steps: teste vermelho → implementar → teste verde → commit.

### Task 7: Auditar as 6 coberturas adiadas (run-3 escopada)

**Files:** só leitura do código; saída em `C:/Users/vinic/security-audit-skill/aluguel-moto/run-3/`.

Unidades, com os caminhos iniciais em `run-2/coverage-ledger.json` (status `deferred`):
1. Job de diff do `infra.yml` com OIDC em `pull_request`.
2. Webhook de pagamento, providers e `ALLOW_FAKE_PAYMENTS`.
3. Inadimplência, dívida aberta e cartão padrão.
4. Movimentos e estoque de baterias.
5. Chaves de foto da entrega e presign do storage.
6. Podfile do iOS e hooks nativos de plugins.

- [ ] **Step 1:** O controlador roda a skill `security-audit` em modo full, perfil `quick`, escopo = essas 6 unidades sobre o HEAD da Tarefa 6. Até 4 caçadores em paralelo, um verificador por candidato e o validador de findings/ledger.
- [ ] **Step 2:** Cada achado `needs_validation` com causa no código vira uma tarefa nova de correção (8.x) no ledger, com o mesmo formato TDD das Tarefas 3-6, registrada como `Ruling`. Achados que dependem só de implantação vão para o relatório final como pendência.

### Task 8.x: Correções da run-3 (dinâmicas)

Uma tarefa por achado da Tarefa 7, no formato das Tarefas 3-6. O controlador escreve o brief a partir do registro do achado: trace, causa e correção mínima sugerida.

### Task 9: Revisão final, publicação e dev

- [ ] **Step 1:** Revisão do branch inteiro (`requesting-code-review`, modelo mais capaz) sobre `3f6afab..HEAD`. Uma rodada de correção e uma re-revisão com escopo.
- [ ] **Step 2:** Rodar todas as suítes. Verde.
- [ ] **Step 3:** No worktree do `feat/galpao` (`C:/Users/vinic/Desktop/Aluguel-moto/.worktrees/galpao`): `git merge --ff-only feat/galpao-correcoes`, depois `git push origin feat/galpao`.
- [ ] **Step 4:** CloudShell: `aws ssm send-command --instance-ids i-0fe5328a27dc50798 --document-name volti-dev-update`, esperar `Success` e `/health` 200. Conferir que a regra `DOCKER-USER` foi aplicada pelo SSM (`iptables -S DOCKER-USER`) e que a API ainda lê o S3, por exemplo com um presign de foto via app.
- [ ] **Step 5:** Fumaça no emulador com APK novo: reserva com pagamento de teste → retirar (teste) → encerrar (teste).
- [ ] **Step 6:** Relatório ao usuário. Nova tag da TestFlight só se ele pedir.
