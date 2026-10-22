# Evoluções de design — painel admin

Cada item vai além do design system atual (`design-system/`, kit `ui_kits/admin-v2`) ou o interpreta para a web. Todos respeitam: verde `#34C25C` como única cor de ação, cores de status fixas, pt-BR em sentence case, sem emoji, e `prefers-reduced-motion`.

Status: **aplicado** (nesta branch, commit indicado) · **proposto** (não implementado; motivo indicado).

Novos tokens criados (em `apps/admin/src/app/globals.css`, não no DS): `--ease-panel: cubic-bezier(.22,1.18,.36,1)` e os keyframes `vt-panel-in`, `vt-section-in`, `vt-scrim-in`, `vt-dialog-in`, `vt-toast-out`, `vt-shimmer`, `vt-flash`, `vt-row-new`, `vt-bar-grow`. **Sugestão:** promover ao `design-system/tokens/motion.css` se aprovados.

---

## Movimento

### E1. Transição entre seções e abas — aplicado
- **O quê:** a área de conteúdo entra com fade + subida de 8px em 280ms (`--ease-out`) ao trocar de seção no menu e de aba (Clientes/Aluguéis/Suporte, Equipe/Auditoria, Tarefas/Manutenção, Visão geral/Aluguéis).
- **Por quê:** o DS define o push lateral de 440ms para telas do app; no painel, com menu fixo, um push lateral seria pesado e repetitivo. Fade curto mantém a noção de troca sem custo.
- **Onde:** `(panel)/layout.tsx`, `TabPanel` em `components/ui.tsx`. Só `animation-fill-mode: backwards`, para não deixar `transform` residual (que quebraria `position: fixed` dos diálogos e o mapa).
- Commit: `design(admin): transições de seção, abas e painel lateral`.

### E2. Painel lateral com mola curta — aplicado
- **O quê:** ficha da moto, do cliente e do aluguel deslizam 28px da direita em 420ms com `--ease-panel` (overshoot ~3%).
- **Por quê:** pedido explícito de "spring"; o `--ease-spring` do DS (overshoot ~56%) é para knobs e pins, exagerado num painel de 360px. Criado um token intermediário.
- **Onde:** `SidePanel` (`.panel-in`). Fechar ainda é imediato (sem animação de saída) — ver E20.

### E3. Polegar deslizante no SegmentedControl — aplicado
- O fundo branco da opção ativa desliza até a nova opção (`--dur-spring`, `--ease-spring`), em vez de trocar de botão. `aria-pressed` em cada opção. `ds/SegmentedControl.tsx`.

### E4. Diálogos com entrada animada — aplicado
- Scrim em fade (200ms) e cartão com pop curto (`translateY(10px) scale(.97)`, 320ms `--ease-screen`). Ver também A1 (foco).

### E5. Pilha de toasts — aplicado
- Até 3 toasts empilhados no rodapé central; entrada `vt-toast-in` com mola, saída `vt-toast-out` 200ms; mensagem repetida renova em vez de duplicar; erro fica 6s (`role=alert`), aviso 4,5s, sucesso 3,2s; botão "Fechar". Lógica em `lib/toast-queue.ts`.

## Dados ao vivo

### E6. Indicadores com ticker e variação — aplicado
- **Implementação:** `createTicker` (`lib/ticker.ts`) guarda o número exibido e toda animação parte dele; o efeito duplo do StrictMode e mudanças no meio da animação continuam de onde o número está (testado).
- **O quê:** `StatTile` numérico: na primeira carga o número sobe do zero; depois rola entre valores (700ms). Cada mudança ao vivo mostra uma variação curta ("+1", "−R$ 12,00") por 2,4s, verde quando a mudança é boa e coral quando é ruim (`goodWhen`), com brilho rápido no cartão.
- **Por quê:** a faixa da frota é o painel da sala de operação; a mudança precisa ser percebida sem ler números.
- **Onde:** `ds/StatTile.tsx`, `lib/ticker.ts`. Faixa da frota e indicadores do Financeiro. "Alertas abertos" agora vem do tempo real (`alert.created`) em vez do refresh de 30s.

### E7. Esqueletos no formato do conteúdo — aplicado
- Linhas-esqueleto com as colunas da tabela, `StatTileSkeleton` com as medidas do cartão, `PanelSkeleton` para fichas, cartões do kanban, lista de cercas e barras do gráfico. Brilho de 1,4s que fica estático com movimento reduzido. Carregamento inicial do painel com a marca "volti" respirando (`vt-breathe`).

