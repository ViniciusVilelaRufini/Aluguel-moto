# volti_api.api.StationsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**cancelStationSwap**](StationsApi.md#cancelstationswap) | **POST** /swap-stations/{id}/swaps/{swapId}/cancel | Cancelar troca na estação
[**createStationSwap**](StationsApi.md#createstationswap) | **POST** /swap-stations/{id}/swaps | Iniciar troca de bateria na estação (QR)
[**getStationSwap**](StationsApi.md#getstationswap) | **GET** /swap-stations/{id}/swaps/{swapId} | Consultar troca na estação
[**listStationSwaps**](StationsApi.md#liststationswaps) | **GET** /swap-stations/{id}/swaps | Trocas da estação (painel)
[**listSwapStations**](StationsApi.md#listswapstations) | **GET** /swap-stations | Estações de troca de bateria (mapa)


# **cancelStationSwap**
> StationSwap cancelStationSwap(id, swapId)

Cancelar troca na estação

Só o dono e só antes da devolução (`opening_slot` ou `awaiting_return`) → `canceled` (`endReason: canceled_by_customer`). Depois disso → `422` `swap-not-cancelable` (a estação precisa liberar a carregada). Troca já cancelada → `200` como está. Bateria devolvida mesmo assim entra no estoque da estação. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String swapId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.cancelStationSwap(id, swapId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->cancelStationSwap: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **swapId** | **String**|  | 

### Return type

[**StationSwap**](StationSwap.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createStationSwap**
> StationSwap createStationSwap(idempotencyKey, id, stationSwapRequest)

Iniciar troca de bateria na estação (QR)

O cliente escaneou o QR fixo da estação (`stationCode`, código assinado sem dado pessoal) com um aluguel em andamento. A API valida, nesta ordem: - QR inválido, adulterado ou de outra estação (o `id` do caminho tem que ser a estação do QR) → `404`   `station-not-found`; - aluguel do próprio cliente (senão `404`) e `active` ou `paused` → senão `409` `rental-not-active`; - uma troca aberta por aluguel → `409` `swap-open`; - estação ativa, aberta (`open24h` ou dentro de `openingHours` quando o texto é interpretável, no fuso   America/Sao_Paulo) e com bateria carregada livre (`availableBatteries` menos as trocas em andamento) → senão   `422` `station-unavailable`; - celular (`lat`/`lng`) a no máximo 50 m da estação → senão `422` `too-far`. A posição só é usada nesta   validação (LGPD): a troca guarda apenas a distância; - moto parada: velocidade 0 conhecida e recente, moto travada ou aluguel pausado. Velocidade desconhecida conta   como em movimento → `422` `vehicle-moving`.  Sucesso → `201` com a troca em `opening_slot`; a estação abre uma vaga vazia. A partir daí o status avança pelos eventos da estação (`station_swap.updated` no WebSocket): `awaiting_return` (vaga aberta, `slotNumber`) → `returned` (bateria devolvida) → `releasing` (vaga fechada, estação libera a carregada) → `completed`. Cada etapa tem prazo de 3 min (`expiresAt`): sem resposta da estação → `failed`; sem devolução → `canceled`; nenhuma bateria é liberada sem a devolução registrada.  Taxa (`feeCents`, congelada aqui): 0 nos planos `day`, `weekly` e `monthly`; nos planos `minute` e `hour`, a taxa de sistema `battery_swap_fee` (padrão 500, editável em `PUT /pricing/fees/{id}`). Não é cobrada na hora: entra como linha `battery_swap_fee` no `breakdown` do fechamento do aluguel, só para trocas `completed`.  Idempotência: a mesma `Idempotency-Key` devolve a mesma troca e não abre outra vaga. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final StationSwapRequest stationSwapRequest = ; // StationSwapRequest | 

try {
    final response = api.createStationSwap(idempotencyKey, id, stationSwapRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->createStationSwap: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **id** | **String**|  | 
 **stationSwapRequest** | [**StationSwapRequest**](StationSwapRequest.md)|  | 

### Return type

[**StationSwap**](StationSwap.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getStationSwap**
> StationSwap getStationSwap(id, swapId)

Consultar troca na estação

Dono (cliente) ou staff. Troca de outro cliente ou de outra estação → `404`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String swapId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getStationSwap(id, swapId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->getStationSwap: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **swapId** | **String**|  | 

### Return type

[**StationSwap**](StationSwap.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listStationSwaps**
> StationSwapPage listStationSwaps(id, cursor, limit, status)

Trocas da estação (painel)

Mais recentes primeiro, com nº de série devolvido/liberado. Estação inexistente → `404` `station-not-found`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final StationSwapStatus status = ; // StationSwapStatus | 

try {
    final response = api.listStationSwaps(id, cursor, limit, status);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->listStationSwaps: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**StationSwapStatus**](.md)|  | [optional] 

### Return type

[**StationSwapPage**](StationSwapPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSwapStations**
> SwapStationList listSwapStations(lat, lng, radiusM)

Estações de troca de bateria (mapa)

Estações ativas com posição, endereço, horário e baterias carregadas disponíveis. Com `lat`/`lng`, filtra pelo raio e ordena por distância (`distanceM`); sem eles, todas em ordem alfabética.  Leitura aberta a qualquer cliente autenticado (`customerAuth`, sem grupo: o mapa e a folha \"Troca de bateria\" do app). `x-required-groups` vale só para `staffAuth`. A resposta traz apenas os campos públicos de `SwapStation` (identificador, nome, endereço, posição, baterias, vagas, horário e distância); dados internos da estação (ativa/inativa, datas de cadastro) não saem da API, para nenhum pool. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final double lat = 1.2; // double | 
final double lng = 1.2; // double | 
final int radiusM = 56; // int | Raio em metros (só com `lat`/`lng`).

try {
    final response = api.listSwapStations(lat, lng, radiusM);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->listSwapStations: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **lat** | **double**|  | [optional] 
 **lng** | **double**|  | [optional] 
 **radiusM** | **int**| Raio em metros (só com `lat`/`lng`). | [optional] [default to 10000]

### Return type

[**SwapStationList**](SwapStationList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

