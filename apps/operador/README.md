# Volti Campo (apps/operador)

App Flutter do operador de campo: tarefas atribuídas (lista e mapa), destravar em modo serviço, checklist de inspeção, troca de bateria, status da moto, conclusão da tarefa e modo offline. Usa `packages/volti_flutter` (tema, widgets, cliente de API, autenticação). Textos em pt-BR (`lib/l10n/app_pt.arb`).

## Rodar

```
cd apps/operador
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001 --dart-define=AUTH_MODE=dev
```

Login dev: `campo@volti.dev` (seed da API; `POST /dev/token`, pool `staff`, grupo `campo`).

## Login Cognito (pool interno, grupo `campo`)

`AUTH_MODE=cognito` abre o Hosted UI do pool interno (staff) no navegador do sistema (Custom Tabs no Android, `ASWebAuthenticationSession` no iOS) com **Authorization Code + PKCE (S256)** via `flutter_appauth`. O MFA do pool interno é pedido dentro do Hosted UI; o app não vê senha nem código. Implementação: `lib/data/cognito_auth.dart` (`OperatorCognitoAuthRepository`).

```
flutter run   --dart-define=API_BASE_URL=https://api.volti.com.br   --dart-define=AUTH_MODE=cognito   --dart-define=COGNITO_DOMAIN=volti-staff.auth.sa-east-1.amazoncognito.com   --dart-define=COGNITO_CLIENT_ID=<app client id, sem secret>   --dart-define=COGNITO_REDIRECT_URI=br.com.volti.operador://callback
```

Opcional: `--dart-define=COGNITO_SCOPES="openid email profile"` (padrão).

Configuração do app client no pool interno:

- Tipo público (sem client secret), fluxo **Authorization code grant**, escopos `openid`, `email`, `profile`.
- Callback URL: exatamente o valor de `COGNITO_REDIRECT_URI` (ex.: `br.com.volti.operador://callback`).
- O esquema da URI precisa bater com o do app: Android usa `appAuthRedirectScheme` (padrão `br.com.volti.operador`, em `android/app/build.gradle.kts`; outro valor com `-PappAuthRedirectScheme=...` ou `gradle.properties`); iOS declara o mesmo esquema em `CFBundleURLTypes` (`ios/Runner/Info.plist`).
- O access token precisa trazer `cognito:groups` com `campo`; quem não está no grupo vê "Sua conta não tem acesso ao app de campo" e nenhum token é guardado.

Comportamento:

- O login sempre pede credenciais (`prompt=login`), porque o aparelho pode ser compartilhado.
- Só o refresh token é guardado (Keystore/Keychain via `flutter_secure_storage`); ao abrir o app a sessão é restaurada com ele. O access token é renovado sozinho 60 s antes de expirar (uma renovação por vez).
- Nome da saudação: `given_name` (ou `name`) do id token; sem ele, a parte local do e-mail.
- Sair apaga o refresh token local e o revoga em `/oauth2/revoke`.
- Faltando um `--dart-define`, a tela de login diz quais.
- Não testado contra um pool real neste repositório: os testes cobrem a configuração/URLs, a leitura dos tokens, o grupo `campo`, a renovação, a restauração e o logout (`test/cognito_auth_test.dart`).

## Regras

- Limitador de velocidade (decisão #13): o campo é uma leitura de 0 a 100 km/h. Acima de 32 o item não pode ser "ok": a tela mostra "Moto fora do limite legal — vai para manutenção" e o envio faz a API abrir manutenção e alerta (ids exibidos na confirmação).
- Troca de bateria: séries da retirada e da instalada (QR/código de barras com `mobile_scanner`, ou digitadas), obrigatoriamente diferentes.
- Offline: checklist, troca e conclusão entram numa fila Hive (`lib/data/offline_queue.dart`), em ordem, com `Idempotency-Key` fixa por item (reenvio nunca duplica). Rotulados "Aguardando sincronização"; sincronizam ao voltar a rede e em "Pendências de envio". Fotos sobem por URL pré-assinada na sincronização. Item recusado pela API (4xx) fica como "Recusado" e pode ser descartado ou reenviado.
- Destravar em modo serviço e mudar status exigem rede (a auditoria é do servidor). O modo serviço destravado fica salvo por tarefa (Hive, `operator_service_unlock`) e sobrevive a reinícios do app; some quando a tarefa é concluída.
- Concluir tarefa (regra do design): só com a moto destravada em modo serviço, o checklist completo (5/5) e a foto da moto após o serviço; nas tarefas de bateria, também a troca registrada. Enquanto faltar algo, o botão fica desabilitado e o motivo aparece acima dele. Se o checklist estiver completo mas ainda não enviado, "Concluir" envia o checklist antes da conclusão (mesma fila offline).
- Localização (geolocator): só com o app em uso (permissão "durante o uso", sem segundo plano; o GPS para quando o app sai da tela). Antes de pedir a permissão o app explica para que serve. Com GPS, a lista mostra a distância até cada moto ("350 m", "1,2 km") e os mapas mostram o seu ponto.

## Testes

```
flutter analyze && flutter test && flutter build apk --debug
```

Widget tests: checklist (bloqueios, leitura > 32, confirmação de manutenção, offline com repositório fake, miniaturas com remover), troca de bateria (séries diferentes), regra de conclusão e modo serviço persistido, badge de distância, controle segmentado, fila Hive e ordenação da lista. Testes de unidade: login Cognito, formatação (distância, prazo, prioridade) e regra de conclusão.
