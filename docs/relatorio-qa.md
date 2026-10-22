# Relatório de QA, integração e segurança — Volti

Agente 8 · 2026-10-21 · branch `fase4/qa` (a partir da `main` 79f3818, com as fases 1 a 3).

## Resumo

O fluxo do cliente de ponta a ponta, o bloqueio seguro com a moto em movimento, o comando para moto offline e a criação de cerca passaram contra a API real, com Mosquitto, simulador e MinIO. A carga com 500 motos e 200 clientes ficou com p95 abaixo de 200 ms e nenhum erro. O contrato está alinhado: 140 operações batem entre controllers, `openapi.yaml`, cliente TS e cliente Dart.

Encontrei **25 problemas: 2 críticos, 3 altos, 7 médios e 13 baixos**. Os dois críticos e dois dos outros já têm correção pontual nesta branch:

| Id | Severidade | Problema | Situação |
|---|---|---|---|
| QA-01 | crítica | Admin/operação conseguia pôr 32 km/h numa moto dentro do calçadão de 6 km/h | corrigido (`a3d9dea`) |
| QA-02 | crítica | Na AWS a API não lia a telemetria (sem cercas nem limites por zona) e subia sem `DATABASE_URL` | corrigido (`71466a2`), sem deploy real; modos desconhecidos recusam subir (`e263fd9`) |
| QA-03 | alta | Editar o limite de uma cerca não reaplica às motos que já estão dentro dela | corrigido (`62f186c`) |
| QA-04 | alta | Tirar um grupo de um usuário interno no painel não revoga o acesso | corrigido (`2d0ba0e`); falta IAM no pool interno (infra) |
| QA-07 | alta | A exclusão LGPD não exclui a identidade no Cognito; o token segue valendo | corrigido (`84c053b`, `8910ac8`) |
| QA-08 | média | Primeiro acesso com requisições paralelas respondia 409 em 9 de 10 chamadas | corrigido (`653a389`; staff: `2a15d26`) |
| QA-05 | média | Zona não distingue área de pedestres (6) de ciclovia (20) | mantido por decisão (sem mudar `ZoneType`); proposta `subtype` em `decisoes.md` (`39cb48d`) |
| QA-09 | média | Revogar o consentimento de localização não parava a gravação do trajeto | corrigido (`8b1c331`) |
| QA-10 | baixa | CORS refletia qualquer origem com credenciais | corrigido (`b28023d`); falta `CORS_ORIGINS` na task (infra) |
| QA-11 | média | Link do recibo gravado no banco expirava | corrigido (`5b943ce`) |
| QA-12 | média | Localização de início do aluguel ficava para sempre | corrigido (`ef6a378`) |
| QA-13 | baixa | Exportação LGPD incompleta e sem `no-store` | parcial (`fb0265e`): `no-store`; entidades novas dependem da proposta de contrato em `decisoes.md` |
| QA-14 | baixa | Fotos de devolução não eram apagadas na exclusão | corrigido (`3c76eba`) |
| QA-15 | baixa | `AUTH_MODE=dev` possível em produção | corrigido (`1dc289b`) |
| QA-17 | baixa | Cognito aceitava id token; staff casado por e-mail | corrigido (`cd3fb73`) |
| QA-18 | baixa | Sem helmet, throttler em memória, trust proxy fixo | corrigido (`9508b05`); falta `TRUST_PROXY=1` e regra de rate no WAF (infra) |
| QA-19 | baixa | Segredo do webhook nascia `CHANGE_ME` | corrigido na API (`46caedc`: recusa subir em produção) |
| QA-20 | baixa | `GET /vehicles` com posição até 30 s velha | corrigido (`0949b33`) |
| QA-21 | média | Aluguel começava (e cobrava) com a moto offline | corrigido (`869da45`) |
| QA-23 | baixa | Desired pendente perdido na reconexão (intermitente) | corrigido (`e6e144c`) |
| QA-24 | baixa | Aluguel não exigia aceite dos termos | corrigido (`b19199b`) |
| QA-25 | baixa | `dev` compilava sem `prisma generate` | corrigido (`d667db0`) |

