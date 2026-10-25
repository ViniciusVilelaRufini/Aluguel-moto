# Volti: infraestrutura AWS (CDK)

AWS CDK v2 (TypeScript), região `sa-east-1`, dois ambientes (`dev`, `prod`). Tags em todos os recursos: `projeto=volti`, `ambiente=<dev|prod>`.

## Stacks

Nome no CloudFormation: `volti-<env>-<stack>`.

| Stack | Conteúdo |
|---|---|
| `network` | VPC 10.20.0.0/16, 2 AZs, subnets públicas e privadas, NAT (dev 1, prod 2), endpoint S3 |
| `data` | RDS PostgreSQL 16 (KMS, privado, backup, segredo no Secrets Manager `volti/<env>/rds`), Redis (ElastiCache, criptografado), buckets `documentos-kyc` (KMS próprio), `fotos-devolucao`, `relatorios`, `anexos`, `catalogo` (CORS só para a origem do painel) |
| `auth` | Cognito de clientes (sem senha: `USER_AUTH` com OTP por SMS e, com SES, por e-mail; Google/Apple opcionais; MFA opcional) e interno (MFA obrigatório TOTP, grupos `admin`, `operacao`, `financeiro`, `suporte`, `campo`); domínio do Hosted UI nos dois pools; clients do app do cliente, do painel e do app do operador |
| `messaging` | SQS `telemetry`, `payments-webhook`, `alerts` e `stations.fifo` (FIFO), cada uma com DLQ, e `stations-forwarder-dlq` (falhas do encaminhador das estações); EventBridge bus `volti-<env>` com a regra de presença → `telemetry` |
| `iot` | Thing types `moto` e `estacao`, políticas de menor privilégio, regras IoT (telemetria e eventos do rastreador para a fila de telemetria, eventos das estações em ordem via Kinesis → Lambda → fila FIFO, presença para o EventBridge), Amazon Location (tracker, geofence collection e place index) |
| `api` | ECR, ECS Fargate, ALB HTTPS 443 (ACM), health check `/health`, auto scaling por CPU, segredos via Secrets Manager (inclusive as chaves HMAC geradas pelo CDK), WAF regional (regras gerenciadas AWS + limite por IP por ambiente) |
| `waf` | Web ACL do CloudFront (precisa estar em `us-east-1`): regras gerenciadas AWS + limite por IP |
| `admin-web` | S3 privado + CloudFront com OAC e o WAF |
| `observability` | SNS, alarmes (5xx da API, DLQs, CPU/armazenamento/conexões do RDS, memória do Redis, idade da fila de telemetria e da de estações, erros das regras IoT e das Lambdas, tarefas saudáveis da API) e AWS Budget (dev US$ 100/mês) |

Configuração por ambiente (tamanhos, NAT, retenção, orçamento, limite do WAF, limiares de alarme, domínios e callbacks do Cognito) em `lib/config.ts`.

## Comandos

