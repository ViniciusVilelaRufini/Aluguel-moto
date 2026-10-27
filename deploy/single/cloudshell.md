# Volti dev em uma instância: primeiro deploy pelo AWS CloudShell

Nada roda no seu PC. Tudo é feito no **AWS CloudShell**: no console da AWS, troque a região para **São Paulo (sa-east-1)** e clique no ícone `>_` no topo. O CloudShell já vem com `aws`, `git` e `npm`, usando as suas credenciais do console. O deploy não usa Docker: a imagem da API é construída na própria instância.

Tudo o que a stack cria recebe a tag `Projeto=Volti` e tem nome começando por `volti-`, porque a conta também roda outro projeto. Três cuidados com o que é do outro projeto:

- **Bootstrap:** o Volti usa um toolkit do CDK próprio (`volti-cdk-toolkit`, qualifier `volti`).
- **Rede:** a instância fica numa **VPC própria** (`volti-dev-single`), não na VPC padrão.
- **DNS:** na zona `prestarecondominios.com.br`, a instância só faz UPSERT do registro A `api-volti-dev`. Nenhum outro registro é tocado.

O CloudShell guarda só 1 GB no home. Por isso o Node, o código e o store do pnpm ficam em `/tmp` e em `/usr/local`, que somem ao fechar a sessão. Não tem problema: o código fica no GitHub e basta repetir os passos 1 e 2 numa sessão nova.

## 0. Variáveis da sessão

```bash
export AWS_REGION=sa-east-1 AWS_DEFAULT_REGION=sa-east-1
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export BRANCH=feat/galpao
export BUDGET_EMAIL=voce@exemplo.com
export API_DOMAIN=api-volti-dev.prestarecondominios.com.br
export HOSTED_ZONE_ID=Z04583703P20295WCJ8TF
export SES_FROM=nao-responda@voltz.prestarecondominios.com.br   # identidade de DOMÍNIO já verificada no SES (sa-east-1)
```

## 1. Node 24 e pnpm (fora do home)

O `package.json` do monorepo exige Node >= 24, e o CloudShell traz uma versão anterior.

```bash
sudo npm install -g n
sudo n 24
hash -r
node -v
sudo npm install -g pnpm@9.15.9
```

## 2. Deploy key do GitHub (somente leitura) e código

A chave fica em `/tmp` e é apagada no passo 5.

```bash
ssh-keygen -t ed25519 -f /tmp/volti_deploy -N "" -C volti-dev-deploy
cat /tmp/volti_deploy.pub
```

No GitHub, vá no repositório `ViniciusVilelaRufini/Aluguel-moto` → Settings → Deploy keys → Add deploy key. Cole a chave pública e **não** marque "Allow write access". Depois:

```bash
GIT_SSH_COMMAND="ssh -i /tmp/volti_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  git clone --depth 1 --branch "$BRANCH" git@github.com:ViniciusVilelaRufini/Aluguel-moto.git /tmp/volti
cd /tmp/volti
pnpm install --frozen-lockfile --filter "infra..." --store-dir /tmp/pnpm-store
cd /tmp/volti/infra
```

## 3. Bootstrap do CDK (uma vez por conta/região)

```bash
pnpm exec cdk bootstrap aws://$ACCOUNT/sa-east-1 \
  --qualifier volti --toolkit-stack-name volti-cdk-toolkit --tags Projeto=Volti
```

## 4. Deploy

```bash
pnpm exec cdk deploy --all --require-approval never --toolkit-stack-name volti-cdk-toolkit \
  -c env=dev -c profile=single -c account=$ACCOUNT -c branch=$BRANCH -c budgetEmail=$BUDGET_EMAIL \
  -c hostedZoneId=$HOSTED_ZONE_ID -c apiDomain=$API_DOMAIN -c sesFromEmail=$SES_FROM   -c customerSignup=open
```

`-c customerSignup=open` libera o cadastro pelo app com celular (SMS pelo SNS) e e-mail. Sem ela (padrão `closed`), o pool de clientes não tem auto-cadastro nem SMS e os clientes de teste vêm do documento `volti-dev-admin`.