Situação depois da branch `fix/qa-api` (correções da API) na tabela acima; QA-06, QA-16 e QA-22 ficam com a branch de infra/massa de teste. Os achados estão detalhados abaixo, junto com a tabela de tudo o que passou.

## Ambiente usado

- Postgres/PostGIS, Redis, MinIO do `docker compose`. Banco próprio `volti_qa` (migrate deploy + seed) e Redis db 6.
- API do worktree em `localhost:3005` (`AUTH_MODE=dev`, `IOT_MODE=local`, `GEOFENCE_MODE=local`, `PAYMENT_PROVIDER=fake`).
- **Mosquitto próprio na porta 1884.** A API de outro worktree (porta 3000) usa o broker do compose e também emula o shadow das motos `moto-0001…`. Com as duas no mesmo broker, as duas respondem pelo mesmo shadow. Comando: `docker run -d --name volti-qa-mosquitto -p 1884:1883 -v <repo>/infra/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro eclipse-mosquitto:2`.
- Simulador `services/iot-sim` com `SIM_VEHICLES=50`, `MQTT_URL=mqtt://localhost:1884`. As motos 51 a 60 ficam para os rastreadores emulados pelos testes (`tests/e2e/lib/harness.mjs`, que obedece ao contrato do firmware).
- `test:e2e` e `test:contract` do pacote da API rodaram num banco limpo `volti_qa_e2e` (Redis db 7). Eles assumem o seed sem o simulador: com o simulador ligado, `VLT-0001…0006` não ficam `free` (ver QA-22).

## O que passou

| Verificação | Comando | Resultado |
|---|---|---|
| Unitários da API (com as correções) | `pnpm --filter api test` | 34 suítes, 659 testes, 0 falhas |
| Lint + tipos da API | `pnpm --filter api lint` | ok |
| e2e da API (fluxo, pagamentos, IoT com Mosquitto, relatórios) | `DATABASE_URL=…/volti_qa_e2e REDIS_URL=…/7 pnpm --filter api test:e2e` | 4 suítes, 14 testes ok |
| Contrato com respostas reais (`jest-openapi`) | `… pnpm --filter api test:contract` | 11 testes ok |
| Simulador | `pnpm --filter iot-sim test` | 24 testes ok |
| CDK | `cd infra && npx jest` | 37 testes ok (depois de QA-02) |
| Painel (Vitest) | `pnpm --filter admin test` | 35 testes ok |
| Painel (Playwright, `SIM=1`) | `SIM=1 E2E_CHROME=<chromium-1234> E2E_PORT=3105 E2E_API_URL=http://localhost:3005 pnpm --filter admin test:e2e` | 9 de 12 ok; as 3 falhas são de massa de teste (QA-22) |
| Flutter | `flutter test` em `packages/volti_flutter`, `apps/cliente`, `apps/operador` | 72, 19 (+1 pulado) e 19 testes ok |
| **e2e cliente** | `node --test tests/e2e/customer-flow.e2e.mjs` | ok em cerca de 21 s. Cadastro, KYC com PUT real no MinIO e aprovação do mock, reserva, cartão tokenizado, caução, desbloqueio pelo shadow, entrada no calçadão (desired 6 e velocidade ≤ 6), saída (32), `zone.notice` no Socket.IO, saída da área (aviso + alerta), retorno antes de 5 min (sem bloqueio), parada, foto, encerramento com trava confirmada, recibo (total, final 4242, trajeto). `TrackPoint.expiresAt` = +90 dias; nada é gravado depois do fim |
| **e2e admin** | `node --test tests/e2e/admin-flow.e2e.mjs` | 3 de 3 ok (8 rodadas; 1 falha intermitente, ver QA-23). Lock de moto do simulador a ≥ 10 km/h: rampa decrescente, nenhum `travada: true` publicado com `velocidade_kmh ≥ 3`, termina `confirmed`. Moto offline: `pending`, continua `pending`, aplicado e `confirmed` ao reconectar. Cerca nova de 6 km/h: 33 → 400, 25 → 422, a moto que entra recebe 6 e volta a 32 ao sair |
| **Segurança / LGPD / legal** | `node --test tests/e2e/security.e2e.mjs` | 10 ok + 3 `todo` (QA-03, QA-07, QA-10 falham como esperado) |
| **Diff de contrato** | `pnpm --filter api exec tsx ../../tests/e2e/contract-diff.ts` | 140 operações implementadas = 140 no `openapi.yaml` = 140 no cliente TS = 140 no cliente Dart, nenhuma divergência. TS regerado com `--default-non-nullable=false` é idêntico ao versionado |
| `POST /dev/token` fora de dev | API com `NODE_ENV=production AUTH_MODE=cognito` na porta 3006 | `POST /dev/token` → 404; token dev nessa API → 401 |
| Segredos no repositório | `git grep` por AKIA/ASIA, chaves privadas, `APP_USR-`, `sk_live_`, `ghp_`, `xox*`, JWT, `password=`… | nada real; só valores de dev (`volti-dev-secret`, `troque-este-segredo-local`) e o placeholder `CHANGE_ME` (QA-19). Nenhum `.env`, `.pem` ou `.key` versionado |
| Buckets | GET anônimo em `documentos-kyc`, `fotos-devolucao`, `relatorios`, `anexos` (MinIO); `data-stack.ts` | 403 em todos; na AWS `BLOCK_ALL` + `enforceSSL`, KYC com KMS |
| Webhook | sem assinatura, com assinatura inválida | 401; HMAC com janela de 5 min e `timingSafeEqual`; o estado vem do gateway (`getPayment`), nunca do corpo |

