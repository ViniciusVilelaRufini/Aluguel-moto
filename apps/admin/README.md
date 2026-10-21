# Painel admin (`apps/admin`)

Next.js 14 (App Router, `output: 'export'`), TypeScript, Tailwind 3, MapLibre GL 4, TanStack Query 5, `openapi-fetch` tipado por `packages/contracts/generated/ts/schema.d.ts` e `socket.io-client` (`/realtime`). Layout e componentes seguem `design-system/ui_kits/admin-v2` (os componentes de `design-system/components` foram portados para `src/ds`).

## Seções (menu filtrado por grupo)

| Seção | Grupos | Conteúdo |
|---|---|---|
| Frota ao vivo | admin, operacao, suporte | Mapa ao vivo (cluster, filtros por status, mapa de calor de demanda), faixa de dashboard (ocupação, aluguéis ativos, receita do dia, alertas), ficha da moto no painel lateral (posição, bateria, velocidade, comandos com motivo e estado ao vivo, replay de trajeto, histórico, log de comandos) |
| Alertas | admin, operacao, suporte | Fila por prioridade em tempo real; atribuir, resolver (com motivo), ver no mapa |
| Cercas e regras | admin, operacao | Desenhar, editar e excluir polígonos (operação, devolução, proibida, velocidade reduzida) com validação (limite <= 20 em velocidade reduzida; qualquer limite <= 32) |
| Clientes | admin, suporte | Abas **Clientes** (busca, ficha com verificação/atendimento/histórico, bloqueio, lista de restrição, CPF mascarado exceto admin), **Aluguéis** (filtros, detalhe com eventos, encerramento forçado, estorno) e **Suporte** (conversas, contestações, sinistros, ocorrências) |
| Operação | admin, operacao | Kanban de tarefas de campo (criar, atribuir) e manutenção |
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
pnpm --filter admin test        # Vitest: status->cor, menu por grupo, máscara de CPF, validação de cerca
pnpm --filter admin test:e2e    # Playwright contra a API real (sobe `next dev` em :3100)
```

E2E: configure `E2E_API_URL` (padrão `http://localhost:3004`) para uma API com `AUTH_MODE=dev`, `IOT_MODE=stub`, banco migrado e com seed. O cenário de bloquear moto em movimento precisa do simulador de rastreadores e só roda com `SIM=1`. O cenário de moto offline simula a resposta `pending` + `offline` na rede, porque o stub de IoT confirma tudo na hora.

## Notas

- Rotas de ficha usam query string (`/fleet?vehicle=`, `/customers?tab=rentals&rental=`), pois o CloudFront devolve `index.html` para rotas desconhecidas.
- Pontos de atenção em `docs/superpowers/plans/2026-10-21-admin.md`.
