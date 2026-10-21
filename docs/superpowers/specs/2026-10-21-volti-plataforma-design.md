# Volti — plataforma de aluguel de motos elétricas (design)

Data: 2026-10-21 · Autor: Vinicius Vilela Rufini (com Claude)

## 1. Objetivo

Construir a plataforma Volti inteira seguindo `docs/prompts-agentes.md` (oito agentes em quatro fases) sobre as funções de `docs/funcoes-arquitetura.md`, com o visual do Volti Design System (`design-system/`). O contexto base de todos os agentes está em `CLAUDE.md`.

Esta spec **não repete** os prompts: ela fecha as lacunas que eles deixam abertas (valores dos colchetes, execução local sem AWS, fronteiras entre agentes e o processo de execução). Onde esta spec e um prompt divergirem, vale esta spec.

## 2. Valores dos colchetes

| Colchete | Valor |
|---|---|
| Nome do app | Volti |
| Cidade (seed e simulador) | São Paulo — zonas fictícias em Pinheiros, Vila Madalena e Av. Paulista |
| Gateway de pagamento | Mercado Pago (adaptador real) + fake |
| Retenção dos trajetos | 90 dias |
| Alerta do AWS Budgets (dev) | US$ 100/mês |
| Tempo fora da área antes do bloqueio seguro | 5 minutos |
| Teste de carga k6 | 500 motos enviando telemetria + 200 clientes simultâneos |

## 3. Monorepo

```
/infra                  AWS CDK (TypeScript)                       — agente 1
/services/api           NestJS + Prisma + PostGIS + Redis           — agente 2 (+ módulos iot: agente 3; payments/insurance: agente 4)
/services/iot-sim       simulador de rastreadores (TypeScript)      — agente 3
/apps/admin             Next.js App Router + Tailwind + MapLibre    — agente 6
/apps/cliente           Flutter                                     — agente 5
/apps/operador          Flutter                                     — agente 7
/packages/contracts     openapi.yaml, mqtt.md + JSON Schemas, realtime.md, clientes gerados — agentes 2 e 3
/packages/volti_flutter tema e widgets Volti para Flutter           — agente 5 (agente 7 consome)
/design-system          Volti Design System (somente leitura; referência visual)
/docs                   decisoes.md, ADRs, relatorio-qa.md
docker-compose.yml      ambiente local completo (raiz)
```

- pnpm workspaces (`pnpm-workspace.yaml` na raiz) para `infra`, `services/*`, `apps/admin`, `packages/contracts`.
- Flutter: `apps/cliente` e `apps/operador` dependem por path de `packages/volti_flutter` e do cliente Dart gerado (`packages/contracts/generated/dart`).
- Node 24 / pnpm 9 / Flutter 3.41 / Java 17 (para o openapi-generator).

## 4. Contratos e geração de código

- `packages/contracts/openapi.yaml` (OpenAPI 3.1) é a fonte da verdade da API REST. Erros em RFC 7807 (`application/problem+json`), paginação por cursor (`?cursor=&limit=`), cabeçalho `Idempotency-Key` em `POST /rentals` e nos endpoints de pagamento.
- `packages/contracts/realtime.md`: eventos do WebSocket. Transporte **Socket.IO** (`@nestjs/platform-socket.io`; clientes `socket.io-client` no painel e `socket_io_client` no Flutter). Autenticação pelo mesmo JWT; salas `fleet` (staff) e `rental:{id}` (cliente dono do aluguel).
- `packages/contracts/mqtt.md` + `schemas/*.json`: tópicos e shadow (agente 3).
- Geração:
  - TypeScript: `openapi-typescript` → `generated/ts/schema.d.ts`, consumido com `openapi-fetch`.
  - Dart: `openapi-generator-cli` (gerador `dart-dio`) → `generated/dart` (pacote `volti_api`).
  - Mock: `@stoplight/prism-cli` servindo o `openapi.yaml` na porta 4010.
  - Script `pnpm --filter contracts generate` regenera tudo; os arquivos gerados são versionados.
- Mudança de contrato depois da fase 1: o agente propõe em `docs/decisoes.md` e para; o usuário aprova.