### Carga (k6 via `docker run grafana/k6`)

| Cenário | Comando | p95 | Erros | Outros números |
|---|---|---|---|---|
| 500 motos de telemetria (simulador a 1 msg/s por moto = 500 msg/s, 5 vezes a cadência do contrato) + 20 painéis lendo a frota, 2 min | `node tests/load/provision-load-vehicles.mjs 500`; simulador com `SIM_VEHICLES=500 SIM_FIRST_VEHICLE=1001 SIM_RIDING_RATIO=1 SIM_TELEMETRY_RIDING_MS=1000`; `docker run --rm -e API_URL=http://host.docker.internal:3005 -v "$PWD/tests/load:/scripts" grafana/k6 run /scripts/k6-telemetry.js` | 27,8 ms | 0,00 % (6.937 req) | 100 % das motos de carga frescas no REST; atraso do REST: média 15 s e máximo 30,3 s (gravação no Postgres a cada 30 s por moto, sem fila acumulando). Estado ao vivo no Redis: p50 0,9 s |
| 200 clientes simultâneos, 2 min | `docker run … grafana/k6 run /scripts/k6-clients.js` | 163,7 ms (`/vehicles/nearby` 208,9 ms) | 0,00 % (93.976 req, 745 req/s) | — |
| 200 clientes + 500 motos ao mesmo tempo, 2 min | as duas cargas juntas | 169,8 ms (`nearby` 186,6 ms) | 0,00 % (92.590 req, 747 req/s) | — |

**Notas da carga.**

- Para a carga, a API subiu com `THROTTLE_LIMIT_PER_MINUTE=1000000`, porque todos os VUs saem do mesmo IP. Com o padrão de 300/min por rota e IP, o rate limit responde 429, como esperado.
- O k6 oficial não fala MQTT. Tentei compilar a extensão `xk6-mqtt` com o `grafana/xk6`, nas versões v0.54 e atual, e a resolução de dependência falhou. Por isso os 500 rastreadores vêm do simulador oficial (mesmo contrato do firmware), e o `k6-telemetry.js` mede o lado da plataforma.
- Ambiente: um único processo Node no Windows (Docker Desktop).