### E8. Linha do tempo do comando remoto — aplicado
- **O quê:** três passos Pendente → Em andamento → Confirmado/Falhou ligados por uma linha que se preenche. O passo atual pulsa (azul; laranja com ícone de sem sinal quando `pending` + `offline`), passos concluídos entram com `vt-check-pop`. Quando termina, um toast avisa "confirmado pela moto" ou a falha.
- **Contraste dos pontos (≥ 3:1, WCAG 1.4.11):** ícone `--ink-900` sobre o verde (7,7:1) e sobre o laranja (6,4:1); branco sobre o azul info (4,0:1); o ponto de falha usa `--danger-ink` (coral 600) com ícone branco (3,9:1) em vez do coral 500 (3,1:1). É um desvio do padrão "ícone branco sobre cor" do DS, só neste componente.
- **Onde:** `components/CommandTimeline.tsx`, `lib/command-steps.ts`. O texto do estado (`data-testid="command-state"`, ex.: "moto offline — será aplicado ao reconectar") foi mantido para testes e leitores de tela.
- Usa `command.updated` (realtime) e o fallback de consulta já existente; sem mudança de contrato.

### E9. Indicador "Ao vivo" — aplicado
- Pílula no header: ponto verde com anel pulsando quando o socket está conectado; laranja piscando com "Reconectando" quando cai. No tablet só o ponto. `(panel)/layout.tsx`.

### E10. Alerta crítico em qualquer seção — aplicado
- `alert.created` com prioridade `critical` vira toast de erro ("Alerta crítico: Queda detectada · VLT-0012") fora da fila de alertas; dentro da fila, a linha recém-chegada pisca em coral por 2,4s (`vt-row-new`).

## Mapa

### E11. Movimento suave dos pins — aplicado
- Cada `vehicle.position` faz o pin deslizar da posição desenhada até a nova em 900ms (rAF + `setData`). Motos novas aparecem no destino; saltos maiores que ~1 km (volta de sinal) não animam. `lib/map-anim.ts` (testado).

### E12. Pin com anel de bateria — aplicado
- Pin na cor do status (fixa) com anel externo na cor da bateria (verde >50, sol 21–50, coral ≤20), separado por borda branca. Aplica a regra do DS "estados de bateria sempre em pin e pílula" ao pin circular do admin.

### E13. Pulso da moto selecionada e dica ao passar o mouse — aplicado
- Marcador HTML com dois anéis `vt-pulse-ring` defasados (some com movimento reduzido); dica escura com código (mono), status e bateria.

### E14. Abertura de cluster suave — aplicado (parcial)
- Clique no grupo faz zoom com `easeInOutCubic` em 650ms. **Não aplicado:** "explodir" os pins a partir do centro do grupo — o cluster do MapLibre é recalculado no worker e não expõe a transição; exigiria um cluster próprio (ex.: supercluster no cliente). Proposto para quando a frota passar de algumas centenas de motos.

### E15. Replay com reprodução — aplicado
- A rota se desenha ao carregar (700ms) e o mapa enquadra o trajeto; trecho percorrido em azul forte e o restante a 35%; play/pausa (1x, 4x, 16x); trilha do slider preenchida até a posição. Barra de vidro (`--glass-bg`, `--blur-glass`, mesma receita dos cartões flutuantes do DS) recuada para não cobrir o zoom.
- **Exceção ao movimento reduzido:** a reprodução do replay (play) continua andando com `prefers-reduced-motion`, porque é iniciada pelo usuário e é o próprio conteúdo (a posição da moto ao longo do tempo), não decoração. O que é automático segue a preferência: o desenho da rota e o enquadramento do mapa ficam instantâneos.

### E16. Contagem nos clusters — proposto
- Exige `glyphs` no estilo do mapa para camadas `symbol`. Em produção o Amazon Location fornece; localmente dependeria de um servidor de fontes externo. Alternativa: contagem em marcadores HTML. Fora do escopo desta passada.

## Navegação e teclado