Enums compartilhados (iguais no banco, na API e na UI):
- `VehicleStatus`: `free`, `rented`, `reserved`, `paused`, `blocked`, `maintenance`, `offline` (mesmas cores de `--status-*` do design system).
- `ZoneType`: `operation`, `return`, `forbidden`, `reduced_speed` (com `speedLimitKmh`).
- Valores em centavos (`amountCents: integer`), datas em UTC ISO 8601.

## 5. Execução local sem AWS

Cada dependência AWS fica atrás de uma interface no `services/api` com duas implementações, escolhidas por variável de ambiente (detalhes em `CLAUDE.md`):

| Interface | Local | AWS | Dono |
|---|---|---|---|
| `AuthVerifier` | `AUTH_MODE=dev`: JWT HS256 do emissor local `volti-dev`, claims `sub`, `email`, `cognito:groups`; endpoint `POST /dev/token` só existe nesse modo | Cognito (JWKS de cada pool) | agente 2 |
| `IotGateway` | `IOT_MODE=local`: Mosquitto imitando os tópicos de shadow do IoT Core | IoT Data Plane | agente 2 define; agente 3 implementa |
| `GeofenceEngine` | `GEOFENCE_MODE=local`: PostGIS `ST_Contains` comparando a posição anterior e a atual | Amazon Location (geofence collection + tracker) | agente 3 |
| `QueueBus` | `QUEUE_MODE=local`: fila em processo | SQS/EventBridge | agente 2 |
| `ObjectStorage` | `STORAGE_MODE=local`: MinIO (S3 compatível, URLs pré-assinadas funcionam) | S3 | agente 2 |
| `PaymentProvider` | `PAYMENT_PROVIDER=fake` | `mercadopago` | agente 2 define; agente 4 implementa |
| `InsuranceProvider` | `INSURANCE_PROVIDER=mock` | (parceiro futuro) | agente 4 |
| `KycProvider` | `KYC_PROVIDER=mock` (aprova se 18+; CPF terminado em `00` reprova) | (provedor futuro) | agente 2 |
| `PushNotifier` | `PUSH_MODE=log` | FCM | agente 2 |

- `docker-compose.yml` na raiz: `postgis/postgis:16-3.4` (5432), `redis:7` (6379), `eclipse-mosquitto:2` (1883), `minio` (9000/9001), `api` (3000), `iot-sim` (perfil `sim`), `prism` (4010, perfil `mock`). LocalStack fica opcional, num perfil `localstack`.
- Trajetos: tabela `TrackPoint` no Postgres com `expiresAt = now + 90 dias` e job diário (`@nestjs/schedule`) que apaga os expirados. Sem DynamoDB.
- Segredos locais: `.env.example` versionado, `.env` ignorado.

## 6. Fronteiras entre agentes

Para que as fases 2 e 3 rodem em paralelo sem conflito:

- **Agente 2** entrega, além do contrato e da API:
  - as interfaces `IotGateway` e `PaymentProvider` em `services/api/src/ports/`, com stubs mínimos em memória (`StubIotGateway` confirma na hora; `StubPaymentProvider` aprova tudo), o suficiente para o e2e reservar → iniciar → pausar → encerrar passar;
  - os módulos `iot`, `payments` e `insurance` só como pastas com o `*.module.ts` registrando os stubs.
- **Agente 3** trabalha só em `services/api/src/modules/iot/**`, `services/iot-sim/**`, `packages/contracts/mqtt.md` e `schemas/**`, `docs/adr-rastreador.md` e o serviço Mosquitto do compose. Substitui o `StubIotGateway`.
- **Agente 4** trabalha só em `services/api/src/modules/payments/**` e `insurance/**`, em migrações Prisma novas (sem editar as existentes) e em `docs/pagamentos.md`. Substitui o `StubPaymentProvider`.
- Arquivos compartilhados (`app.module.ts`, `schema.prisma`, `openapi.yaml`): cada agente pode acrescentar, nunca reescrever o que outro fez. O orquestrador resolve conflitos no merge.
- **Agentes 5, 6 e 7** não editam nada fora da própria pasta, exceto: agente 5 cria `packages/volti_flutter`; agente 7 só acrescenta widgets lá.