## Achados

Severidade:

- **crítica**: viola uma regra não negociável ou impede a operação.
- **alta**: risco real de segurança, LGPD ou legal, com contorno manual.
- **média**: defeito com impacto limitado.
- **baixa**: endurecimento ou melhoria.

### Crítica

#### QA-01 · Limite manual acima do limite da zona era aplicado (Contran/zonas) — corrigido

`POST /vehicles/{id}/commands` com `speed_limit` só validava 0..32. Com a moto dentro do calçadão de 6 km/h, um admin ou operação podia mandar 32: o desired ia para o rastreador e a moto andava a 30 km/h na área de pedestres. O motor de cercas não corrigia isso nas posições seguintes, porque só reage a ENTER/EXIT.

- **Reproduzir (antes):** rastreador emulado no calçadão (`-23.5633, -46.6849`) → desired 6 → `POST /vehicles/{id}/commands {type: speed_limit, speedLimitKmh: 32}` → `202 confirmed`, `limite_kmh` 32 no rastreador, velocidade 30 km/h dentro da zona.
- **Correção (`a3d9dea`):** `BaseIotGateway.setSpeedLimit` recusa qualquer valor acima de `limitResolver(thing)`, que é o limite em vigor pelas zonas. O comando termina `failed`/`invalid_limit`, sem publicar nada e sem truncar. O motor de cercas manda exatamente o limite em vigor, então continua passando. Vale para os modos local e aws.
- **Testes:** unitário em `base-iot-gateway.spec.ts`; e2e `security.e2e.mjs` "QA-01".
- **Sugestão adicional:** mostrar o limite da zona no painel (o `VehicleSheet` só valida 0..32) e mapear `invalid_limit` para "acima do limite da zona".

#### QA-02 · Variáveis da task ECS diferentes das que a API lê (produção sem telemetria e sem banco) — corrigido, falta validar em deploy real

`infra/lib/stacks/api-stack.ts` passava:

- `QUEUE_MODE: 'aws'` e `STORAGE_MODE: 'aws'`, mas a API só conhece `sqs`/`local` e `s3`/`local`, e o `loadConfig` não valida;
- as filas como `SQS_TELEMETRY_URL`, `SQS_PAYMENTS_WEBHOOK_URL` e `SQS_ALERTS_URL`, mas a API lê `SQS_QUEUE_TELEMETRIA_URL` etc.;
- a região como `AWS_REGION_NAME`;
- nenhuma `DATABASE_URL`, só `DB_HOST`/`DB_USER`/`DB_PASSWORD`. O README da infra dizia que "a API monta a URL", mas nada montava.

Efeitos:

1. O Prisma subia sem URL e a API não iniciava.
2. Mesmo com URL, o `QUEUE_MODE=aws` caía na fila em processo, e a telemetria que a regra do IoT Core manda para o SQS nunca era consumida. Sem posições, a plataforma não tinha frota ao vivo, ENTER/EXIT, limites de 6/20 km/h nem bloqueio por saída da área em produção.

- **Reproduzir:** `grep -n "QUEUE_MODE\|SQS_\|DATABASE_URL" infra/lib/stacks/api-stack.ts services/api/src/config/env.ts`.
- **Correção (`71466a2`):** nomes e valores alinhados ao `env.ts`. O entrypoint do container (`scripts/start.mjs`) monta `DATABASE_URL` a partir de `DB_*` (com `encodeURIComponent` e `sslmode=require`) antes do `migrate deploy` e da API. README da infra atualizado. Testes do CDK: 37 ok.
- **Ainda falta:**
  - validar no primeiro deploy;
  - fazer o `loadConfig` falhar ao receber valor desconhecido (`AUTH_MODE`, `QUEUE_MODE`, `STORAGE_MODE`, `IOT_MODE`), como o `payments.config.ts` já faz;
  - criar o bucket de anexos (QA-06).

### Alta

#### QA-03 · Editar o limite de uma cerca não reaplica às motos que já estão dentro

