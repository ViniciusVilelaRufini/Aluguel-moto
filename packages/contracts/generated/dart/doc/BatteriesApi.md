# volti_api.api.BatteriesApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createBattery**](BatteriesApi.md#createbattery) | **POST** /batteries | Cadastrar bateria no galpão
[**getVanStock**](BatteriesApi.md#getvanstock) | **GET** /batteries/van-stock | Estoque de baterias na van do operador
[**listBatteries**](BatteriesApi.md#listbatteries) | **GET** /batteries | Baterias (série, carga, ciclos, onde estão)
[**listBatteryMovements**](BatteriesApi.md#listbatterymovements) | **GET** /batteries/{id}/movements | Histórico de movimentação da bateria
[**loadVanBatteries**](BatteriesApi.md#loadvanbatteries) | **POST** /batteries/van-stock/load | Carregar baterias na van
[**markBatteryCharged**](BatteriesApi.md#markbatterycharged) | **POST** /batteries/{id}/mark-charged | Marcar bateria como carregada
[**reportBatteryDefect**](BatteriesApi.md#reportbatterydefect) | **POST** /batteries/{id}/report-defect | Registrar defeito na bateria
[**retireBattery**](BatteriesApi.md#retirebattery) | **POST** /batteries/{id}/retire | Dar baixa na bateria
[**unloadVanBatteries**](BatteriesApi.md#unloadvanbatteries) | **POST** /batteries/van-stock/unload | Descarregar baterias da van


# **createBattery**
> Battery createBattery(batteryCreateRequest)

Cadastrar bateria no galpão

Cadastra uma bateria nova pelo número de série, no galpão `depotId`, como `charging` (carregando) ou `charged` (carregada, `chargePct` 100). Série já cadastrada → `409`; galpão inexistente → `404`; galpão inativo → `422` `depot-inactive`. Grava a primeira movimentação (`fromStatus` ausente). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final BatteryCreateRequest batteryCreateRequest = ; // BatteryCreateRequest | 

try {
    final response = api.createBattery(batteryCreateRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->createBattery: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batteryCreateRequest** | [**BatteryCreateRequest**](BatteryCreateRequest.md)|  | 

### Return type

[**Battery**](Battery.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getVanStock**
> VanStock getVanStock(operatorId)

Estoque de baterias na van do operador

Baterias com `status: in_van` do operador (padrão: o próprio usuário; `admin`/`operacao` podem passar `operatorId`). Carregada = `chargePct >= 90`. A troca de bateria tira a instalada do estoque e põe a retirada. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String operatorId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getVanStock(operatorId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->getVanStock: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **operatorId** | **String**|  | [optional] 

### Return type

[**VanStock**](VanStock.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listBatteries**
> BatteryPage listBatteries(cursor, limit, status, depotId, holderId, q)

Baterias (série, carga, ciclos, onde estão)

`statusCounts` traz a contagem por status de todas as baterias que passam nos filtros `depotId`, `holderId` e `q` (ignora `status` e a paginação), para o resumo do inventário. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final BatteryStatus status = ; // BatteryStatus | 
final String depotId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Galpão onde a bateria está (`charging`, `charged` ou `defective`).
final String holderId = holderId_example; // String | Operador que leva a bateria na van (`me` = o próprio usuário).
final String q = q_example; // String | Busca por número de série.

try {
    final response = api.listBatteries(cursor, limit, status, depotId, holderId, q);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->listBatteries: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**BatteryStatus**](.md)|  | [optional] 
 **depotId** | **String**| Galpão onde a bateria está (`charging`, `charged` ou `defective`). | [optional] 
 **holderId** | **String**| Operador que leva a bateria na van (`me` = o próprio usuário). | [optional] 
 **q** | **String**| Busca por número de série. | [optional] 

### Return type

[**BatteryPage**](BatteryPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listBatteryMovements**
> BatteryMovementPage listBatteryMovements(id, cursor, limit)

Histórico de movimentação da bateria

Cada mudança de status (cadastro, van, galpão, moto, estação, troca por QR, defeito, baixa), mais recente primeiro.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.

try {
    final response = api.listBatteryMovements(id, cursor, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->listBatteryMovements: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]

### Return type

[**BatteryMovementPage**](BatteryMovementPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **loadVanBatteries**
> VanStock loadVanBatteries(batteryTransferRequest)

Carregar baterias na van

Move as baterias (por série) para a van do usuário (`in_van`). Série desconhecida é cadastrada. Bateria instalada numa moto, com defeito (`defective`) ou baixada (`retired`) → `409`. Prefira as `charged` do galpão (`GET /batteries?depotId=…&status=charged`); carregar uma `charging` continua permitido: ela vai com a carga conhecida (`items[].chargePct`) e a série volta em `loadedChargingSerials`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final BatteryTransferRequest batteryTransferRequest = ; // BatteryTransferRequest | 

try {
    final response = api.loadVanBatteries(batteryTransferRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->loadVanBatteries: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batteryTransferRequest** | [**BatteryTransferRequest**](BatteryTransferRequest.md)|  | 

### Return type

[**VanStock**](VanStock.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **markBatteryCharged**
> Battery markBatteryCharged(id)

Marcar bateria como carregada

`charging` → `charged` com `chargePct` 100, no mesmo galpão. Bateria carregando numa estação de troca (devolvida por QR: `stationId` sem `depotId`) volta a `in_station` e conta de novo nas disponíveis da estação. Outro status → `409`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.markBatteryCharged(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->markBatteryCharged: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Battery**](Battery.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **reportBatteryDefect**
> Battery reportBatteryDefect(id, batteryDefectRequest)

Registrar defeito na bateria

De `charging`, `charged`, `in_van` ou `in_station` → `defective` (fora de uso). Bateria instalada numa moto → `409` (retire-a da moto antes); já `defective` ou `retired` → `409`. Na estação, uma bateria carregada deixa de contar como disponível. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final BatteryDefectRequest batteryDefectRequest = ; // BatteryDefectRequest | 

try {
    final response = api.reportBatteryDefect(id, batteryDefectRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->reportBatteryDefect: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **batteryDefectRequest** | [**BatteryDefectRequest**](BatteryDefectRequest.md)|  | 

### Return type

[**Battery**](Battery.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **retireBattery**
> Battery retireBattery(id, batteryRetireRequest)

Dar baixa na bateria

De `defective`, `charging` ou `charged` → `retired` (definitivo). Outro status → `409`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final BatteryRetireRequest batteryRetireRequest = ; // BatteryRetireRequest | 

try {
    final response = api.retireBattery(id, batteryRetireRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->retireBattery: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **batteryRetireRequest** | [**BatteryRetireRequest**](BatteryRetireRequest.md)|  | [optional] 

### Return type

[**Battery**](Battery.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unloadVanBatteries**
> VanStock unloadVanBatteries(batteryTransferRequest)

Descarregar baterias da van

Tira da van do usuário: para uma estação (`in_station`, com `stationId`) ou para carregar no galpão (`charging` com `depotId`). Sem `stationId` e sem `depotId`, usa o único galpão ativo; com mais de um (ou nenhum) → `422` `depot-required`. Bateria fora da van do usuário → `409`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final BatteryTransferRequest batteryTransferRequest = ; // BatteryTransferRequest | 

try {
    final response = api.unloadVanBatteries(batteryTransferRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling BatteriesApi->unloadVanBatteries: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batteryTransferRequest** | [**BatteryTransferRequest**](BatteryTransferRequest.md)|  | 

### Return type

[**VanStock**](VanStock.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

