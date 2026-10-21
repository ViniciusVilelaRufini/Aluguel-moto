<!-- Extraído de "Prompts para agentes.docx" com os colchetes preenchidos (ver spec). -->

# Prompts para agentes

Oito prompts, um por área, que partem do mesmo contexto base e do mesmo contrato de API, para que os agentes trabalhem em paralelo sem divergir.

## Como usar

Rode os agentes em quatro fases: o contrato da API sai primeiro e, a partir dele, as integrações e as interfaces são construídas em paralelo.

ordem dos agentes · 4 fases

Cada fase só começa depois que você revisa e faz merge da anterior.
- Salve o contexto base como CLAUDE.md na raiz do repositório. Em outra ferramenta, cole-o antes de cada prompt.
- Preencha os colchetes: nome do app, cidade, gateway, prazo de retenção dos trajetos, valores de alerta.
- Rode o agente 2 até o openapi.yaml ficar pronto e revise-o você mesmo; o agente 1 pode rodar junto.
- Rode os agentes 3 e 4 em paralelo e, depois, os agentes 5, 6 e 7, cada um na sua branch.
- Por último, rode o agente 8 numa sessão nova.

Peça a cada agente um plano antes do código e aprove mudanças no contrato pessoalmente.

## Contexto base

Todo agente recebe este texto primeiro. O mais prático é salvá-lo como CLAUDE.md (ou AGENTS.md) na raiz do repositório, que o Claude Code lê sozinho; trechos entre colchetes são para você preencher.

```text
Você é um engenheiro de software sênior no projeto "Volti", uma plataforma de aluguel de motos elétricas no Brasil.

PRODUTO
- Clientes alugam motos elétricas por minuto, hora, dia, semana ou mês, com seguro, pelo app.
- Cada moto tem um rastreador (GPS + 4G + relé/controlador) que permite rastrear, limitar velocidade e bloquear remotamente.
- Um painel web permite ao admin ver a frota em tempo real, bloquear/desbloquear, gerenciar cercas, clientes e finanças.
- Operadores de campo usam um app para trocar baterias, recolher e inspecionar motos.

RESTRIÇÕES (NÃO NEGOCIÁVEIS)
- As motos são equipamentos autopropelidos (Resolução Contran 996/2023): até 1.000 W e até 32 km/h, sem placa e sem CNH. O software nunca pode permitir ultrapassar esses limites.
- Limites por zona: 6 km/h em áreas de pedestres, 20 km/h em ciclovias.
- Segurança física: nunca cortar o motor com a moto em movimento. Bloquear = reduzir a potência gradualmente e travar só abaixo de 3 km/h.
- LGPD: localização é dado pessoal. Rastrear o cliente só durante o aluguel e com consentimento; trajetos expiram após 90 dias; o cliente pode exportar e excluir seus dados.
- Dados de cartão nunca passam pelo backend (só tokens do gateway).

ARQUITETURA (AWS, região sa-east-1)
- API: NestJS (TypeScript) em ECS Fargate atrás de ALB; WebSocket para tempo real.
- Banco: RDS PostgreSQL 16 com PostGIS (ORM Prisma); ElastiCache Redis para estado ao vivo; S3 para arquivos.
- Auth: Cognito. Pool de clientes; pool interno com MFA e grupos admin, operacao, financeiro, suporte, campo.
- IoT: AWS IoT Core (MQTT/TLS, certificado X.509 por rastreador, device shadow); Amazon Location Service para cercas.
- Eventos: SQS + EventBridge; Lambda para tarefas pequenas.
- Infra como código: AWS CDK em TypeScript.
- Apps móveis: Flutter. Painel: Next.js + TypeScript + Tailwind + MapLibre.

MONOREPO
/infra                 CDK
/services/api          NestJS
/services/iot-sim      simulador de rastreador
/apps/cliente          Flutter
/apps/operador         Flutter
/apps/admin            Next.js
/packages/contracts    OpenAPI 3.1 + schemas MQTT (fonte única da verdade)
/docs                  decisões e ADRs

CONVENÇÕES
- O contrato em /packages/contracts é a fonte da verdade. Não invente endpoints: se precisar de um novo, proponha a mudança no contrato e registre em /docs/decisoes.md.
- Código e nomes em inglês; textos de interface em português do Brasil.
- Dinheiro em centavos (inteiro); datas em UTC ISO 8601; exibição no fuso America/Sao_Paulo.
- Nenhum segredo no código (Secrets Manager ou variáveis de ambiente).
- Logs estruturados em JSON, sem dados pessoais.

DEFINIÇÃO DE PRONTO
- Compila, lint sem erros, testes passando, README da pasta atualizado.
- Ao terminar, entregue: resumo do que foi feito, como rodar localmente, testes executados e pendências.
```


