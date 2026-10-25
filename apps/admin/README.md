# Painel admin (`apps/admin`)

Next.js 14 (App Router, `output: 'export'`), TypeScript, Tailwind 3, MapLibre GL 4, TanStack Query 5, `openapi-fetch` tipado por `packages/contracts/generated/ts/schema.d.ts` e `socket.io-client` (`/realtime`). Layout e componentes seguem `design-system/ui_kits/admin-v2` (os componentes de `design-system/components` foram portados para `src/ds`).

## Seções (menu filtrado por grupo)

| Seção | Grupos | Conteúdo |
|---|---|---|
| Frota ao vivo | admin, operacao, suporte | Mapa ao vivo (cluster, filtros por status, mapa de calor de demanda, pino do galpão, motos `awaiting_pickup` com halo e legenda) ou **Lista** (endereço, modelo, revisão, busca por código/endereço/modelo/bateria, filtro "Motos fixas de plano"), faixa de dashboard (ocupação, aluguéis ativos, receita do dia, alertas), ficha da moto no painel lateral (endereço, posição, modelo, km/horas desde a revisão e situação, bateria com série e ciclos, moto fixa com "Trocar" para admin/operação, bateria, velocidade, comandos com motivo e estado ao vivo, replay de trajeto, histórico, log de comandos). **Editar moto** (`PATCH /vehicles/{id}`: modelo, rastreador, QR, correção de odômetro/horas) para admin/operação; o botão **Nova moto** do mapa abre o cadastro da seção Motos (`/motos?new=1`) |
| Motos | admin, operacao | Cadastro da frota (`/motos`, Task 31): lista paginada (`GET /vehicles`, 25 por página) com busca por código, QR ou rastreador e filtros por galpão (`depotId`), situação e modelo (`vehicleModelId`); colunas código, modelo com a foto do catálogo, galpão ("Na rua" sem galpão), situação, bateria, sinal (online/último sinal) e odômetro. **Cadastrar moto** (`POST /vehicles`): código sugerido (próximo `VLT-NNNN` da frota ao vivo), modelo do catálogo, **galpão obrigatório** (só ativos; a moto nasce livre na posição do galpão, disponível para retirada), rastreador (`thingName`, sugerido `moto-NNNN`; no dev o simulador assume qualquer moto cadastrada em até 60 s), QR (vazio = `volti://v/<código>`) e bateria opcional (só `charged` livres, ou digitar a série de uma bateria nova). Ficha (`?vehicle=<id>`): dados, **Editar moto** (mesmo formulário), **Transferir de galpão** (`POST /vehicles/{id}/transfer-depot`, só livre/manutenção sem aluguel, galpão ativo diferente do atual e motivo), **Colocar em manutenção / Liberar para uso** (`POST /vehicles/{id}/status` com motivo), **Ver no mapa** e histórico (auditoria para admin; comandos para operação). Aposentar moto não existe no contrato (pendente em `docs/decisoes.md`). Testes: `tests/motos.test.tsx` |
| Alertas | admin, operacao, suporte, financeiro | Fila por prioridade em tempo real; atribuir, resolver (com motivo), ver no mapa. Alerta **Pagamento precisa de revisão** (`payment_needs_review`) com **Ver pagamento** (abre o detalhe em Financeiro > Pagamentos). O financeiro vê só esses alertas e resolve (não atribui; continua começando no Financeiro); quem é só operação não os vê |
| Cercas e regras | admin, operacao | Desenhar, editar e excluir polígonos (operação, devolução, proibida, velocidade reduzida) com validação (limite <= 20 em velocidade reduzida; qualquer limite <= 32) |
| Clientes | admin, suporte | Abas **Clientes** (busca, coluna Plano, ficha com verificação/atendimento/histórico, chave Pix de estorno completa só para admin/financeiro e mascarada para os demais, assinatura com moto fixa — definir/trocar só admin —, bloqueio, lista de restrição, CPF mascarado exceto admin, **Ajustar carteira** — crédito/débito em reais até R$ 1.000, motivo obrigatório, só admin/financeiro, com `Idempotency-Key`; o diálogo mostra o saldo atual e não deixa debitar acima dele —, **Pagamentos** com inadimplência e valor em aberto e **Registrar quitação** com motivo para admin/financeiro), **Aluguéis** (filtros, detalhe com eventos, encerramento forçado, estorno) e **Suporte** (conversas com estado enviada/entregue/lida e leitura ao abrir, imagens anexadas pelo cliente por `attachmentUrls` — links assinados de 15 min, abrem numa nova aba —, contestações, sinistros, ocorrências) |
| Operação | admin, operacao | **Tarefas** (kanban; cartão com endereço da moto/destino e bateria retirada com série, carga e ciclos), **Manutenção** (revisões por km/horas com situação Vencida/Próxima/Em dia e "Agendar" por linha; agenda com origem Painel/Cliente/Automática — operação vê só o primeiro nome do cliente —, "Em aberto" consultado no servidor por agendadas e em andamento, filtro de pedidos de clientes, iniciar/concluir/cancelar) e **Baterias** (contagem por situação, estações com carregadas/vagas e estoque, van de cada operador, carregar/descarregar a própria van por série, lista com série, carga, ciclos e local; botão **Trocas** por estação com o histórico de trocas por QR — série de entrada/saída, status e horário de São Paulo — para admin/operação/suporte) |
| Galpões | admin, operacao (editam), financeiro (leitura) | Cadastro do galpão: ponto no mapa (clique), endereço, horário por dia da semana (HH:MM, abertura antes do fechamento), prazos (retirar agora, agendar até, tolerância) e motos do galpão por status. Desativar/Reativar só para admin (não há exclusão no contrato). **Estoque mínimo de baterias carregadas** (`minChargedBatteries`; vazio = sem alerta, enviado como 0 na edição): abaixo dele a API abre o alerta `battery_stock_low` ("Poucas baterias carregadas no galpão"). **Estação de troca** do galpão (seleção entre as estações cadastradas; "Nenhuma" desliga com `clearSwapStation`) |
| Estações | admin, operacao | Cadastro das estações de troca (`GET /swap-stations/registry`, `POST /swap-stations`, `PATCH /swap-stations/{id}`): ponto no mapa (clique; cinza = inativa, vermelho = sem carregada), nome, endereço, horário em texto ou "Aberta 24 horas", vagas (não abaixo das baterias na estação) e *thing* do armário no IoT (vazio = `station-<id>`). Desativar/Reativar (com troca em andamento a API recusa e o aviso aparece no diálogo). Ficha com carregadas/vagas, baterias na estação, trocas em andamento, galpões ligados, **QR para imprimir** (`GET /swap-stations/{id}/qr`, desenhado no navegador com `qrcode-generator`; Imprimir abre a impressão do adesivo com nome e endereço, Baixar SVG salva o arquivo) e **Trocas** (histórico por QR). Testes: `tests/stations.test.tsx` |
| Retiradas | admin, operacao | Agenda do dia por galpão (`GET /depots/{id}/pickups`): horário em São Paulo, Agora/Agendadas, filtro de status, só o primeiro nome do cliente, nunca o `pickupCode` |
| Entregas | admin, operacao, suporte | Saídas e chegadas com fotos (links assinados), checklist, bateria e status; aba Disputas (`status=disputed`) com o motivo e "Abrir no suporte" (fila de Clientes > Suporte); **Cancelar entrega** com motivo obrigatório para admin/operação, só em saída aguardando o cliente ou em disputa; a entrega cancelada mostra motivo, quando e quem cancelou; `lastError` traduzido (pagamento, caução, moto sem conexão) |
| Financeiro | admin, financeiro | Receita (aluguéis encerrados + assinaturas pagas, com a legenda das duas parcelas; recargas e pacotes ficam fora do total e aparecem em "Recargas de carteira"), ocupação, planos, cauções/seguros/estornos e exportação CSV (nome do arquivo com o período) para **Hoje, 7 dias, 30 dias ou Período livre** (datas De/Até em dias de São Paulo; o `to` do contrato é exclusivo, então vai ao início do dia seguinte; máximo de 366 dias, sem datas futuras). Abas **Aluguéis** (mesmo painel de Clientes), **Pagamentos** (`GET /payments` com filtros de situação, tipo e período, e detalhe em `GET /payments/{id}`; o contrato não tem filtro por forma de pagamento nem CSV desta lista, então a forma aparece só como coluna), **Cauções** (`GET /payments/deposits` com filtro de status) e **Carteira** (busca de cliente em `GET /customers` ou **Mostrar: Inadimplentes**, com **Ajustar carteira** e **Registrar quitação**; o financeiro não abre a ficha em Clientes). O detalhe do pagamento mostra o nome do cliente, o saldo devedor e a quitação, e também oferece o ajuste; `?payment=<id>` abre o detalhe direto. Erros de carregamento mostram **Tentar de novo** |
| Preços e planos | admin, financeiro (leitura) | Planos, taxas, seguros, **modelos** (catálogo com foto enviada por URL pré-assinada no prefixo `catalog/`, preço por minuto e desbloqueio próprio ou herdado do plano por minuto, intervalos de revisão, ativo) e cupons (validade, planos, limite total e por cliente). Admin cria **plano** (`POST /pricing/plans`) e **taxa** (`POST /pricing/fees`) além da edição; valores digitados em reais, enviados em centavos |
| Equipe e acessos | admin | Usuários internos e permissões (quem entrou pelo Cognito sem nome cadastrado aparece pelo e-mail; cadastre o primeiro nome — é o que o cliente vê, senão "Equipe Volti"); aba **Auditoria** (ações e entidades com rótulos em pt-BR em `lib/audit-labels.ts`; o identificador técnico fica como detalhe) |