```bash
pnpm install                       # na raiz do monorepo
pnpm --filter infra test           # assertions do CDK (jest)
pnpm --filter infra exec cdk synth -c env=dev     # sem credenciais AWS
pnpm --filter infra exec cdk synth -c env=prod -c domainName=volti.com.br
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
| `domainName` | vazio | Se definido junto com `adminCertificateArn`, o painel responde em `admin.<domainName>`; a API usa `api.<domainName>` no link público do SOS. **Obrigatório em prod** (sem ele o synth falha) |
| `adminCertificateArn` | vazio | Certificado ACM em `us-east-1` (exigência do CloudFront) |
| `alarmEmail` | vazio | E-mail de alarmes e do orçamento (sem ele, só o tópico SNS `volti-<env>-alarms`) |
| `apiRateLimitPer5Min` | dev 2000, prod 3000 | Limite por IP do WAF da API (requisições em 5 minutos); inteiro >= 10 |
| `sesFromEmail`, `sesVerifiedDomain` | vazio | Identidade SES verificada para os e-mails do pool de clientes; liga o `EMAIL_OTP`. Sem ela, só OTP por SMS e e-mails pelo remetente padrão do Cognito |
| `googleIdpSecretName` | vazio | Nome do segredo do Google (`{"clientId","clientSecret"}`); vazio = IdP não criado. O segredo precisa **existir antes** do deploy com este `-c` (o synth é offline e não confere; o CloudFormation falha na resolução dinâmica se ele não existir) |
| `appleIdpSecretName` | vazio | Nome do segredo da Apple (`{"servicesId","teamId","keyId","privateKey"}`); vazio = IdP não criado |
| `customerDomainPrefix`, `staffDomainPrefix` | `volti-<env>-clientes`, `volti-<env>-equipe` (prod sem `-<env>`) | Prefixo do domínio do Hosted UI (`<prefixo>.auth.sa-east-1.amazoncognito.com`); único por região, troque se já estiver em uso |

DNS não é gerenciado aqui: aponte `api.<domínio>` para o ALB (`api/load-balancer-dns` no SSM) e `admin.<domínio>` para a distribuição.

### Ordem de deploy

O serviço da API nasce com 0 tarefas (`-c apiDesiredCount=0`, o padrão), porque o repositório ECR é criado pela própria stack e ainda está vazio. Sem isso o Fargate não consegue baixar a imagem e o circuit breaker faz rollback.

1. `cdk bootstrap aws://<conta>/sa-east-1` e `aws://<conta>/us-east-1` (a stack `waf` fica em us-east-1).
2. Crie o certificado ACM e rode `cdk deploy --all -c env=dev -c account=... -c certificateArn=...` (infra completa, serviço com 0 tarefas).
3. Construa e publique a imagem de `services/api` no ECR (`api/ecr-repository` no SSM) com a tag que será usada em `-c apiImageTag`.
4. Redeploy com a tarefa rodando: `cdk deploy --all ... -c apiImageTag=<tag> -c apiDesiredCount=1` (prod: 2 ou mais).
5. Preencha `MERCADOPAGO_ACCESS_TOKEN` no segredo `volti/<env>/app` (nasce como `CHANGE_ME`). O `MERCADOPAGO_WEBHOOK_SECRET` já nasce aleatório (48 caracteres, gerado pelo Secrets Manager); veja "Rotação do segredo do webhook" abaixo. `STATION_QR_SECRET`, `FRAUD_HASH_SECRET` e `PICKUP_CODE_SECRET` também nascem aleatórios (64 caracteres, segredos `volti/<env>/station-qr-secret`, `fraud-hash-secret`, `pickup-code-secret`; `RETAIN` em prod). Não rotacione à toa: trocar o do QR invalida todos os QRs colados nas estações (reemita com `pnpm --filter api stations:qr`), trocar o de fraude quebra a comparação dos CPFs já gravados.
6. As migrações rodam na subida do container (`RUN_MIGRATIONS=true`, `scripts/start.mjs`); a migração inicial cria a extensão PostGIS.
7. Cognito: para SMS fora do sandbox do SNS, peça a saída do sandbox e registre a origem para o Brasil. Para o OTP por e-mail, verifique a identidade no SES (e saia do sandbox do SES) e faça o deploy com `-c sesFromEmail=... -c sesVerifiedDomain=...`. Para Google/Apple, crie os segredos no Secrets Manager (formatos na tabela de contexto) e faça o deploy com `-c googleIdpSecretName=...`/`-c appleIdpSecretName=...`; no console do Google/Apple o redirect é `https://<customerDomainPrefix>.auth.sa-east-1.amazoncognito.com/oauth2/idpresponse`.
   **SMS pumping** (cadastro aberto + OTP por SMS é alvo clássico de fraude de tarifação): antes de sair do sandbox, defina o limite de gasto mensal de SMS do SNS (`aws sns set-sms-attributes --attributes MonthlySpendLimit=<US$>`), restrinja os destinos ao Brasil (+55) com SNS Protect/política de países, e considere associar o WAF regional ao user pool (`CfnWebACLAssociation` no ARN do pool; não feito aqui).
