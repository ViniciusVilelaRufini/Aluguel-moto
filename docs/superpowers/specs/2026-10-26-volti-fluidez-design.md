# Volti — fluidez, movimento e resposta ao toque (painel e app do cliente)

**Status:** rascunho para aprovação do dono. Escrito em 2026-10-26 durante a madrugada, sem o dono disponível: as perguntas do brainstorming foram decididas a partir do código e do Volti Design System. Cada decisão tomada no lugar do dono está marcada **[Suposição]** e listada em "Decisões para confirmar". Nada deste spec foi implementado.

## 1. Objetivo

Fazer o painel web (`apps/admin`) e o app do cliente (`apps/cliente`) parecerem rápidos e vivos: transições coerentes de entrada **e saída**, retorno imediato a cada clique/toque, mapas que deslizam em vez de saltar, listas que rolam sem engasgo, e um backend que não segura a interface esperando trabalho que o usuário não vê.

Fora de escopo: redesenho de identidade visual, novas telas ou fluxos de produto, modo escuro do painel (conflita com a marca, `docs/design/evolucoes-admin.md`).

## 2. Ponto de partida (fatos do código)

- O DS já tem tokens de movimento (`design-system/tokens/effects.css:9-12`: `--dur-fast 120`, `--dur-base 200`, `--dur-slow 320`, `--dur-screen 440`, `--dur-spring 280`, easings out/spring/in-out/screen, `--press-scale .97`) e 24 keyframes `vt-*` em `motion.css`, com chave global de `prefers-reduced-motion`. O Flutter espelha em `VoltiMotion` (`packages/volti_flutter/lib/src/tokens/shadows.dart:30-60`).
- **Painel:** os tokens são copiados à mão em `apps/admin/src/app/globals.css:15-70` (risco de divergência); o Tailwind só mapeia cores/fontes/raios/sombras. `SidePanel` e `Modal` têm entrada mas **não têm saída**. Nenhuma atualização otimista. O realtime reconstrói o array inteiro de veículos a cada lote de 500 ms e re-renderiza todo consumidor de `useRealtime`; o mapa faz `setData` de todas as features em cada frame de rAF durante a interpolação de 900 ms. `VehicleSheet` faz polling de comando a cada 2,5 s apesar de `command.updated` chegar pelo socket. A lista de frota não é virtualizada (corta em 200) e a carga inicial busca até 20 páginas em série.
- **App do cliente:** transições de rota e Hero já seguem o DS. Mas `splashFactory: NoSplash` (`apps/cliente/lib/core/theme.dart:68`) contradiz o DS v2 ("ripple a partir do toque"); cada tile do mapa é envolvido em `ColorFiltered` (camada de composição por tile → engasgo ao arrastar); na tela de corrida cada `vehicle.position` dá `setState` na tela inteira e `_map.move` instantâneo (o pino e a câmera **saltam**), e um `Timer.periodic` de 1 s também re-renderiza a tela toda (`ride_screen.dart:115,182-216`). Nenhuma lista usa `ListView.builder`.
- **Backend:** sem compressão HTTP nem ETag; geocodificação reversa dentro do caminho da requisição de `/vehicles` (até 1,5 s); `POST /rentals` bloqueia até 30 s + 5 s esperando o desbloqueio IoT, com o app mostrando só um spinner; `track` devolve até 20.000 pontos; o catálogo assina URL nova a cada requisição (anula cache do navegador); sem índice espacial em `Vehicle`.
- **QA visual:** `visual.spec.ts` só tira prints (não compara); nenhum golden no Flutter.

## 3. Abordagens consideradas

1. **Fundação comum + polimento por superfície, medindo antes e depois (recomendada).** Primeiro alinhar tokens e primitivas de movimento (uma fonte → CSS, Tailwind e Dart), depois atacar os gargalos medidos de cada superfície, depois o backend percebido. Mudanças pequenas, revisáveis, cada uma com teste e métrica.
2. **Trocar a base de animação** (framer-motion no painel, flutter_animate no app). Ganha API declarativa, mas duplica o que o DS já tem, aumenta bundle e reabre decisões de motion já aprovadas. Rejeitada por YAGNI.
3. **Só desempenho, sem movimento novo.** Resolve engasgos, mas deixa as saídas abruptas e a falta de retorno ao toque, que são metade do pedido. Rejeitada.

## 4. Desenho

### 4.1 Fundação de movimento (compartilhada)