**Sandbox do SNS (conta compartilhada):** o SMS está em sandbox e com limite de gasto de US$ 1/mês para a conta inteira. Só números verificados recebem SMS. Para testar com um celular, cadastre o número em **SNS > Mensagens de texto (SMS) > Números de telefone da sandbox** (região sa-east-1) e confirme o código recebido. Acompanhe o gasto mensal nessa mesma tela; ao atingir o limite, o SMS para de ser enviado até o mês seguinte. Isso é configuração da conta, não do deploy.

Com `-c sesFromEmail`, o pool de clientes manda o código de login por e-mail pelo SES. O remetente é `"Volti (dev)" <nao-responda@voltz.prestarecondominios.com.br>`, usando a identidade do **domínio** verificado `voltz.prestarecondominios.com.br` (derivada do endereço; ou passe `-c sesVerifiedDomain=...`). A identidade precisa estar verificada em **sa-east-1**. Se a conta estiver no sandbox do SES, só destinatários verificados recebem o código.

O deploy cria 3 stacks:

- `volti-dev-admin-web`: S3 + CloudFront do painel, no domínio padrão do CloudFront.
- `volti-dev-auth`: Cognito. O pool de clientes **não tem auto-cadastro nem SMS**, a menos que o deploy use `-c customerSignup=open`.
- `volti-dev-single`: VPC própria, instância, chave KMS `alias/volti-dev`, buckets, parâmetros, documentos SSM, agenda, snapshots e orçamento.

Confirme a inscrição no e-mail que a AWS Budgets enviar.

Opções de `-c`:

- `-c schedule=false`: a instância fica ligada 24 h. Por padrão ela liga às 07:00 e desliga às 23:00, horário de São Paulo.
- `-c customerSignup=open|closed` (padrão `closed`): `open` liga o auto-cadastro por celular (SMS/SNS) e e-mail no pool de clientes. Valor diferente de `open`/`closed` aborta o synth. O pool interno (staff) não muda.
- `-c apiDomain=-`: sem DNS. A API fica em `https://<ip-com-hifens>.sslip.io`.
- `-c instanceType=t4g.small`, `-c rootVolumeGb=25`, `-c repoUrl=...`.

## 5. Gravar a deploy key no Parameter Store (logo depois do deploy)

A chave privada vai cifrada com a chave KMS `alias/volti-dev`, que **só a role da instância decifra**. A instância espera por ela até 60 minutos no primeiro boot.

```bash
aws ssm put-parameter --name /volti/dev/github-deploy-key --type SecureString --key-id alias/volti-dev \
  --value "$(cat /tmp/volti_deploy)" --tags Key=Projeto,Value=Volti
shred -u /tmp/volti_deploy /tmp/volti_deploy.pub
```

Se o parâmetro já existir (por exemplo, criado antes com a chave `aws/ssm`), apague e crie de novo. O `--overwrite` não aceita `--tags`. Gere outra chave no passo 2 se a anterior já tiver sido apagada.

```bash
aws ssm delete-parameter --name /volti/dev/github-deploy-key
aws ssm put-parameter --name /volti/dev/github-deploy-key --type SecureString --key-id alias/volti-dev \
  --value "$(cat /tmp/volti_deploy)" --tags Key=Projeto,Value=Volti
```

Depois disso, nem você consegue ler o valor: o `get-parameter --with-decryption` dá `AccessDenied`. É esperado.

## 6. Primeiro boot (automático, cerca de 15 min)

O user data faz, nesta ordem:

1. Instala Docker (com rotação de log), Compose e buildx (binários conferidos por sha256) e git.
2. Cria 2 GB de swap.
3. Espera a deploy key e clona a branch.
4. Registra o serviço `volti-dns`, que faz o UPSERT de `api-volti-dev...` → IP atual a cada boot.
5. Roda `deploy/single/update.sh`: gera os segredos em `/volti/dev/secrets/*`, monta `/opt/volti/.env`, constrói a API e o PostGIS, roda `prisma migrate deploy` e sobe tudo.

