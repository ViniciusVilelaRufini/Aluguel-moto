# volti_api.api.BatteriesApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getVanStock**](BatteriesApi.md#getvanstock) | **GET** /batteries/van-stock | Estoque de baterias na van do operador
[**listBatteries**](BatteriesApi.md#listbatteries) | **GET** /batteries | Baterias (série, carga, ciclos, onde estão)
[**loadVanBatteries**](BatteriesApi.md#loadvanbatteries) | **POST** /batteries/van-stock/load | Carregar baterias na van
[**unloadVanBatteries**](BatteriesApi.md#unloadvanbatteries) | **POST** /batteries/van-stock/unload | Descarregar baterias da van


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
> BatteryPage listBatteries(cursor, limit, status, holderId, q)

Baterias (série, carga, ciclos, onde estão)

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getBatteriesApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final BatteryStatus status = ; // BatteryStatus | 
final String holderId = holderId_example; // String | Operador que leva a bateria na van (`me` = o próprio usuário).
final String q = q_example; // String | Busca por número de série.

try {
    final response = api.listBatteries(cursor, limit, status, holderId, q);
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

# **loadVanBatteries**
> VanStock loadVanBatteries(batteryTransferRequest)

Carregar baterias na van

Move as baterias (por série) para a van do usuário (`in_van`). Série desconhecida é cadastrada. Bateria instalada numa moto → `409`.

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

# **unloadVanBatteries**
> VanStock unloadVanBatteries(batteryTransferRequest)

Descarregar baterias da van

Tira da van do usuário (para `charging`, ou `in_station` com `stationId`). Bateria fora da van do usuário → `409`.

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

