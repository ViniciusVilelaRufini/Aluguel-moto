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

`DB_PASSWORD`, `STATION_QR_SECRET`, `FRAUD_HASH_SECRET`, `PICKUP_CODE_SECRET` e `MERCADOPAGO_WEBHOOK_SECRET` nascem sozinhos no primeiro boot, e a instância nunca os sobrescreve. Não troque o `DB_PASSWORD`: o volume do Postgres já foi criado com ele.

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