Para acompanhar, abra o Session Manager (EC2 → `volti-dev-single` → Connect → Session Manager) e rode:

```bash
sudo tail -f /var/log/volti-boot.log
```

Teste no CloudShell:

```bash
curl -fsS https://$API_DOMAIN/health
```

Se o boot falhar antes do clone (por exemplo, a deploy key não apareceu em 60 minutos), crie o parâmetro e rode de novo pelo Session Manager:

```bash
sudo bash /var/lib/cloud/instance/scripts/part-001
```

## 7. Seed, painel e clientes de teste

```bash
IID=$(aws ec2 describe-instances --filters Name=tag:Name,Values=volti-dev-single Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ssm send-command --instance-ids $IID --document-name volti-dev-seed --query Command.CommandId --output text
aws ssm send-command --instance-ids $IID --document-name volti-dev-admin --parameters action=publish-panel --query Command.CommandId --output text
aws ssm send-command --instance-ids $IID --document-name volti-dev-admin \
  --parameters action=create-customer,email=cliente.teste@exemplo.com --query Command.CommandId --output text
# resultado: aws ssm list-command-invocations --command-id <id> --details --query 'CommandInvocations[0].Status'
```

O painel fica em `https://<distribuição>.cloudfront.net`. O endereço está no parâmetro de config:

```bash
aws ssm get-parameter --name /volti/dev/config/ADMIN_ORIGIN --query Parameter.Value --output text
```

O primeiro usuário da equipe se cria no console do Cognito (pool `volti-dev-staff`): coloque-o no grupo `admin` e configure o TOTP no primeiro login.

**Clientes no dev:** não há auto-cadastro. O fluxo "criar conta" do app só funciona com usuários criados antes pelo `volti-dev-admin` (`create-customer`).

- **Com `-c sesFromEmail` (o padrão deste passo a passo):** o usuário é criado confirmado, com uma senha aleatória que ninguém conhece. O login é pelo código enviado ao e-mail.
- **Sem SES:** o pool aceita só senha. O Cognito envia o convite com uma senha temporária pelo e-mail padrão dele (não usa SNS), e no primeiro login o app recebe o desafio `NEW_PASSWORD_REQUIRED`.

## 8. (Opcional, ação do dono da conta) tag de alocação de custo

O orçamento `volti-dev-single-monthly` filtra pela tag `Projeto`. Ativar uma tag de alocação de custo é uma configuração de **billing da conta inteira**: numa conta-membro de Organization, só a conta de gerenciamento pode fazer isso. A tag aparece no Billing até 24 h depois de existir em algum recurso. Se você decidir ativar:

```bash
aws ce update-cost-allocation-tags-status --cost-allocation-tags-status TagKey=Projeto,Status=Active
```

Sem isso, o orçamento fica em US$ 0 (o filtro não enxerga gasto).

## Atualizações depois

Atualizar o código: Systems Manager → Run Command → `volti-dev-update` → alvo `volti-dev-single` → Run. Ou, no CloudShell:

```bash
aws ssm send-command --instance-ids $IID --document-name volti-dev-update
```

- Painel: `volti-dev-admin` com `action=publish-panel`.
- Mudanças de infra: repita o passo 4 com os novos `-c`. O user data só roda no primeiro boot; para trocar a branch de uma instância já criada, edite `VOLTI_BRANCH` em `/etc/volti/instance.env` e rode o update.

## Simulador de rastreadores (motos sem rastreador real)

O dev single não tem rastreador físico. Por isso o `update.sh` sobe o serviço `iot-sim` (`services/iot-sim`, profile `sim` do `compose.yml`) ligado ao Mosquitto da instância. Ele simula um rastreador por moto cadastrada, lendo a frota do Postgres só com `SELECT`, e:

- publica telemetria na posição da moto (moto livre ou em manutenção no galpão fica na posição do galpão), parada, com velocidade 0, a cada 60 s. É esse heartbeat que deixa a moto `online` no painel;
- responde aos comandos pelo shadow como o firmware: destrava, trava só abaixo de 3 km/h, limite de 0 a 32 km/h. O aceite da entrega (`/handovers/{id}/accept`) deixa de dar `409 vehicle-offline`;
- quando a moto chega a um galpão pelo recolhimento ou pela entrega (travada e parada), passa a reportar a posição do galpão depois de 3 min.

