# Painel admin (`apps/admin`)

Next.js 14 (App Router, `output: 'export'`), TypeScript, Tailwind 3, MapLibre GL 4, TanStack Query 5, `openapi-fetch` tipado por `packages/contracts/generated/ts/schema.d.ts` e `socket.io-client` (`/realtime`). Layout e componentes seguem `design-system/ui_kits/admin-v2` (os componentes de `design-system/components` foram portados para `src/ds`).

## Seções (menu filtrado por grupo)

| Seção | Grupos | Conteúdo |
|---|---|---|
| Frota ao vivo | admin, operacao, suporte | Mapa ao vivo (cluster, filtros por status, mapa de calor de demanda) ou **Lista** (endereço, modelo, revisão, busca por código/endereço/modelo/bateria, filtro "Motos fixas de plano"), faixa de dashboard (ocupação, aluguéis ativos, receita do dia, alertas), ficha da moto no painel lateral (endereço, posição, modelo, km/horas desde a revisão e situação, bateria com série e ciclos, moto fixa com "Trocar" para admin/operação, bateria, velocidade, comandos com motivo e estado ao vivo, replay de trajeto, histórico, log de comandos) |
| Alertas | admin, operacao, suporte | Fila por prioridade em tempo real; atribuir, resolver (com motivo), ver no mapa |
| Cercas e regras | admin, operacao | Desenhar, editar e excluir polígonos (operação, devolução, proibida, velocidade reduzida) com validação (limite <= 20 em velocidade reduzida; qualquer limite <= 32) |
| Clientes | admin, suporte | Abas **Clientes** (busca, coluna Plano, ficha com verificação/atendimento/histórico, chave Pix de estorno completa só para admin/financeiro e mascarada para os demais, assinatura com moto fixa — definir/trocar só admin —, bloqueio, lista de restrição, CPF mascarado exceto admin), **Aluguéis** (filtros, detalhe com eventos, encerramento forçado, estorno) e **Suporte** (conversas com estado enviada/entregue/lida e leitura ao abrir, contestações, sinistros, ocorrências) |
| Operação | admin, operacao | **Tarefas** (kanban; cartão com endereço da moto/destino e bateria retirada com série, carga e ciclos), **Manutenção** (revisões por km/horas com situação Vencida/Próxima/Em dia e "Agendar" por linha; agenda com origem Painel/Cliente/Automática, filtro de pedidos de clientes, iniciar/concluir/cancelar) e **Baterias** (contagem por situação, estações com carregadas/vagas e estoque, van de cada operador, carregar/descarregar a própria van por série, lista com série, carga, ciclos e local) |
| Financeiro | admin, financeiro | Receita, ocupação, planos, cauções/seguros/estornos, exportação CSV; aba **Aluguéis** (mesmo painel de Clientes) |
| Preços e planos | admin, financeiro (leitura) | Planos, taxas, seguros, **modelos** (catálogo com foto enviada por URL pré-assinada no prefixo `catalog/`, preço por minuto e desbloqueio próprio ou herdado do plano por minuto, intervalos de revisão, ativo) e cupons (validade, planos, limite total e por cliente) |
| Equipe e acessos | admin | Usuários internos e permissões; aba **Auditoria** |

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
- `NEXT_PUBLIC_AUTH_MODE=cognito`: hosted UI do pool interno (OAuth code + PKCE). Variáveis: `NEXT_PUBLIC_COGNITO_DOMAIN`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REDIRECT_URI` (`<origem>/auth/callback/`). O MFA é imposto pelo pool.

O token fica só em `sessionStorage`.

## Testes

```bash
pnpm --filter admin lint        # next lint + tsc
pnpm --filter admin test        # Vitest: status->cor, menu por grupo, máscara de CPF, validação de cerca,
                                # motion (reduced-motion, tween), interpolação de pins, ticker, toasts,
                                # linha do tempo do comando, paleta (Ctrl+K) e foco preso em diálogo; contrato v2:
                                # revisão por km/horas, baterias (séries, local), catálogo (rascunho -> POST/PATCH,
                                # desbloqueio herdado), chave Pix (máscara por grupo), estado do chat, busca por endereço
                                # e permissões novas
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

## Design e movimento

Auditoria e evoluções em `docs/design/auditoria-admin.md` e `docs/design/evolucoes-admin.md`. Movimento com os presets `vt-*` do DS (`globals.css`); animações em JS passam por `lib/motion.ts` (`useReducedMotion`, `tween`), que zera a duração com `prefers-reduced-motion`. Atalhos: Ctrl+K, Cmd+K ou `/` abrem a busca; Esc fecha diálogo, busca e ficha da moto.

## Notas

- O staff não lê a assinatura (`GET /payments/subscriptions/{id}` é só do cliente) nem pausa/retoma: a ficha mostra o plano (`Customer.activePlanCode`), a moto fixa (frota, `Vehicle.assignedSubscriptionId`) e, depois de definir a moto, o estado devolvido pelo `PUT .../vehicle`. Não há endpoint de staff para indicação (referral) nem para horários de manutenção; os pedidos de clientes aparecem como manutenções com `source: customer`.
- Carregar/descarregar (`/batteries/van-stock/load|unload`) vale sempre para a van de quem está logado; o painel mostra a van de outro operador só para leitura.
- Rotas de ficha usam query string (`/fleet?vehicle=`, `/customers?tab=rentals&rental=`), pois o CloudFront devolve `index.html` para rotas desconhecidas.
- Pontos de atenção em `docs/superpowers/plans/2026-10-21-admin.md`.
