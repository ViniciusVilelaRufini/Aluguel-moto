# Volti Campo (apps/operador)

App Flutter do operador de campo: tarefas atribuídas (lista e mapa), destravar em modo serviço, checklist de inspeção, troca de bateria, status da moto, conclusão da tarefa, modo offline e a aba **Retiradas** do galpão (agenda do dia, QR da reserva, checklist de saída com aceite do cliente e chegada). Usa `packages/volti_flutter` (tema, widgets, cliente de API, autenticação). Textos em pt-BR (`lib/l10n/app_pt.arb`).

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

Opcionais: `--dart-define=COGNITO_SCOPES="openid email profile"` (padrão) e `--dart-define=COGNITO_LOGOUT_URI=...` ("Sign out URL" do app client; padrão = `COGNITO_REDIRECT_URI`). A URI de logout usada (por padrão a própria callback, ex.: `br.com.volti.operador://callback`) precisa estar cadastrada em **Sign out URL(s)** do app client, senão o `/logout` do Cognito responde erro.

Configuração do app client no pool interno:

- Tipo público (sem client secret), fluxo **Authorization code grant**, escopos `openid`, `email`, `profile`.
- Callback URL: exatamente o valor de `COGNITO_REDIRECT_URI` (ex.: `br.com.volti.operador://callback`).
- O esquema da URI precisa bater com o do app: Android usa `appAuthRedirectScheme` (padrão `br.com.volti.operador`, em `android/app/build.gradle.kts`; outro valor com `-PappAuthRedirectScheme=...` ou `gradle.properties`); iOS declara o mesmo esquema em `CFBundleURLTypes` (`ios/Runner/Info.plist`).
- O access token precisa trazer `cognito:groups` com `campo`; quem não está no grupo vê "Sua conta não tem acesso ao app de campo" e nenhum token é guardado.

Comportamento:

- O login sempre pede credenciais (`prompt=login`), porque o aparelho pode ser compartilhado.
- Só o refresh token é guardado (Keystore/Keychain via `flutter_secure_storage`); ao abrir o app a sessão é restaurada com ele. O access token é renovado sozinho 60 s antes de expirar (uma renovação por vez).
- Nome da saudação: `given_name` (ou `name`) do id token; sem ele, a parte local do e-mail.
- Na abertura, uma falha de rede ao restaurar é tentada de novo uma vez antes de mostrar o login; refresh recusado (`invalid_grant`) apaga o token salvo.
- Sair apaga o refresh token local na hora; a revogação em `/oauth2/revoke` (timeout de 5 s) e o logout do Hosted UI (`/logout?client_id=&logout_uri=`, encerra o cookie do navegador) rodam em segundo plano, sem segurar a tela. O logout do Hosted UI só roda quando o operador toca em "Sair"; a saída forçada (token expirado durante a sincronização) não abre o navegador. Uma falha ao limpar o estado local (Hive) não impede a saída.
- Faltando um `--dart-define`, a tela de login diz quais.
- Não testado contra um pool real neste repositório: os testes cobrem a configuração/URLs, a leitura dos tokens, o grupo `campo`, a renovação, a restauração e o logout (`test/cognito_auth_test.dart`).

## Regras

