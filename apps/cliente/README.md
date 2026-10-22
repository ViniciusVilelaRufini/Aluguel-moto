# App do cliente Volti (`apps/cliente`)

Flutter (Android e iOS; alvo web só para verificação). Usa `packages/volti_flutter` (tema, widgets, API e auth) e o cliente gerado `volti_api`.

## Rodar

```bash
cd apps/cliente
flutter pub get
# contra o mock Prism (pnpm --filter @volti/contracts mock, porta 4010)
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4010
# contra a API de dev (emulador Android usa 10.0.2.2)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Variáveis `--dart-define`: `API_BASE_URL`, `AUTH_MODE=dev|cognito` (padrão `dev`; build release sempre usa cognito), `SUPPORT_PHONE` (telefone do botão SOS), no modo cognito `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REDIRECT_URI` (ver Login), `FIRST_RIDE_PROMO=true` (liga o cartão "1ª corrida grátis" da home e o selo "1ª grátis" da lista para clientes sem aluguéis; padrão desligado, porque o contrato ainda não diz se a promoção existe; a boas-vindas não mostra promoção), `MAP_TILE_URL`, `MAP_TILE_REFERENCE_URL` e `MAP_TILE_ATTRIBUTION` (tiles dos mapas, ver abaixo), `TERMS_URL` e `PRIVACY_URL` (links dos termos de uso e da política de privacidade no rodapé da boas-vindas; sem eles, o link avisa que o documento não está publicado neste ambiente).

## Mapas (tiles)

Todos os mapas do app (home, boas-vindas, corrida, devolução e recibo) passam por `VoltiMap` e pela camada comum `voltiTileLayer` (`lib/core/map_tiles.dart`).

**Padrão de desenvolvimento:** Esri World Light Gray Canvas, raster sem chave. A URL é `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` (atenção à ordem `{y}/{x}`). Por cima vai a camada de rótulos `World_Light_Gray_Reference`, sem o filtro de cor. A atribuição "Esri, HERE, Garmin, © OpenStreetMap contributors" fica numa pílula de vidro; tocar nela abre `openstreetmap.org/copyright`.

Provedores descartados:
- o OSM público é proibido para apps;
- o CARTO público passou a exigir chave e devolve um tile "API KEY" com status 200.

**Configuração:** `--dart-define=MAP_TILE_URL=...`, `MAP_TILE_REFERENCE_URL=...` (vazio desliga a camada de rótulos; com um `MAP_TILE_URL` próprio ela já vem desligada) e `MAP_TILE_ATTRIBUTION=...`. O User-Agent usa o id real do pacote (`br.com.volti.volti_cliente`). `@2x` só é pedido quando o template tem `{r}`.

**Falhas de tile:**
- o `NetworkTileProvider` tenta de novo (`RetryClient`);
- tiles com erro são descartados ao sair da tela;
- em debug, cada falha vira uma linha JSON `map.tile_error`.

**Proteções contra mapa quebrado:**
- Em debug, a sonda da inicialização (`checkMapTilesAtStartup`) baixa dois tiles de lugares diferentes. Bytes idênticos (tile de aviso), erro HTTP ou resposta que não é imagem gravam `map.tile_probe_failed`.
- Em release com um provedor de dev, um aviso vai para o log do sistema.
- Na boas-vindas, 4 erros trocam o mapa pela ilustração e escondem a atribuição.

Em release, o `main` silencia o `debugPrint`, porque o z/x/y do tile revela a região que o mapa mostra.

**Bloqueio de lançamento (docs/decisoes.md, 2026-10-22):** os basemaps da Esri sem chave são só para desenvolvimento e testes. Antes de lançar, troque por um provedor licenciado (MapTiler, Stadia ou Esri com chave) via `MAP_TILE_URL`.

## Boas-vindas (referência `login-referencia.png`)

`WelcomeScreen` (`features/onboarding/welcome_screen.dart`) tem duas partes. Em cima fica o hero animado (`WelcomeHero`, `welcome_hero.dart`). Embaixo fica a folha branca, com estes elementos:

- selos com ícone;
- "Pegue uma moto **e vá.**";
- **Continuar com celular** (OTP);
- "ou entre com", seguido de Apple / Google / E-mail. Apple e Google usam o Hosted UI do Cognito; no modo dev só mostram um aviso;
- os termos, com os dois links.

A nota do modo dev só aparece em debug, pequena, sob os termos.

O hero ocupa a faixa livre acima da folha. A altura da folha é medida e o layout dos chips é relativo a essa faixa (`HeroLayoutDelegate`). O hero tem:

- **Mapa real** de Pinheiros (tiles do `MAP_TILE_URL`, filtro do DS, sem interação), centrado no galpão (-23.5654, -46.6847, zoom 15), com deriva lenta da câmera (pan + zoom, 20 s ida e volta). A deriva é um `Transform` sobre um `RepaintBoundary` estático e não reconstrói os tiles.
- **Galpão** com anel pulsando.
- **Quatro motos andando** por trechos reais (Rua dos Pinheiros, Teodoro Sampaio, Faria Lima e Fradique Coutinho), com velocidades e defasagens diferentes, aparecendo e sumindo nas pontas. Ficam recortadas 16 px acima da folha.
- **Moto em destaque** (`assets/images/volti_moto_hero.webp`, fundo transparente), centrada embaixo com até 70% da largura. Sobe e cresce de 0,92 a 1 em cerca de 600 ms, depois flutua 2,5 px num ciclo de 3 s, com uma sombra elíptica que acompanha a flutuação.
- **Chips**, com afirmações verdadeiras do serviço e sem números inventados. Entram em cascata, com 80 ms entre eles:
  - linha 1: logo e "• Retire no galpão" (ícone do galpão);
  - linha 2: o cartão "Planos diário, semanal e mensal · ou por minuto e hora" (ícone de calendário) e a pílula escura "Seguro incluso | Troca de bateria". Em telas estreitas (< 392 px), a pílula desce para uma linha própria, com as duas partes lado a lado.

  Nenhum chip é pintado sobre a moto, que fica com o que sobra (até 70% da largura). Não há promoção na boas-vindas: o `FIRST_RIDE_PROMO` vale só para a home e a lista.
- **Área livre do mapa:** o galpão fica entre os chips e a moto ou, em telas baixas, à esquerda da moto. As motos **saem do galpão** pelas ruas (Rua dos Pinheiros e Fradique Coutinho) e só andam na faixa do mapa, a 16 px das bordas. Somem onde ficariam atrás de um chip ou da moto e seguem a mesma matriz de deriva do mapa, ficando sobre as ruas.
- **Mapa:** o mapa é maior que o hero (32 px de folga em cada lado) e é criado uma vez só; mudanças de layout movem a câmera pelo `MapController`. O `VoltiMap` guarda um provedor de tiles por camada durante a vida do mapa, e tiles com erro são pedidos de novo até 3 vezes. Todos os mapas usam **um cliente HTTP de tiles compartilhado, que nenhum mapa fecha** (`RetryClient` sobre `IOClient` com até 6 conexões por host; no web, o cliente padrão), sem abortar pedidos obsoletos. O abort fica desligado em todos os mapas, inclusive na home: um pedido abortado vira PNG transparente no `ImageCache`, e qualquer outro mapa que peça a mesma URL enquanto ele está em andamento recebe a imagem vazia. O `ImageCache` identifica o tile pela URL, então mapas diferentes dividem o mesmo pedido em andamento. No flutter_map 8, um cliente fechado (o `TileLayer` descartava o provedor ao sair da tela) ou um pedido abortado vira um PNG transparente "carregado". A home monta o mapa por um instante na abertura e era fechada no meio dos pedidos; a boas-vindas, que esperava os mesmos tiles, ficava com a coluna em comum vazia para sempre. Essa era a costura do hero, diagnosticada no emulador. Com `--dart-define=MAP_DEBUG=true`, o build de debug registra no logcat (tag `VOLTI_DBG`) a câmera e cada tile. A `TileLayer` tem `panBuffer: 1` e `keepBuffer: 2`, e o mapa do hero só é criado quando a folha já foi medida, para a câmera não se mover logo depois de abrir. Enquanto os tiles chegam, o fundo é um cinza liso: a ilustração desenhada só entra quando o mapa falha de vez.

A camada visual do hero é decorativa: fica dentro de `ExcludeSemantics` e `IgnorePointer`. Fora dela, há nós de semântica nos retângulos reais do logo ("Volti", cabeçalho), do "Retire no galpão", do cartão dos planos e da pílula. Cada grupo de animação tem um ticker próprio.

Em situações especiais:

- **Reduced motion:** tudo fica parado no estado final.
- **App em segundo plano ou rota coberta** (`TickerMode`): os controllers param.
- **Tiles falhando** (4 erros): o mapa sai e entra a ilustração desenhada, sob os mesmos chips. A tela nunca fica cinza.

A atribuição do mapa fica na borda de cima da folha.

Com texto acima de 100%, as três afirmações ("Retire no galpão", o cartão dos planos e a pílula) descem para a folha e escalam com o texto. No hero, os textos escalam até 1,3x.

**Tamanho da moto (trade-off):** nenhum chip pode cobrir a moto, então ela fica com o espaço que sobra entre os chips e a folha, e encolhe em telas baixas. Valores atuais, em fração da largura da tela (debug tem a nota de dev na folha; release não tem):

| Tela | Debug | Release |
|---|---|---|
| 360×740 | 0,22 | 0,31 |
| 360×800 | 0,38 | 0,45 |
| 393×852 | 0,38 | 0,45 |
| 412×915 | 0,53 | 0,61 |

Os testes de sobreposição fixam esses valores com tolerância de 0,02. Com 200%, os botões quebram linha, Apple/Google/E-mail empilham e a folha rola por cima do hero.

Testes em `test/cliente_login_test.dart`.

## Estrutura

- `lib/core`: `Backend` (única fronteira com a API; os testes usam um fake), sessão, rotas (go_router), tempo real (Socket.IO), localização, push, tokenização de cartão, widgets comuns (`AsyncView`, `ErrorState`, `VoltiMap`).
- `lib/features/<tela>`: onboarding, home (mapa com o galpão), pick ("Escolha sua moto" do galpão), plan (plano, seguro e Pix), pickup (retirada agora/agendada e regras de horário), reservation (reserva com QR), handover ("Confira sua moto" e o vigia da entrega), ride (corrida e "Trocar bateria"), return_flow (ponto verde ou galpão), summary, account.
- `lib/l10n/app_pt.arb`: todos os textos (pt-BR).

## Motion (design v2)

Transições de tela em `core/transitions.dart` (`voltiPage` + `routeTransitions`, mapa rota → transição em `docs/design/evolucoes-app.md`): funil e conta em push lateral (440 ms `--ease-screen`, fade sutil, parallax da tela de trás); QR da reserva, "Confira sua moto" e recibo sobem de baixo (a de trás recua); boas-vindas, cadastro, início e corrida em fade-through. Abrir usa `--ease-screen` e fechar usa a curva invertida. Voltar do sistema e voltar preditivo do Android funcionam (`android:enableOnBackInvokedCallback="true"` no manifesto; a tela segue o dedo). Pendente: arrastar da borda no iOS (`CustomTransitionPage` não tem o gesto do Cupertino). O cabeçalho do plano, do seguro e da retirada mostra a foto do modelo (`FlowHeader(heroModelId:)`), então o Hero voa foto → foto. Passos do cadastro cruzam o conteúdo no eixo X e a barra enche (`OnboardingStepSwitcher`). Reduced motion ou leitor de tela (`accessibleNavigation`): troca instantânea, sem deslize nem fade. Rota nova precisa de entrada em `routeTransitions` (`test/transitions_test.dart` cobra). Listas e seções entram em cascata (`VoltiStagger.wrap`), a miniatura da moto voa da lista para o cabeçalho do plano (Hero, desligado em reduced motion), posição do usuário pulsa, rotas se desenham (`DrawnPolyline`), recibo mostra `VoltiSuccessCheck`. Tudo respeita reduced motion (`MediaQuery.disableAnimationsOf`). Animações infinitas (pulso, brilho, ponto ao vivo) impedem `pumpAndSettle`: use `pump(duration)` nos testes dessas telas.

Toque e seleção (E-21): os botões, chips e cartões de escolha vêm do `volti_flutter` (press com mola, sombra que baixa, loading sem salto, seleção em tween). "Confirmar reserva" (retirada) e "Aceitar e destravar" (entrega) tocam háptica leve no toque e, quando o servidor confirma, mostram o check de sucesso no próprio botão por 700 ms antes de navegar (sem espera com reduced motion; com caução Pix pendente o QR abre direto). A escolha da moto usa `VoltiRadio` e os consentimentos (cadastro, contato de emergência) usam `VoltiCheckbox`. Durante o aceite da entrega o voltar (botão e sistema) fica bloqueado. `VoltiButtonLabels` no `builder` do app dá ao leitor de tela "Carregando…"/"Concluído". Nos testes, `VoltiHaptics.debugHandler` grava a háptica.

## Design pass (UI/UX)

Auditoria em `docs/design/auditoria-app.md` e evoluções em `docs/design/evolucoes-app.md`. Resumo: HUD da corrida com `VoltiSpeedGauge`, números que rolam (`VoltiTicker`) e faixas animadas (`VoltiStatusBanner`); esqueletos (`AsyncView(loading:)` + `VoltiSkeleton`); estados vazios (`VoltiEmptyState`); puxar para atualizar; cartão da moto arrasta para fechar; háptica semântica (`VoltiHaptics`); coreografia de sucesso no Pix, devolução e recibo; confirmação ao cancelar a renovação. O mapa da home também respeita `mapEnabledProvider` (testes sem tiles). Testes do design pass em `test/design_pass_test.dart` (reduced motion, semântica, texto a 200%).

## Retirada em galpão (spec 2026-10-22, Task 9)

O cliente não acha moto na rua: escolhe no app e retira no galpão.

- **Home** (`/home`): mapa com o galpão em destaque, pontos verdes de devolução (zonas `return`) e estações de bateria (`GET /swap-stations`); sem motos na rua e sem "Escanear para andar". Cartão fixo "Galpão Volti · <bairro> · N motos disponíveis" (`Depot.district`, `availableVehicleCount`), "Aberto até 20h" / "Fechado · abre seg. às 7h", endereço e **Escolher moto**. Com vários galpões o cartão vira seletor (chips, mais perto primeiro por `distanceM`; sem localização — sem consentimento ou sem GPS — a API não manda `distanceM` e fica a ordem da API). `currentDepotProvider` = galpão escolhido ou, sem escolha, o mais perto.
- **Cartão "Sua reserva"** (`features/home/home_reservation_card.dart`): com reserva em aberto (`active` ou `handover`, `isPendingReservation`) ele ocupa o lugar do cartão do galpão (a faixa escura "Moto reservada · Ver reserva" saiu). Foto do modelo (`VehicleModel.photoUrl` pelo `vehicleModelId`; sem foto, ícone), nome e código; status "Retire até 15:28" com a contagem ao vivo (agora), "Retirada agendada · amanhã às 09:00" (agendada) ou "Sua moto está sendo entregue" (entrega); galpão e endereço com **Como chegar** (só no toque); **Ver QR da reserva** (`/reservation/:id`) ou, em `handover`, **Conferir moto** (`/handover/:id`). "Escolher moto", o seletor de galpões e o passe somem enquanto há reserva (só uma por vez); o passe também some no modo estações (cobria um marcador). A troca galpão ↔ reserva desliza e funde (`durScreen`/`easeScreen`); reduced motion troca na hora. A contagem usa o `clockProvider` (relógio do servidor), anda de segundo em segundo só com a home visível (`TickerMode`) e o app em primeiro plano, nunca passa da duração da reserva (`reservationRemaining`) e, ao zerar, recarrega a reserva uma vez (a API devolve `expired`/nada e o cartão do galpão volta; se ainda vier ativa, mostra "O prazo de retirada acabou"). Leitor de tela: o cartão é um contêiner com "Reserva da Volti Urbana VLT-0026, retire até 15:28" e o tempo vai em minutos ("Faltam 88 minutos"), sem anúncio por segundo.
- **Escolher moto** (`/pick`): `GET /depots/{id}/vehicles`; foto do modelo (`VehicleModel.photoUrl`, inteira — `contain` — num quadro branco, para foto de produto em fundo branco; sem foto, ícone), categoria (`categoryLabel`) e, embaixo, a descrição curta do modelo em até 2 linhas (`VehicleModel.description`, fatos-chave primeiro, ex.: "32 km/h · sem CNH · 1000 W · cesto e garupa"; a foto é decodificada no tamanho da miniatura e o catálogo fica 12 h em memória na sessão para o link assinado — e a foto em cache — não mudar a cada visita), código, bateria/autonomia e preço por modelo (`pricePerMinuteCents`); sem distância. Filtro por modelo na ordem do catálogo (`VehicleModel.sortOrder`; fora do catálogo, alfabética); **Continuar** (com "<modelo> · <código>" na segunda linha do botão, que quebra em vez de cortar o código) não reserva, só segue.
  - **Pílula de bateria clara** (`BatteryPill(light: true)`): fundo `surfaceContainerHighest`, texto escuro e raio colorido pela carga. As faixas são as mesmas em todas as pílulas e temas (`VoltiColors.batteryLevel`): ≥ 50% verde, ≥ 20% âmbar, abaixo disso coral. É usada na lista, na conferência da moto e no HUD da corrida.
  - **Detalhes:** pressionar e segurar um cartão abre os detalhes no lugar, com altura animada pelos tokens (reduced motion: instantâneo). Aparecem a descrição inteira, a categoria, a potência e a velocidade (lidas da descrição), a bateria e a autonomia, o preço por minuto, a taxa de desbloqueio do plano avulso e o código. Fechado, o cartão mostra uma dica pequena "Detalhes ⌄", que também abre ao tocar. Segurar de novo, tocar na seta ou segurar outro cartão fecha; fica um aberto por vez. O toque normal continua só selecionando. Ao abrir há háptica de seleção. O leitor de tela ganha a ação "Ver detalhes"/"Recolher" e ouve o estado aberto/fechado.
  - **Botão flutuante:** não há rodapé opaco. A lista rola por baixo do botão (16 px nas laterais, mais a área segura), com um véu suave (transparente → superfície a 60%) que não recebe toques (`IgnorePointer`). A lista tem espaço embaixo para o último cartão subir acima do botão, e o aviso de KYC flutua como cartão acima dele.
- **Plano** (`/plan`, extra `DepotSelection`): diário, semanal e mensal em destaque; "Outras opções" (minuto, hora) recolhidas; semanal/mensal avisam que renovam.
- **Seguro** (`/insurance`): básico obrigatório, pré-marcado e não removível; completo opcional com o que cobre.
- **Retirada** (`/pickup`): "Retirar agora (até HH:MM)" ou "Agendar" (dias até `maxScheduleDays`, domingo/dia sem horário aparece "Fechado", horários de 30 em 30 min). Resumo (plano, seguro, caução pela cotação), cupom, caução cartão ou Pix (Pix pré-selecionado sem cartão), consentimento de localização (decisão #8) e **Confirmar reserva** (`POST /reservations` com `depotId`, `pickupMode`, `pickupAt`, `planCode`, `coverage`, `depositMethod`, `cardId`, Idempotency-Key). Caução Pix abre a folha Pix existente. 409 `vehicle-unavailable` → "Essa moto acabou de ser reservada" e volta à lista.
- **Reserva confirmada** (`/reservation/:id`): QR do `pickupCode` (`qr_flutter`), moto, prazo ("Retire até 12:00") ou horário agendado com tolerância, endereço com **Como chegar** (só abre o app de mapas no toque, `openDirections`: `geo:` no Android e o Google Maps web `/maps/dir/?api=1`), aviso com "Tentar de novo" quando a reserva vem sem `pickupCode` (a resposta da criação semeia a tela), **Cancelar reserva** com confirmação. Com status `handover` o cancelar some e aparece "Sua moto já está sendo entregue. Use Apontar problema."; um 409 `reservation-in-handover` mostra o mesmo aviso.
- `/scan` (com ou sem `?swap=`) e `/reserved` (links antigos) redirecionam para `/home`: o cliente não escaneia moto nem troca de moto no meio da corrida (o "Reportar problema" só reporta; `docs/decisoes.md`). `/plan`, `/insurance` e `/pickup` sem `extra` também voltam à home.

## Entrega, bateria e devolução no galpão (spec 2026-10-22 §3.7–3.9, Task 10)

- **Confira sua moto** (`/handover/:id`, `features/handover/handover_screen.dart`): `GET /handovers/{id}`; fotos da saída (`photoUrls`), bateria (`batteryPct`, `batterySerial`), checklist (`freios`, `luzes`, `pneus`, `buzina`, `painel`, `carenagem`; outro código aparece como veio) com a observação do operador e só o primeiro nome dele. **Aceitar e destravar** → `POST /handovers/{id}/accept` com uma Idempotency-Key gerada uma vez por entrega e guardada no estado da tela (toque duplo e nova tentativa mandam a mesma); 201 abre `/ride`. O texto diz que o aluguel começa agora e que o plano é acertado no fim, com a caução de garantia (nada de "cobrado agora"; o plano e a retirada dizem o mesmo). O aviso de `lastError` some enquanto o aceite está em andamento. Erros: 422 `payment-declined`/`deposit-not-held` mostram o motivo e a tela fica (o `lastError` da entrega também aparece ao reabrir); 422 `handover-not-pending` recarrega e mostra o estado novo; 404 volta ao início ("Essa entrega não foi encontrada."). **Apontar problema** abre a folha com o motivo (3–500 caracteres) → `POST /handovers/{id}/dispute` → "O suporte vai falar com você." com **Falar com o suporte**; 422 `handover-not-pending` fecha a folha e recarrega a entrega. Entrega aceita mostra **Ir para a corrida**; cancelada manda falar com o operador. `handover.updated` da entrega aberta recarrega a tela.
- **Quem abre a entrega** (`features/handover/handover_watch.dart`, `HandoverWatcher`): fica no início e na reserva enquanto há reserva de galpão. `handover.pending` da reserva atual abre `/handover/:id`; reserva já em `handover` (app aberto depois do evento, `GET /reservations/current` com `handoverId`) também abre, uma vez por entrega na sessão (voltar ao início não empurra de novo); `handover.updated` e uma consulta a cada 15 s atualizam a reserva, para seguir mesmo sem tempo real. A consulta é uma só para todos os vigias (`reservationPollerProvider`), roda só com a reserva `active` e o app em primeiro plano (`AppLifecycleListener`; ao voltar consulta na hora), para em `handover` ou sem reserva e volta quando a reserva fica ativa. A reserva em `handover` mostra **Conferir moto**; cancelar continua recusado ("Sua moto já está sendo entregue. Use Apontar problema.").
- **Tempo real do cliente** (`core/services.dart`): `customerRealtimeProvider` abre uma conexão só (sala `customer:{id}`) enquanto alguma tela ouve `customerEventsProvider`; eventos novos `HandoverPending` e `HandoverUpdated`.
- **Trocar bateria** (chip da corrida, `features/ride/battery_sheet.dart`; falha de `GET /swap-stations` mostra erro com "Tentar de novo", o galpão continua na lista): o galpão primeiro (pela estação dele, `Depot.swapStationId`, com as baterias disponíveis, ou o próprio galpão, "Troca com o operador") e depois `GET /swap-stations` sem repetir a do galpão. A rota só abre no toque (`openDirections`: `geo:` no Android, depois `https://www.google.com/maps/dir/?api=1&destination=`). O galpão do aluguel (`rentalDepotProvider`) é o da moto (`Vehicle.depotId`) ou, sem ele, o mais perto. Sem troca de moto no app.
- **Devolver no galpão** (`/return/:id`, segmento "Galpão"): endereço do galpão com **Como chegar** (galpão não encontrado: aviso com "Tentar de novo"), "Leve a moto ao galpão e entregue ao operador…" e a espera (ícone fixo em reduced motion). A devolução não abre outro socket: a corrida repassa os eventos dela (`rideEventBusProvider`) e, com a devolução aberta (`returnScreensOpenProvider`), só a devolução reage ao fim do aluguel. Sem devolução, a corrida fecha diálogos e folhas abertos e abre o recibo. O operador registra a chegada (`return_depot`); `handover.updated` de uma entrega `return_depot` deste aluguel (conferida por `GET /handovers/{id}`) abre o recibo (`/summary/:id`). A corrida também ouve esse evento. Como reforço, `rental.updated` encerrado e uma consulta do aluguel a cada 10 s (só com o segmento "Galpão" aberto; para ao abrir o recibo ou voltar a "Ponto verde") abrem o recibo (a API de hoje encerra o aluguel na chegada, mas não emite `handover.updated` para `return_depot`).