## Como rodar

```bash
cp apps/admin/.env.example apps/admin/.env.local   # API_BASE_URL, modo de auth
pnpm --filter admin dev          # http://localhost:3100
pnpm --filter admin build        # estático em apps/admin/out
```

O build de produção (`next build`) usa Cognito se `NEXT_PUBLIC_AUTH_MODE` não for informado; para testar localmente com o login de desenvolvimento, passe `NEXT_PUBLIC_AUTH_MODE=dev`.

API local (ver `services/api/README.md`): `API_PORT=3001` se a 3000 estiver ocupada, e `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`.

### Autenticação

- `NEXT_PUBLIC_AUTH_MODE=dev` (padrão): tela de login com seletor de grupo, chama `POST /dev/token` (a API precisa de `AUTH_MODE=dev`). O passo de 2FA do layout é só visual neste modo.
- `NEXT_PUBLIC_AUTH_MODE=cognito`: **login próprio com e-mail e senha** na tela do painel, direto no pool interno do Cognito (`InitiateAuth`/`RespondToAuthChallenge` em `cognito-idp.<região>.amazonaws.com`, fluxo `USER_SRP_AUTH` com `amazon-cognito-identity-js`: a senha nunca sai do navegador, só a prova SRP). Não há endpoint novo na API. Variáveis: `NEXT_PUBLIC_COGNITO_USER_POOL_ID` (a região sai do prefixo) e `NEXT_PUBLIC_COGNITO_CLIENT_ID` (client `admin-panel`, sem segredo, com `userSrp` no CDK). `NEXT_PUBLIC_COGNITO_DOMAIN` e `NEXT_PUBLIC_COGNITO_REDIRECT_URI` (`<origem>/auth/callback/`) ficam só para concluir um login que já estava no Hosted UI e para o logout dessas sessões; o botão do Hosted UI saiu da tela.