**Ligado por padrão.** Para desligar (por exemplo, ao instalar um rastreador de bancada com o mesmo `thingName`), crie o parâmetro e rode o update:

```bash
# primeira vez: cria com a tag do projeto
aws ssm put-parameter --name /volti/dev/config/IOT_SIM --type String --value off --tags Key=Projeto,Value=Volti
# se já existe: troca o valor (o --overwrite não aceita --tags)
aws ssm put-parameter --name /volti/dev/config/IOT_SIM --type String --value off --overwrite
aws ssm send-command --instance-ids $IID --document-name volti-dev-update --query Command.CommandId --output text
```

Para religar, use `--value on` (ou apague o parâmetro com `aws ssm delete-parameter --name /volti/dev/config/IOT_SIM`) e rode o update. O `render-env.sh` regrava o `/opt/volti/.env` a cada update, então editar o `.env` à mão não adianta: o valor vem do parâmetro. Opcional: `/volti/dev/config/SIM_RIDE_ON_UNLOCK=true` faz um piloto simulado andar com a moto destravada num laço de ~220 m perto de onde ela está. O padrão `false` deixa a moto parada.

Logs: `docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env logs --tail 50 iot-sim` (Session Manager, como root, em `/opt/volti/src`).

## Rastreador GT06 (Traccar + ponte + emulador)

Spec `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`. Profile `gt06` do `compose.yml`: Traccar
(`traccar/traccar:6.16.0-ubuntu`, arm64, a mesma imagem do `docker-compose.yml` local e do CDK), a ponte
(`services/traccar-bridge`) e o emulador GT06 (mesma imagem da ponte). Nenhum dos três tem IP fixo, IMDS ou `NET_RAW`.
**Desligado por padrão**: a t4g.small tem 2 GiB e o profile soma ~900 MB de limite. Confira `free -m` na instância antes;
se faltar memória, desligue o `IOT_SIM`.

**Antes do primeiro deploy com este código** (Session Manager na instância, como root, em `/opt/volti/src`). A migração do
GT06 cria o índice único de `Tracker.imei`; IMEI duplicado ou migração anterior pela metade fazem o `prisma migrate deploy`
falhar:

```bash
DC="docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env"
# 1) IMEI duplicado (tem de voltar vazio; antes da migração a coluna pode não existir — erro "column does not exist" = ok)
echo 'SELECT imei, count(*) FROM "Tracker" WHERE imei IS NOT NULL GROUP BY imei HAVING count(*) > 1' | $DC exec -T postgres psql -U volti -d volti -tA
# 2) migração do Prisma que falhou e ficou pendente (tem de voltar vazio; senão resolva com `prisma migrate resolve` antes)
echo 'SELECT migration_name, started_at FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL' | $DC exec -T postgres psql -U volti -d volti -tA
# 3) memória e disco (o profile gt06 soma ~900 MB de limite; o build da imagem da ponte precisa de ~1 GB livre em disco)
free -m; df -h /
# 4) volta rápida: guarda a imagem atual da API e um dump do banco (só root lê: 600)
docker tag volti/api:dev volti/api:pre-gt06
(umask 077; $DC exec -T postgres pg_dump -U volti -d volti -Fc > /var/tmp/volti-pre-gt06.dump) && ls -l /var/tmp/volti-pre-gt06.dump
```

Para voltar: `docker tag volti/api:pre-gt06 volti/api:dev`, `$DC up -d api` e, se preciso, `pg_restore --clean` do dump. Apague
o dump quando não precisar mais (dado pessoal).

```bash
# primeira vez: cria com a tag do projeto (se já existe: --overwrite, sem --tags)
aws ssm put-parameter --name /volti/dev/config/GT06 --type String --value on --tags Key=Projeto,Value=Volti
# opcional: modelo da bateria (48v, 60v ou 72v, o padrão) para a ponte e o emulador
aws ssm put-parameter --name /volti/dev/config/GT06_BATTERY_MODEL --type String --value 72v --tags Key=Projeto,Value=Volti
aws ssm send-command --instance-ids $IID --document-name volti-dev-update --query Command.CommandId --output text
```