O `GeofenceService` só manda `speed_limit` quando o conjunto de zonas `reduced_speed` muda (ENTER/EXIT). Mudar uma ciclovia de 20 para 6 km/h, ou a geometria passar a cobrir uma moto parada, não gera comando: a moto continua a 20 dentro de uma área que agora é de 6. Desativar ou excluir a cerca funciona, porque a zona some do conjunto.

- **Reproduzir:** criar cerca de 20 km/h, levar a moto para dentro (desired 20), `PUT /zones/{id}` com 6, mandar mais posições dentro → `limite_kmh` continua 20 (`security.e2e.mjs` "QA-03", `todo`).
- **Sugestão:** no `zone.changed`, reavaliar as motos dentro da zona alterada (PostGIS `ST_Contains` sobre a posição ao vivo) e reenviar o limite efetivo quando ele cair. Ou guardar em `appliedLimit` e comparar a cada posição: se `limit < appliedLimit`, reenviar.

#### QA-04 · Remover grupo de um usuário interno no painel não revoga o acesso

O `AuthGuard` decide pelos grupos **do token**, e o `PrincipalResolver` regrava `StaffUser.groups` com os grupos do token a cada requisição. `PATCH /staff/{id} {groups: [...]}` só altera o banco e é desfeito na próxima requisição do usuário. Desativar (`active: false`) funciona.

- **Reproduzir:** `PATCH /staff/<dev-operacao> {groups:["suporte"]}` → 200 → token `operacao` do mesmo usuário → `POST /vehicles/{id}/commands` → **202**, e o banco volta para `["operacao"]`.
- **Sugestão:** ou o painel muda os grupos no Cognito (`AdminAddUserToGroup`/`AdminRemoveUserFromGroup` + `AdminUserGlobalSignOut`), pela porta `StaffDirectory` já proposta em `decisoes.md` (Task 3, item 8); ou o guard usa a interseção token ∩ banco e o resolver para de sobrescrever o banco. Enquanto isso, o painel deveria avisar que a mudança de grupo não tem efeito imediato.

#### QA-07 · Exclusão de conta (LGPD) não exclui a identidade no Cognito; o token continua valendo — parcial

`DELETE /lgpd/account` anonimiza o cadastro e troca `cognitoSub` para `deleted:<id>`, mas:

- não chama o Cognito, embora a task role tenha `AdminDeleteUser`/`AdminUserGlobalSignOut`: e-mail e telefone ficam no pool e a sessão continua;
- o cache do `PrincipalResolver` (30 s) mantinha o principal: nesse intervalo, `PATCH /me` regravava nome e telefone no cadastro anonimizado;
- depois do cache, o mesmo token cria **uma conta nova**. O "Conta excluída" do resolver nunca dispara, porque o `cognitoSub` mudou.

- **Reproduzir:** cliente novo → `DELETE /lgpd/account` → `PATCH /me {name}` → 200 e o nome é regravado (antes da correção). 31 s depois, `GET /me` → 200 com outro `customer.id`.
- **Correção parcial (`84c053b`):** a exclusão limpa o cache do resolver. Com uma instância da API, o token deixa de escrever no cadastro anonimizado (teste "LGPD" em `security.e2e.mjs`). Com várias tasks ECS, o cache das outras continua até 30 s.
- **Sugestão:** criar uma porta `IdentityDirectory` (aws: `AdminUserGlobalSignOut` + `AdminDeleteUser` no pool de clientes; local: no-op) chamada na exclusão. No resolver, recusar o token cujo `sub` pertença a um cliente excluído: guardar um hash do `sub` original em vez de `deleted:<id>`. Teste `todo` "QA-07".

### Média

#### QA-05 · Zona não distingue área de pedestres (6) de ciclovia (20)

`reduced_speed` aceita qualquer valor de 0 a 20. Um calçadão pode ser cadastrado com 20 km/h e nada impede isso; a mensagem ao cliente usa `≤ 6 ⇒ pedestres`. A regra do produto é 6 em áreas de pedestres.

