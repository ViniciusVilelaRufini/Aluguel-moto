# Auditoria de UI/UX — painel admin (`apps/admin`)

Data: 21/10/2026 · Branch `design/admin` · Referências: `design-system/readme.md` (VISUAL FOUNDATIONS, CONTENT FUNDAMENTALS, Motion v2), `design-system/tokens/*`, `design-system/ui_kits/admin-v2`.

Método: leitura de todo o `src/`, comparação com o kit de referência e capturas de tela de todas as seções e abas em 1440×900 (desktop) e 900×1100 (tablet), com a API local (`http://localhost:3001`, seed) e login dev. Capturas: `docs/design/screenshots/antes/` e `docs/design/screenshots/depois/` (geradas por `apps/admin/e2e/visual.spec.ts`).

Escala de impacto: **P0** quebra a aparência ou o uso em toda a aplicação · **P1** afeta uma tarefa central (frota, comandos, alertas) · **P2** atrito ou inconsistência visível · **P3** acabamento.

Status: **corrigido** (commit nesta branch) · **proposto** (ver `evolucoes-admin.md`) · **aberto**.

---

## P0 — afeta a aplicação inteira

| # | Problema | Onde | Status |
|---|---|---|---|
| 1 | **Tokens de tipografia ausentes.** `--type-*`, `--fw-*` e `--ls-*` não existiam em `globals.css`. Toda declaração `font: var(--type-label)` ou `font: var(--fw-semibold) 12px/1 ...` era inválida e caía no 14px/500 herdado: o número do StatTile saía em 14px (deveria ser 26px bold), badges em 14px (deveriam ser 11–12px semibold), botões sem peso 600, títulos de diálogo e labels fora da escala. | `globals.css`, todos os componentes de `src/ds` | corrigido |
| 2 | **Tabelas cortadas no fim da página.** Os filhos de `Page` (flex column com `overflow: auto`) encolhiam; a tabela com `overflow: hidden` perdia as últimas linhas (ex.: "Recargas de carteira" no Financeiro). | `ui.tsx` (`Page`) | corrigido |
| 3 | **Trilho de ícones do tablet nunca ativava.** O CSS usava `.shell-nav`, mas o SideNav não tinha essa classe: abaixo de 1024px o menu continuava com 232px. E, quando o texto some, os botões ficavam sem nome acessível. | `SideNav`, `globals.css` | corrigido |
| 4 | **Foco invisível nos campos.** `TextInput`, `Select`, `TextArea` e `MiniInput` zeravam o `outline` no estilo inline e não tinham estado de foco: navegação por teclado sem indicação. | `ui.tsx` | corrigido |
| 5 | **Diálogos sem foco preso nem retorno de foco.** Tab saía do modal para a página atrás; ao fechar o foco se perdia; Esc fechava todos os diálogos empilhados e também a ficha. | `Modal` | corrigido |

## P1 — tarefas centrais

| # | Problema | Onde | Status |
|---|---|---|---|
| 6 | Estado do comando remoto só como uma pílula de texto; sem leitura de progresso (pendente → em andamento → confirmado) nem aviso quando termina enquanto o operador olha o mapa. | `VehicleSheet` | corrigido (linha do tempo + toast de resultado) |
| 7 | Pins "saltam" a cada `vehicle.position` (lote de 500 ms); difícil acompanhar a moto em movimento. | `fleet/page.tsx` | corrigido (interpolação 900 ms) |
| 8 | Pin não mostra bateria, contrariando "Estados de bateria: sempre em pin e pílula". | mapa da frota | corrigido (anel de bateria) |
| 9 | Moto selecionada pouco destacada no mapa; sem dica ao passar o mouse. | mapa da frota | corrigido (pulso + dica) |
| 10 | Busca do header só por código exato; ao buscar uma moto estando já em `/fleet`, a ficha não abria (estado inicializado só na montagem). | `layout.tsx`, `fleet/page.tsx` | corrigido (paleta Ctrl+K + sincronia com a query) |
| 11 | "Carregando..." em texto solto em tabelas, fichas, cercas e no carregamento do painel; o layout pula quando os dados chegam. | vários | corrigido (esqueletos) |
| 12 | Alerta crítico novo só aparece se o operador estiver na fila de alertas. | global | corrigido (toast crítico em qualquer seção; linha nova pisca na fila) |
| 13 | Sem indicação de conexão em tempo real: se o socket cai, a frota "congela" sem aviso. | header | corrigido ("Ao vivo" / "Reconectando") |
| 14 | Replay de trajeto sem reprodução (só arrastar o slider) e sem distinção do trecho percorrido; a barra cobria o controle de zoom. | `ReplayBar` | corrigido |
| 15 | Clusters sem contagem de motos (o estilo não tem `glyphs`). | mapa da frota | proposto (depende de fonte de glyphs; Amazon Location fornece) |

## P2 — atrito e inconsistência

