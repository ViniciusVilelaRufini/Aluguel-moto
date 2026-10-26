# Volti: infraestrutura AWS (CDK)

AWS CDK v2 (TypeScript), região `sa-east-1`, dois ambientes (`dev`, `prod`). Tags em todos os recursos: `projeto=volti`, `ambiente=<dev|prod>`.

## Stacks

Nome no CloudFormation: `volti-<env>-<stack>`.

| Stack | Conteúdo |
|---|---|
| `network` | VPC 10.20.0.0/16, 2 AZs, subnets públicas e privadas, NAT (dev 1, prod 2), endpoint S3 |
| `data` | RDS PostgreSQL 16 (KMS, privado, backup, segredo no Secrets Manager `volti/<env>/rds`), Redis (ElastiCache, criptografado), buckets `documentos-kyc` (KMS próprio), `fotos-devolucao`, `relatorios` |
| `auth` | Cognito de clientes (MFA opcional) e interno (MFA obrigatório TOTP, grupos `admin`, `operacao`, `financeiro`, `suporte`, `campo`) |
| `messaging` | SQS `telemetry`, `payments-webhook`, `alerts`, cada uma com DLQ; EventBridge bus `volti-<env>` |
| `iot` | Thing type `moto`, política de menor privilégio, regras IoT (telemetria e eventos para SQS, presença para EventBridge), Amazon Location (tracker e geofence collection) |
| `api` | ECR, ECS Fargate, ALB HTTPS 443 (ACM), health check `/health`, auto scaling por CPU, segredos via Secrets Manager |
| `waf` | Web ACL do CloudFront (precisa estar em `us-east-1`): regras gerenciadas AWS + limite por IP |
| `admin-web` | S3 privado + CloudFront com OAC e o WAF |
| `observability` | SNS, alarmes (5xx da API, DLQs, CPU do RDS) e AWS Budget (dev US$ 100/mês) |

Configuração por ambiente (tamanhos, NAT, retenção, orçamento) em `lib/config.ts`.

## Comandos

```bash
pnpm install                       # na raiz do monorepo
pnpm --filter infra test           # assertions do CDK (jest)
pnpm --filter infra exec cdk synth -c env=dev     # sem credenciais AWS
pnpm --filter infra exec cdk synth -c env=prod
pnpm --filter infra exec cdk diff --all -c env=dev -c account=<id> -c certificateArn=<arn>
```

O synth offline usa conta `000000000000` e ARNs de certificado fictícios. Nenhum `fromLookup` é usado (as AZs são fixas em `lib/config.ts`).

### Contexto (`-c chave=valor`)

| Chave | Padrão | Uso no deploy real |
|---|---|---|
| `env` | `dev` | `dev` ou `prod` |
| `account` | `000000000000` | ID da conta AWS |
| `certificateArn` | ARN fictício | Certificado ACM em `sa-east-1` para o ALB (obrigatório no deploy real) |
| `apiDesiredCount` | `0` | Tarefas Fargate; use 0 até existir imagem no ECR, depois 1 (dev) ou mais |
| `apiImageTag` | `latest` | Tag da imagem no ECR `volti-<env>-api` (o CI usa o SHA do commit) |
| `domainName` | vazio | Se definido junto com `adminCertificateArn`, o painel responde em `admin.<domainName>` |
| `adminCertificateArn` | vazio | Certificado ACM em `us-east-1` (exigência do CloudFront) |
| `alarmEmail` | vazio | E-mail de alarmes e do orçamento (sem ele, só o tópico SNS `volti-<env>-alarms`) |

DNS não é gerenciado aqui: aponte `api.<domínio>` para o ALB (`api/load-balancer-dns` no SSM) e `admin.<domínio>` para a distribuição.

### Ordem de deploy

O serviço da API nasce com 0 tarefas (`-c apiDesiredCount=0`, o padrão), porque o repositório ECR é criado pela própria stack e ainda está vazio. Sem isso o Fargate não consegue baixar a imagem e o circuit breaker faz rollback.