### A1. Paleta de comandos (Ctrl+K) — aplicado
- **O quê:** a busca "Buscar moto, cliente ou aluguel" abre uma paleta: Ctrl+K, Cmd+K ou "/" de qualquer tela; lista motos (com a cor do status), seções e a busca livre de clientes; setas, Enter, Esc. No tablet vira botão redondo.
- **Mantém o comportamento antigo:** código exato abre a ficha da moto; texto livre busca clientes; perfil sem acesso a clientes procura a moto no mapa.
- **Onde:** `components/CommandPalette.tsx`, `lib/palette.ts` (filtro sem acento, ranking, testado). Combobox + listbox com `aria-activedescendant`.
- **Foco no destino:** ao abrir um item, o foco vai para a ficha da moto ou para o título/conteúdo da seção (`#main-content`), não para o `<body>`. Ctrl+K não abre por cima de um diálogo aberto.
- **Proposto para depois:** buscar aluguel por ID e cliente por CPF direto na paleta (hoje vai para a lista de clientes) — dá para fazer com os endpoints atuais (`GET /rentals/{id}`, `GET /customers?q=`), ficou fora por escopo.

### A2. Atalhos — aplicado
- Ctrl+K / Cmd+K / "/" (busca), Esc (fecha diálogo do topo, paleta e ficha da moto), Enter/Espaço em linhas de tabela, setas na paleta e no slider do replay. Os atalhos aparecem no rodapé da paleta.
- **Proposto:** atalhos "g f" (frota), "g a" (alertas) etc. e uma folha de atalhos em "?". Baixo impacto agora.

### A3. Foco e diálogos — aplicado
- Foco preso no diálogo, primeiro campo focado ao abrir (o motivo do comando já chega com o cursor), foco devolvido a quem abriu, Esc só no diálogo do topo (pilha em `lib/focus.ts`), título `h2` com `aria-labelledby`. Campos com borda verde no foco.

## Tabelas e estados

### T1. Tabela com hover, seleção, teclado e cabeçalho fixo — aplicado
- Hover `--ink-50`, seleção `--brand-soft` (hover `--green-100`), transição 200ms; linhas clicáveis focáveis; `aria-selected`, `aria-busy`; ao trocar de página a tabela esmaece enquanto carrega; cabeçalho fixo (opção `sticky`) nas listas de página inteira.

### T2. Estados vazios com ação — aplicado
- Ícone + frase + dica + ação: "Nenhum alerta aberto · A frota está em ordem", "Nenhum cliente para "x" · Limpar busca e filtros", "Nenhuma tarefa pendente · Nova tarefa", "Nenhuma cerca cadastrada · Desenhar área".

### T3. Chips de filtro inline — aplicado (frota)
- Filtros de status com `aria-pressed`, press .97, hover de borda e "Limpar filtro" quando há filtro ativo. **Proposto:** chips removíveis nas listas de aluguéis e auditoria no lugar dos campos de filtro (hoje `Select` e datas).

## Propostos (não aplicados)

### E17. Modo escuro para a sala de operação — proposto
- O DS é claro por princípio ("mapa claro full-bleed", fundos brancos). Um tema escuro geral contraria a marca. **Proposta:** só um modo "sala de operação" para a Frota ao vivo em telão (mapa com tiles escuros, cartões `--ink-800`, mesmas cores de status), ativado manualmente. Precisa de validação de contraste das cores de status sobre fundo escuro (o sol `#FBC531` e o cinza offline ficam bem; o azul `#2F7FE0` precisa de um tom mais claro). Não implementado.

### E18. Contraste do verde com texto branco — proposto
- Botão primário: branco sobre `#34C25C` = 2,3:1 (abaixo de AA para texto normal). Opções: texto `--ink-900` sobre o verde (7,7:1) ou fundo `--green-700` (4,4:1 com branco, AA para texto grande). Mexe na cor de ação da marca: decisão do dono do DS.

### E19. Título único por seção — proposto
- O header de 64px repete o título do `PageHeader`. Proposta: header mostra contexto (ex.: "Clientes / Cliente E2E") e o `PageHeader` fica com o título; ou remover o título do header nas seções com `PageHeader`.

### E20. Saída animada do painel lateral e dos diálogos — proposto
- Hoje fecham na hora. Exige atrasar a desmontagem (estado "saindo"). Baixo impacto, custo médio.

### E21. Kanban com arrastar e soltar — proposto
- Mover tarefa entre Pendente/Em andamento/Concluída com `PATCH /field-tasks/{id}` (já existe). Requer biblioteca de DnD acessível ou implementação com teclado; fora do escopo de aparência.

### E22. Sparklines nos indicadores — proposto
- Mini gráfico de 7 dias no StatTile de receita e ocupação usando `GET /reports/revenue` e `/reports/occupancy` (já existem). Custo: mais 2 consultas na frota.
