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

Variáveis `--dart-define`: `API_BASE_URL`, `AUTH_MODE=dev|cognito` (padrão `dev`), `SUPPORT_PHONE` (telefone do botão SOS), `FIRST_RIDE_PROMO=true` (liga o cartão "1ª corrida grátis" e o selo "1ª grátis" para clientes sem aluguéis; padrão desligado, porque o contrato ainda não diz se a promoção existe).

O Prism exige um header `Authorization: Bearer ...`; o login de dev (`POST /dev/token`, pool customer) já devolve um. No mock as respostas são exemplos fixos do contrato.

## Estrutura

- `lib/core`: `Backend` (única fronteira com a API; os testes usam um fake), sessão, rotas (go_router), tempo real (Socket.IO), localização, push, tokenização de cartão, widgets comuns (`AsyncView`, `ErrorState`, `VoltiMap`).
- `lib/features/<tela>`: onboarding, home (mapa), pick ("Escolha sua moto", lista com filtro por modelo e reserva), reservation, scan, plan (+ Pix), ride, return_flow, summary, account.
- `lib/l10n/app_pt.arb`: todos os textos (pt-BR).

## Motion (design v2)

Transições de tela em `core/router.dart` (`voltiPage`): push lateral de 440 ms; `/scan` abre como modal de baixo e a tela de trás recua. Listas e seções entram em cascata (`VoltiStagger.wrap`), pins caem em sequência, pin selecionado e posição do usuário pulsam, rotas se desenham (`DrawnPolyline`), recibo mostra `VoltiSuccessCheck`. Tudo respeita reduced motion (`MediaQuery.disableAnimationsOf`). Animações infinitas (pulso, brilho, ponto ao vivo) impedem `pumpAndSettle`: use `pump(duration)` nos testes dessas telas.

## Design pass (UI/UX)

Auditoria em `docs/design/auditoria-app.md` e evoluções em `docs/design/evolucoes-app.md`. Resumo: HUD da corrida com `VoltiSpeedGauge`, números que rolam (`VoltiTicker`) e faixas animadas (`VoltiStatusBanner`); esqueletos (`AsyncView(loading:)` + `VoltiSkeleton`); estados vazios (`VoltiEmptyState`); puxar para atualizar; cartão da moto arrasta para fechar; háptica semântica (`VoltiHaptics`); coreografia de sucesso no Pix, devolução e recibo; confirmação ao cancelar a renovação. O mapa da home também respeita `mapEnabledProvider` (testes sem tiles). Testes do design pass em `test/design_pass_test.dart` (reduced motion, semântica, texto a 200%).

## Mapa e "Escolha sua moto"

Home como no design (`HomeScreen.jsx`): avatar com iniciais, pílula "Sua localização · <ponto de retirada em que o cliente está ou "Perto de você">", sino (bolinha = mensagem do suporte não lida, abre o suporte), cartões de promoção, filtros "Todas" / "Autonomia 10+ km" / "Pontos de retirada" (motos dentro de zonas `return` ativas), pins escuros (`VehicleMarker(customerStyle: true)`), botão "Escolher moto" e "Escanear para andar".

`/pick` (`PickScreen.jsx`): motos de `GET /vehicles/nearby` ordenadas pela distância a pé (haversine a partir do GPS, ~80 m/min; sem GPS não mostra distância), chips de modelo derivados dos dados, categoria por um mapa local de modelos, preço do plano `minute`, seleção em radio e "Reservar <modelo> · <código>" (`POST /reservations`, depois `/reserved`). KYC não aprovado, inadimplência, reserva ou corrida ativa desligam o botão com o motivo. Um 409 ao reservar (`vehicle-unavailable` ou `reservation-already-active`) recarrega a lista e a reserva, tira a moto da seleção e mostra o aviso (com link para a reserva ativa). Mapa e lista recarregam as motos a cada 20 s com a tela no topo e ao voltar do segundo plano (`NearbyAutoRefresh`). Lógica pura em `features/pick/pick_logic.dart`; o que falta no contrato está em `docs/decisoes.md` (2026-10-21, app "Escolha sua moto").

## Pontos de integração

### Push (Firebase Cloud Messaging)
`PushService` tem a implementação `FirebasePushService` (registra o token em `POST /me/devices`). Sem Firebase configurado ela falha em silêncio e o app segue sem push. Para ativar:
1. Crie o projeto no Firebase e registre `br.com.volti.cliente` (Android e iOS).
2. Android: coloque `google-services.json` em `android/app/` e aplique o plugin `com.google.gms.google-services` em `android/settings.gradle.kts` e `android/app/build.gradle.kts`.
3. iOS: `GoogleService-Info.plist` em `ios/Runner/`, capacidades Push Notifications e Background Modes, chave APNs no Firebase.

### Cartão (Mercado Pago)
`CardTokenizer` devolve só o token; o número do cartão nunca vai à API. `DevCardTokenizer` devolve `tok_visa_4242` (token do gateway falso, `PAYMENT_PROVIDER=fake`). Para produção, implemente `CardTokenizer` com o SDK do Mercado Pago (formulário de cartão) e sobrescreva `cardTokenizerProvider` em `main.dart`.

### Login
Modo `dev`: tela de e-mail que chama `POST /dev/token`. O modo `cognito` usa a mesma interface `AuthRepository` (`volti_flutter`) e hoje mostra um aviso até a implementação existir. O token fica só em memória.

### Localização
Android: serviço em primeiro plano do tipo `location` e permissões no manifesto. iOS: `UIBackgroundModes: location` e textos de uso. O rastreio em segundo plano só começa na tela de corrida (aluguel ativo) e termina ao sair dela. O consentimento (`PUT /lgpd/consents`) é pedido no onboarding e de novo no início do aluguel se estiver desligado (decisão #8).

## Testes

```bash
flutter analyze && flutter test
```
Cobrem a lista "Escolha sua moto" (`test/pick_screen_test.dart`, `test/pick_logic_test.dart`), a paridade da home (`test/home_parity_test.dart`), onboarding sem consentimento, plano com seguro básico fixo, bloqueio do início sem consentimento, `zone.notice`, `device.event` de queda, encerrar sem foto e erro de rede com "Tentar de novo".