## Pontos de troca de bateria na home (branch `feat/cliente-estacoes`)

- **Botão** no canto direito do mapa, acima de "Minha localização": `VoltiIconButton` branco com `batteryCharging` (44 px, rótulo "Pontos de troca de bateria", estado ligado/desligado no leitor de tela; ligado fica verde de ação). Tocar liga o **modo estações**; tocar de novo, fechar a folha (X) ou o voltar do Android desliga e o cartão do galpão volta. Ao ligar, `swapStationsProvider` busca de novo (a contagem de baterias é ao vivo).
- **Marcadores** (`features/home/stations/station_markers.dart`): no modo estações, cada estação vira um disco de 52 px com o raio e um selo com `availableBatteries`: verde (≥ 3), âmbar (1–2) e cinza (0). O rótulo do marcador lê "nome: N baterias disponíveis" e o nó tem ação de toque (leitor de tela). Tocar centra o mapa. A estação do próprio galpão (`Depot.swapStationId` ou a até 30 m, `splitDepotStations`) não ganha marcador por cima: o selo vai no marcador do galpão, que continua tocável e anuncia as baterias. O número do selo acompanha o texto do sistema até 1,3×.
- **Folha "Troca de bateria"** (`features/home/stations/stations_sheet.dart`, `VoltiBottomSheet` no lugar do cartão, sem modal, então o mapa continua visível): o galpão primeiro quando ele é ponto de troca (`Depot.swapStationId`), depois as estações por `distanceM`. Sem localização (sem consentimento ou sem GPS) a API não manda `distanceM` e fica a ordem da API. Cada linha mostra nome, endereço · distância, a pílula clara de baterias (estilo E-25: "8 baterias disponíveis", "1 bateria disponível", "Sem baterias no momento"), "Aberto 24h" ou o `openingHours` publicado e **Como chegar** (`openDirections`, só no toque). Tocar na linha centra o mapa. Erro de rede: `ErrorState` com "Tentar de novo". Lista vazia: "Nenhum ponto de troca por perto".
- **Extensão futura:** `StationsSheet(extraActions:)` recebe ações extras por linha, ao lado de "Como chegar", para o "Trocar aqui" da troca por QR (em especificação; não implementado).
- Lógica pura em `features/home/stations/station_logic.dart` (`orderSwapPoints`, `stationAvailability`, `stationHoursLabel`); reaproveita `swapPlaces` da folha da corrida. Testes em `test/home_stations_test.dart`.