## Agente 1 — Infraestrutura AWS

Cria toda a base na AWS; pode rodar ao mesmo tempo que o agente 2.

```text
TAREFA: infraestrutura AWS em /infra com AWS CDK (TypeScript), stacks parametrizadas por ambiente (dev, prod).

1. Rede: VPC com subnets públicas e privadas em 2 AZs; 1 NAT gateway em dev.
2. Dados: RDS PostgreSQL 16 em subnet privada (PostGIS habilitável), backups automáticos, criptografia KMS; ElastiCache Redis; buckets S3 privados (documentos-kyc criptografado, fotos-devolucao, relatorios) com bloqueio de acesso público e regras de ciclo de vida.
3. Auth: dois Cognito User Pools (clientes; interno com MFA obrigatório e grupos admin, operacao, financeiro, suporte, campo).
4. API: cluster ECS Fargate + ALB com HTTPS (ACM), auto scaling por CPU, health check em /health, imagem de /services/api, segredos via Secrets Manager.
5. IoT: thing type "moto"; política de menor privilégio (cada rastreador só publica e assina em motos/{thingName}/...); regras do IoT Core enviando telemetria para SQS e eventos de estado para EventBridge; Amazon Location com tracker e geofence collection.
6. Mensageria: filas SQS (telemetria, pagamentos-webhook, alertas), cada uma com DLQ.
7. Painel: S3 + CloudFront com OAC e WAF (regras gerenciadas).
8. Observabilidade: log groups com retenção, alarmes CloudWatch (5xx da API, mensagens na DLQ, CPU do RDS) e AWS Budgets com alerta em US$ 100/mês (dev).

REQUISITOS
- Região sa-east-1, tags padrão (projeto, ambiente).
- Publique nomes e ARNs que os outros serviços usam em SSM Parameter Store e documente em /infra/README.md.
- Testes de assertions do CDK.
- GitHub Actions: cdk synth + diff em pull request; deploy em dev no merge para main, com credenciais via OIDC (sem chaves fixas).
- Inclua uma estimativa aproximada de custo mensal do ambiente dev.

FORA DO ESCOPO: código da API e dos apps.
```


## Agente 2 — Backend, API e banco

É o agente mais importante: o contrato que ele escreve primeiro destrava todos os outros.