| # | Problema | Onde | Status |
|---|---|---|---|
| 16 | Estados vazios genéricos ("Nada por aqui ainda.") sem explicar nem oferecer a ação seguinte. | tabelas, kanban, cercas | corrigido (ícone + dica + ação: limpar busca, nova tarefa, desenhar área) |
| 17 | Linhas de tabela clicáveis sem hover, sem foco por teclado e sem `aria-selected`. | `DataTable` | corrigido |
| 18 | Cabeçalho da tabela some ao rolar listas longas. | alertas, clientes, aluguéis, auditoria | corrigido (cabeçalho fixo nessas listas) |
| 19 | Status em inglês cru na ficha do cliente (contestação `open`, sinistro `submitted`, conversa `open`) e no histórico da moto (aluguel `ended`, manutenção `scheduled`). Fere CONTENT FUNDAMENTALS. | `customers/page.tsx`, `VehicleSheet` | corrigido |
| 20 | Login: Enter não avança nem envia (botões fora de `<form>`), sem foco no código 2FA, sem estado "Entrando...". | `login/page.tsx` | corrigido |
| 21 | Toast único: um novo apagava o anterior sem animação; erro e sucesso com o mesmo tempo; sem fechar. | `ToastProvider` | corrigido (pilha com movimento) |
| 22 | Lista de cercas com `div` clicável (não focável), sem `aria-label`. | `zones/page.tsx` | corrigido |
| 23 | Filtros de status e segmentos sem `aria-pressed`; menu sem `aria-current`. | `FleetStatus`, `SegmentedControl`, `SideNav` | corrigido |
| 24 | Título duplicado: o header mostra o nome da seção e o `PageHeader` repete logo abaixo (também no kit de referência). | todas as seções com `PageHeader` | proposto (header vira breadcrumb/contexto) |
| 25 | Ícone do estado vazio invisível sobre fundo cinza (kanban). | `Empty` | corrigido |
| 26 | "E-mail" quebrava em duas linhas no KV; "Sinal —/5" quando sem dado; "Limitar vel." abreviado. | `KV`, `VehicleSheet` | corrigido |
| 27 | Tabelas largas (preços) passavam do cartão quando o cabeçalho fixo tirou a rolagem horizontal. | `DataTable` | corrigido (cabeçalho fixo só por opção `sticky`) |
| 28 | Kanban sem arrastar e soltar entre colunas. | `tasks/page.tsx` | proposto (precisa só de `PATCH /field-tasks/{id}` com `status`, que já existe; ficou fora por escopo) |

## P3 — acabamento

| # | Problema | Onde | Status |
|---|---|---|---|
| 29 | Sem transição entre seções, abas e na abertura do painel lateral. | layout, abas, `SidePanel` | corrigido |
| 30 | Indicadores trocam de valor sem movimento; mudanças ao vivo passam despercebidas. | `StatTile` | corrigido (ticker + variação curta) |
| 31 | Barra única do gráfico de receita ocupava a largura toda; barras sem entrada. | `finance/page.tsx` | corrigido (máx. 72px, crescem em cascata) |
| 32 | Contadores das colunas do kanban desalinhados do título. | `tasks/page.tsx` | corrigido |
| 33 | "Ocultar camadas" em verde (secundário) ao lado de botões neutros no mapa. | `zones/page.tsx` | corrigido |
| 34 | Modo escuro inexistente. | global | proposto (ver evolução E17: só para a sala de operação) |
| 35 | Tiles OSM com saturação menor que a especificada (`saturate .55`), aproximada por `raster-saturation -0.5`. | `MapView` | aberto (aceitável; produção usa Amazon Location) |

## Acessibilidade — checagem rápida

- **Contraste:** texto secundário `--ink-500` (#6B7178) sobre branco = 4,9:1 (AA). `--text-tertiary` (#9AA0A6) = 2,6:1: usado só em placeholder e ícones decorativos — manter assim. Verde `#34C25C` com texto branco = 2,3:1: o DS usa o verde como fundo de CTA com texto branco 15px/600; não atinge nem o mínimo de texto grande (3:1). Sinalizado, não alterado (cor de marca fixa). Ver E18.
- **Teclado:** menu, filtros, tabelas, lista de cercas, paleta e diálogos navegáveis; Esc fecha diálogo do topo, paleta e ficha da moto; "/" e Ctrl+K abrem a busca.
- **Leitores de tela:** `aria-current` no menu, `aria-pressed` em filtros e segmentos, `aria-selected` em linhas e opções, `aria-busy` em tabelas carregando, `role=status` no estado do comando e no indicador ao vivo, `role=alert` em toasts de erro, `aria-live=polite` nos demais.
- **Movimento reduzido:** todas as animações CSS caem para 0,01 ms; esqueletos ficam estáticos; pulsos somem; animações em JS (ticker, interpolação de pins, desenho da rota, zoom do cluster) aplicam o valor final na hora (`lib/motion.ts`).
- **Responsivo até tablet:** trilho de ícones abaixo de 1024px, busca vira botão redondo, painel lateral 320px; abaixo de 820px o painel empilha sob o mapa/lista.