Aberto/fechado e horários saem de `Depot.openingHours`, `timezone`, `maxScheduleDays` e `pickupNowWindowMinutes` em `features/pickup/depot_hours.dart`, espelho de `services/api/src/modules/depots/depot-rules.ts` (fechamento exclusivo; último horário = fechamento − 30 min; "agora" vence no menor entre agora + janela e o fechamento de hoje; horários passados e além de `maxScheduleDays` saem). O servidor valida de novo. Fusos do Brasil com deslocamento fixo (sem horário de verão).

## Ajustes do teste no emulador (rodada 1)

- Reserva: a reserva de rua (trilho "Deslize para cancelar", rota a pé `walkingPath`) saiu; a reserva de galpão está em "Retirada em galpão" acima (`/reservation/:id`, QR, Como chegar e Cancelar reserva).
- Contagem com o relógio do servidor: `clockProvider` usa o `ServerClock` do `volti_flutter`, corrigido pelo cabeçalho `Date` das respostas, e nunca passa da duração da reserva.
- Resumo de preço (plano e recibo) por `core/breakdown.dart`: o seguro, o cupom e as taxas aparecem uma vez (das linhas da API; os totais só viram linha quando a categoria não veio).
- Caução: sem cartão salvo, o Pix vem pré-selecionado na tela de retirada (`/pickup`); botão desligado diz o motivo; "Obrigatório" só no selo do seguro.
- Pix: `core/pix_qr.dart` desenha o QR a partir do "copia e cola" quando o PNG vem vazio ou minúsculo (fake: 1×1).
- Conta: cadastro por celular mostra o telefone formatado, nunca o e-mail sintético (`@celular.volti.dev`, `@sem-email.volti.invalid`).
- Testes em `test/emulador_1_test.dart` (carregam as fontes reais para medir texto cortado como no aparelho).