- **Fonte única de tokens:** `design-system/tokens/*.css` continua a fonte da verdade. Um script `pnpm tokens:sync` (em `/design-system`) gera `apps/admin/src/styles/tokens.css` (substitui o bloco copiado de `globals.css`) e um preset Tailwind (`design-system/tailwind-preset.cjs`) com `transitionDuration`, `transitionTimingFunction`, `spacing`, `fontSize`, cores de status/coral/azul/violeta, raio pill e sombras sheet/coral. Um teste falha se `volti_flutter` divergir dos valores CSS (durações/curvas/cores), e os tokens que hoje só existem no app (`brandAction`, `warningInkStrong`, `dangerInkStrong`) entram no CSS.
- **Tokens novos (mínimos):** `--dur-exit 160` e `--ease-exit` (saídas mais curtas que entradas), `--spring-drag` (já documentado em `docs/design/evolucoes-app.md:40-45`). **[Suposição]** valores: saída = 0,8× a entrada correspondente.
- **Regra de redução de movimento** mantida: estado final no primeiro frame (`docs/design/evolucoes-*.md`).

### 4.2 Painel web

1. **Presença com saída:** um hook `usePresence(open, exitMs)` (mantém montado até a animação de saída terminar) aplicado a `SidePanel`, `Modal`/`ReasonDialog`, `CommandPalette`, popovers e `Toast` (este já tem saída). Keyframes de saída `panel-out`, `dialog-out`.
2. **Navegação entre seções:** esqueleto por seção (`loading` visual imediato no clique, não `null`), prefetch dos dados da seção no hover/focus do item do menu (`queryClient.prefetchQuery`), manter a seção anterior visível até a nova ter dados (sem piscar branco).
3. **Retorno imediato a ações:** atualizações otimistas com rollback nas mutações frequentes (reconhecer/resolver alerta, atribuir/concluir tarefa, bloquear/desbloquear cliente, editar zona, pausar/retomar no painel), com o padrão `onMutate`/`onError`/`onSettled` e toast de desfazer onde o contrato permite. Comandos IoT **não** são otimistas: mostram estado "enviando → pendente → confirmado" vindo do socket.
4. **Realtime sem re-render global:** trocar o contexto único por um store externo (`useSyncExternalStore`) com seletores por veículo/contagem; o mapa recebe deltas e atualiza só as features que mudaram (`setData` uma vez por frame, sobre o array já mantido, ou `updateData` por id onde a versão do MapLibre permitir); remover o polling de 2,5 s do `VehicleSheet` (usar `command.updated`, com polling apenas de reserva se o socket cair).
5. **Listas:** virtualização (`@tanstack/react-virtual` **[Suposição]** — dependência nova pequena, a ser aprovada) na lista de frota e nas tabelas longas; carga inicial da frota em paralelo limitado (3 páginas por vez) em vez de 20 em série.
6. **Microinterações:** estados hover/press/focus uniformes via classes geradas dos tokens (remover estilos inline de animação), `.vt-stagger` nas entradas de listas, contadores animados (`ticker`) nos StatTiles.

### 4.3 App do cliente

1. **Toque:** reativar ripple (`InkSparkle`/`InkRipple` com cor do DS) em botões e linhas tocáveis, mantendo o `.97` de `VoltiPressable`; háptico já existe.
2. **Mapa:** remover `ColorFiltered` por tile (aplicar o filtro uma vez sobre a camada de tiles ou usar tiles já estilizados **[Suposição]**: filtro único sobre a `TileLayer`); na corrida, interpolar posição do pino e mover a câmera com animação (`AnimatedMapController` ou tween próprio de 800–1000 ms com `easeOut`), sem animar saltos > 1 km (mesma regra do painel, `lib/map-anim.ts`).
3. **Re-render localizado:** extrair o cronômetro (1 s) e o bloco de posição para widgets próprios com `ValueListenableBuilder`/providers estreitos, para que o mapa não reconstrua a cada segundo.
4. **Listas preguiçosas:** `ListView.builder`/`SliverList` em histórico, carteira, extrato, suporte/chat e ajuda.
5. **Desbloqueio com progresso:** a tela de plano mostra etapas ("reservando a moto → caução → seguro → destravando") alimentadas por eventos do backend (ver 4.4.2), com estado de sucesso `VoltiSuccessCheck` e erro claro, em vez de um spinner de até 35 s.
6. **Polling → eventos** onde o socket já existe (chat de suporte, recarga, Pix, retorno), mantendo polling de reserva.

### 4.4 Backend (latência percebida)