- Limitador de velocidade (decisão #13): o campo é uma leitura de 0 a 100 km/h. Acima de 32 o item não pode ser "ok": a tela mostra "Moto fora do limite legal — vai para manutenção" e o envio faz a API abrir manutenção e alerta (ids exibidos na confirmação).
- Troca de bateria: séries da retirada e da instalada (QR/código de barras com `mobile_scanner`, ou digitadas), obrigatoriamente diferentes.
- Offline: checklist, troca e conclusão entram numa fila Hive (`lib/data/offline_queue.dart`), em ordem, com `Idempotency-Key` fixa por item (reenvio nunca duplica). Rotulados "Aguardando sincronização"; sincronizam ao voltar a rede e em "Pendências de envio". Fotos sobem por URL pré-assinada na sincronização. Item recusado pela API (4xx) fica como "Recusado" e pode ser descartado ou reenviado.
- Destravar em modo serviço e mudar status exigem rede (a auditoria é do servidor). O modo serviço destravado fica salvo por tarefa (Hive, `operator_service_unlock`, com o instante) e sobrevive a reinícios do app. Vale por 2 h (`serviceUnlockTtlProvider`); some ao concluir a tarefa (quando a API confirma), ao sair da conta, e a cada lista nova da API se a tarefa foi reatribuída, cancelada, concluída ou a moto está num status incompatível.
- Conclusão: recusada pela API (checklist ou conclusão), a tarefa continua aberta e destravada e o motivo aparece no detalhe (reenvio em "Pendências de envio"); sem rede, fica "Aguardando sincronização" (não concluída) até a fila enviar.
- Concluir tarefa (regra do design): só com a moto destravada em modo serviço, o checklist completo (5/5) e a foto da moto após o serviço; nas tarefas de bateria, também a troca registrada. Enquanto faltar algo, o botão fica desabilitado e o motivo aparece acima dele. Se o checklist estiver completo mas ainda não enviado, "Concluir" envia o checklist antes da conclusão (mesma fila offline).
- Localização (geolocator): só com o app em uso (permissão "durante o uso", sem segundo plano; o GPS para quando o app sai da tela e quando nenhuma tela visível usa distância ou mapa). Antes de pedir a permissão o app explica para que serve. Com GPS, a lista mostra a distância até cada moto ("350 m", "1,2 km") e os mapas mostram o seu ponto.

## Galpão (aba Retiradas)

- **Agenda do dia**: `GET /depots/{id}/pickups?date=` (data local do aparelho). Primeiro as acionáveis (`active`, depois `handover`); dentro de cada grupo, "Retirar agora" antes e depois por horário. `converted`, `canceled` e `expired` ficam recolhidas em "Concluídas hoje". Só o primeiro nome do cliente aparece. Com mais de um galpão (`GET /depots`), o operador escolhe; com um só, ele já vem selecionado. A lista recarrega com `handover.updated` (Socket.IO `/realtime`, sala `depot:{id}`) e ao reconectar.
- **QR da reserva** (`lib/features/pickups/pickup_scan_page.dart`): câmera ou código colado. O app confere o formato `v1.<reservationId>.<exp>.<assinatura>`, o vencimento e se a reserva está na agenda de hoje como `active`; a assinatura é conferida pela API no envio (`404` → "Código inválido").
- **Checklist de saída**: freios, luzes, pneus, buzina, painel e carenagem (motivo opcional no item com problema), bateria em % (0–100) e nº de série opcional, fotos de frente, trás e dos dois lados (mínimo 4, até 12). Fotos sobem por `POST /handovers/uploads` (URL pré-assinada, prefixo `handovers/`) e o envio é `POST /handovers` com `type: pickup`. O envio precisa do servidor (o cliente aceita no app): sem rede, o rascunho fica guardado e a tela diz "Sem conexão: envie quando voltar a rede"; fotos já enviadas não sobem de novo.
- **Estado ao vivo** (`handover_status_page.dart`): `handover.updated` + `GET /handovers/{id}`: "Aguardando o cliente", "Aceito — moto liberada", "Pagamento não aprovado" (`lastError`) ou "Problema apontado" (`disputed`, com o motivo).
- **Chegada** (`lib/features/arrivals/arrival_checklist_page.dart`), checklist curto (freios, pneus, luzes, carenagem) + bateria + galpão:
  - devolução de aluguel: confere a moto pelo código (`GET /vehicles/code/{code}` → `currentRentalId`), exige uma foto e envia `POST /handovers` `type: return_depot` com `rentalId` e `depotId` pela **fila offline** (sem rede, o aluguel é resolvido no envio). Item com problema: a moto vai para manutenção (decidido pela API).
  - recolhimento (tarefa `collect`): "Concluir tarefa" abre a chegada; a conclusão vai com `depotId` e `vehicleStatus` `maintenance` (algum item com problema) ou `free`, e o resumo do checklist nas observações.

## Testes

```
flutter analyze && flutter test && flutter build apk --debug
```

Widget tests: galpão (`test/pickups_test.dart`: ordem da agenda e concluídas recolhidas, só primeiro nome, QR adulterado/vencido e `404`, checklist com 4 fotos e bateria, rascunho sem rede, estados ao vivo com `handover.updated`, chegada com item problemático e fila offline, recolhimento com galpão, 200% de texto em 360×740 e semântica de toque), checklist (bloqueios, leitura > 32, confirmação de manutenção, offline com repositório fake, miniaturas com remover), troca de bateria (séries diferentes), regra de conclusão e modo serviço persistido, badge de distância, controle segmentado, fila Hive e ordenação da lista. Testes de unidade: login Cognito, formatação (distância, prazo, prioridade) e regra de conclusão.