## Pontos de integração

### Push (Firebase Cloud Messaging)
`PushService` tem a implementação `FirebasePushService` (registra o token em `POST /me/devices`). Sem Firebase configurado ela falha em silêncio e o app segue sem push. Para ativar:
1. Crie o projeto no Firebase e registre `br.com.volti.cliente` (Android e iOS).
2. Android: coloque `google-services.json` em `android/app/` e aplique o plugin `com.google.gms.google-services` em `android/settings.gradle.kts` e `android/app/build.gradle.kts`.
3. iOS: `GoogleService-Info.plist` em `ios/Runner/`, capacidades Push Notifications e Background Modes, chave APNs no Firebase.

### Cartão (Mercado Pago)
`CardTokenizer` devolve só o token; o número do cartão nunca vai à API. `DevCardTokenizer` devolve `tok_visa_4242` (token do gateway falso, `PAYMENT_PROVIDER=fake`). Para produção, implemente `CardTokenizer` com o SDK do Mercado Pago (formulário de cartão) e sobrescreva `cardTokenizerProvider` em `main.dart`.

### Login (Cognito, pool de clientes)
Boas-vindas com as opções do design: **Continuar com celular** (código por SMS), **Apple**, **Google** e **Entrar com e-mail** (ghost). Depois do login vem o cadastro em 4 passos (código, dados, identidade, pagamento).