```text
TAREFA: API principal em /services/api (NestJS + Prisma + PostgreSQL/PostGIS + Redis).

1. CONTRATO PRIMEIRO: escreva /packages/contracts/openapi.yaml cobrindo todos os módulos abaixo e gere clientes tipados para TypeScript (painel) e Dart (apps). Só depois implemente.

2. MODELO DE DADOS (Prisma + migrações): Customer (status de verificação), StaffUser, Vehicle (número, QR, status, bateria, modelo, thingName), Tracker, Battery, Zone (geometria PostGIS; tipos operacao, devolucao, proibida, velocidade_reduzida com limite), PricingPlan, Coupon, Reservation, Rental, RentalEvent (pausa, alerta, troca), Payment, Deposit (caução), InsurancePolicy, Incident/Claim, MaintenanceTask, FieldTask, AuditLog.

3. MÓDULOS
- auth: valida JWT do Cognito; guards por grupo.
- kyc: upload pré-assinado no S3; provedor de KYC atrás de uma interface (adaptador mock); regra de 18+.
- vehicles: motos próximas (PostGIS: raio e autonomia), ficha da moto.
- reservations: reserva com expiração em Redis (TTL), uma por cliente.
- rentals: iniciar (exige KYC aprovado, caução e seguro; pede desbloqueio ao módulo IoT), pausar, retomar, encerrar (só em zona de devolução, com foto e confirmação do rastreador de "parada e travada"); cálculo de preço por plano.
- pricing: planos, taxas e cupons configuráveis pelo admin.
- commands: bloquear, desbloquear, buzina, limitar velocidade, modo roubada. Sempre grava AuditLog (quem, quando, motivo) e delega ao módulo IoT.
- realtime: WebSocket com salas por perfil (admin vê a frota; cliente só a própria moto durante o aluguel).
- alerts: consome eventos do SQS/EventBridge e gera alertas.
- support: incidentes, contestações e sinistros.
- reports: receita, ocupação, receita por moto/dia.
- lgpd: exportar dados do cliente, excluir/anonimizar conta, job de expiração de trajetos.

4. REGRAS TRANSVERSAIS: Idempotency-Key no início de aluguel e em pagamentos; paginação; validação de entrada; erros no padrão RFC 7807; rate limiting.

5. DEV LOCAL: Docker Compose (Postgres+PostGIS, Redis, LocalStack opcional) e seed com motos e zonas fictícias em São Paulo.

6. TESTES: unitários das regras de preço e de encerramento; e2e do fluxo reservar → iniciar → pausar → encerrar.

FORA DO ESCOPO: MQTT real (use a interface IotGateway, implementada pelo agente de IoT) e gateway de pagamento real (interface PaymentProvider, implementada pelo agente de pagamentos).
```


## Agente 3 — IoT, rastreio e cercas

Implementa a ponte entre a API e as motos, mais um simulador para testar tudo sem hardware.

```text
TAREFA: camada de rastreio e comandos (módulo iot em /services/api) e simulador em /services/iot-sim.

1. CONTRATO MQTT em /packages/contracts/mqtt.md + JSON Schemas:
- motos/{thingName}/telemetria: a cada 5 s em aluguel e 60 s parada; lat, lng, velocidade_kmh, bateria_pct, travada, ignicao, sinal, timestamp.
- motos/{thingName}/eventos: queda, violacao, bateria_critica, movimento_sem_aluguel.
- Device shadow: desired {travada, limite_kmh, modo_roubada}; reported com os mesmos campos + versão de firmware.

2. IotGateway (interface definida pelo backend): grava o estado desejado no shadow via AWS IoT Data Plane e aguarda a confirmação (reported) com timeout. Moto offline = comando pendente, aplicado ao reconectar.

3. TELEMETRIA: consumidor da fila SQS atualiza Redis (última posição e status), envia a posição ao tracker do Amazon Location, grava o trajeto com o TTL da LGPD e publica no WebSocket.

4. CERCAS: sincroniza as zonas do banco com a geofence collection do Amazon Location. Eventos ENTER/EXIT: zona de velocidade reduzida → ajusta limite_kmh; saída da área de operação → alerta ao cliente e, após 5 minutos, bloqueio seguro.

5. BLOQUEIO SEGURO (crítico, com testes): se a velocidade for maior que 3 km/h, reduz o limite progressivamente até a moto parar e só então trava. Documente o comportamento esperado do firmware e cubra o lado do servidor com testes.

6. PROVISIONAMENTO: script para cadastrar um rastreador novo (thing, certificado X.509, política e vínculo com o Vehicle).

7. SIMULADOR (TypeScript): N motos virtuais conectadas via MQTT, rodando rotas em São Paulo, obedecendo ao shadow e gerando eventos configuráveis. Serve para demo do painel e teste de carga.

8. ADR em /docs/adr-rastreador.md: se o hardware escolhido não suportar MQTT/TLS com certificado, a alternativa é Traccar em ECS atrás de NLB, traduzindo para os mesmos tópicos e eventos.

FORA DO ESCOPO: firmware do rastreador.
```


## Agente 4 — Pagamentos, caução e seguro

Cuida de todo o dinheiro do sistema, com idempotência para nunca cobrar duas vezes.