- **Reproduzir:** `POST /zones {type: reduced_speed, name: "Calçadão …", speedLimitKmh: 20}` → 201.
- **Sugestão:** subtipo `pedestrian` | `bike_lane` (mudança de contrato, registrar em `decisoes.md`) com teto 6 e 20, respectivamente.

#### QA-06 · Bucket de anexos não existe na infra

A API usa `S3_BUCKET_ATTACHMENTS` (padrão `anexos`) para os uploads de suporte (`POST /support/uploads`), mas o `data-stack.ts` não cria esse bucket e a task não recebe a variável. Na AWS, o PUT pré-assinado falha.

- **Sugestão:** criar o bucket com `BLOCK_ALL`, `enforceSSL` e lifecycle, dar `grantReadWrite` à task role e passar `S3_BUCKET_ATTACHMENTS`.

#### QA-08 · Primeiro acesso com requisições paralelas respondia 409 — corrigido

O upsert do cliente no `PrincipalResolver` disputava entre requisições simultâneas do mesmo token novo, e o app abre várias telas juntas no primeiro login.

- **Reproduzir (antes):** 10 `GET /me` em paralelo com um token novo → 9 × `409 conflict "Registro duplicado"`.
- **Correção (`653a389`):** em `P2002`, o resolver relê o cliente criado pela requisição concorrente. Unitário novo e e2e "QA-08".
- **Fica:** o mesmo padrão no `staffUser.create`, de impacto menor.

#### QA-09 · Revogar o consentimento de localização durante o aluguel não para a gravação do trajeto

`PUT /lgpd/consents {locationTracking:false}` é aceito com aluguel em andamento, e o `TelemetryService` continua gravando `TrackPoint` só pelo status do aluguel. O consentimento só é conferido no início.

- **Sugestão:** decidir a regra (por segurança, a posição da moto é necessária durante o aluguel) e aplicá-la de forma explícita. Uma opção é recusar a revogação com aluguel aberto (`409`, com explicação). A outra é parar de gravar `TrackPoint` mantendo só a posição ao vivo da moto. Registrar em `decisoes.md`.

#### QA-11 · Link do recibo gravado no banco expira (7 dias; na AWS, em horas)

`ReceiptService` grava em `Payment.receiptUrl` uma URL GET pré-assinada de 7 dias, e o `GET /rentals/{id}/receipt` a devolve para sempre. Na AWS, com credenciais temporárias da task role, a URL morre quando a sessão STS expira (horas). Depois disso, o recibo aponta para um link morto. O link também é um portador de 7 dias.

- **Sugestão:** gravar só a chave do objeto e gerar a URL (15 min) a cada `GET /receipt`.

#### QA-12 · Localização de início do aluguel fica para sempre e não sai na exclusão

`Rental.startLat`/`startLng` (posição exata, ligada ao `customerId`) não expiram em 90 dias e não são apagados no `DELETE /lgpd/account`. O mapa de calor só precisa do valor arredondado (3 casas).

- **Sugestão:** gravar arredondado (≈ 100 m) ou anular depois de 90 dias no job diário, e anular na exclusão.

#### QA-21 · Aluguel começa (e cobra) com a moto offline

Com a moto offline, o `unlock` fica `pending`, mas o aluguel é criado `active` e o relógio começa: o cliente paga minutos com a moto travada (`rental-start.service.ts`, "não desfaz o aluguel se a moto estiver offline").

- **Sugestão:** recusar o início se a moto estiver offline (o `GET /vehicles/nearby` já tem `online`). Outra opção é começar a contar só no `unlock` confirmado e cancelar sem custo se ele não confirmar em N segundos.

### Baixa

