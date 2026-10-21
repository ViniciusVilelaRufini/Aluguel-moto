# Plano da área: app do cliente (`apps/cliente`)

Flutter (Android e iOS, com alvo web para verificação). Usa `packages/volti_flutter` (tema, widgets, `apiClientProvider`, `AuthRepository`) e `volti_api` (cliente gerado).

## Arquitetura
- Feature-first em `lib/features/<feature>/` (`onboarding`, `home`, `reservation`, `scan`, `plan`, `ride`, `return_flow`, `summary`, `account`) e `lib/core/` (backend, realtime, location, push, card tokenizer, router, erros).
- Riverpod 3 para estado; go_router com redirect por sessão e KYC/consentimento.
- `Backend` (interface) encapsula `VoltiApi`; `ApiBackend` é a implementação real; os testes de widget usam `FakeBackend`.
- Textos em `lib/l10n/app_pt.arb` (`flutter_localizations`, `gen-l10n`), pt-BR, sem emoji, sentence case, nunca km rodados.
- Mapa: `flutter_map` + tiles OSM (roda em Android, iOS e web), filtro de cor conforme o design.
- Tempo real: `socket_io_client` no namespace `/realtime` (`rental.updated`, `vehicle.position`, `zone.notice`, `device.event`) atrás de `RealtimeService`.
- Push: `PushService` (interface) com `FirebasePushService` e `NoopPushService` quando Firebase não está configurado.
- Cartão: `CardTokenizer` (interface); implementação dev devolve `tok_visa_4242`; SDK Mercado Pago entra no mesmo ponto. Nunca enviar número de cartão à API.
- Localização em segundo plano (`geolocator`) só com aluguel ativo e consentimento; permissões declaradas em Android e iOS.
- Login: tela dev (`POST /dev/token`, pool customer) via `AuthRepository`; modo cognito atrás da mesma interface.
- `API_BASE_URL` via `--dart-define`; funciona com Prism (`pnpm --filter @volti/contracts mock`, porta 4010) e API dev.

## Telas (prompt do agente 5)
1. Onboarding: boas-vindas, login, dados + termos + consentimento de localização (obrigatório), documento e selfie (upload pré-assinado), status da verificação.
2. Mapa/Home: motos próximas (bateria, autonomia), filtro de bateria, zonas, reserva de 15 min com contagem e rota a pé, buzina.
3. Destravar: QR (`mobile_scanner`) ou número da moto.
4. Plano: plano, seguro (básico pré-selecionado e não removível), cupom, resumo, caução (cartão ou Pix, decisão #1), carteira.
5. Em aluguel: tempo, custo, bateria, velocidade em tempo real; avisos de zona; pausar/retomar; SOS; "Você está bem?"; reportar problema e trocar de moto.
6. Encerrar: foto obrigatória, só em devolução (erro da API explicado), recibo com trajeto.
7. Conta: histórico, recibos, avaliação, contestação, sinistro, planos, chat de suporte, ajuda (regras de trânsito), exportar e excluir dados.
8. Push.

## Decisões aplicadas
#1 Pix 202 `awaiting_deposit`; #2 endpoints "current" sempre 200; #8 consentimento exigido para iniciar aluguel (bloqueio no início, além do passo de onboarding); #9 reserva de 15 min.

## Resiliência e acessibilidade
Retry do `volti_flutter`; estados de carregamento e erro com "Tentar de novo" (`AsyncView`); `Semantics` nos controles; textos escalam (sem alturas fixas em texto); tema claro e escuro.

## Testes de widget (TDD)
Onboarding bloqueia sem consentimento; plano exige seguro básico não removível; `zone.notice` mostra novo limite; `device.event` queda abre "Você está bem?"; encerrar desabilitado sem foto; erro de rede mostra "Tentar de novo"; bloqueio do início sem consentimento.

## Verificação
`flutter analyze`, `flutter test`, `flutter build web`, `flutter build apk --debug`; fluxo contra o Prism.