**Rode o `volti-dev-update` duas vezes** na primeira vez que a instância recebe este código: o documento executa o
`update.sh` que já estava na instância, e o `git reset` dele só troca o arquivo para o update seguinte. O primeiro update já
gera os segredos novos (o `render-env.sh` e o `compose.yml` são lidos do código novo); o segundo liga o profile `gt06`.
Confira no output: `rastreador GT06 (Traccar + ponte + emulador): ligado`, `Traccar no ar ("version":"6.16...")`,
`GT06 pronto (...)` e os containers `traccar`, `traccar-bridge` e `gt06-emulator` em execução.

O update gera `TRACCAR_DB_PASSWORD`, `TRACCAR_ADMIN_PASSWORD`, `TRACCAR_BRIDGE_PASSWORD` e `BRIDGE_DB_PASSWORD` em
`/volti/dev/secrets/` (mesmo com `GT06=off`: o `compose.yml` os exige) e, com `GT06=on`, roda `gt06.sh init` depois das
migrações: banco `traccar` (papel `traccar`), papel `volti_bridge` (só `SELECT` em `imei`, `thingName` e `controlMode` de
`"Tracker"`), o admin do Traccar (`admin@volti.local`) e o usuário da ponte (`bridge@volti.local`, não admin; o
`provision` liga cada dispositivo a ele). Painel/REST do Traccar só em 127.0.0.1:8082 na instância, nunca no security group:

```bash
aws ssm start-session --target $IID --document-name AWS-StartPortForwardingSession --parameters portNumber=8082,localPortNumber=8082
```

Provisionar a moto do emulador (IMEI padrão `860000000000901`) ou um J16, e rodar o e2e:

```bash
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh provision VLT-0060 moto-0060 860000000000901"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
# DONO: token de staff (admin/operacao) de uma sessão do painel — DevTools → Rede → qualquer chamada à API → valor depois de
# "Bearer ". Vale ~1 h; fica fora da allowlist do render-env.sh (nunca entra no .env; o update avisa "ignorado").
aws ssm put-parameter --name /volti/dev/secrets/E2E_STAFF_TOKEN --type SecureString --key-id alias/volti-dev --overwrite --value '<token>'
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript --timeout-seconds 600 \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh e2e VLT-0060 moto-0060"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query '[StandardOutputContent,StandardErrorContent]' --output text
```

Use uma moto livre (fora de aluguel). Esperado no fim: `comando <id>: confirmed`, `{"ok":true,"problems":[]}`,
`cortes no emulador: speedKmhAtCut":0` e `e2e GT06: OK`. Os logs do e2e ficam em `/var/tmp/gt06-e2e.*` (pasta 700, arquivos
600, só root; sem segredos; IMEI só mascarado). Com sucesso, o `mqtt.log` (posições = dado pessoal) é apagado e fica só o
`emulator.log`; com falha, o `mqtt.log` fica para o diagnóstico: apague a pasta depois (`rm -rf /var/tmp/gt06-e2e.*`).
O `gt06.sh provision` reinicia o `iot-sim` (se estiver rodando): ele só lê a frota ao iniciar e, sem isso, continuaria
respondendo pelo shadow da moto que virou GT06 (confirmando um lock que o relé não fez). Se provisionar por outro caminho
(`provision-tracker.ts`, SQL), reinicie o `iot-sim` à mão: `docker compose -f deploy/single/compose.yml --env-file
/opt/volti/.env --profile sim restart iot-sim`.

`gt06.sh deprovision moto-0060` (só dev) apaga a linha inteira do `Tracker` relay_only e reinicia o `iot-sim`, que volta a
simular a moto; o dispositivo **continua no Traccar** (a ponte passa a tratá-lo como desconhecido; apague pelo painel do
Traccar se o IMEI não for mais usado). Para economizar memória, `GT06=off` e update.

