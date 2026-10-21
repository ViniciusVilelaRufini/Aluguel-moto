<!-- Extraído de "Aluguel de motos elétricas — funções e arquitetura AWS.docx". -->

# Aluguel de motos elétricas — funções e arquitetura AWS

Oct 21, 2026 · @Vinicius Vilela Rufini

O sistema tem três aplicações (app do cliente, app do operador de campo e painel web do admin) sobre um backend na AWS, região São Paulo (sa-east-1), conectado aos rastreadores das motos via AWS IoT Core.

## App do cliente

O app cobre a jornada inteira do aluguel, do cadastro ao recibo, para Android e iOS.

### Cadastro e verificação
- Login com e-mail/telefone, Google ou Apple, com código por SMS.
- Validação de CPF, foto do documento e selfie com prova de vida (comparação facial).
- Checagem de idade mínima (18+) e aceite dos termos de uso, da política de privacidade e do consentimento de localização.
- Cadastro de cartão (tokenizado pelo gateway) e chave Pix para estornos.

### Encontrar e reservar
- Mapa com as motos disponíveis, % de bateria e autonomia estimada em km.
- Filtro por autonomia e por ponto de retirada.
- Reserva por 10 a 15 minutos (gratuita ou com taxa pequena), com rota a pé até a moto.
- Botão "tocar buzina/piscar farol" para achar a moto na rua.
- Destravar pelo QR code do guidão ou pelo número da moto.

### Plano, seguro e pagamento
- Escolha do plano: por minuto, hora, dia, semanal ou mensal.
- Escolha do seguro: básico (obrigatório) ou completo, mostrando as coberturas de cada um.
- Resumo do valor antes de confirmar, com caução por pré-autorização no cartão ou depósito via Pix.
- Carteira de créditos com recarga e pacotes de minutos com desconto.
- Cupons e indicação de amigos.

### Durante o aluguel
- Painel com tempo decorrido, custo acumulado, bateria e velocidade.
- Aviso de zona: ao entrar em calçada ou ciclovia, mostra o novo limite (a moto reduz sozinha via rastreador); perto do limite da área de operação, alerta antes de bloquear.
- Pausa: trava a moto temporariamente (ex.: entrar numa loja) com tarifa reduzida.
- Botão SOS: liga para o suporte e compartilha a localização em tempo real com um contato.
- Detecção de queda pelo acelerômetro: o app pergunta "você está bem?" e, sem resposta, aciona o suporte.
- Reportar problema (pneu, freio, bateria) com troca para outra moto sem nova taxa.

### Devolução
- Mapa dos pontos de devolução permitidos; fora deles o app não deixa encerrar ou cobra taxa.
- Foto obrigatória da moto estacionada.
- Encerramento confirmado só depois que o rastreador confirma que a moto está parada e travada.
- Recibo detalhado na hora com trajeto, tempo, valor e seguro.

### Pós-aluguel e conta
- Histórico de viagens com trajeto no mapa e nota fiscal/recibo.
- Avaliação da moto e da viagem.
- Contestação de cobrança e abertura de sinistro (com fotos e boletim de ocorrência).
- Gestão do plano semanal/mensal: próxima cobrança, pausar e cancelar.
- Chat de suporte, central de ajuda e regras de trânsito para autopropelidos.
- Excluir conta e baixar os próprios dados (exigência da LGPD).

### Plano semanal para entregadores
- Moto fixa por período, cobrança recorrente automática.
- Estações de troca de bateria no mapa e agendamento de manutenção.

## App do operador de campo

Um app separado (ou um perfil no mesmo app) para a equipe que mantém a frota rodando.
- Lista de tarefas: recolher moto, trocar bateria, levar para manutenção, reposicionar.
- Destravar qualquer moto em modo serviço, sem cobrança.
- Checklist de inspeção (freio, pneu, luzes, campainha, limitador de velocidade) com fotos.
- Registro de troca de bateria, vinculando o número de série da bateria à moto.

## Painel web do admin

O painel concentra rastreio em tempo real, bloqueio remoto, regras de área e a gestão de clientes e finanças.

Perfis de acesso: administrador, operação, financeiro e suporte, cada um vendo só o que precisa. Todo login no painel usa autenticação em dois fatores.

### Frota e rastreio
- Mapa ao vivo com filtro por status (livre, alugada, reservada, pausada, bloqueada, manutenção, sem sinal).
- Ficha de cada moto: posição, bateria, velocidade, último sinal, sinal GPS/4G, histórico de aluguéis e de manutenção.
- Replay de trajeto por período ou por aluguel.
- Comandos remotos: bloquear, desbloquear, buzina, limitar velocidade e modo "roubada" (bloqueio + envio de posição em alta frequência).
- Log de auditoria: quem bloqueou qual moto, quando e por quê.