## 7. Design

- Apps Flutter: `packages/volti_flutter` traduz `design-system/tokens/*.css` para `ThemeData` (claro e escuro), `TextTheme` com Plus Jakarta Sans e JetBrains Mono (copiadas de `design-system/assets/fonts`) e widgets equivalentes aos de `design-system/components` (Button, BatteryPill, VehicleMarker, RouteInfoPill, ReservationBanner, OptionCard, BottomSheet, FleetStatus etc.). As telas seguem `design-system/ui_kits/app` e `ui_kits/operator`.
- Painel: os tokens viram `theme.extend` no Tailwind e variáveis CSS globais; o layout segue `design-system/ui_kits/admin` (SideNav ink-900, conteúdo ink-50). Mapa com MapLibre e tiles OSM no estilo claro do design system.
- Textos em pt-BR seguindo "CONTENT FUNDAMENTALS" do `design-system/readme.md` (sem emoji, sentence case, nada de km rodados para o cliente).

## 8. Processo de execução

Plano em `docs/superpowers/plans/` (skill writing-plans) e execução com subagentes (skill subagent-driven-development), um subagente por área, cada um com o prompt do seu agente, esta spec e o `CLAUDE.md`.

| Fase | Agentes | Branches | Gate para seguir |
|---|---|---|---|
| 0 | orquestrador | `main` | esqueleto do monorepo, `CLAUDE.md`, docs e design system versionados |
| 1 | 2 (contrato → API) e 1 (infra), em paralelo | `fase1/api`, `fase1/infra` | **o usuário revisa o `openapi.yaml`** (o agente 2 para depois de gerar o contrato e os clientes); depois API e infra terminam, passam pela revisão e são mescladas |
| 2 | 3 (IoT) e 4 (pagamentos), em paralelo | `fase2/iot`, `fase2/pagamentos` | revisão e merge feitos pelo orquestrador |
| 3 | 5 (cliente), 6 (admin), 7 (operador), em paralelo; o 7 começa quando `packages/volti_flutter` existir | `fase3/cliente`, `fase3/admin`, `fase3/operador` | revisão e merge feitos pelo orquestrador |
| 4 | 8 (QA), subagente sem contexto anterior | `fase4/qa` | `docs/relatorio-qa.md` entregue ao usuário |

- Cada agente roda num git worktree próprio, apresenta um plano curto antes de codar (o orquestrador aprova) e termina com a "definição de pronto" do `CLAUDE.md`.
- Revisão entre fases: o orquestrador roda build, lint e testes da área e faz code review antes do merge.
- Mudanças de contrato durante as fases 2 e 3 sobem para o usuário.

## 9. Critérios de aceite

- `docker compose up` + `pnpm -r test` passam na raiz; o e2e reservar → iniciar → pausar → encerrar passa contra o compose.
- `pnpm --filter infra test` (assertions do CDK) e `cdk synth` para `dev` e `prod` passam.
- O simulador com 50 motos aparece se movendo no mapa do painel; um bloqueio pelo painel com a moto andando reduz o limite e só trava abaixo de 3 km/h.
- `flutter test` passa em `apps/cliente`, `apps/operador` e `packages/volti_flutter`; os dois apps abrem no Android/web apontando para o compose ou para o Prism.
- Playwright do painel cobre bloqueio e cercas.
- Nenhum caminho aceita limite acima de 32 km/h (validação na API, no `IotGateway` e no simulador, com teste).
- `docs/relatorio-qa.md` existe com os problemas por severidade.

## 10. Fora do escopo nesta rodada

- `cdk deploy` e qualquer recurso AWS real (não há AWS CLI configurada).
- Cobranças reais no Mercado Pago: o adaptador fica implementado, mas os testes usam o fake e o sandbox fica documentado.
- Build e assinatura iOS (Windows); o código Flutter fica pronto para iOS.
- Firmware do rastreador, provedores reais de KYC/seguro/NFS-e (só interfaces e mocks), arte de ilustrações e ícone próprio de moto.