| Id | Achado | Como reproduzir / onde | Sugestão |
|---|---|---|---|
| QA-10 | CORS reflete qualquer origem com `credentials: true` (HTTP e Socket.IO) | `OPTIONS /vehicles` com `Origin: https://evil.example` → `access-control-allow-origin: https://evil.example`, `allow-credentials: true` (`security.e2e.mjs`, `todo`). Impacto baixo porque o token vai no `Authorization` (`sessionStorage`), não em cookie | lista de origens por ambiente (`CORS_ORIGINS`: painel CloudFront e `localhost` em dev) e `credentials: false` |
| QA-13 | Exportação LGPD incompleta e sem `Cache-Control: no-store` | `GET /lgpd/export` não traz conversas/mensagens de suporte, dispositivos, eventos do aluguel, metadados do KYC nem fotos de devolução | incluir as entidades e mandar `no-store` |
| QA-14 | Fotos de devolução não são apagadas na exclusão (lifecycle de 365 dias) | `Rental.returnPhotoObjectKey` permanece depois do `DELETE /lgpd/account` | apagar ou reduzir a retenção, se a foto puder identificar o cliente |
| QA-15 | `POST /dev/token` depende só de `AUTH_MODE`, que vale `dev` quando ausente | `auth.module.ts`. Mitigado: o `DevAuthVerifier` exige `DEV_JWT_SECRET` e a infra fixa `cognito` (verificado: 404) | recusar `AUTH_MODE=dev` com `NODE_ENV=production` |
| QA-16 | Política IoT pode ser mais estreita | dispositivo: falta a condição `iot:Connection.Thing.IsAttached`; task role da API: `iot:Publish` em `topic/motos/*` (pode publicar telemetria de qualquer moto) | condição `IsAttached`; API só em `motos/*/comandos` e `$aws/things/*/shadow/update` |
| QA-17 | Verificador Cognito aceita id token e usa `username` como e-mail do access token; o staff é casado por e-mail | `cognito-auth-verifier.ts`, `principal-resolver.service.ts` | aceitar só access token e casar o staff só por `sub` |
| QA-18 | Endurecimento HTTP | sem HSTS/`nosniff`/`frame-ancestors` (helmet); throttler em memória por task; com `trust proxy 1` sem ALB na frente, o `X-Forwarded-For` forjado troca o IP do rate limit (só em dev) | `helmet`, throttler no Redis e WAF com rate rule (a `waf-stack` existe) |
| QA-19 | Segredo do Mercado Pago nasce com `CHANGE_ME` | `api-stack.ts`: se esquecido, qualquer um assina webhooks com o segredo conhecido (mitigado: o estado vem do gateway) | gerar aleatório ou falhar no boot se o valor for `CHANGE_ME` |
| QA-20 | `GET /vehicles` mostra posição até 30 s velha | Postgres atualizado a cada 30 s por moto (k6: atraso médio de 15 s). O painel usa o WebSocket ao vivo | documentar no contrato ou ler o Redis ao vivo na listagem |
| QA-22 | Testes do painel dependem da massa de dados | Playwright: "bloquear moto em movimento" exige uma moto **alugada** andando no simulador; "CPF mascarado" exige cliente com CPF na 1ª página; o cenário offline só simula a resposta na rede (o e2e de caixa-preta desta branch cobre o caso real). O `test:e2e` da API quebra com o simulador ligado | o teste cria a própria massa (aluguel na moto do simulador; cliente com CPF) |
| QA-23 | Intermitente: desired pendente não entregue na reconexão | 1 falha em 8 execuções do e2e offline quando rodado em paralelo com o fluxo do cliente; isolado, 5 de 5 ok. Não reproduzido de forma determinística | investigar a ordem `presence`/`get`/`reported` na reconexão (`local-shadow.ts`, `telemetry.service.ts`) |
| QA-24 | Aluguel não exige aceite dos termos | `eligibility.ts` confere KYC, bloqueio, inadimplência e consentimento de localização, mas não `termsAccepted` | exigir a versão vigente dos termos |
| QA-25 | Worktree novo: `tsc` da API falhou com tipos do Prisma ausentes depois do `pnpm install` | `npx tsc -p tsconfig.build.json` → TS2339 em `vehicle`, `rental`…; `pnpm --filter api build` (que roda `prisma generate`) resolveu | o script `dev` rodar `prisma generate` antes do `tsc` |