```text
TAREFA: módulos payments e insurance em /services/api.

1. Interface PaymentProvider: criar cliente; receber token de cartão (tokenizado no app pelo SDK do gateway); pré-autorizar (caução); capturar; cancelar pré-autorização; cobrar; estornar; gerar Pix (QR + copia e cola, com expiração); assinatura recorrente para planos semanal e mensal.

2. Adaptador real para Mercado Pago + adaptador fake para dev e testes.

3. WEBHOOKS: endpoint público que valida a assinatura, enfileira no SQS e processa de forma idempotente (o mesmo evento recebido duas vezes não gera dois efeitos). Documente a máquina de estados de Payment.

4. FLUXO DO ALUGUEL: no início, pré-autoriza a caução no cartão ou exige Pix de caução. No encerramento, calcula o valor (plano, cupons, taxa de devolução fora do ponto), captura e libera o restante. Falha de cobrança → cliente inadimplente, sem novos aluguéis.

5. CARTEIRA: créditos e pacotes de minutos registrados em tabela de lançamentos (ledger), nunca saldo editado diretamente.

6. SEGURO: interface InsuranceProvider (cotar, emitir apólice por aluguel ou período, cancelar, abrir sinistro) com adaptador mock. Plano básico obrigatório e completo, coberturas configuráveis; valor somado ao aluguel e repasse registrado.

7. Recibos em PDF no S3; emissão de nota fiscal (NFS-e) atrás de uma interface.

8. Dados para o financeiro do painel: receita por período e plano, cauções retidas, inadimplência, repasses de seguro.

9. TESTES de todas as transições de estado e de idempotência.

REGRAS: valores em centavos; nunca armazenar número de cartão; segredos no Secrets Manager. A venda do seguro é feita por seguradora registrada na SUSEP; o sistema só intermedia via API do parceiro.
```


## Agente 5 — App do cliente

Pode começar assim que o contrato da API existir, usando um mock server gerado dele.

```text
TAREFA: app do cliente em /apps/cliente (Flutter, Android e iOS).

Use o cliente Dart gerado de /packages/contracts. Arquitetura feature-first com Riverpod e go_router; testes de widget.

TELAS E FUNÇÕES
1. Onboarding: login (e-mail ou telefone com código, Google, Apple) via Cognito; foto do documento e selfie com prova de vida (upload pré-assinado); aceite de termos e consentimento de localização; tela de status da verificação.
2. Mapa: motos próximas com bateria e autonomia; filtros; pontos de devolução e zonas; reserva de 10 a 15 min com contagem regressiva e rota a pé; botão buzina/piscar.
3. Destravar: leitor de QR code ou número da moto.
4. Contratação: escolha de plano e de seguro (com coberturas), resumo de valores, caução (cartão pelo SDK do gateway ou Pix), cupons, carteira de créditos.
5. Em aluguel: tempo, custo, bateria e velocidade em tempo real (WebSocket); avisos de zona e de saída da área; pausar e retomar; SOS (ligar para o suporte e compartilhar localização com um contato); pergunta "você está bem?" ao receber evento de queda; reportar problema e trocar de moto.
6. Encerrar: só em ponto de devolução, foto obrigatória, aguarda confirmação de "travada"; recibo com trajeto.
7. Conta: histórico com mapa, recibos, avaliação, contestação, abertura de sinistro, gestão do plano semanal/mensal, chat de suporte, central de ajuda com regras de trânsito para autopropelidos, exportar e excluir dados.
8. Notificações push via Firebase Cloud Messaging.

REQUISITOS
- Localização em segundo plano só durante aluguel ativo.
- Funciona com rede instável: retentativas e estados claros de carregamento e erro.
- Acessibilidade (tamanho de fonte, leitor de tela) e modo escuro.
- Textos em pt-BR centralizados em arquivos de tradução.
- Entregue um fluxo navegável apontando para o backend de dev ou para um mock server gerado do OpenAPI.
```


## Agente 6 — Painel web do admin

Roda em paralelo com os apps; para demonstrar o mapa ao vivo, use o simulador do agente 3.

