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

Variáveis `--dart-define`: `SENTRY_DSN` (opcional, ver Relatório de falhas), `API_BASE_URL`, `AUTH_MODE=dev|cognito` (padrão `dev`; build release sempre usa cognito), `SUPPORT_PHONE` (telefone do botão SOS), no modo cognito `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REDIRECT_URI` (ver Login), `FIRST_RIDE_PROMO=true` (liga o cartão "1ª corrida grátis" da home e o selo "1ª grátis" da lista para clientes sem aluguéis; padrão desligado, porque o contrato ainda não diz se a promoção existe; a boas-vindas não mostra promoção), `MAP_TILE_URL`, `MAP_TILE_REFERENCE_URL` e `MAP_TILE_ATTRIBUTION` (tiles dos mapas, ver abaixo), `TERMS_URL` e `PRIVACY_URL` (links dos termos de uso e da política de privacidade no rodapé da boas-vindas; sem eles, o link avisa que o documento não está publicado neste ambiente).

### Cartão de crédito (Mercado Pago)

O formulário de cartão (`features/payments/card_form_sheet.dart`) envia número, validade, CVV, nome e CPF do titular **direto ao Mercado Pago** (`POST https://api.mercadopago.com/v1/card_tokens?public_key=...`, `core/mercadopago_gateway.dart`). Só o token volta e segue para `POST /payments/cards` (`cardToken`); o backend resolve bandeira e últimos 4 dígitos pelo próprio Mercado Pago. Dados de cartão nunca passam pela API nem vão para log.

- `--dart-define=MP_PUBLIC_KEY=<chave pública>`: **obrigatória em release** (sem ela o app abre em "Configuração inválida do app"). Em debug/profile sem a chave continua o `DevCardTokenizer` (token falso `tok_visa_4242`, para `PAYMENT_PROVIDER=fake`).
- Chave de teste: painel do Mercado Pago Developers → *Suas integrações* → sua aplicação → *Credenciais de teste* → **Public Key** (`TEST-...`). Use a *Public Key*, nunca o *Access Token*. Cartões de teste e CPF/nome do titular (ex.: `APRO` para aprovar) estão na documentação *Cartões de teste* do Mercado Pago. Combine com a API em `PAYMENT_PROVIDER=mercadopago` e o Access Token de teste correspondente.
- Exemplo: `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=MP_PUBLIC_KEY=TEST-xxxxxxxx-xxxx`.


## Build de release (prontidão)

**Obrigatórios em release** (`flutter build apk/appbundle/ipa --release`): `API_BASE_URL` (URL https da API), `SUPPORT_PHONE` (telefone real do suporte, só dígitos com + opcional, ex.: `+5511999990000`; o valor de exemplo `+551100000000` também é recusado) e, como o release usa Cognito, `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN` e `COGNITO_REDIRECT_URI`. Recomendados: `MAP_TILE_URL` (provedor licenciado), `TERMS_URL` e `PRIVACY_URL`. Sem `API_BASE_URL` ou `SUPPORT_PHONE`, o app mostra a tela "Configuração inválida do app" (pt-BR) com a lista do que falta, em vez de abrir (`lib/core/release_env.dart`, testado em `test/release_env_test.dart`); em debug e profile nada disso é exigido (a API cai em `10.0.2.2:3000` no Android e `localhost:3000` no resto).

```bash
flutter build appbundle --release   --dart-define=API_BASE_URL=https://api.volti.com.br --dart-define=SUPPORT_PHONE=+5511999990000   --dart-define=MP_PUBLIC_KEY=APP_USR-...   --dart-define=COGNITO_REGION=sa-east-1 --dart-define=COGNITO_USER_POOL_ID=... --dart-define=COGNITO_CLIENT_ID=...   --dart-define=COGNITO_DOMAIN=... --dart-define=COGNITO_REDIRECT_URI=volti://auth/callback
```

**iPad.** O app é retrato-only; por isso o `Info.plist` tem `UIRequiresFullScreen=true` (exigido pela App Store para iPad sem todas as orientações).

**Assinatura Android.** O release lê `android/key.properties` (fora do git, como o keystore). Formato:

