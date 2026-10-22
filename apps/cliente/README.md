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

Variáveis `--dart-define`: `API_BASE_URL`, `AUTH_MODE=dev|cognito` (padrão `dev`; build release sempre usa cognito), `SUPPORT_PHONE` (telefone do botão SOS), no modo cognito `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REDIRECT_URI` (ver Login), `FIRST_RIDE_PROMO=true` (liga o cartão "1ª corrida grátis" e o selo "1ª grátis" para clientes sem aluguéis; padrão desligado, porque o contrato ainda não diz se a promoção existe).

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

## Ajustes do teste no emulador (rodada 1)

- Reserva: barra do topo no topo (abaixo da status bar), sem voltar visível nem megafone; "Voltar" só para leitor de tela e voltar do sistema; trilho "Deslize para cancelar" de largura total; rota a pé em "L" (`walkingPath`) até existir a rota por ruas (proposta R2). A tela será redesenhada para retirada no galpão.
- Contagem com o relógio do servidor: `clockProvider` usa o `ServerClock` do `volti_flutter`, corrigido pelo cabeçalho `Date` das respostas, e nunca passa da duração da reserva.
- Resumo de preço (plano e recibo) por `core/breakdown.dart`: o seguro, o cupom e as taxas aparecem uma vez (das linhas da API; os totais só viram linha quando a categoria não veio).
- Plano: sem cartão salvo, a caução já vem em Pix; botão desligado diz o motivo; "Obrigatório" só no selo.
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
Cobrem login (dev × cognito), código por SMS com reenvio e limite de 60 s, passo de pagamento, CPF inválido, a lista "Escolha sua moto" (`test/pick_screen_test.dart`, `test/pick_logic_test.dart`), a paridade da home (`test/home_parity_test.dart`), onboarding sem consentimento, plano com seguro básico fixo, bloqueio do início sem consentimento, `zone.notice`, `device.event` de queda, encerrar sem foto e erro de rede com "Tentar de novo".