8. Estações de troca: para cada estação cadastrada na API, `pnpm --filter infra exec ts-node scripts/provision-station.ts --station <id da SwapStation> --env <env>` (credenciais AWS do ambiente; certificado e chave em `~/.volti/certs/station-<id>`, fora do repositório).

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
| `s3/catalog-bucket` | `S3_BUCKET_CATALOG` |
| `cognito/customer-pool-id`, `cognito/customer-client-id` | `COGNITO_CUSTOMER_POOL_ID`, `COGNITO_CUSTOMER_CLIENT_ID` |
| `cognito/staff-pool-id`, `cognito/staff-client-id` | `COGNITO_STAFF_POOL_ID`, `COGNITO_STAFF_CLIENT_ID` (client do painel); a task também recebe `COGNITO_STAFF_CLIENT_IDS` = painel + app do operador |
| `cognito/operator-client-id` | `COGNITO_CLIENT_ID` do app do operador (pool interno) |
| `cognito/customer-domain`, `cognito/staff-domain` | `COGNITO_DOMAIN` dos apps / `NEXT_PUBLIC_COGNITO_DOMAIN` do painel |
| `iot/endpoint` | `IOT_ENDPOINT` (substitui `MQTT_URL` local) |
| `iot/thing-type` | `moto` |
| `iot/station-thing-type` | `estacao` |
| `location/place-index` | `LOCATION_PLACE_INDEX` |
| `location/tracker-name` | `LOCATION_TRACKER_NAME` |
| `location/geofence-collection` | `LOCATION_GEOFENCE_COLLECTION` |
| `sqs/telemetry-url` | `SQS_QUEUE_TELEMETRIA_URL` |
| `sqs/payments-webhook-url` | `SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL` |
| `sqs/alerts-url` | `SQS_QUEUE_ALERTAS_URL` |
| `sqs/stations-url` | `SQS_QUEUE_ESTACOES_URL` (FIFO, termina em `.fifo`) |
| `admin/distribution-domain` | domínio do CloudFront do painel |

Extras: `api/load-balancer-dns`, `api/ecr-repository`, `admin/site-bucket`.

