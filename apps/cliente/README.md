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
- `lib/features/<tela>`: onboarding, home (mapa com o galpão), pick ("Escolha sua moto" do galpão), plan (plano, seguro e Pix), pickup (retirada agora/agendada e regras de horário), reservation (reserva com QR), handover ("Confira sua moto" e o vigia da entrega), ride (corrida e "Trocar bateria"), return_flow (ponto verde ou galpão), summary, account.
- `lib/l10n/app_pt.arb`: todos os textos (pt-BR).

## Motion (design v2)

Transições de tela em `core/router.dart` (`voltiPage`): push lateral de 440 ms; páginas `modal: true` sobem de baixo e a tela de trás recua. Listas e seções entram em cascata (`VoltiStagger.wrap`), a miniatura da moto voa da lista para o cabeçalho do plano (Hero, desligado em reduced motion), posição do usuário pulsa, rotas se desenham (`DrawnPolyline`), recibo mostra `VoltiSuccessCheck`. Tudo respeita reduced motion (`MediaQuery.disableAnimationsOf`). Animações infinitas (pulso, brilho, ponto ao vivo) impedem `pumpAndSettle`: use `pump(duration)` nos testes dessas telas.

Toque e seleção (E-21): os botões, chips e cartões de escolha vêm do `volti_flutter` (press com mola, sombra que baixa, loading sem salto, seleção em tween). "Confirmar reserva" (retirada) e "Aceitar e destravar" (entrega) tocam háptica leve no toque e, quando o servidor confirma, mostram o check de sucesso no próprio botão por 700 ms antes de navegar (sem espera com reduced motion; com caução Pix pendente o QR abre direto). A escolha da moto usa `VoltiRadio`. Nos testes, `VoltiHaptics.debugHandler` grava a háptica.

## Design pass (UI/UX)

Auditoria em `docs/design/auditoria-app.md` e evoluções em `docs/design/evolucoes-app.md`. Resumo: HUD da corrida com `VoltiSpeedGauge`, números que rolam (`VoltiTicker`) e faixas animadas (`VoltiStatusBanner`); esqueletos (`AsyncView(loading:)` + `VoltiSkeleton`); estados vazios (`VoltiEmptyState`); puxar para atualizar; cartão da moto arrasta para fechar; háptica semântica (`VoltiHaptics`); coreografia de sucesso no Pix, devolução e recibo; confirmação ao cancelar a renovação. O mapa da home também respeita `mapEnabledProvider` (testes sem tiles). Testes do design pass em `test/design_pass_test.dart` (reduced motion, semântica, texto a 200%).

## Retirada em galpão (spec 2026-10-22, Task 9)

O cliente não acha moto na rua: escolhe no app e retira no galpão.

- **Home** (`/home`): mapa com o galpão em destaque, pontos verdes de devolução (zonas `return`) e estações de bateria (`GET /swap-stations`); sem motos na rua e sem "Escanear para andar". Cartão fixo "Galpão Volti · <bairro> · N motos disponíveis" (`Depot.district`, `availableVehicleCount`), "Aberto até 20h" / "Fechado · abre seg. às 7h", endereço e **Escolher moto**. Com vários galpões o cartão vira seletor (chips, mais perto primeiro por `distanceM`; sem localização — sem consentimento ou sem GPS — a API não manda `distanceM` e fica a ordem da API). `currentDepotProvider` = galpão escolhido ou, sem escolha, o mais perto.
- **Escolher moto** (`/pick`): `GET /depots/{id}/vehicles`; foto (`VehicleModel.photoUrl`), categoria (`categoryLabel`), código, bateria/autonomia e preço por modelo (`pricePerMinuteCents`); sem distância. Filtro por modelo; **Continuar com <modelo> · <código>** não reserva, só segue.
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