```properties
storeFile=/caminho/absoluto/volti-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Sem esse arquivo o build continua funcionando, assinado com a chave **debug**, e o Gradle imprime `WARNING: android/key.properties ausente`; esse APK serve para emulador e testes, nunca para a loja. APK para o emulador x86_64: `flutter build apk --target-platform android-x64 --split-per-abi --dart-define=API_BASE_URL=http://10.0.2.2:3001` — o build funciona, mas o APK é release e na inicialização exige `SUPPORT_PHONE`: acrescente `--dart-define=SUPPORT_PHONE=+5511999990000` (qualquer número que não seja o de exemplo). O `applicationId`/bundle id segue `br.com.volti.volti_cliente` (a decisão dos IDs de loja é do dono do produto).

**Outros ajustes.** Nome na tela inicial "Volti" (Android e iOS); orientação só retrato (`setPreferredOrientations`, `android:screenOrientation` e `Info.plist`); texto de localização do iOS no modelo galpão (durante o aluguel: segurança, limites de velocidade e devolução). O SOS ganhou "Ligar 192 (SAMU)" e "Ligar 190 (Polícia)" ao lado do suporte (`tel:` pelo lançador existente, com rótulo de leitor de tela). Mensagem de câmera negada no leitor de QR fica dentro da moldura (rola a 200% de texto) e Enter no campo de código digitado envia.

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

O hero ocupa a faixa livre acima da folha. A altura da folha é medida e o layout do logo, do carrossel e da moto é relativo a essa faixa (`HeroLayoutDelegate`). O hero tem:

- **Mapa real** de Pinheiros (tiles do `MAP_TILE_URL`, filtro do DS, sem interação), centrado no galpão (-23.5654, -46.6847, zoom 15), com deriva lenta da câmera (pan + zoom, 20 s ida e volta). A deriva é um `Transform` sobre um `RepaintBoundary` estático e não reconstrói os tiles.
- **Galpão** com anel pulsando.
- **Quatro motos andando** por trechos reais (Rua dos Pinheiros, Teodoro Sampaio, Faria Lima e Fradique Coutinho), com velocidades e defasagens diferentes, aparecendo e sumindo nas pontas. Ficam recortadas 16 px acima da folha.
- **Moto em destaque** (`assets/images/volti_moto_hero.webp`, fundo transparente), centrada embaixo com até 70% da largura. Sobe e cresce de 0,92 a 1 em cerca de 600 ms, depois flutua 2,5 px num ciclo de 3 s, com uma sombra elíptica que acompanha a flutuação.
- **Logo** em cima, à esquerda.
- **Carrossel das afirmações**, embaixo do logo, de ponta a ponta. São afirmações verdadeiras do serviço, sem números inventados, em três cartões brancos iguais (`HeroStatementCard`: superfície, raio md, `shadow1`, ícone verde num quadrado brand-soft, texto escuro):
  - "Retire no galpão" / "Escolha no app, retire no galpão" (galpão);
  - "Planos diário, semanal e mensal" / "ou por minuto e hora" (calendário);
  - "Seguro incluso" / "Troca de bateria no galpão e nas estações" (escudo; a segunda linha tem o ícone da bateria).

  Os cartões andam para a esquerda a 36 px/s (`kHeroMarqueeSpeed`), num marquee contínuo: um `AnimationController` sem limite com simulação linear e um render próprio (`RenderHeroStatements`) que só repinta. Cada cartão existe uma vez na árvore; o render pinta as cópias em sequência, a 10 px uma da outra, até cobrir a faixa, então a volta não tem fresta nem salto. A faixa fica num `RepaintBoundary` com máscara de fade (`ShaderMask`, 24 px) nas duas bordas; o gutter de 16 px fica dentro dela. A faixa inteira é obstáculo: nem a moto nem os pins passam por ela. Não há promoção na boas-vindas: o `FIRST_RIDE_PROMO` vale só para a home e a lista.