**Modo `dev`** (`AUTH_MODE=dev`, padrão local): celular aceita o código fixo `123456` e entra por `POST /dev/token` com o e-mail `<dígitos>@celular.volti.dev`; "Entrar com e-mail" abre o login de desenvolvimento; Apple/Google só mostram um aviso. A tela inicial mostra uma dica "Modo dev". Build de release sempre usa o modo `cognito` (sem configuração, as telas de login só mostram o aviso).

**Modo `cognito`**:

```bash
flutter run --dart-define=AUTH_MODE=cognito \
  --dart-define=API_BASE_URL=https://api.dev.volti.com.br \
  --dart-define=COGNITO_REGION=sa-east-1 \
  --dart-define=COGNITO_USER_POOL_ID=sa-east-1_XXXX \
  --dart-define=COGNITO_CLIENT_ID=xxxxxxxx \
  --dart-define=COGNITO_DOMAIN=volti-dev.auth.sa-east-1.amazoncognito.com \
  --dart-define=COGNITO_REDIRECT_URI=volti://auth/callback
```

Pool id e client id estão no SSM (`/volti/<env>/cognito/customer-pool-id`, `customer-client-id`), publicados pela `AuthStack`.

- **Celular/e-mail com código** (`core/cognito.dart`, `features/onboarding/otp_flow.dart`): login sem senha do Cognito pela API REST (`cognito-idp`, JSON 1.1, client público). `SignUp` sem senha primeiro (conta nova recebe o código de confirmação; `ConfirmSignUp` devolve uma `Session` que entra direto com `InitiateAuth USER_AUTH`); `UsernameExistsException` → `InitiateAuth USER_AUTH` com `PREFERRED_CHALLENGE=SMS_OTP|EMAIL_OTP` → `RespondToAuthChallenge`. Novo envio só depois de 60 s, inclusive para outro número depois de "Corrigir". Se a confirmação da conta não devolver `Session`, o app pede o código de login e avisa "Conta confirmada". O telefone vai para o perfil (`PATCH /me`, `phone` E.164).
- **Google/Apple** (`core/cognito_auth.dart`): Hosted UI com Authorization Code + PKCE (S256, `state` conferido) aberto por `flutter_web_auth_2` (Custom Tabs/ASWebAuthenticationSession); o código é trocado em `/oauth2/token`.
- Bearer da API = **access token**; renovado com `REFRESH_TOKEN_AUTH` 60 s antes de vencer. Tokens no Keychain/Keystore (`SecureCognitoTokenStore`). Sair chama `RevokeToken`.
- O esquema `volti` do retorno está no `AndroidManifest.xml` (`CallbackActivity` do `flutter_web_auth_2`). No iOS não há configuração extra.