**Traccar parado em "Waiting for changelog lock"** (primeira subida interrompida no meio da migração Liquibase, p.ex. por OOM
ou restart): com o Traccar parado, libere a trava no banco `traccar` e suba de novo:

```bash
DC="docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env --profile gt06"
$DC stop traccar
echo 'UPDATE databasechangeloglock SET locked=false, lockgranted=null, lockedby=null' | $DC exec -T postgres psql -U volti -d traccar
$DC up -d traccar
```

Saúde da ponte: o contêiner tem HEALTHCHECK (arquivo de vida que só avança com a fila de entrada andando). O Docker **não**
reinicia contêiner `unhealthy` sozinho: confira `docker ps` (coluna STATUS) e, se `unhealthy`, `$DC restart traccar-bridge`.

O `gt06.sh init` também desliga o cadastro aberto do Traccar (`registration:false` pelo `PUT /api/server`): nenhum container
cria usuário sozinho. Se o init falhar, o update segue sem o profile `gt06` (aviso `AVISO: GT06 init falhou`) e a API é
atualizada normalmente.

J16 de bancada (DONO): por padrão a 5023 do Traccar só escuta em 127.0.0.1 da instância (o emulador usa a rede interna).
Para um J16 real, as duas coisas juntas: (1) `cdk deploy` da stack `volti-dev-single` com
`-c gt06Port=true -c gt06Cidrs=<ip-do-chip>/32` ou, reconhecendo que o GT06 não tem TLS e o chip M2M comum não tem faixa
fixa, `-c gt06Port=true -c openGt06=true` (0.0.0.0/0, só bancada; um CIDR `/0` em `gt06Cidrs` é recusado); (2)
`/volti/dev/config/GT06_BIND=0.0.0.0` e update. Depois, `SERVER,0,<ip-da-instância>,5023,0#` por SMS (README da ponte).
Ao terminar, volte `GT06_BIND` (apague o parâmetro) e faça o deploy sem `gt06Port`.

```bash
aws ssm put-parameter --name /volti/dev/config/GT06_BIND --type String --value 0.0.0.0 --tags Key=Projeto,Value=Volti
aws ssm send-command --instance-ids $IID --document-name volti-dev-update --query Command.CommandId --output text
```

Logs: `docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env --profile gt06 logs --tail 50 traccar traccar-bridge gt06-emulator`.

## Correção de dados: posição das motos no galpão

`deploy/single/fix-depot-positions.sh` é idempotente. Ele alinha `lat`/`lng` (e o endereço em cache) de toda moto com `depotId` e status `free` ou `maintenance` à posição do galpão dela. Corrige motos movidas de galpão por SQL sem atualizar a posição. Cada moto corrigida ganha um registro `vehicle.position_fix` no AuditLog, e uma segunda execução não muda nada. Primeiro rode sem gravar (`--dry-run`), depois aplique:

```bash
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/fix-depot-positions.sh --dry-run"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/volti/src/deploy/single/fix-depot-positions.sh"]' --query Command.CommandId --output text)
aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
```

O script precisa do código atualizado na instância: rode o `volti-dev-update` antes.

## Segredos manuais (opcionais)

```bash
aws ssm put-parameter --name /volti/dev/secrets/MERCADOPAGO_ACCESS_TOKEN --type SecureString --key-id alias/volti-dev \
  --value '<token>' --tags Key=Projeto,Value=Volti
```

Depois, rode o update. Só entram no `.env` valores com `A-Z a-z 0-9 . _ : / , @ + = -`; os outros são ignorados com aviso.

**Allowlist:** o `render-env.sh` só aceita nomes conhecidos. Em `/volti/dev/secrets/` são `DB_PASSWORD`, `STATION_QR_SECRET`, `FRAUD_HASH_SECRET`, `PICKUP_CODE_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET` e `MERCADOPAGO_ACCESS_TOKEN`; em `/volti/dev/config/`, os parâmetros da stack mais `IOT_SIM` e `SIM_RIDE_ON_UNLOCK`. Um nome fora da lista (ou em subpasta) não entra no `.env` e aparece no log do update como `ignorado (fora da allowlist ...)`, sem o valor. Para usar um nome novo, inclua-o em `CONFIG_NAMES` ou `SECRET_NAMES` no `render-env.sh`.