- **Área livre do mapa:** o galpão fica entre os chips e a moto ou, em telas baixas, à esquerda da moto. As motos **saem do galpão** pelas ruas (Rua dos Pinheiros e Fradique Coutinho) e só andam na faixa do mapa, a 16 px das bordas. Somem onde ficariam atrás de um chip ou da moto e seguem a mesma matriz de deriva do mapa, ficando sobre as ruas.
- **Mapa:** o mapa é maior que o hero (32 px de folga em cada lado) e é criado uma vez só; mudanças de layout movem a câmera pelo `MapController`. O `VoltiMap` guarda um provedor de tiles por camada durante a vida do mapa, e tiles com erro são pedidos de novo até 3 vezes. Todos os mapas usam **um cliente HTTP de tiles compartilhado, que nenhum mapa fecha** (`RetryClient` sobre `IOClient` com até 6 conexões por host; no web, o cliente padrão), sem abortar pedidos obsoletos. O abort fica desligado em todos os mapas, inclusive na home: um pedido abortado vira PNG transparente no `ImageCache`, e qualquer outro mapa que peça a mesma URL enquanto ele está em andamento recebe a imagem vazia. O `ImageCache` identifica o tile pela URL, então mapas diferentes dividem o mesmo pedido em andamento. No flutter_map 8, um cliente fechado (o `TileLayer` descartava o provedor ao sair da tela) ou um pedido abortado vira um PNG transparente "carregado". A home monta o mapa por um instante na abertura e era fechada no meio dos pedidos; a boas-vindas, que esperava os mesmos tiles, ficava com a coluna em comum vazia para sempre. Essa era a costura do hero, diagnosticada no emulador. Com `--dart-define=MAP_DEBUG=true`, o build de debug registra no logcat (tag `VOLTI_DBG`) a câmera e cada tile. A `TileLayer` tem `panBuffer: 1` e `keepBuffer: 2`, e o mapa do hero só é criado quando a folha já foi medida, para a câmera não se mover logo depois de abrir. Enquanto os tiles chegam, o fundo é um cinza liso: a ilustração desenhada só entra quando o mapa falha de vez.

A camada visual do hero é decorativa: fica dentro de `ExcludeSemantics` e `IgnorePointer`. Fora dela, há nós de semântica estáticos: o logo ("Volti", cabeçalho) e cada afirmação mostrada uma vez ("título, texto"), lado a lado na faixa do carrossel. As cópias pintadas do marquee não chegam ao leitor de tela. Cada grupo de animação tem um ticker próprio.

Em situações especiais:

- **Reduced motion:** tudo fica parado no estado final. O carrossel não anda e mostra só os primeiros cartões que cabem inteiros na linha. Os outros vão para a folha (`onStatementsShown`), estáticos, e cada afirmação aparece uma vez.
- **App em segundo plano ou rota coberta** (`TickerMode`): os controllers param.
- **Tiles falhando** (4 erros): o mapa sai e entra a ilustração desenhada, sob o mesmo logo e carrossel. A tela nunca fica cinza.

A atribuição do mapa fica na borda de cima da folha.

Com texto acima de 100%, os três cartões das afirmações descem para a folha (estáticos, quebrando linha) e escalam com o texto. O hero fica só com o logo. No hero, os textos escalam até 1,3x.

**Tamanho da moto (trade-off):** nenhum cartão pode cobrir a moto, então ela fica com o espaço que sobra entre o carrossel e a folha, e encolhe em telas baixas. Valores atuais, em fração da largura da tela (debug tem a nota de dev na folha; release não tem):

| Tela | Debug | Release |
|---|---|---|
| 360×740 | 0,29 | 0,39 |
| 360×800 | 0,45 | 0,45 |
| 393×852 | 0,45 | 0,54 |
| 412×915 | 0,57 | 0,66 |

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

## Troca de bateria na estação via QR (branch `feat/cliente-troca-qr`)

Spec: `docs/superpowers/specs/2026-10-22-volti-troca-bateria-qr-design.md`. Código em `lib/features/station_swap/`.

- **Aviso de proximidade.** Só com aluguel em andamento (`active`/`paused`) e consentimento de localização. A distância é calculada no app (haversine, `swapPromptStation`, até 50 m) sobre `GET /swap-stations`.
  - Na corrida: usa a posição do rastreio que a corrida já faz.
  - Na home: usa a mesma posição do mapa (`userLocationProvider`, uma consulta, sem rastreio fora do aluguel).
  - O que aparece: o cartão "Você está na <estação> · Trocar bateria" e o botão "Trocar aqui" na linha da estação da folha "Troca de bateria" (`extraActions`).