**O que habilitar no pool** (hoje a `AuthStack` cria o pool só com e-mail + SRP; a mudança de infra está como proposta em `docs/decisoes.md`):
1. Login por telefone e e-mail como *username attributes* (`signInAliases: { phone: true, email: true }`), e-mail não obrigatório. Atributos obrigatórios e aliases só mudam recriando o pool.
2. Login sem senha (plano Essentials): primeiros fatores `SMS_OTP` e `EMAIL_OTP` na política de login; app client com `ALLOW_USER_AUTH` e `ALLOW_REFRESH_TOKEN_AUTH`, revogação de token ligada.
3. SMS: papel do SNS para o Cognito, saída do sandbox do SNS e origem registrada para o Brasil.
4. Domínio do Hosted UI (managed login) e, no app client: fluxo `code`, escopos `openid email phone profile`, callback e logout `volti://auth/callback`, provedores `COGNITO`, `Google`, `SignInWithApple`.
5. Provedores: **Google** (client id/secret do OAuth do Google Cloud; redirect `https://<domínio>/oauth2/idpresponse`) e **Sign in with Apple** (Services ID, Team ID, Key ID e chave .p8). Mapear `email` e `phone_number`.

Testes: `test/cognito_test.dart` (URL do Hosted UI, PKCE, corpo das chamadas, renovação) e `test/otp_flow_test.dart` (máquina de estados do código com Cognito falso).