1. `cdk bootstrap aws://<conta>/sa-east-1` e `aws://<conta>/us-east-1` (a stack `waf` fica em us-east-1).
2. Crie o certificado ACM e rode `cdk deploy --all -c env=dev -c account=... -c certificateArn=...` (infra completa, serviço com 0 tarefas).
3. Construa e publique a imagem de `services/api` no ECR (`api/ecr-repository` no SSM) com a tag que será usada em `-c apiImageTag`.
4. Redeploy com a tarefa rodando: `cdk deploy --all ... -c apiImageTag=<tag> -c apiDesiredCount=1` (prod: 2 ou mais).
5. Preencha `MERCADOPAGO_ACCESS_TOKEN` no segredo `volti/<env>/app` (nasce como `CHANGE_ME`). O `MERCADOPAGO_WEBHOOK_SECRET` já nasce aleatório (48 caracteres, gerado pelo Secrets Manager); veja "Rotação do segredo do webhook" abaixo.
6. Habilite a extensão com `CREATE EXTENSION IF NOT EXISTS postgis;` na migração inicial.

O workflow de deploy do dev faz 2 a 4 sozinho: deploy com 0 tarefas, build e push da imagem se existir `services/api/Dockerfile`, e novo deploy com 1 tarefa. Sem Dockerfile, o serviço permanece em 0 tarefas. Com 0 tarefas o auto scaling usa mínimo 0.

## Parâmetros no SSM (prefixo `/volti/<env>/`)

| Parâmetro | Variável equivalente (`.env.example` / API) |
|---|---|
| `vpc/id` | (infra) |
| `rds/endpoint` | `DB_HOST` (monta `DATABASE_URL`) |
| `rds/secret-arn` | segredo com `username` e `password` (`DB_USER`, `DB_PASSWORD`) |
| `redis/endpoint` | `REDIS_URL` (`rediss://<endpoint>:6379`, TLS ligado) |
| `s3/kyc-bucket` | `S3_BUCKET_KYC` |
| `s3/return-photos-bucket` | `S3_BUCKET_RETURN_PHOTOS` |
| `s3/reports-bucket` | `S3_BUCKET_REPORTS` |
| `s3/attachments-bucket` | `S3_BUCKET_ATTACHMENTS` |
| `cognito/customer-pool-id`, `cognito/customer-client-id` | `COGNITO_CUSTOMER_POOL_ID`, `COGNITO_CUSTOMER_CLIENT_ID` |
| `cognito/staff-pool-id`, `cognito/staff-client-id` | `COGNITO_STAFF_POOL_ID`, `COGNITO_STAFF_CLIENT_ID` |
| `iot/endpoint` | `IOT_ENDPOINT` (substitui `MQTT_URL` local) |
| `iot/thing-type` | `moto` |
| `location/tracker-name` | `LOCATION_TRACKER_NAME` |
| `location/geofence-collection` | `LOCATION_GEOFENCE_COLLECTION` |
| `sqs/telemetry-url` | `SQS_QUEUE_TELEMETRIA_URL` |
| `sqs/payments-webhook-url` | `SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL` |
| `sqs/alerts-url` | `SQS_QUEUE_ALERTAS_URL` |
| `admin/distribution-domain` | domínio do CloudFront do painel |

Extras: `api/load-balancer-dns`, `api/ecr-repository`, `admin/site-bucket`.