- **Leitor** (`/station-swap/scan`, push).
  - Usa `mobile_scanner` (só QR). Permissão de câmera: Android `CAMERA`; iOS `NSCameraUsageDescription` em pt-BR.
  - Campo "Código da estação" para emulador e desenvolvimento: cole o payload do QR.
  - Câmera negada ou indisponível: a tela explica e leva ao campo.
  - O QR `vst1.<stationId>.<assinatura>` dá o id da estação; a assinatura só a API confere.
  - Vindo do aviso de proximidade, mostra "Estação: <nome>".
  - O visor entrega o mesmo QR continuamente (`DetectionSpeed.normal`): enquanto a confirmação está aberta a leitura é ignorada e, depois que ela fecha, o mesmo QR fica ignorado por 2 s (`kSwapRescanCooldown`).
  - Criada a troca (ou se já havia uma aberta), o leitor fecha e devolve a troca a quem abriu (`openSwapScan`), que abre o progresso. Se a folha fechar sem resposta, o leitor relê `GET /rentals/current` e retoma a troca que a API tenha criado.
- **Confirmação** (folha).
  - Mostra "Trocar a bateria da <código> aqui?" e as baterias disponíveis.
  - Taxa: "Taxa R$ X" com o valor exato de `CurrentRental.batterySwapFeeCents` (o mesmo `feeCents` que o POST congela); `0` (diário/semanal/mensal) não mostra taxa. Sem o campo (API antiga), nos planos por minuto/hora aparece a linha genérica "Taxa por troca no seu plano…".
  - "Abrir compartimento" faz `POST /swap-stations/{id}/swaps` com uma `Idempotency-Key` por tentativa. Rede, 5xx e 429 repetem com a mesma chave e a mesma posição (a troca pode ter sido criada); recusa da API (4xx) gera chave nova.
  - Durante o POST a folha não fecha: sem arrastar e com `PopScope` (voltar e toque fora bloqueados).
  - Cada slug tem sua mensagem em pt-BR: `station-not-found`, `too-far`, `vehicle-moving` ("Pare e trave a moto…"), `station-unavailable` ("sem baterias" quando a estação está zerada; "fechada agora" só quando o horário é legível e agora cai fora dele, `stationClosedAt`, mesma leitura da API; senão "não está disponível"), `swap-open` (leva à troca aberta) e `rental-not-active`.
- **Progresso** (`/station-swap/:stationId/:swapId`, modal).
  - Passos: abrindo a vaga → "Devolva a bateria na vaga N" → bateria recebida → "Pegue a bateria carregada" → "Bateria trocada · N%". Cada passo tem a contagem até `expiresAt`, pelo relógio do servidor.
  - Atualização: o status vem do `station_swap.updated`; o `GET` da troca traz vaga, prazo e motivo e cobre a reconexão (com o socket fora, um GET a cada 10 s). Com a corrida aberta por baixo, usa o socket dela (`rideEventBusProvider` + `RideRealtimeLink`); senão, a conexão do cliente.
  - Respostas fora de ordem: GET com `updatedAt` mais antigo que a troca mostrada é descartado (sem `updatedAt`, vale a ordem dos passos) e cada GET leva um número de sequência (resposta de um pedido anterior ao último estado aplicado, inclusive o cancelamento, é ignorada).
  - Segundo plano (`AppLifecycleListener`): para a contagem e o GET periódico; ao voltar, faz um GET na hora e retoma os dois.
  - "Cancelar troca" só aparece antes de `returned`.
  - Finais `canceled`/`failed` mostram a mensagem do `endReason`. Inclui a devolução atrasada, que ainda pode liberar a carregada; `return_after_close` (operação avisada, suporte); `rental_force_ended`. Motivo desconhecido mostra uma mensagem genérica.
  - Concluída: recarrega o aluguel e a bateria da moto.
- **Retomar.** A partir de `CurrentRental.currentStationSwap` (`Backend.currentRentalState`), a home e a corrida mostram "Troca de bateria em andamento · Continuar". Na devolução, `409 swap-open` mostra "Continuar troca". As entradas travam toques repetidos enquanto o fluxo está aberto.

### Testar localmente