### Localização
Android: serviço em primeiro plano do tipo `location` e permissões no manifesto. iOS: `UIBackgroundModes: location` e textos de uso. O rastreio em segundo plano só começa na tela de corrida (aluguel ativo) e termina ao sair dela. O consentimento (`PUT /lgpd/consents`) é oferecido no onboarding (opcional, pré-marcado) e pedido de novo no início do aluguel se estiver desligado (decisão #8).

## Testes

```bash
flutter analyze && flutter test
```
Cobrem login (dev × cognito), código por SMS com reenvio e limite de 60 s, passo de pagamento, CPF inválido, o fluxo do galpão (`test/galpao_flow_test.dart`: home, seletor de galpões, lista, plano, seguro, retirada, reserva com QR, 409, handover, 200% em 360×740 e reduced motion), a entrega, a bateria e a devolução no galpão (`test/handover_test.dart`: `handover.pending` abre "Confira sua moto", app aberto com reserva em `handover`, aceite com toque duplo e mesma chave na nova tentativa, pagamento recusado, caução não retida, entrega não pendente, 404, apontar problema, galpão primeiro na troca de bateria, devolução no galpão com `handover.updated`, 200% em 360×740, reduced motion e semântica), as regras de horário (`test/depot_hours_test.dart`), `test/pick_logic_test.dart`, a home (`test/home_parity_test.dart`), o cartão "Sua reserva" (`test/home_reservation_card_test.dart`: agora com contagem, agendada, entrega com Conferir moto, passe e Escolher moto escondidos, modo estações, expiração recarrega, segundo plano pausa, reduced motion, semântica e 200% em 360×740), os pontos de troca na home (`test/home_stations_test.dart`: botão alterna o modo, marcadores com contagem e cor, galpão primeiro e depois distância, pílulas 0/1/muitas, Como chegar, erro, vazio, 200% em 360×740 e reduced motion), onboarding sem consentimento, seguro básico fixo, reserva bloqueada sem consentimento de localização, `zone.notice`, `device.event` de queda, encerrar sem foto e erro de rede com "Tentar de novo".

## Correções do emulador (2026-10-22, branch `feat/cliente-login`)

- A explicação da localização fala do galpão ("Galpão mais perto"), não de motos por perto.
- O Pix da caução diz "para confirmar a reserva"; a moto é liberada na entrega no galpão.
- O cabeçalho "Sua localização" mostra "Perto do Galpão Volti · <bairro>" (ou "Perto de você"), nunca o nome de uma zona de devolução.
- O mapa da home centra o galpão ao abrir e quando ele muda (`MapController.move` com deslocamento para a faixa livre acima do cartão). Recriar o `FlutterMap` com outro `initialCenter` não movia a câmera (o controller guarda a câmera), e o pin ficava fora da tela.