O container da API recebe estas variáveis do `.env.example` já com os adaptadores AWS: `NODE_ENV=production`, `AUTH_MODE=cognito`, `IOT_MODE=aws`, `GEOFENCE_MODE=aws`, `QUEUE_MODE=sqs`, `STORAGE_MODE=s3`, `PAYMENT_PROVIDER` (dev `fake`, prod `mercadopago`), `INSURANCE_PROVIDER=mock`, `KYC_PROVIDER=mock`, `PUSH_MODE=log`, `TRACK_RETENTION_DAYS=90`, `OUT_OF_AREA_LOCK_MINUTES=5`. `DATABASE_URL` não é injetada: o entrypoint do container (`services/api/scripts/start.mjs`) monta a URL (com `sslmode=require`) com `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (o Secrets Manager não compõe strings). Variáveis locais (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `DEV_JWT_SECRET`, `MQTT_URL`) não existem na AWS: a task role acessa S3, SQS, IoT e Location.

## Contrato IoT

A política `volti-<env>-moto-policy` (anexada ao certificado de cada rastreador no provisionamento) usa `${iot:Connection.Thing.ThingName}`:

- Connect: `client/<thing>`.
- Publish: `motos/<thing>/telemetria`, `motos/<thing>/eventos`, `$aws/things/<thing>/shadow/update` e `/get`.
- Subscribe/Receive: `motos/<thing>/comandos`, shadow `update/accepted|rejected|delta|documents`, `get/accepted|rejected`.
- Shadow: `GetThingShadow`, `UpdateThingShadow` só na própria thing.

Regras: `motos/+/telemetria` vai para a fila de telemetria; `motos/+/eventos` vai para a fila de alertas; eventos de presença (`$aws/events/presence/+/+`) vão por uma Lambda mínima para o EventBridge (`source=volti.iot`, `detail-type=iot.presence`, sem logar o payload). Erros das regras ficam em `/volti/<env>/iot/rule-errors`. O backend publica comandos e shadow com a task role (`topic/motos/*` e `thing/*`).

## Decisões

- AZs fixas `sa-east-1a/b` e `env` explícito, sem lookups, para o synth rodar offline.
- Certificado ACM importado por contexto (ARN fictício no synth). Imagem da API vem de um ECR criado pela stack e tag em contexto.
- WAF do CloudFront em stack separada em `us-east-1` (`crossRegionReferences`); o `admin-web` fica em `sa-east-1`. O CDK cria um recurso auxiliar para ler o ARN entre regiões.
- Regras IoT não têm ação nativa para EventBridge: usamos Lambda mínima para presença. Eventos de dispositivo (`eventos`) vão para SQS, que tem DLQ e já é o que a API consome.
- Eventos de ciclo de vida (presença) do IoT Core são publicados automaticamente; nada a habilitar.
- Dev e prod devem ficar em contas AWS separadas: o thing type `moto` e o nome do certificado são únicos por conta e região.
- Segurança de rede: RDS e Redis aceitam tráfego do CIDR da VPC (evita dependência cíclica entre stacks); sem acesso público.
- Redis com TLS: a API precisa conectar com `rediss://`.
- Segredos: DB gerado pelo RDS; credenciais do Mercado Pago em `volti/<env>/app` (o access token começa como `CHANGE_ME` e o segredo do webhook é gerado aleatoriamente).
- Buckets sempre com `RETAIN`; KYC com versionamento e expiração de versões antigas em 90 dias (retenção legal dos documentos fica com o jurídico). Fotos: IA aos 90 dias, expiram em 365. Relatórios: IA aos 30, expiram em 730.
- `dev`: RDS com snapshot na remoção, sem deletion protection, sem Container Insights. `prod`: Multi-AZ, deletion protection, termination protection nas stacks.
- Budget: sem filtro por tag (requer ativar tags de alocação de custo); notifica em 80% e 100% do gasto real e 100% da previsão. Com `alarmEmail` envia por e-mail, senão para o SNS.
- `lint` roda ESLint (typescript-eslint, flat config); `build` roda `tsc --noEmit`.

## Custo mensal aproximado (dev, sa-east-1, valores de lista, sem free tier)

| Item | US$/mês |
|---|---|
| NAT gateway (1) + tráfego | 45 |
| ALB | 25 |
| RDS `db.t4g.micro` single-AZ, 20 GB gp3, backups | 25 |
| ElastiCache `cache.t4g.micro` | 18 |
| Fargate 0,25 vCPU / 0,5 GB, 1 tarefa | 14 |
| WAF (web ACL + 4 regras) | 11 |
| CloudFront, S3, SQS, Cognito (uso baixo) | 3 |
| KMS (2 chaves), Secrets Manager (2), CloudWatch/logs, Location | 8 |
| **Total** | **cerca de 150** |

Atenção: o orçamento de US$ 100/mês do dev dispara alerta de previsão logo no primeiro mês com esta configuração. Para ficar abaixo, desligue o ambiente fora do expediente (`desiredCount` 0 e remover a NAT) ou ajuste `budgetUsd` em `lib/config.ts`. Valores aproximados: confirme na calculadora da AWS.

## CI/CD (`.github/workflows/infra.yml`)

- Pull request: testes, `cdk synth` (dev e prod) e `cdk diff` do dev.
- Push em `main`: `cdk deploy --all` no dev.
- Autenticação por OIDC, sem chaves fixas. PRs usam `AWS_LOOKUP_ROLE_ARN_DEV` (papel só-leitura, confiança `repo:<owner>/<repo>:pull_request`, usado apenas no `cdk diff`; sem a variável o diff é pulado com aviso). O deploy usa `AWS_DEPLOY_ROLE_ARN_DEV` com `environment: dev`. Variáveis do repositório: `AWS_ACCOUNT_ID`, `AWS_LOOKUP_ROLE_ARN_DEV`, `AWS_DEPLOY_ROLE_ARN_DEV` e `CERTIFICATE_ARN_DEV`.
- `permissions` do topo é só `contents: read`; `id-token: write` fica apenas nos jobs `diff` e `deploy-dev`. A imagem da API é construída com o contexto na raiz (`docker build -f services/api/Dockerfile .`). Pendência: fixar as actions por SHA de commit.

### Passos na AWS e no GitHub (feitos uma vez pelo dono)

1. Crie o papel `volti-ci-cdk-lookup-dev` no IAM com confiança no provedor OIDC `token.actions.githubusercontent.com`, `aud = sts.amazonaws.com`, `sub = repo:<owner>/<repo>:pull_request`.
2. Permissões: apenas `sts:AssumeRole` em `arn:aws:iam::<conta>:role/cdk-*-lookup-role-*` (**não** em `cdk-*-deploy-role`), mais leitura de CloudFormation (`cloudformation:DescribeStacks`, `GetTemplate`, `ListStacks`) e `ssm:GetParameter` em `/cdk-bootstrap/*`.
3. No GitHub, crie a variável `AWS_LOOKUP_ROLE_ARN_DEV` com o ARN do papel.
4. Restrinja a confiança do papel de deploy para `sub = repo:<owner>/<repo>:environment:dev`, removendo `pull_request` e `ref:refs/heads/*`.

### Regras IoT

As regras `motos/+/telemetria` e `motos/+/eventos` projetam `topic(2) AS thingName`, `topic(3) AS channel`, `timestamp() AS ingestedAt` e o corpo aninhado em `payload` (só os campos do contrato); as duas enviam à fila `telemetria` (o `channel` distingue eventos). O SQL ainda não foi validado na AWS: no primeiro deploy dev, confirme que campos ausentes ficam omitidos. Mensagens antigas na fila (sem `payload`) são descartadas.

## Rotação do segredo do webhook (Mercado Pago)

O `MERCADOPAGO_WEBHOOK_SECRET` em `volti/<env>/app` é gerado no primeiro deploy. Para rotacionar:

1. Gere um valor novo (`aws secretsmanager get-random-password --password-length 48 --exclude-punctuation`) ou copie o segredo exibido no painel do Mercado Pago (Webhooks, chave secreta).
2. Atualize o campo no segredo (`aws secretsmanager put-secret-value`, mantendo o `MERCADOPAGO_ACCESS_TOKEN`) e cadastre o mesmo valor no painel do Mercado Pago.
3. Force um novo deploy do serviço (`aws ecs update-service --force-new-deployment`), pois as tasks leem o segredo ao iniciar.

Entre os passos 2 e 3 os webhooks assinados com o valor antigo falham com 401 e o Mercado Pago reenvia; faça tudo numa janela curta. Rotacione também se o segredo vazar.

Ambientes implantados antes da correção QA-19 (segredo do webhook gerado aleatoriamente) ainda têm `MERCADOPAGO_WEBHOOK_SECRET=CHANGE_ME` no segredo, porque o Secrets Manager não regera o valor num segredo existente: rotacione-o à mão com o procedimento acima. Hoje nenhum ambiente existe, então não há o que migrar.