```bash
# services/api: banco com migrate + seed e, depois do seed, os QR das estações
npx prisma migrate deploy && npx prisma db seed
pnpm --filter api stations:qr

# A) sem simulador: a estação avança sozinha (STATION_STUB_STEP_MS, padrão 1,5 s)
IOT_MODE=stub pnpm --filter api dev
# B) com o simulador das estações (Mosquitto do docker-compose)
IOT_MODE=local pnpm --filter api dev
pnpm --filter station-sim dev          # automático; dev:manual para avançar no teclado (d/f/l/s)
```

No emulador, ponha a localização a até 50 m da estação, por exemplo em Largo da Batata: `-23.5672, -46.6930`. Use um aluguel em andamento com a moto parada ou travada (velocidade desconhecida conta como em movimento: `422`). Depois toque em "Trocar bateria" e cole um destes payloads (segredo de dev `volti-dev-station-qr-secret`):

| Estação | Payload |
|---|---|
| Largo da Batata (24 h) | `vst1.d0000000-0000-4000-8000-000000000001.lMyoiWvb5xuRTHIzBFoxEQ` |
| Metrô Vila Madalena | `vst1.d0000000-0000-4000-8000-000000000002.-OQdidRFbby02UAXfqQOXw` |
| Benedito Calixto | `vst1.d0000000-0000-4000-8000-000000000003.6Stn4xTFoxVCTZ5Zv4TtYQ` |
| Paulista–Consolação (24 h) | `vst1.d0000000-0000-4000-8000-000000000004.crYpZuWtPHt-ir7YFNKFuQ` |
| Faria Lima (0 baterias → "sem baterias") | `vst1.d0000000-0000-4000-8000-000000000005.NimejMRACpa__AchaFlEYA` |

Testes: `test/station_swap_test.dart` (proximidade, QR, taxa, slugs, máquina de estados, leitor, progresso, cancelamento e retomada) e `test/station_swap_fix1_test.dart` (releitura do QR, segundo plano, folha travada no POST, GET atrasado, horário, taxa exata, socket da corrida, devolução com troca aberta, chave em 5xx/429); fixtures em `test/swap_fixtures.dart`.

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
`PushService` (`core/services.dart`) tem a implementação `FirebasePushService`, sobre a interface `PushTransport` (testável sem plugin). Na home ela pede permissão, registra o token em `POST /me/devices` (e de novo quando o FCM renova o token) e liga os ouvintes:
- **Primeiro plano** (`onMessage`): vira aviso (`VoltiToast`) com título e texto.
- **Toque na notificação** (`onMessageOpenedApp`) e **mensagem que abriu o app** (`getInitialMessage`): `routeForPush` (`core/push_routing.dart`) converte o `data` da API em rota, empilhada sobre a home: `reservation.reminder` -> `/reservation/:reservationId`; `handover.pending` -> `/handover/:handoverId` ("Confira sua moto"; sem `handoverId`, a reserva); `rental.*` -> `/ride`; `swap.*` -> `/station-swap/:stationId/:swapId`; `receipt` / `rental.finished` -> `/summary/:rentalId`; `kind: kyc` -> `/account/verification`. Tipo desconhecido ou id fora de `[A-Za-z0-9_-]{1,64}` -> `/home`. Hoje a API só envia `reservation.reminder` e `kind: kyc`; os demais tipos são aceitos para quando ela passar a enviá-los.

**Sem configuração do Firebase o app funciona normalmente, com push desligado** (a inicialização falha em silêncio; nenhum arquivo do Firebase é versionado). Para ativar:
1. Crie o projeto no Firebase e registre o app Android (`br.com.volti.volti_cliente`) e o iOS (bundle `br.com.volti.voltiCliente`).
2. Android: baixe `google-services.json` para `android/app/`. O Gradle aplica o plugin `com.google.gms.google-services` **só quando esse arquivo existe** (`android/app/build.gradle.kts`). Android 13+ pede a permissão de notificações (já no manifesto).
3. iOS: `GoogleService-Info.plist` em `ios/Runner/` (adicione ao alvo Runner no Xcode) e chave APNs no Firebase. O projeto já traz `Runner.entitlements` (`aps-environment`; a assinatura de distribuição troca `development` por `production`) e `UIBackgroundModes` com `remote-notification`.
4. Na API, `PUSH_MODE=fcm` com as credenciais do serviço (ver README da API).

