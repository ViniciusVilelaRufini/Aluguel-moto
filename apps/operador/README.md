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

## Contrato v2 (operação)

- **Endereço:** o cartão da tarefa mostra `FieldTask.vehicleAddress` (no reposicionamento, "Para: `targetAddress`"); sem endereço, as observações. O detalhe mostra endereço e observações; o aviso de destino traz o endereço e a distância.
- **Status da moto:** `FieldTask.vehicleStatus` alimenta o `FleetStatusBadge`, os marcadores e a reconciliação do modo serviço (moto alugada/reservada/bloqueada solta o modo serviço). O status mudado pelo operador vale até a próxima lista da API.
- **Bateria:** o detalhe e a troca mostram "Retirada: BT-190577 · 12% · 412 ciclos" (`vehicleBatterySerial`, `vehicleBatteryPct`, `vehicleBatteryCycleCount`); a série retirada vem pré-preenchida (editável) e as baterias carregadas (≥ 90%) da van aparecem como sugestão para a instalada. A troca continua na fila offline; quando sincroniza, o estoque da van é relido e a confirmação mostra a série, a carga e os ciclos da instalada.
- **Van** (`/van`, stat "Baterias na van" do header = `VanStock.chargedCount`, "—" sem rede): lista série, carga e ciclos; "Carregar baterias" (séries lidas ou digitadas, até 50, sem repetir) e "Descarregar para recarga". Exige rede (como destravar): nada disso entra na fila offline. A contagem da fila offline continua no menu da conta (ponto no ícone e "Pendências de envio").
- **Revisões da frota** (`/maintenance`, menu da conta): `GET /maintenance/vehicles` com filtro Todas/Vencidas/Próximas; cada moto mostra Em dia/Próxima/Vencida, km desde a revisão e quanto falta (ou o excesso), horas de uso e a revisão agendada. Somente leitura (agendar é do painel; `POST /maintenance/tasks` não é do grupo `campo`).
- **Ficha da moto no detalhe:** `GET /vehicles/{id}` + `GET /vehicle-models` → foto, nome, categoria e preço por minuto do modelo, e o indicador da revisão. Sem rede, o cartão some.
- **Manutenção da tarefa:** com `maintenanceTaskId`, `GET /maintenance/tasks/{id}` → título, tipo, origem e data. Cliente só pelo primeiro nome (a API já manda só ele ao `campo`; o app corta de novo por garantia).
- **Chat:** o app de campo não tem chat (o suporte é dos grupos `admin`/`suporte`), então `SupportMessage.status` não se aplica aqui.

## Testes

```
flutter analyze && flutter test && flutter build apk --debug
```

Widget tests (`test/contract_v2_test.dart` cobre o contrato v2: endereço, status, bateria retirada, sugestões da van, van com carregar/descarregar e offline, revisões com filtro, cartões da moto e da manutenção, primeiro nome e texto a 200%): checklist (bloqueios, leitura > 32, confirmação de manutenção, offline com repositório fake, miniaturas com remover), troca de bateria (séries diferentes), regra de conclusão e modo serviço persistido, badge de distância, controle segmentado, fila Hive e ordenação da lista. Testes de unidade: login Cognito, formatação (distância, prazo, prioridade) e regra de conclusão.