Como entra (modo cognito, código em `src/lib/cognito-login.ts` e `src/components/login/`):

1. **E-mail e senha** → entra. Erros em pt-BR, com mensagem única para senha errada ou e-mail inexistente; também usuário desativado, muitas tentativas, código inválido/expirado, senha fraca e sem conexão. Nada é logado.
2. **Primeiro acesso** (convite com senha temporária, desafio `NEW_PASSWORD_REQUIRED`): tela "Crie sua senha" com as regras da política do pool interno (12 caracteres, maiúscula, minúscula, número e símbolo, espelhando `infra/lib/stacks/auth-stack.ts`), conferidas enquanto digita.
3. **2FA**: com TOTP cadastrado (`SOFTWARE_TOKEN_MFA`) pede o código de 6 dígitos do app autenticador; a dica de 2FA só aparece nesse passo. Sem TOTP num pool com MFA obrigatório (`MFA_SETUP`), mostra o QR code (`AssociateSoftwareToken`, `otpauth://totp/Volti:<e-mail>`) e a chave em texto, e conclui com `VerifySoftwareToken`.
4. **Esqueci minha senha**: `ForgotPassword` manda o código por e-mail (a tela não diz se o e-mail existe) → `ConfirmForgotPassword` com o código e a senha nova → volta para "Entrar" com o aviso de senha alterada.