```text
TAREFA: painel em /apps/admin (Next.js App Router, TypeScript, Tailwind, MapLibre GL, TanStack Query).

Login pelo Cognito interno com MFA; menus e ações conforme o grupo (admin, operacao, financeiro, suporte).

PÁGINAS
1. Dashboard: ocupação, receita do dia, motos por status, mapa de calor de demanda.
2. Mapa da frota ao vivo (WebSocket): motos coloridas por status, filtros, agrupamento em zoom baixo; clique abre a ficha.
3. Ficha da moto: posição, bateria, velocidade, último sinal, histórico de aluguéis e manutenção; replay de trajeto com linha do tempo; comandos (bloquear, desbloquear, buzina, limitar velocidade, modo roubada) com confirmação, motivo obrigatório e estado do comando (pendente, confirmado, moto offline).
4. Cercas: desenhar, editar e excluir polígonos (operação, devolução, proibida, velocidade reduzida com limite), com validação.
5. Alertas: fila em tempo real por prioridade; atribuir, resolver, ir para a moto.
6. Clientes: busca, ficha (verificação, aluguéis, pagamentos), bloqueio de conta, lista de restrição.
7. Aluguéis: lista com filtros, detalhe com eventos, encerramento forçado com motivo, estornos.
8. Suporte: chat, contestações e sinistros.
9. Operação de campo: criar e atribuir tarefas, manutenção preventiva.
10. Financeiro: receita, cauções, inadimplência, repasses de seguro, exportação CSV.
11. Configurações: planos, preços, cupons, taxas, usuários internos e permissões.
12. Auditoria: log de todos os comandos e alterações sensíveis.

REQUISITOS
- Mostrar só os dados pessoais que o perfil precisa.
- Tabelas com paginação no servidor; layout responsivo até tablet.
- Testes Playwright dos fluxos de bloqueio e de cercas.
- Build estático (output: 'export') compatível com o S3 + CloudFront definido em /infra.
```


## Agente 7 — App do operador de campo

O menor dos apps; reaproveita os pacotes comuns do app do cliente.

```text
TAREFA: app do operador em /apps/operador (Flutter), reaproveitando pacotes comuns com /apps/cliente quando fizer sentido.

Login pelo Cognito interno (grupo campo).

1. Lista e mapa das tarefas atribuídas (recolher, trocar bateria, manutenção, reposicionar), com prioridade e rota.
2. Destravar em modo serviço, sem cobrança, registrado na auditoria.
3. Checklist de inspeção: freio, pneus, luzes, campainha e limitador de velocidade (confirmar que a velocidade máxima configurada é no máximo 32 km/h), com fotos e observações.
4. Troca de bateria: ler o número de série (QR ou código de barras) da bateria retirada e da instalada.
5. Mudar o status da moto (manutenção ou disponível) e concluir a tarefa.
6. Modo offline: salvar checklists sem rede e sincronizar depois.

REQUISITOS: testes de widget dos fluxos de checklist e troca de bateria; textos em pt-BR.
```


## Agente 8 — Integração, QA e segurança

Roda por último, de preferência numa sessão nova, para revisar o trabalho dos outros com olhar de fora.

```text
TAREFA: integração, qualidade e segurança. Você revisa e testa; não reescreve módulos inteiros.

1. Suba o ambiente completo localmente (Docker Compose + simulador com 50 motos) e execute ponta a ponta:
- Cliente: cadastro → verificação → reserva → caução → desbloqueio → corrida com troca de zona → saída da área → retorno → encerramento → recibo.
- Admin: bloquear moto em movimento (verificar que só trava abaixo de 3 km/h), comando para moto offline, criação de cerca nova.
2. Escreva os testes e2e que faltarem e um teste de carga com k6: 500 motos enviando telemetria e 200 clientes simultâneos.
3. Contrato: compare a API implementada, o openapi.yaml e os clientes gerados.
4. Segurança: OWASP API Top 10, permissões por grupo, políticas IoT de menor privilégio, segredos, buckets privados, assinatura dos webhooks.
5. LGPD: consentimento, minimização de dados, retenção de trajetos, exportação e exclusão de conta.
6. Regras legais: nenhum caminho do sistema permite limite acima de 32 km/h ou fora dos limites por zona.

ENTREGA: /docs/relatorio-qa.md com cada problema por severidade, como reproduzir e sugestão de correção.
```
