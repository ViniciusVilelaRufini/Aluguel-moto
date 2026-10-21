# Volti Campo (apps/operador)

App Flutter do operador de campo: tarefas atribuídas (lista e mapa), destravar em modo serviço, checklist de inspeção, troca de bateria, status da moto, conclusão da tarefa e modo offline. Usa `packages/volti_flutter` (tema, widgets, cliente de API, autenticação). Textos em pt-BR (`lib/l10n/app_pt.arb`).

## Rodar

```
cd apps/operador
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=AUTH_MODE=dev
```

Login dev: `campo@volti.dev` (seed da API; `POST /dev/token`, pool `staff`, grupo `campo`). `AUTH_MODE=cognito` usa a mesma interface, mas o login hospedado ainda não está ligado.

## Regras

- Limitador de velocidade (decisão #13): o campo é uma leitura de 0 a 100 km/h. Acima de 32 o item não pode ser "ok": a tela mostra "Moto fora do limite legal — vai para manutenção" e o envio faz a API abrir manutenção e alerta (ids exibidos na confirmação).
- Troca de bateria: séries da retirada e da instalada (QR/código de barras com `mobile_scanner`, ou digitadas), obrigatoriamente diferentes.
- Offline: checklist, troca e conclusão entram numa fila Hive (`lib/data/offline_queue.dart`), em ordem, com `Idempotency-Key` fixa por item (reenvio nunca duplica). Rotulados "Aguardando sincronização"; sincronizam ao voltar a rede e em "Pendências de envio". Fotos sobem por URL pré-assinada na sincronização. Item recusado pela API (4xx) fica como "Recusado" e pode ser descartado ou reenviado.
- Destravar em modo serviço e mudar status exigem rede (a auditoria é do servidor).

## Testes

```
flutter analyze && flutter test && flutter build apk --debug
```

Widget tests: checklist (bloqueios, leitura > 32, confirmação de manutenção, offline com repositório fake), troca de bateria (séries diferentes), fila Hive e ordenação da lista.