1. **Compressão e cache:** `compression` (gzip/br) no Nest; `ETag`/`Cache-Control: private, max-age` curtos para catálogo, planos, zonas e consentimentos; URLs assinadas do catálogo cacheadas até perto do vencimento (mesma URL por ~10 min).
2. **Início de aluguel com progresso:** **[Suposição]** manter o contrato síncrono de `POST /rentals` (sem quebrar clientes) e publicar eventos `rental.start-progress` pelo realtime na sala do cliente a cada etapa; paralelizar etapas independentes (seguro e caução após a reserva da moto). Mudança de contrato só em `packages/contracts/realtime.md` (evento novo), registrada em `docs/decisoes.md`.
3. **Geocodificação fora do caminho:** endereço vem de cache (Redis, por célula de ~100 m) preenchido de forma assíncrona; a resposta de `/vehicles` nunca espera o geocoder.
4. **Trajeto:** parâmetro opcional de simplificação (`?simplify=`; Douglas-Peucker no servidor) para replay e recibo — mudança de contrato a registrar.
5. **Índice espacial** em `Vehicle` (geography de lat/lng) para `nearby` crescer com a frota.

## 5. Erros e estados

Toda ação tem quatro estados visuais (ocioso, enviando, sucesso, erro) com transição entre eles; erro de rede mostra a mensagem do problema em pt-BR e permite repetir; atualizações otimistas revertem com animação e toast. Socket caído: o painel mostra "Reconectando…" (pill já existe) e volta ao polling de reserva.

## 6. Medição e testes

- **Métricas de aceite [Suposição]:**
  - Painel com 500 veículos simulados: INP < 200 ms no clique de um pino e na abertura do `VehicleSheet`; nenhuma long task > 50 ms durante os lotes de realtime; abertura/fechamento de painel lateral sem layout shift.
  - App (perfil, Pixel_10): tela de corrida sem frames > 16 ms durante 60 s de telemetria simulada; arrastar o mapa da home sem jank.
  - Backend: `GET /vehicles` p95 < 300 ms sem geocoder; payload JSON comprimido ≥ 60% menor.
- **Testes:** Playwright com API mockada (o harness `apps/admin/e2e-mock/` criado no loop de QA de 2026-10-26) passa a ter `toHaveScreenshot` nas telas principais e um teste de desempenho com tracing (long tasks) no mapa da frota; vitest para `usePresence`, store de realtime e otimistas; Flutter: widget tests das transições/ripple e goldens das telas principais; teste de performance com `flutter drive --profile` na tela de corrida; jest no backend para compressão, ETag, eventos de progresso e cache do geocoder.

## 7. Ordem de entrega (sub-projetos)

1. Fundação de movimento (4.1) — destrava os demais.
2. Painel: presença/saídas, navegação e microinterações (4.2.1, 4.2.2, 4.2.6).
3. Painel: realtime, mapa e listas (4.2.4, 4.2.5) e otimistas (4.2.3).
4. App: toque, mapa, re-render e listas (4.3.1–4.3.4, 4.3.6).
5. Backend: compressão, cache, geocoder, índice (4.4.1, 4.4.3, 4.4.5).
6. Início de aluguel com progresso (4.4.2 + 4.3.5) e simplificação de trajeto (4.4.4).

Cada sub-projeto termina com lint, testes, README atualizado e prints antes/depois em `docs/design/screenshots/`.

## 7.1 Ajustes ao spec descobertos ao escrever o plano (prevalecem sobre o texto acima)

1. O cursor de `GET /vehicles` é opaco: a carga inicial é paralela por `status`, não "3 páginas por vez" (sem mudar o contrato).
2. O progresso do início de aluguel vai para a sala `user:{customerId}` (o cliente ainda não está em `rental:{id}`), com `attemptId` = `Idempotency-Key`.
3. Ordem real do início: caução → seguro → reserva da moto → destravamento; caução e seguro ficam em paralelo só no cartão.
4. Chat, recarga e Pix não têm eventos no socket do cliente: só a devolução passa de polling para evento.
5. Otimistas só onde há endpoint: não há "reconhecer alerta", "concluir tarefa" não é do painel e pausar/retomar assinatura é do cliente.
6. Cache HTTP: `private, no-cache` + ETag (não `max-age`, que deixaria o painel velho logo após salvar).
7. Cache do geocoder mantém a grade atual (~11 m), não ~100 m.
8. Contadores animados nos StatTiles e ripple nos botões já existem; o `NoSplash` está em `packages/volti_flutter/lib/src/theme.dart:68`.
9. `--ease-exit` = `cubic-bezier(.4,0,1,1)`.
10. Sem tarefa: popovers (não existem no painel) e Central de ajuda (5 perguntas fixas).

## 8. Decisões para confirmar

1. Saídas com 0,8× a duração da entrada (`--dur-exit 160`).
2. Dependência nova `@tanstack/react-virtual` no painel.
3. Filtro de cor único sobre a camada de tiles no app (em vez de tiles pré-estilizados de outro provedor).
4. `POST /rentals` continua síncrono, com eventos de progresso pelo realtime (em vez de 202 + polling).
5. Parâmetro `simplify` em `track` (mudança de contrato).
6. Métricas de aceite da seção 6.
