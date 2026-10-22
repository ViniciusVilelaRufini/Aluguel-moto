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

Variáveis `--dart-define`: `API_BASE_URL`, `AUTH_MODE=dev|cognito` (padrão `dev`; build release sempre usa cognito), `SUPPORT_PHONE` (telefone do botão SOS), no modo cognito `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REDIRECT_URI` (ver Login), `FIRST_RIDE_PROMO=true` (liga o cartão "1ª corrida grátis" e o selo "1ª grátis" para clientes sem aluguéis; padrão desligado, porque o contrato ainda não diz se a promoção existe; **exceção:** na boas-vindas, build de debug liga o cartão por padrão para o emulador bater com a referência, e `FIRST_RIDE_PROMO=false` desliga), `MAP_TILE_URL` e `MAP_ATTRIBUTION` (tiles dos mapas, ver abaixo), `TERMS_URL` e `PRIVACY_URL` (links dos termos de uso e da política de privacidade no rodapé da boas-vindas; sem eles, o link avisa que o documento não está publicado neste ambiente).

## Mapas (tiles)

Todos os mapas (home, boas-vindas, corrida, devolução) passam por `VoltiMap` e pela camada comum `voltiTileLayer` (`lib/core/map_tiles.dart`). O servidor público do OpenStreetMap (`tile.openstreetmap.org`) não pode ser usado por apps (política de tiles da OSMF; corta quem usa muito e os tiles ficavam cinza no emulador), então o padrão é o **CARTO Voyager** raster, `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` (subdomínios `a,b,c`, `@2x` em telas densas), com a atribuição exigida "© OpenStreetMap contributors © CARTO" numa pílula de vidro (`MapAttribution`; na home fica ao lado do botão de localizar, na boas-vindas logo acima da folha). Para outro provedor: `--dart-define=MAP_TILE_URL=...` e `--dart-define=MAP_ATTRIBUTION=...`. O User-Agent usa o id real do pacote (`br.com.volti.volti_cliente`). Falhas de tile: o `NetworkTileProvider` já tenta de novo (`RetryClient`), tiles com erro são descartados ao sair da tela (pedidos de novo na volta) e, em debug, cada falha vira uma linha JSON `map.tile_error` com a URL e o erro (status HTTP). O filtro de cor suave do design continua. **Bloqueio de lançamento (docs/decisoes.md, 2026-10-22):** os basemaps públicos do CARTO são só para desenvolvimento e testes; antes de lançar, troque por um provedor licenciado via `MAP_TILE_URL` (ou contrate a licença comercial do CARTO). Tocar na atribuição abre `openstreetmap.org/copyright`. Em release o `main` silencia o `debugPrint` (o z/x/y do tile revela a região que o mapa mostra).

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
- **Chips** (logo, "108 motos perto", "1ª corrida grátis" com `FIRST_RIDE_PROMO`, bateria e "2 min | 120 m"), que entram em cascata com 80 ms entre eles. A bateria conta de 0 até 92%. Em telas baixas (360×740), bateria e tempo viram etiquetas sobre as bordas da moto, pintadas por cima dela.

O hero é decorativo: fica dentro de `ExcludeSemantics` e `IgnorePointer`. A promoção chega ao leitor de tela por um nó na folha. Cada grupo de animação tem um ticker próprio.

Em situações especiais:

- **Reduced motion:** tudo fica parado no estado final.
- **App em segundo plano ou rota coberta** (`TickerMode`): os controllers param.
- **Tiles falhando** (4 erros): o mapa sai e entra a ilustração desenhada, sob os mesmos chips. A tela nunca fica cinza.

A atribuição do mapa fica na borda de cima da folha.

Com texto acima de 100%, o cartão da promoção desce para a folha e escala com o texto. Com 200%, os botões quebram linha, Apple/Google/E-mail empilham e a folha rola por cima do hero.

Testes em `test/cliente_login_test.dart`.

## Estrutura

- `lib/core`: `Backend` (única fronteira com a API; os testes usam um fake), sessão, rotas (go_router), tempo real (Socket.IO), localização, push, tokenização de cartão, widgets comuns (`AsyncView`, `ErrorState`, `VoltiMap`).
- `lib/features/<tela>`: onboarding, home (mapa com o galpão), pick ("Escolha sua moto" do galpão), plan (plano, seguro e Pix), pickup (retirada agora/agendada e regras de horário), reservation (reserva com QR), handover ("Confira sua moto" e o vigia da entrega), ride (corrida e "Trocar bateria"), return_flow (ponto verde ou galpão), summary, account.
- `lib/l10n/app_pt.arb`: todos os textos (pt-BR).

