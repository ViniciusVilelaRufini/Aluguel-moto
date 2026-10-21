# @volti/contracts

Contrato da plataforma Volti: **fonte única da verdade** para a API, o painel e os apps.

| Arquivo | Conteúdo |
|---|---|
| `openapi.yaml` | API REST (OpenAPI 3.1): 140 operações em 22 tags, erros RFC 7807, paginação por cursor, `Idempotency-Key`, grupos de staff (`x-required-groups`) |
| `realtime.md` | Eventos do WebSocket (Socket.IO, namespace `/realtime`), salas e payloads |
| `generated/ts/schema.d.ts` | Tipos TypeScript gerados com `openapi-typescript` (painel, com `openapi-fetch`) |
| `generated/dart/` | Pacote Dart `volti_api` gerado com `openapi-generator` (`dart-dio` + `built_value`) para os apps Flutter |
| `scripts/generate.mjs` | Regenera os dois clientes |
| `dart-generator.yaml`, `openapitools.json` | Opções e versão fixada do openapi-generator (7.25.0) |
| `redocly.yaml` | Regras do lint |
| `mqtt.md`, `schemas/` | Contrato MQTT (criado pela Task 4, agente de IoT) |

## Pré-requisitos

- Node 24 e pnpm 9 (`pnpm install` na raiz do repositório)
- Java 17 (o openapi-generator é um `.jar`, baixado na primeira execução para `node_modules`)
- Dart 3.11 / Flutter 3.41 (para o `build_runner` e o `dart analyze` do pacote Dart)

## Comandos

Rode a partir da raiz do repositório:

```bash
pnpm --filter @volti/contracts lint        # redocly lint openapi.yaml (tem que sair sem erros e sem avisos)
pnpm contracts:generate                    # regenera TypeScript e Dart (inclui build_runner e dart format)
pnpm --filter @volti/contracts typecheck   # tsc sobre o schema.d.ts gerado
pnpm --filter @volti/contracts mock        # mock Prism em http://localhost:4010
```

Opções do gerador: `pnpm --filter @volti/contracts generate:ts` ou `generate:dart` para gerar só um lado;
`node scripts/generate.mjs --skip-build-runner` para pular o `build_runner` do Dart.

Verificar o pacote Dart:

```bash
cd packages/contracts/generated/dart
dart pub get
dart analyze      # esperado: No issues found!
```

## Como mudar o contrato

1. Depois da aprovação da Task 1, toda mudança é **proposta** em `docs/decisoes.md` e aprovada pelo usuário.
2. Edite `openapi.yaml`, mantendo as convenções: campos em camelCase; dinheiro em `...Cents` (inteiro);
   datas `format: date-time`; `operationId` em camelCase (vira o nome do método nos clientes); toda
   operação com tag, `security` e ao menos uma resposta 4xx; endpoints de staff com `x-required-groups`;
   todo objeto e enum como componente nomeado (sem `allOf`/`oneOf` nem objetos inline: o `dart-dio` gera
   nomes instáveis para eles); sem `null` (campo opcional = ausente).
3. `pnpm --filter @volti/contracts lint`, `pnpm contracts:generate`, `typecheck` e `dart analyze`.
4. Faça commit do `openapi.yaml` **junto com** `generated/` (os clientes gerados são versionados).

Não edite nada em `generated/` à mão; o script apaga e recria a pasta. Exceções mantidas à mão em
`generated/dart`: `.openapi-generator-ignore` (escrito pelo script) e `analysis_options.yaml` (silencia
`unused_import`, que os templates do gerador produzem em todos os arquivos de API).

## Mock (Prism)

```bash
pnpm --filter @volti/contracts mock
curl -H "Authorization: Bearer dev" "http://localhost:4010/vehicles/nearby?lat=-23.56&lng=-46.69"
```

- O Prism exige o header `Authorization: Bearer <qualquer coisa>` nas rotas protegidas (sem ele responde 401);
  não valida o token.
- Valida as requisições contra o contrato: `speedLimitKmh: 33` em `POST /vehicles/{id}/commands` → 400
  `problem+json`; `POST /rentals` sem `Idempotency-Key` → 422.
- Responde com o `example` da operação quando houver (ex.: `/vehicles/nearby`) ou com dados gerados do
  schema. Para respostas dinâmicas: `prism mock -d openapi.yaml`.
- Para forçar um status: header `Prefer: code=404`.
- No docker compose, o serviço `prism` (perfil `mock`) usa este mesmo arquivo na porta 4010.

## Como consumir

**Painel (TypeScript):**

```ts
import createClient from 'openapi-fetch';
import type { paths, components } from '@volti/contracts';

const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL });
const { data, error } = await api.GET('/vehicles/nearby', {
  params: { query: { lat: -23.56, lng: -46.69 } },
  headers: { Authorization: `Bearer ${token}` },
});
type Vehicle = components['schemas']['Vehicle'];
```

Adicione `"@volti/contracts": "workspace:*"` às dependências do pacote.

**Apps Flutter (Dart):**

```yaml
# pubspec.yaml
dependencies:
  volti_api:
    path: ../../packages/contracts/generated/dart
```

```dart
import 'package:volti_api/volti_api.dart';

final api = VoltiApi(basePathOverride: apiBaseUrl);
api.dio.options.headers['Authorization'] = 'Bearer $token';
final res = await api.getVehiclesApi().listNearbyVehicles(lat: -23.56, lng: -46.69);
final vehicles = res.data!.items;
```

Observações do pacote Dart: os enums aceitam valores desconhecidos (`unknownDefaultOpenApi`), então um
valor novo no servidor não quebra o app; o campo `on` de `SendCommandRequest`/`VehicleCommand` virou `on_`
(palavra reservada no Dart); os modelos são `built_value` (imutáveis, criados com
`SendCommandRequest((b) => b..type = CommandType.lock..reason = '...')`).

## Regras que o contrato garante

- `speedLimitKmh` sempre `0..32` (comandos, zonas, inspeção, ficha da moto); acima disso → 400.
- Zonas `reduced_speed` exigem `speedLimitKmh <= 20` (422).
- Cartão: só `cardToken` do gateway; nenhum campo de número, CVV ou validade completa.
- Cliente nunca recebe distância percorrida; recebe tempo, custo, bateria, autonomia e velocidade.
- CPF completo só para o próprio cliente e para `admin`.