### Cercas e regras
- Desenhar no mapa a área de operação, pontos de devolução, zonas proibidas e zonas de velocidade reduzida.
- Regras automáticas, por exemplo: saiu da área → alerta e, após X minutos, redução gradual e bloqueio.

### Alertas
- Moto em movimento sem aluguel.
- Rastreador desconectado ou violado.
- Queda detectada.
- Bateria crítica.
- Aluguel muito longo ou moto parada há muito tempo fora do ponto.

### Clientes e operação
- Busca de clientes, status da verificação, bloqueio de conta e lista de restrição por fraude.
- Atendimento: chat, sinistros, contestações e estornos.
- Tarefas do operador de campo e manutenção preventiva por km/horas de uso.

### Financeiro e relatórios
- Receita por dia, plano e moto; inadimplência; cauções retidas e repasses de seguro.
- Configuração de preços, planos, cupons e taxas.
- Indicadores: taxa de ocupação, receita por moto/dia, tempo médio de aluguel e mapa de calor de demanda.

## Arquitetura na AWS

Tudo roda na região São Paulo (sa-east-1), com menor latência e mais simples para a LGPD; o Amazon Location Service, usado para cercas e rastreio, está disponível nessa região (AWS).

arquitetura na AWS · apps, serviços e rastreador

Os apps nunca falam direto com a moto: todo comando passa pela API, que grava a auditoria e envia o estado desejado ao IoT Core.

### Papel de cada serviço

Serviço

Para quê

ECS Fargate + Application Load Balancer

Roda a API (NestJS) sem gerenciar servidor e escala sozinho; WebSocket para o mapa ao vivo

Cognito

Dois grupos de usuários: clientes e equipe interna (com MFA obrigatório)

RDS PostgreSQL (com PostGIS)

Clientes, motos, aluguéis, pagamentos, contratos e auditoria

ElastiCache Redis

Última posição e status de cada moto, reservas com tempo de expiração

DynamoDB (opcional)

Pontos de trajeto em alto volume, com expiração automática (TTL) para a retenção da LGPD

S3

Fotos de devolução, documentos do cadastro (criptografados), relatórios

AWS IoT Core

Conexão MQTT segura com cada rastreador; o device shadow guarda o estado desejado mesmo com a moto sem sinal

Amazon Location Service

Mapas, cercas virtuais e eventos de entrada/saída de área

SQS + EventBridge

Webhooks de pagamento, alertas e tarefas assíncronas sem perder eventos

Lambda

Funções pequenas: processar webhooks, gerar recibos, rotinas noturnas

Rekognition

Comparação facial e prova de vida no cadastro

CloudFront + S3 + WAF

Hospedagem do painel e proteção contra ataques

Secrets Manager + KMS

Chaves do gateway e da seguradora, criptografia de dados sensíveis

CloudWatch

Logs, métricas e alarmes (ex.: muitas motos sem sinal ao mesmo tempo)

Notificações push: Firebase Cloud Messaging, chamado pela API.

### Como funciona um bloqueio pelo painel
- O admin clica em "bloquear"; a API registra no log de auditoria.
- A API atualiza o estado desejado no device shadow do IoT Core.
- O rastreador recebe o comando por MQTT. Com a moto andando, reduz a potência gradualmente e só trava abaixo de ~3 km/h.
- O rastreador confirma o novo estado; uma regra do IoT Core avisa a API.
- A API atualiza o Redis e o painel mostra a moto bloqueada em tempo real.

Sem sinal, o comando fica pendente no shadow e é aplicado assim que a moto reconectar.

### Escolha do rastreador

O IoT Core exige MQTT com TLS e certificado por dispositivo. Muitos rastreadores baratos usam protocolos próprios via TCP (tipo GT06), que não conectam direto; nesse caso, roda-se o Traccar num container no ECS atrás de um Network Load Balancer, traduzindo para a API. Escolher o hardware antes de fechar essa parte.

### Boas práticas desde o início
- Infraestrutura como código (AWS CDK ou Terraform) e ambientes separados de teste e produção.
- CI/CD com GitHub Actions publicando no ECS.
- Banco em rede privada, sem acesso público; backups automáticos ativados.
- Alerta de orçamento no AWS Budgets. Para o MVP, uma instância pequena de RDS, um Redis pequeno e 1 a 2 tarefas Fargate seguram dezenas de motos.

## Fontes
- Amazon Location Service endpoints and quotas — AWS
