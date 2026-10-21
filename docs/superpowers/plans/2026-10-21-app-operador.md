# Plano da area: app do operador de campo (`apps/operador`)

Task 8 / Agente 7. Flutter, Riverpod, go_router, pt-BR em `lib/l10n/app_pt.arb`. Reaproveita `volti_flutter` (tema, widgets, `apiClientProvider`, `AuthRepository`) e `volti_api`.

## Decisoes
- Login: `DevAuthRepository.signIn(pool: staff, groups: [campo])` (POST /dev/token); Cognito atras da mesma interface (`AuthRepository`).
- Limitador (decisao #13): `configuredMaxKmh` e uma leitura 0..100. Acima de 32 o item nao pode ser "ok": a UI mostra "Moto fora do limite legal - vai para manutencao", forca "nao ok" e, no envio, a API abre manutencao + alerta; a tela mostra `maintenanceTaskId`/`alertId`.
- Offline: fila `hive_ce` (caixa de JSON, sem codegen) com `OfflineQueue` abstrata; jobs `inspection`, `batterySwap` e `completeTask` em ordem FIFO, cada um com `Idempotency-Key` fixa (uuid gerado ao enfileirar), reenviada em toda tentativa. Fotos ficam como arquivos locais e sobem (URL pre-assinada) na sincronizacao; as chaves sobem junto no job. Erro de rede/5xx mantem o job; 4xx marca `failed` (visivel, descartavel). Sincroniza ao voltar a rede (`connectivity_plus` atras de `ConnectivityMonitor`) e ao abrir o app. Rotulo "Aguardando sincronizacao".
- Troca de bateria: `mobile_scanner` (QR/codigo de barras) ou digitacao; as duas series precisam ser diferentes (`battery-serials-must-differ` tambem tratado).
- Mapa: `flutter_map` + OSM; lista/mapa alternaveis; rota abre o app de mapas (`url_launcher`) ate o destino.
- Destravar em modo servico e mudar status (free/maintenance) so online; concluir tarefa entra na fila.

## Estrutura
- `lib/data`: modelos de rascunho (`InspectionDraft`, `BatterySwapDraft`, `QueuedJob`), `OfflineQueue` (Hive/memoria), `FieldRepository` (API/fake), `SyncController`.
- `lib/features`: `auth` (login), `tasks` (lista, mapa, detalhe), `inspection` (formulario), `battery` (troca + scanner), `sync` (pendencias).
- `lib/ui`: cabecalho escuro ink-900 arredondado (`OperatorHeader`).

## Testes (TDD, widget)
1. Checklist nao conclui sem os 5 itens e sem foto.
2. Leitura > 32 forca "nao ok", mostra aviso e bloqueia o "ok"; envio devolve manutencao/alerta.
3. Troca exige duas series diferentes.
4. Checklist salvo offline mostra "Aguardando sincronizacao" e sincroniza ao voltar a rede (repositorio fake), com a mesma `Idempotency-Key`.
Extras: fila Hive (ida e volta), mapeamento de erros.

## Verificacao
`flutter pub get && flutter analyze && flutter test && flutter build apk --debug`.