## Motion (design v2)

Transições de tela em `core/router.dart` (`voltiPage`): push lateral de 440 ms; páginas `modal: true` sobem de baixo e a tela de trás recua. Listas e seções entram em cascata (`VoltiStagger.wrap`), a miniatura da moto voa da lista para o cabeçalho do plano (Hero, desligado em reduced motion), posição do usuário pulsa, rotas se desenham (`DrawnPolyline`), recibo mostra `VoltiSuccessCheck`. Tudo respeita reduced motion (`MediaQuery.disableAnimationsOf`). Animações infinitas (pulso, brilho, ponto ao vivo) impedem `pumpAndSettle`: use `pump(duration)` nos testes dessas telas.

## Design pass (UI/UX)

Auditoria em `docs/design/auditoria-app.md` e evoluções em `docs/design/evolucoes-app.md`. Resumo: HUD da corrida com `VoltiSpeedGauge`, números que rolam (`VoltiTicker`) e faixas animadas (`VoltiStatusBanner`); esqueletos (`AsyncView(loading:)` + `VoltiSkeleton`); estados vazios (`VoltiEmptyState`); puxar para atualizar; cartão da moto arrasta para fechar; háptica semântica (`VoltiHaptics`); coreografia de sucesso no Pix, devolução e recibo; confirmação ao cancelar a renovação. O mapa da home também respeita `mapEnabledProvider` (testes sem tiles). Testes do design pass em `test/design_pass_test.dart` (reduced motion, semântica, texto a 200%).

## Retirada em galpão (spec 2026-10-22, Task 9)

O cliente não acha moto na rua: escolhe no app e retira no galpão.

- **Home** (`/home`): mapa com o galpão em destaque, pontos verdes de devolução (zonas `return`) e estações de bateria (`GET /swap-stations`); sem motos na rua e sem "Escanear para andar". Cartão fixo "Galpão Volti · <bairro> · N motos disponíveis" (`Depot.district`, `availableVehicleCount`), "Aberto até 20h" / "Fechado · abre seg. às 7h", endereço e **Escolher moto**. Com vários galpões o cartão vira seletor (chips, mais perto primeiro por `distanceM`; sem localização — sem consentimento ou sem GPS — a API não manda `distanceM` e fica a ordem da API). `currentDepotProvider` = galpão escolhido ou, sem escolha, o mais perto.
- **Escolher moto** (`/pick`): `GET /depots/{id}/vehicles`; foto (`VehicleModel.photoUrl`), categoria (`categoryLabel`), código, bateria/autonomia e preço por modelo (`pricePerMinuteCents`); sem distância. Filtro por modelo; **Continuar** (com "<modelo> · <código>" na segunda linha do botão, que quebra em vez de cortar o código) não reserva, só segue.
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
Cobrem login (dev × cognito), código por SMS com reenvio e limite de 60 s, passo de pagamento, CPF inválido, o fluxo do galpão (`test/galpao_flow_test.dart`: home, seletor de galpões, lista, plano, seguro, retirada, reserva com QR, 409, handover, 200% em 360×740 e reduced motion), a entrega, a bateria e a devolução no galpão (`test/handover_test.dart`: `handover.pending` abre "Confira sua moto", app aberto com reserva em `handover`, aceite com toque duplo e mesma chave na nova tentativa, pagamento recusado, caução não retida, entrega não pendente, 404, apontar problema, galpão primeiro na troca de bateria, devolução no galpão com `handover.updated`, 200% em 360×740, reduced motion e semântica), as regras de horário (`test/depot_hours_test.dart`), `test/pick_logic_test.dart`, a home (`test/home_parity_test.dart`), onboarding sem consentimento, seguro básico fixo, reserva bloqueada sem consentimento de localização, `zone.notice`, `device.event` de queda, encerrar sem foto e erro de rede com "Tentar de novo".

## Correções do emulador (2026-10-22, branch `feat/cliente-login`)

- A explicação da localização fala do galpão ("Galpão mais perto"), não de motos por perto.
- O Pix da caução diz "para confirmar a reserva"; a moto é liberada na entrega no galpão.
- O cabeçalho "Sua localização" mostra "Perto do Galpão Volti · <bairro>" (ou "Perto de você"), nunca o nome de uma zona de devolução.
- O mapa da home centra o galpão ao abrir e quando ele muda (`MapController.move` com deslocamento para a faixa livre acima do cartão). Recriar o `FlutterMap` com outro `initialCenter` não movia a câmera (o controller guarda a câmera), e o pin ficava fora da tela.