O access token fica só em `sessionStorage` (o mesmo de antes); o login próprio guarda também o refresh token ali, só para o logout chamar `RevokeToken` (o client tem revogação habilitada). Não há renovação automática: com o access token vencido (1 h) a API responde 401 e o painel volta ao login. A tela de login segue o tema claro/escuro do aparelho (as outras telas do painel ainda só têm o claro).

## Testes

```bash
pnpm --filter admin lint        # next lint + tsc
pnpm --filter admin test        # Vitest: status->cor, menu por grupo, máscara de CPF, validação de cerca,
                                # motion (reduced-motion, tween), interpolação de pins, ticker, toasts,
                                # linha do tempo do comando, paleta (Ctrl+K) e foco preso em diálogo; contrato v2:
                                # revisão por km/horas, baterias (séries, local), catálogo (rascunho -> POST/PATCH,
                                # desbloqueio herdado), chave Pix (máscara por grupo), estado do chat, busca por endereço
                                # e permissões novas; galpão (horários, agenda, entregas;
                                # componentes .tsx renderizados com react-dom/server sobre respostas simuladas do contrato);
                                # Task 14 (tests/lacunas-t14.test.tsx): débito até o saldo, quitação, alerta de pagamento,
                                # escopo do contador de alertas, motivo do cancelamento e rótulos das baterias;
                                # login próprio (tests/cognito-login.test.ts com o Cognito simulado no fetch: SRP, senha nova,
                                # TOTP, MFA_SETUP, esqueci a senha, erros, RevokeToken; tests/login-views.test.tsx: telas)
pnpm --filter admin test:e2e    # Playwright contra a API real (sobe `next dev` em :3100)
```

E2E: configure `E2E_API_URL` (padrão `http://localhost:3004`) para uma API com `AUTH_MODE=dev`, `IOT_MODE=stub`, banco migrado e com seed. Os testes criam a própria massa pela API (cliente com CPF e KYC aprovado; aluguel de uma moto livre do simulador). O cenário de bloquear moto em movimento precisa do simulador de rastreadores (`VLT-0001…0050`) e só roda com `SIM=1`. O cenário de moto offline simula a resposta `pending` + `offline` na rede, porque o stub de IoT confirma tudo na hora.

Contrato v2 (`e2e/v2.spec.ts`): lista da frota e busca por endereço, revisões por km/horas e agendar/concluir, pedido de manutenção de cliente do plano, carregar/descarregar a van, modelo novo com foto (upload pré-assinado) e desbloqueio herdado, assinatura com moto fixa, chave Pix completa/mascarada por grupo e estado das mensagens do chat. Precisa de uma API do contrato v2 com o seed v2 (modelos, estações, baterias) e o MinIO no ar. Exemplo com banco próprio:

```bash
# services/api/.env com PORT=3014, DATABASE_URL=.../volti_v2_admin, IOT_MODE=stub, AUTH_MODE=dev
pnpm --filter api prisma migrate deploy && pnpm --filter api prisma db seed && pnpm --filter api dev
NEXT_PUBLIC_AUTH_MODE=dev NEXT_PUBLIC_API_BASE_URL=http://localhost:3014 pnpm --filter admin build
npx serve apps/admin/out -l 3120
E2E_PORT=3120 E2E_API_URL=http://localhost:3014 E2E_CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" pnpm --filter admin test:e2e
```