O container da API recebe estas variáveis do `.env.example` já com os adaptadores AWS: `NODE_ENV=production`, `AUTH_MODE=cognito`, `IOT_MODE=aws`, `GEOFENCE_MODE=aws`, `QUEUE_MODE=sqs`, `STORAGE_MODE=s3`, `PAYMENT_PROVIDER` (dev `fake`, prod `mercadopago`), `INSURANCE_PROVIDER=mock`, `INVOICE_ISSUER=mock`, `KYC_PROVIDER=mock`, `PUSH_MODE=log`, `TRACK_RETENTION_DAYS=90`, `OUT_OF_AREA_LOCK_MINUTES=5`, `GEOCODER_MODE=aws` (com `LOCATION_PLACE_INDEX`), `RUN_MIGRATIONS=true`, `S3_BUCKET_CATALOG` e `SQS_QUEUE_ESTACOES_URL`; e os segredos `STATION_QR_SECRET`, `FRAUD_HASH_SECRET`, `PICKUP_CODE_SECRET` (gerados pelo CDK). O teste de deriva (`test/api.test.ts`) confere os dois sentidos: todo nome injetado é lido pela API, e toda variável citada numa mensagem de erro em qualquer arquivo de `services/api/src` (`X é obrigatório em produção`, `IOT_MODE=aws exige X`, `X não configurado`...) está na task, exceto `DEV_JWT_SECRET` (só existe com `AUTH_MODE=dev`, recusado em produção). `DATABASE_URL` não é injetada: o entrypoint do container (`services/api/scripts/start.mjs`) monta a URL (com `sslmode=require`) com `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (o Secrets Manager não compõe strings). Variáveis locais (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `DEV_JWT_SECRET`, `MQTT_URL`) não existem na AWS: a task role acessa S3, SQS, IoT e Location.

## Contrato IoT

A política `volti-<env>-moto-policy` (anexada ao certificado de cada rastreador no provisionamento) usa `${iot:Connection.Thing.ThingName}`:

- Connect: `client/<thing>`.
- Publish: `motos/<thing>/telemetria`, `motos/<thing>/eventos`, `$aws/things/<thing>/shadow/update` e `/get`.
- Subscribe/Receive: `motos/<thing>/comandos`, shadow `update/accepted|rejected|delta|documents`, `get/accepted|rejected`.
- Shadow: `GetThingShadow`, `UpdateThingShadow` só na própria thing.

A política `volti-<env>-estacao-policy` (anexada ao certificado de cada estação por `scripts/provision-station.ts`, thing `station-<stationId>` do tipo `estacao`):

- Connect: `client/<thing>`, só com certificado anexado à thing.
- Publish: `estacoes/<thing>/eventos`.
- Subscribe/Receive: `estacoes/<thing>/comandos`. Sem shadow.

Regras (todas com a mesma ação de erro: `/volti/<env>/iot/rule-errors` + filtro de métrica `Volti/<env>/IotRuleErrors`, com alarme):

- `motos/+/telemetria` → fila de telemetria (`SELECT *, topic(2) AS thingName, timestamp() AS ingestedAt`).
- `motos/+/eventos` → **fila de telemetria** (mesmo SQL). A API (`AwsIotTransport`) separa pelo campo `tipo` e gera o alerta com moto, aluguel e posição. **Escolha registrada:** a correção foi feita na regra (destino), não com SQL de transformação para `CreateAlertInput`: esse formato exige o `vehicleId` (UUID do banco), o aluguel aberto e a posição, que o SQL do IoT não tem como buscar a partir do `thingName`. A fila `alerts` continua com o formato `CreateAlertInput`, para produtores que não sejam o rastreador. A Task 5 (API) pode tolerar os dois formatos no listener, mas nada cru do rastreador chega mais à fila `alerts`.
- `estacoes/+/eventos` (`SELECT *, topic(2) AS thing`) → **Kinesis** `volti-<env>-station-events` (chave de partição `${topic(2)}` = thing, 1 shard, 24 h) → Lambda `StationForwarder` por event source mapping (paralelização 1, um lote por shard de cada vez, `ReportBatchItemFailures`, sem bisseção, 50 retentativas, idade máxima 1 h) → fila FIFO `stations.fifo` (`MessageGroupId` = thing, deduplicação por conteúdo, `maxReceiveCount` 3).
  - **Por que não SQS direto nem Lambda direto:** a ação SQS do IoT não envia para fila FIFO (sem `MessageGroupId`), e a ação Lambda do IoT é assíncrona (invocações em paralelo, retentativa minutos depois), o que inverte a ordem; a API depende da ordem por estação (`station-swaps.service.ts`: um `slot_closed` antes do `battery_returned` cancela a troca com a bateria do cliente na vaga).
  - **Ordem garantida daqui em diante:** a ordem de chegada no Kinesis é preservada por chave de partição até a fila FIFO. A Lambda envia um registro por vez, na ordem do shard; no primeiro envio que falha ela para e devolve aquele registro como falha, então a retentativa recomeça dele (o shard fica bloqueado, nunca pula adiante). Registros reenviados numa retentativa são absorvidos pela deduplicação por conteúdo da fila (5 min). Um evento que a API não consegue processar segura o grupo da estação por no máximo 3 recebimentos (cerca de 3 min) e vai para `stations-dlq.fifo`.
  - **Lacuna que sobra (a API precisa tolerar):** o IoT Core não garante a ordem entre o broker e a ação da regra; duas mensagens da mesma estação publicadas com milissegundos de diferença podem chegar ao Kinesis invertidas. Os eventos de uma troca vêm com segundos de intervalo (`slot_opened` → `battery_returned` → `slot_closed`), então é raro, mas possível. A API deve ordenar pelo `ts` do evento dentro da troca, ou adiar por alguns segundos o cancelamento por `slot_closed` sem devolução esperando um `battery_returned` atrasado (fica para a tarefa da API).
  - **Falha de entrega:** depois das retentativas (ou com mais de 1 h no stream) o event source mapping manda para a fila `stations-forwarder-dlq` (padrão: destino de falha da Lambda não aceita FIFO) uma mensagem com os **metadados** do lote (`KinesisBatchInfo`: `shardId`, `startSequenceNumber`, `endSequenceNumber`), não o payload. Há alarme. Para reinjetar em até 24 h (retenção do stream): `aws kinesis get-shard-iterator --stream-name volti-<env>-station-events --shard-id <shardId> --shard-iterator-type AT_SEQUENCE_NUMBER --starting-sequence-number <startSequenceNumber>`, `aws kinesis get-records --shard-iterator <it>`, e para cada registro até `endSequenceNumber`: `aws sqs send-message --queue-url <stations.fifo> --message-group-id <thing> --message-body <data decodificado>`, na ordem. A Lambda descarta mensagem sem thing `station-<uuid>` e não loga o payload.
- `$aws/events/presence/+/+` → Lambda mínima → EventBridge (`source=volti.iot`, `detail-type=iot.presence`, sem logar o payload) → regra `presence-to-telemetry` → fila de telemetria como `{ "thingName", "presence": "connected" | "disconnected", "timestamp" }` (só things `moto-*`; docs/decisoes.md, IoT item 12). A API (`AwsIotTransport`) encaminha as mensagens com `presence` para `inbound.presence` (lacunas T5).

O backend publica comandos e shadow com a task role (`topic/motos/*/comandos`, `topic/estacoes/*/comandos`, shadow `update`/`get` e `thing/*`), consome as filas `telemetry`, `alerts` e `stations.fifo`, e consulta o place index (`geo:SearchPlaceIndexForPosition`).

## Cognito

| Pool | Client | Fluxos | Callback / logout |
|---|---|---|---|
| clientes (`volti-<env>-customers`, plano Essentials) | `customer-app` (público) | `ALLOW_USER_AUTH` (OTP por SMS; por e-mail com SES), revogação de token; Hosted UI `code` (escopos `openid email phone profile`) **só quando houver Google/Apple configurado, e só com eles** (o provedor `COGNITO`, usuário e senha, nunca aparece no Hosted UI; sem IdP social o client não tem OAuth) | `volti://auth/callback` (só com IdP social) |
| interno (`volti-<env>-staff`, MFA TOTP) | `admin-panel` (público) | SRP e Hosted UI `code` + PKCE, escopos `openid email profile` | `<origem do painel>/auth/callback/` (e sem a barra), logout `<origem>/login/`; no dev também `http://localhost:3100` |
| interno | `operator-app` (público) | só Hosted UI `code` + PKCE e refresh | `br.com.volti.operador://callback` |

Callbacks em `lib/config.ts` (`auth.*CallbackUrls`, `auth.adminExtraOrigins`); a origem do painel vem da stack `admin-web` (domínio próprio ou CloudFront). Login por telefone ou e-mail (atributos de username), e-mail não obrigatório. O SMS sai pelo SNS com um papel criado pelo CDK (external id), sem credencial. O `PASSWORD` continua como primeiro fator porque o Cognito não permite removê-lo; o client do app só habilita `USER_AUTH`. A API aceita a lista `COGNITO_STAFF_CLIENT_IDS` (painel + `operator-app`), definida na task ECS (lacunas T5).

**API com várias tasks (lacunas T5):** o dev roda `PAYMENT_PROVIDER=fake` com `NODE_ENV=production` e por isso a task do dev recebe `ALLOW_FAKE_PAYMENTS=true` (só quando `paymentProvider` é `fake`; prod usa `mercadopago` e não recebe a variável — a API recusa subir com fake em produção sem ela). `PUBLIC_SHARE_BASE_URL` = `https://api.<domainName>/share` (`-c domainName=...`) ou, sem domínio (só dev), o DNS do ALB; prod exige `domainName`. O Redis usa um parameter group com `maxmemory-policy noeviction` (estado de segurança sem TTL nunca é expulso; memória cheia = escritas falham). O segredo `volti/<env>/fcm-service-account` vai para `FCM_SERVICE_ACCOUNT_JSON`: cole o JSON da conta de serviço do Firebase e só então troque `PUSH_MODE` para `fcm` (a API valida o JSON ao subir).

## Alarmes (`observability`)

| Alarme | Métrica | Limiar |
|---|---|---|
| `Api5xx` | 5xx dos alvos do ALB | >= 10 em 5 min (2 períodos) |
| `ApiHealthyTasks` | `HealthyHostCount` (mínimo) do target group | < tarefas mínimas por 3 min; sem dado conta como falha; notificação desligada enquanto o serviço roda com 0 tarefas |
| `TelemetryQueueAge`, `StationsQueueAge` | `ApproximateAgeOfOldestMessage` | dev 120 s / 60 s, prod 60 s / 30 s |
| `StationStreamIteratorAge` | `IteratorAge` da Lambda das estações (eventos parados no Kinesis) | mesmo limiar da fila de estações |
| `*Dlq` (5) | mensagens visíveis na DLQ (inclui `StationsForwarderDlq`) | >= 1 |
| `IotRuleErrors` | filtro de métrica no log de erros das regras | >= 1 em 5 min |
| `StationForwarderErrors`, `PresenceForwarderErrors` | `Errors` das Lambdas | >= 1 em 5 min |
| `RdsCpu`, `RdsFreeStorage`, `RdsConnections` | CPU, armazenamento livre, conexões | 80%, < 10% do alocado, dev 65 / prod 360 (cerca de 80% do `max_connections`: ~80 no `db.t4g.micro`, ~450 no `db.t4g.medium`; confira com `SHOW max_connections`) |
| `RedisMemory00N` | `DatabaseMemoryUsagePercentage` por nó | >= 80% |

## Decisões

- AZs fixas `sa-east-1a/b` e `env` explícito, sem lookups, para o synth rodar offline.
- Certificado ACM importado por contexto (ARN fictício no synth). Imagem da API vem de um ECR criado pela stack e tag em contexto.
- WAF do CloudFront em stack separada em `us-east-1` (`crossRegionReferences`); o `admin-web` fica em `sa-east-1`. O CDK cria um recurso auxiliar para ler o ARN entre regiões.
- Regras IoT não têm ação nativa para EventBridge nem enviam para SQS FIFO: Lambda mínima para presença; eventos das estações por Kinesis (ordem por estação) e uma Lambda por event source mapping até a FIFO. Eventos do rastreador (`eventos`) vão para a fila de telemetria, que tem DLQ e já é o que a API consome.
- WAF da API: `AWSManagedRulesAmazonIpReputationList`, `AWSManagedRulesKnownBadInputsRuleSet` e `AWSManagedRulesCommonRuleSet` (com `SizeRestrictions_BODY` só contando: polígonos de zona do painel passam de 8 KB; o Express limita em 100 KB) e o limite por IP de `lib/config.ts`.
- Place index do Amazon Location com `IntendedUse=Storage`, porque a API guarda os endereços em cache no Redis (o uso `SingleUse` proíbe guardar resultados).
- Pool de clientes: mudar os atributos de username (agora telefone e e-mail) recria o pool; nenhum ambiente está implantado, então não há migração. Num ambiente existente seria preciso exportar e reimportar os usuários.
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
| WAF (2 web ACLs, CloudFront e ALB, 4 regras cada) | 22 |
| CloudFront, S3, SQS, Cognito (uso baixo) | 3 |
| KMS (2 chaves), Secrets Manager (5), CloudWatch/logs e alarmes, Location (inclui place index), Lambdas | 12 |
| Kinesis (1 shard provisionado, eventos das estações) | 15 |
| **Total** | **cerca de 180** |

Atenção: o orçamento de US$ 100/mês do dev dispara alerta de previsão logo no primeiro mês com esta configuração. Para ficar abaixo, desligue o ambiente fora do expediente (`desiredCount` 0 e remover a NAT) ou ajuste `budgetUsd` em `lib/config.ts`. Valores aproximados: confirme na calculadora da AWS.

## CI/CD (`.github/workflows/infra.yml`)

- Dispara em mudanças de `infra/`, `services/api/`, `apps/admin/`, `packages/contracts/` e do lockfile.
- Job `checks` (porta do deploy): `redocly lint` do contrato, lint e testes unitários de `services/api`, lint e vitest de `apps/admin`.
- Pull request: `checks`, testes do CDK, `cdk synth` (dev e prod) e `cdk diff` do dev.
- Push em `main`: `cdk deploy --all` no dev depois de `checks` e `synth`. A imagem da API é construída da raiz do repositório (`docker build -f services/api/Dockerfile .`), porque o Dockerfile copia o lockfile e o `tsconfig.base.json` do workspace.
- Autenticação por OIDC (`aws-actions/configure-aws-credentials` com `role-to-assume`), sem chaves fixas. Configure no repositório as variáveis `AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN_DEV` e `CERTIFICATE_ARN_DEV`, e um provedor OIDC do GitHub na conta AWS com uma role confiando no repositório.

## Rotação do segredo do webhook (Mercado Pago)

O `MERCADOPAGO_WEBHOOK_SECRET` em `volti/<env>/app` é gerado no primeiro deploy. Para rotacionar:

1. Gere um valor novo (`aws secretsmanager get-random-password --password-length 48 --exclude-punctuation`) ou copie o segredo exibido no painel do Mercado Pago (Webhooks, chave secreta).
2. Atualize o campo no segredo (`aws secretsmanager put-secret-value`, mantendo o `MERCADOPAGO_ACCESS_TOKEN`) e cadastre o mesmo valor no painel do Mercado Pago.
3. Force um novo deploy do serviço (`aws ecs update-service --force-new-deployment`), pois as tasks leem o segredo ao iniciar.

Entre os passos 2 e 3 os webhooks assinados com o valor antigo falham com 401 e o Mercado Pago reenvia; faça tudo numa janela curta. Rotacione também se o segredo vazar.

Ambientes implantados antes da correção QA-19 (segredo do webhook gerado aleatoriamente) ainda têm `MERCADOPAGO_WEBHOOK_SECRET=CHANGE_ME` no segredo, porque o Secrets Manager não regera o valor num segredo existente: rotacione-o à mão com o procedimento acima. Hoje nenhum ambiente existe, então não há o que migrar.
