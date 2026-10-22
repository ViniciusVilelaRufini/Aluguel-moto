# Painel admin (`apps/admin`)

Next.js 14 (App Router, `output: 'export'`), TypeScript, Tailwind 3, MapLibre GL 4, TanStack Query 5, `openapi-fetch` tipado por `packages/contracts/generated/ts/schema.d.ts` e `socket.io-client` (`/realtime`). Layout e componentes seguem `design-system/ui_kits/admin-v2` (os componentes de `design-system/components` foram portados para `src/ds`).

## Seções (menu filtrado por grupo)

| Seção | Grupos | Conteúdo |
|---|---|---|
| Frota ao vivo | admin, operacao, suporte | Mapa ao vivo (cluster, filtros por status, mapa de calor de demanda, pino do galpão, motos `awaiting_pickup` com halo e legenda), faixa de dashboard (ocupação, aluguéis ativos, receita do dia, alertas), ficha da moto no painel lateral (posição, bateria, velocidade, comandos com motivo e estado ao vivo, replay de trajeto, histórico, log de comandos) |
| Alertas | admin, operacao, suporte | Fila por prioridade em tempo real; atribuir, resolver (com motivo), ver no mapa |
| Cercas e regras | admin, operacao | Desenhar, editar e excluir polígonos (operação, devolução, proibida, velocidade reduzida) com validação (limite <= 20 em velocidade reduzida; qualquer limite <= 32) |
| Clientes | admin, suporte | Abas **Clientes** (busca, ficha com verificação/atendimento/histórico, bloqueio, lista de restrição, CPF mascarado exceto admin), **Aluguéis** (filtros, detalhe com eventos, encerramento forçado, estorno) e **Suporte** (conversas, contestações, sinistros, ocorrências) |
| Operação | admin, operacao | Kanban de tarefas de campo (criar, atribuir) e manutenção |
| Galpões | admin, operacao (editam), financeiro (leitura) | Cadastro do galpão: ponto no mapa (clique), endereço, horário por dia da semana (HH:MM, abertura antes do fechamento), prazos (retirar agora, agendar até, tolerância) e motos do galpão por status. Desativar/Reativar só para admin (não há exclusão no contrato) |
| Retiradas | admin, operacao | Agenda do dia por galpão (`GET /depots/{id}/pickups`): horário em São Paulo, Agora/Agendadas, filtro de status, só o primeiro nome do cliente, nunca o `pickupCode` |
| Entregas | admin, operacao, suporte | Saídas e chegadas com fotos (links assinados), checklist, bateria e status; aba Disputas (`status=disputed`) com o motivo e "Abrir no suporte" (fila de Clientes > Suporte) |
| Financeiro | admin, financeiro | Receita, ocupação, planos, cauções/seguros/estornos, exportação CSV; aba **Aluguéis** (mesmo painel de Clientes) |
| Preços e planos | admin, financeiro (leitura) | Planos, taxas, seguros, cupons |
| Equipe e acessos | admin | Usuários internos e permissões; aba **Auditoria** |

## Como rodar

```bash
cp apps/admin/.env.example apps/admin/.env.local   # API_BASE_URL, modo de auth
pnpm --filter admin dev          # http://localhost:3100
pnpm --filter admin build        # estático em apps/admin/out
```

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
                                # linha do tempo do comando, paleta (Ctrl+K), foco preso em diálogo e galpão
                                # (horários, agenda, entregas; componentes .tsx renderizados com react-dom/server
                                # sobre respostas simuladas no formato do contrato)
pnpm --filter admin test:e2e    # Playwright contra a API real (sobe `next dev` em :3100)
```

E2E: configure `E2E_API_URL` (padrão `http://localhost:3004`) para uma API com `AUTH_MODE=dev`, `IOT_MODE=stub`, banco migrado e com seed. Os testes criam a própria massa pela API (cliente com CPF e KYC aprovado; aluguel de uma moto livre do simulador). O cenário de bloquear moto em movimento precisa do simulador de rastreadores (`VLT-0001…0050`) e só roda com `SIM=1`. O cenário de moto offline simula a resposta `pending` + `offline` na rede, porque o stub de IoT confirma tudo na hora.

Passada visual (`e2e/visual.spec.ts`): abre todas as seções e abas em desktop (1440) e tablet (900). Com `SHOTS_DIR` salva capturas para revisão:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm --filter admin build && npx serve apps/admin/out -l 3110
E2E_PORT=3110 E2E_API_URL=http://localhost:3001 E2E_CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"   SHOTS_DIR=../../docs/design/screenshots/depois pnpm --filter admin test:e2e
```

### E2E do galpão (`e2e/galpao.spec.ts`)

Cadastro, permissões, mapa e agenda rodam contra a API real (módulo de galpões). A reserva de galpão ainda não tem rota na API desta branch, então o teste da agenda grava a reserva direto no banco com o Prisma Client de `services/api` e só roda com `E2E_DATABASE_URL` (o mesmo `DATABASE_URL` da API); TODO: trocar por `POST /reservations` depois da Task 5. Entregas e disputas ficam em `test.skip` até a Task 6 (handovers).

```bash
# API do worktree numa porta livre (services/api/.env com DATABASE_URL próprio, migrate + seed)
NEXT_PUBLIC_AUTH_MODE=dev NEXT_PUBLIC_API_BASE_URL=http://localhost:3112 pnpm --filter admin build
npx serve apps/admin/out -l 3113
E2E_PORT=3113 E2E_API_URL=http://localhost:3112 E2E_DATABASE_URL=postgresql://volti:volti@localhost:5432/<banco>   pnpm --filter admin exec playwright test e2e/galpao.spec.ts --workers=1
```

## Design e movimento

Auditoria e evoluções em `docs/design/auditoria-admin.md` e `docs/design/evolucoes-admin.md`. Movimento com os presets `vt-*` do DS (`globals.css`); animações em JS passam por `lib/motion.ts` (`useReducedMotion`, `tween`), que zera a duração com `prefers-reduced-motion`. Atalhos: Ctrl+K, Cmd+K ou `/` abrem a busca; Esc fecha diálogo, busca e ficha da moto.

## Notas

- Rotas de ficha usam query string (`/fleet?vehicle=`, `/customers?tab=rentals&rental=`), pois o CloudFront devolve `index.html` para rotas desconhecidas.
- Pontos de atenção em `docs/superpowers/plans/2026-10-21-admin.md`.
