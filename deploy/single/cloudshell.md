# Volti dev em uma instância: primeiro deploy pelo AWS CloudShell

Nada roda no seu PC: tudo é feito no **AWS CloudShell** (console da AWS, região **São Paulo / sa-east-1**, ícone `>_` no topo). O CloudShell já tem `aws`, `git`, `node` e `npm` com as suas credenciais do console. O deploy não usa Docker (a imagem da API é construída na própria instância).

Tudo o que a stack cria leva a tag `Projeto=Volti` e nomes começando por `volti-` (a conta também roda outro projeto). O bootstrap do CDK usa um toolkit próprio (`volti-cdk-toolkit`, qualifier `volti`), separado do que o outro projeto possa ter.

## 0. Variáveis da sessão

```bash
export AWS_REGION=sa-east-1 AWS_DEFAULT_REGION=sa-east-1
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export BRANCH=feat/galpao                    # branch que a instância vai rodar
export BUDGET_EMAIL=voce@exemplo.com         # e-mail dos alertas do orçamento
```

## 1. Chave de deploy do GitHub (somente leitura)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/volti_deploy -N "" -C volti-dev-deploy
cat ~/.ssh/volti_deploy.pub
```

No GitHub: repositório `ViniciusVilelaRufini/Aluguel-moto` → Settings → Deploy keys → Add deploy key → cole a chave pública, **sem** marcar "Allow write access".

Guarde a parte privada no Parameter Store (SecureString, chave `aws/ssm`, grátis). A instância lê só este parâmetro; a stack nunca o cria:

```bash
aws ssm put-parameter --name /volti/dev/github-deploy-key --type SecureString \
  --value "$(cat ~/.ssh/volti_deploy)" --tags Key=Projeto,Value=Volti
```

## 2. Código e dependências do `infra` (só ele)

```bash
cd ~
GIT_SSH_COMMAND="ssh -i ~/.ssh/volti_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  git clone --depth 1 --branch "$BRANCH" git@github.com:ViniciusVilelaRufini/Aluguel-moto.git volti
cd ~/volti
sudo npm install -g pnpm@9.15.9
pnpm install --frozen-lockfile --filter infra
cd infra
```

O home do CloudShell tem 1 GB persistente. Se faltar espaço, clone em `/tmp` (some ao fechar a sessão, sem problema: o código fica no GitHub).

## 3. Bootstrap do CDK (uma vez por conta/região)

```bash
pnpm exec cdk bootstrap aws://$ACCOUNT/sa-east-1 \
  --qualifier volti --toolkit-stack-name volti-cdk-toolkit --tags Projeto=Volti
```

## 4. Deploy

Confira antes que existe a VPC padrão em sa-east-1 (`aws ec2 describe-vpcs --filters Name=isDefault,Values=true`; se não existir: `aws ec2 create-default-vpc`).

```bash
pnpm exec cdk deploy --all --require-approval never --toolkit-stack-name volti-cdk-toolkit \
  -c env=dev -c profile=single -c account=$ACCOUNT \
  -c branch=$BRANCH -c budgetEmail=$BUDGET_EMAIL
```

Contexto opcional: `-c domainName=seudominio.com.br` (a API passa a responder em `api.<domínio>`; crie o registro DNS `A api` → IP público da instância antes do update), `-c adminCertificateArn=<ACM us-east-1>` (painel em `admin.<domínio>`), `-c instanceType=t4g.small`, `-c rootVolumeGb=25`, `-c repoUrl=...`.

Cria 3 stacks: `volti-dev-admin-web` (S3 + CloudFront do painel), `volti-dev-auth` (Cognito) e `volti-dev-single` (instância, buckets, parâmetros, documentos SSM, snapshots e orçamento). Confirme a inscrição no e-mail que a AWS Budgets enviar.

## 5. Primeiro boot (automático, ~15 min)

O user data instala Docker + Compose + git, cria 2 GB de swap, lê a chave do SSM, clona a branch e roda `deploy/single/update.sh` (gera os segredos em `/volti/dev/secrets/*`, monta `/opt/volti/.env`, constrói a API e o PostGIS, roda `prisma migrate deploy` e sobe tudo). Acompanhe pelo Session Manager (EC2 → instância `volti-dev-single` → Connect → Session Manager):

```bash
sudo tail -f /var/log/volti-boot.log
```

No fim aparece `API em https://<ip-com-hifens>.sslip.io`. Teste: `curl https://<host>/health`.

Ou pelo CloudShell:

```bash
IID=$(aws ec2 describe-instances --filters Name=tag:Name,Values=volti-dev-single Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 describe-instances --instance-ids $IID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

## 6. Seed (uma vez) e painel

```bash
aws ssm send-command --instance-ids $IID --document-name volti-dev-seed --query Command.CommandId --output text
aws ssm send-command --instance-ids $IID --document-name volti-dev-admin --query Command.CommandId --output text
# resultado: aws ssm list-command-invocations --command-id <id> --details --query 'CommandInvocations[0].Status'
```

O painel fica em `https://<distribuição>.cloudfront.net` (`aws ssm get-parameter --name /volti/dev/config/ADMIN_ORIGIN --query Parameter.Value --output text`). Crie o primeiro usuário do pool interno (`volti-dev-staff`) no console do Cognito, coloque-o no grupo `admin` e configure o TOTP no primeiro login.

## 7. Tag de alocação de custo (para o orçamento filtrar)

A tag `Projeto` só aparece no Billing até 24 h depois de existir em algum recurso. Depois disso:

```bash
aws ce update-cost-allocation-tags-status --cost-allocation-tags-status TagKey=Projeto,Status=Active
```

Até ativar, o orçamento `volti-dev-single-monthly` fica em US$ 0 (o filtro não casa com nada).

## Atualizações depois

Console → Systems Manager → Run Command → `volti-dev-update` → alvo: a instância `volti-dev-single` → Run. Ou:

```bash
aws ssm send-command --instance-ids $IID --document-name volti-dev-update
```

Para o painel, `volti-dev-admin`. Para mudar a infra (outra branch, outro tipo de instância), repita o passo 4 com os novos `-c`. O user data só roda no primeiro boot: trocar de branch numa instância já criada = editar `VOLTI_BRANCH` em `/etc/volti/instance.env` pelo Session Manager e rodar o update.

## Segredos manuais (opcionais)

```bash
aws ssm put-parameter --name /volti/dev/secrets/MERCADOPAGO_ACCESS_TOKEN --type SecureString --value '<token>' --tags Key=Projeto,Value=Volti
```

Rode o update depois. `DB_PASSWORD`, `STATION_QR_SECRET`, `FRAUD_HASH_SECRET`, `PICKUP_CODE_SECRET` e `MERCADOPAGO_WEBHOOK_SECRET` nascem sozinhos no primeiro boot; não troque `DB_PASSWORD` (o volume do Postgres já foi criado com ela).

## Apontar os apps

- API: `https://<ip-com-hifens>.sslip.io` (ou `https://api.<domínio>`). O IP muda se a instância for **parada e iniciada** (reboot não muda): rode o update, que reemite o certificado para o novo nome, e reaponte os apps. Para um endereço fixo, use um domínio (`-c domainName`) ou um Elastic IP (custa o mesmo que o IP público, US$ 3,65/mês, e não está na stack).
- App do cliente/operador (Flutter): `--dart-define=API_BASE_URL=https://<host>` e os IDs do Cognito (`/volti/dev/config/COGNITO_*` e `/volti/dev/cognito/*`).
- Painel: o `volti-dev-admin` já embute a URL da API e o Hosted UI do pool interno.