`DB_PASSWORD`, `STATION_QR_SECRET`, `FRAUD_HASH_SECRET`, `PICKUP_CODE_SECRET` e `MERCADOPAGO_WEBHOOK_SECRET` nascem sozinhos no primeiro boot, e a instância nunca os sobrescreve. Não troque o `DB_PASSWORD`: o volume do Postgres já foi criado com ele.

## IMDS só para a API

A instância usa IMDSv2 com 2 saltos para o container da API pegar a role (S3, Cognito). Os outros containers ficam sem ela: o `update.sh` roda `deploy/single/imds-guard.sh install`, que põe na chain `DOCKER-USER` um `RETURN` para o IP fixo da API (`172.30.0.10`) e, depois dele, `DROP` para `169.254.169.254`, e instala a unit `volti-imds-guard` (antes do Docker, a cada boot). Para conferir, abra o Session Manager e rode como root:

```bash
iptables -S DOCKER-USER                       # o RETURN do 172.30.0.10 antes do DROP do 169.254.169.254, uma vez cada
systemctl is-enabled volti-imds-guard         # enabled
cd /opt/volti/src && dc() { docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env "$@"; }
dc exec -T api node -e "fetch('http://169.254.169.254/latest/api/token',{method:'PUT',headers:{'X-aws-ec2-metadata-token-ttl-seconds':'60'}}).then(r=>console.log('api',r.status))"
# esperado: api 200
dc exec -T caddy wget -T 3 -qO- http://169.254.169.254/ || echo "caddy sem IMDS (esperado)"
docker run --rm alpine wget -T 3 -qO- http://169.254.169.254/ || echo "bridge padrão sem IMDS (esperado)"
```

## Apontar os apps

- **API:** `https://api-volti-dev.prestarecondominios.com.br`, um nome fixo; o IP muda a cada partida e o DNS acompanha, com TTL de 60 s. Os apps Flutter usam `--dart-define=API_BASE_URL=https://api-volti-dev.prestarecondominios.com.br` e os IDs do Cognito de `/volti/dev/config/COGNITO_*`.
- **Painel:** o `volti-dev-admin` embute a URL da API e o Hosted UI do pool interno.
- **Horário:** fora do horário (23:00–07:00) a API fica fora do ar. No desligamento, o `volti-dns` (ExecStop, ainda com rede) estaciona o registro em `192.0.2.1` (TEST-NET-1, não roteável); no boot, aponta de novo para o IP novo. Assim o nome nunca fica apontando para um IP liberado, que a AWS pode entregar a outra conta. A parada da agenda é um desligamento limpo, então o ExecStop roda.
- **Risco residual:** numa falha brusca (pane do host, terminate forçado, desligamento sem systemd), o ExecStop não roda e o registro fica com o IP antigo até o próximo boot ou até alguém corrigir à mão. Na dúvida, rode `aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript --parameters commands='bash /opt/volti/src/deploy/single/dns.sh down'` antes de parar a instância manualmente, ou corrija o registro pelo console do Route 53 (só o `api-volti-dev`).

## Desmontar

```bash
pnpm exec cdk destroy --all --toolkit-stack-name volti-cdk-toolkit -c env=dev -c profile=single -c account=$ACCOUNT
```

Ficam para trás, por `RETAIN`: os buckets, a chave KMS e o pool de staff.

O registro DNS foi criado pela instância e **não** pelo CloudFormation. Apague só ele, informando o IP que estiver no registro:

```bash
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID \
  --query "ResourceRecordSets[?Name=='$API_DOMAIN.' && Type=='A']"
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch \
  '{"Changes":[{"Action":"DELETE","ResourceRecordSet":{"Name":"'$API_DOMAIN'","Type":"A","TTL":60,"ResourceRecords":[{"Value":"<IP do registro>"}]}}]}'
```