## Revisão sem achado (conferido)

- **OWASP API1 (BOLA):** um cliente estranho recebe 404 em `/rentals/{id}` (inclusive events, track, receipt, pause, rating, location-share), `/payments/{id}`, `/payments/deposits/{id}` e `/insurance/policies/{id}`. O filtro `customerId` não escapa do titular.
- **API2 (autenticação):** sem token → 401; `alg: none` → 401; cliente com claim `cognito:groups: [admin]` → 403 nas rotas de staff (os grupos são descartados no pool de clientes).
- **API3 (mass assignment):** `PATCH /me` ignora `kycStatus`, `status`, `delinquent` e `locationConsent` (`whitelist: true`).
- **API4 (consumo de recursos):** `limit=100000` → 400; uploads pré-assinados de 15 min, com tipo fixo.
- **API5 (permissões por grupo):** campo/suporte/financeiro não mandam comando; financeiro não vê trajeto da moto; suporte não cria cerca nem staff; operação não mexe em preços; campo não lista clientes; financeiro não lê auditoria. A conformidade completa rota × grupo do contrato está no `contract-security.spec.ts`.
- **API8:** erros em RFC 7807 sem stack trace; `x-powered-by` desligado.
- **Legal (velocidade):**
  - API: DTO 0..32 inteiro, sem truncar; serviço revalida; gateway `assertSpeedLimit`; `CHECK` no banco (`UPDATE … 40` falha).
  - Zonas: > 32 → 400, 21..32 → 422.
  - `PATCH /vehicles` ignora `speedLimitKmh`.
  - Inspeção do operador: `configuredMaxKmh > 32` com `ok: true` → 422.
  - Simulador: recusa limite fora de 0..32 e cruzeiro > 32.
  - Painel: `assertSpeedLimit` antes de enviar.
  - App do operador: não tem comando de limite.
  - App do cliente: só exibe.
  - Rampa do bloqueio: só decrescente.
- **Bloqueio seguro:** 8 execuções sem nenhum `travada: true` com a moto a ≥ 3 km/h (painel e fim de aluguel).
- **Pagamentos:** o backend só vê `cardToken` e `cardLast4` (o e2e confere que o PAN não volta); webhook assinado e deduplicado.
- **LGPD:**
  - localização só durante o aluguel (nenhum `TrackPoint` antes ou depois);
  - `expiresAt` = +90 dias e job diário 03:30 (`America/Sao_Paulo`);
  - consentimento exigido para alugar (`location-consent-required`);
  - exportação filtrada pelo titular (staff → 403);
  - exclusão anonimiza nome, CPF, e-mail, telefone e data de nascimento, apaga trajetos, dispositivos e documentos de KYC, e mantém pagamentos;
  - recibo em PDF sem nome, CPF ou trajeto;
  - tópicos MQTT sem dado do cliente.

## Arquivos desta branch

- `tests/e2e/lib/harness.mjs`: HTTP, Socket.IO, MQTT e um rastreador emulado que obedece ao contrato do firmware.
- `tests/e2e/customer-flow.e2e.mjs`, `tests/e2e/admin-flow.e2e.mjs`, `tests/e2e/security.e2e.mjs`: rodar com `node --test <arquivo>`. Precisam da API no ar (`E2E_API_URL`, padrão `http://localhost:$PORT` do `services/api/.env`), migrate + seed, `IOT_MODE=local` e o simulador para o lock em movimento.
- `tests/e2e/contract-diff.ts`: diff de rotas (sem banco).
- `tests/load/k6-telemetry.js`, `tests/load/k6-clients.js`, `tests/load/provision-load-vehicles.mjs`.
- Correções: `a3d9dea` (QA-01), `653a389` (QA-08), `84c053b` (QA-07, parcial), `71466a2` (QA-02).