### Relatório de falhas (Sentry), opcional
`--dart-define=SENTRY_DSN=https://...` liga o `sentry_flutter` (`core/crash_reporting.dart`) **só em release/profile**; sem DSN, ou em debug, fica desligado e nada é exigido no build. Nada de dado pessoal sai do aparelho: `sendDefaultPii=false`, sem captura de tela, sem trilha de ações (URLs e posição), sem traces; `beforeSend` remonta o evento sem usuário, requisição (URL, cabeçalhos, cookies, corpo), extras, tags e transação, e redige token/JWT, e-mail, CPF e coordenadas no texto das exceções. Não registre localização nem dados do cliente em mensagens de erro.

### Privacidade nas lojas
`ios/Runner/PrivacyInfo.xcprivacy` (incluído no alvo Runner) declara sem rastreamento (`NSPrivacyTracking=false`) os dados coletados e vinculados ao usuário para funcionamento do app: localização precisa (só durante o aluguel, com consentimento), fotos e conteúdo do usuário (documento e selfie do KYC, foto da devolução), nome, e-mail, telefone, dados de pagamento (o cartão vai direto ao Mercado Pago; só o token chega à API), ID de usuário e de dispositivo (token FCM) e dados de falha (Sentry, sem vínculo ao usuário), além dos motivos de uso das APIs de UserDefaults (`CA92.1`) e carimbo de data de arquivo (`C617.1`). Mantenha esta lista alinhada ao questionário "Segurança dos dados" do Google Play e aos "rótulos de privacidade" da App Store quando mudar o que o app coleta.

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

## Correções do QA exploratório (Task 13)

Testes em `test/qa_cliente_test.dart` (100% e 200% de fonte), mais `card_form_sheet_test.dart`, `home_parity_test.dart` e `packages/volti_flutter/test/segmented_badge_test.dart`.

- **Tarifa da corrida:** o card "Tarifa" lê o preço unitário da linha `time` do `breakdown` do aluguel (o preço congelado na largada, o mesmo da cobrança, inclusive o preço do modelo no plano por minuto). Sem `breakdown`, cai no preço do plano.
- **Cupom no resumo da retirada:** a cotação só cobre o mínimo estimado, então o resumo consulta a regra (`POST /me/coupons/validate`, `Backend.validateCoupon`) e mostra "até -R$ 10,00" (valor fixo) ou "-10% do tempo" (percentual) com a nota "aplicado no fechamento, limitado ao valor do tempo de uso". Se o desconto cotado já é o valor inteiro do cupom, mostra o valor exato sem nota. Sem a regra (falha), mostra o mínimo cotado com a nota.
- **KYC com CPF já usado (409):** o erro troca "Tentar de novo" por "Corrigir CPF", que volta ao passo de dados com o CPF preenchido e o erro no campo (o mesmo CPF não segue). A API não tem validação de CPF antes do envio, então a recusa só vem no envio.
- **Termos e Política de privacidade:** linhas em Conta (grupo LGPD) e em Conta > Privacidade, com os mesmos links do rodapé (`legalLinksProvider`, `core/legal.dart`).
- **Home sem sino:** não há central de notificações no contrato; o suporte tem entrada na Conta e a bolinha de mensagem nova do suporte passa para o avatar.
- **Recibo em PDF** abre numa aba dentro do app (`inAppUrlLauncherProvider`, `LaunchMode.inAppBrowserView`).
- **Fonte 200%:** corrida (métricas empilhadas, plano e seguro em chips), resumo da retirada (rótulo acima do valor), seguro (`OptionCard`/`VoltiBadge` com altura mínima que cresce com o texto), erros do cartão (`errorMaxLines: 3`, "Data inválida"), pílula de localização (2 linhas), filtros de modelo (quebram linha) e descrição da moto sem reticências.
- **Menores:** "Hoje · Encerrado" na agenda sem horários; "Estação X" sem prefixo duplicado no leitor de QR; histórico com "4 min 9 s"; limites da recarga em "R$ 10,00 e R$ 1.000,00".
- **Mapa:** `VoltiMap` pede de novo os tiles que falharam quando o app volta do segundo plano (faixa cinza da home); mitigação sem reprodução em emulador.