Passada visual (`e2e/visual.spec.ts`): abre todas as seções e abas em desktop (1440) e tablet (900). Com `SHOTS_DIR` salva capturas para revisão:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm --filter admin build && npx serve apps/admin/out -l 3110
E2E_PORT=3110 E2E_API_URL=http://localhost:3001 E2E_CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"   SHOTS_DIR=../../docs/design/screenshots/depois pnpm --filter admin test:e2e
```

### E2E do galpão (`e2e/galpao.spec.ts`)

Cadastro, permissões, mapa e agenda rodam contra a API real (galpões e reserva de galpão). A reserva da agenda é criada pela API: galpão aberto todos os dias, moto nova levada ao galpão por um recolhimento (`collect`) concluído com `depotId`, cliente com KYC aprovado, cartão fake e `POST /reservations` com `depotId` e `Idempotency-Key`; o teste cancela a reserva no fim. Todo galpão do teste nasce em Maceió (longe das cercas de São Paulo) e é desativado no `afterEach`. Entregas e disputas também rodam contra a API real: reserva "retirar agora", foto enviada pela URL pré-assinada (`POST /handovers/uploads` + `PUT` no MinIO), saída do operador (`campo`) com o `pickupCode`; o admin vê a entrega em `/entregas` com foto, checklist e status, o cliente aponta um problema e o suporte a vê em Disputas com "Abrir no suporte". No fim, a operação cancela a saída e o cliente cancela a reserva. Precisa do MinIO no ar.

```bash
# API do worktree numa porta livre (services/api/.env com DATABASE_URL próprio, migrate + seed)
NEXT_PUBLIC_AUTH_MODE=dev NEXT_PUBLIC_API_BASE_URL=http://localhost:3112 pnpm --filter admin build
npx serve apps/admin/out -l 3113
E2E_PORT=3113 E2E_API_URL=http://localhost:3112   pnpm --filter admin exec playwright test e2e/galpao.spec.ts --workers=1
```

## Design e movimento

Auditoria e evoluções em `docs/design/auditoria-admin.md` e `docs/design/evolucoes-admin.md`. Movimento com os presets `vt-*` do DS (`globals.css`); animações em JS passam por `lib/motion.ts` (`useReducedMotion`, `tween`), que zera a duração com `prefers-reduced-motion`. Atalhos: Ctrl+K, Cmd+K ou `/` abrem a busca; Esc fecha diálogo, busca e ficha da moto.

## Notas

- Formulários das telas de gestão (moto, cancelar entrega, plano, taxa, ajuste de carteira) validam em `src/lib/admin-forms.ts` (funções puras `build*`, testadas em `tests/lacunas-forms.test.tsx`, que também confere as permissões de `src/lib/permissions.ts` contra o `x-required-groups` do `openapi.yaml`). O contrato permite `campo` em algumas dessas rotas, mas esse grupo não usa o painel.

- O staff não lê a assinatura (`GET /payments/subscriptions/{id}` é só do cliente) nem pausa/retoma: a ficha mostra o plano (`Customer.activePlanCode`), a moto fixa (frota, `Vehicle.assignedSubscriptionId`) e, depois de definir a moto, o estado devolvido pelo `PUT .../vehicle`. Não há endpoint de staff para indicação (referral) nem para horários de manutenção; os pedidos de clientes aparecem como manutenções com `source: customer`.
- Carregar/descarregar (`/batteries/van-stock/load|unload`) vale sempre para a van de quem está logado; o painel mostra a van de outro operador só para leitura.
- **Ciclo de vida das baterias** (Operação > Baterias): as contagens por situação vêm de `statusCounts` (inclui Carregada e Com defeito) e respeitam o filtro de **galpão** (`depotId`); a tabela mostra o galpão de cada bateria. **Cadastrar bateria** (`POST /batteries`: série, galpão, carregando com carga opcional ou carregada) só para `admin` e `operacao`; por linha, **Carregada** (`charging`), **Defeito** (motivo obrigatório, 3 a 500 caracteres) e **Dar baixa** (motivo opcional, só `admin`/`operacao`), sempre conforme a situação (as demais voltariam `409`), e **Histórico** (`GET /batteries/{id}/movements`, paginado, horário no fuso do galpão). Descarregar a van agora escolhe o galpão (`depotId`) ou a estação. Testes: `tests/battery-lifecycle.test.ts`.
- Rotas de ficha usam query string (`/fleet?vehicle=`, `/customers?tab=rentals&rental=`), pois o CloudFront devolve `index.html` para rotas desconhecidas.
- Pontos de atenção em `docs/superpowers/plans/2026-10-21-admin.md`.

## Limpeza da Task 18 (lacunas)

- Auditoria: os filtros de Ação e Entidade têm a opção "Outra…" (texto livre com o identificador técnico) para valores fora do mapa de rótulos.
- Financeiro: o grupo `suporte` abre a seção só para a lista de Pagamentos (`GET /payments`); a Visão geral, Aluguéis, Cauções e Carteira seguem fechadas. Com `?tab=` e grupos ainda carregando, a página não mostra aba nenhuma (sem piscar a visão geral).
- Baterias: descarregar a van com mais de um galpão exige escolher o destino no painel (antes a API respondia 422).
- Estações: textos e vínculos extraídos para `src/lib/stations.ts` e cobertos em `tests/t18-painel.test.ts`.
