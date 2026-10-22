# volti_api.api.VehiclesApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createVehicle**](VehiclesApi.md#createvehicle) | **POST** /vehicles | Cadastrar moto
[**getVehicle**](VehiclesApi.md#getvehicle) | **GET** /vehicles/{id} | Ficha da moto
[**getVehicleByCode**](VehiclesApi.md#getvehiclebycode) | **GET** /vehicles/by-code/{code} | Moto pelo código (QR ou número)
[**getVehicleTrack**](VehiclesApi.md#getvehicletrack) | **GET** /vehicles/{id}/track | Trajeto da moto no período (replay)
[**listNearbyVehicles**](VehiclesApi.md#listnearbyvehicles) | **GET** /vehicles/nearby | Motos próximas
[**listVehicles**](VehiclesApi.md#listvehicles) | **GET** /vehicles | Listar frota
[**ringVehicle**](VehiclesApi.md#ringvehicle) | **POST** /vehicles/{id}/ring | Buzinar e piscar (cliente)
[**setVehicleStatus**](VehiclesApi.md#setvehiclestatus) | **POST** /vehicles/{id}/status | Mudar status operacional (manutenção ou disponível)
[**updateVehicle**](VehiclesApi.md#updatevehicle) | **PATCH** /vehicles/{id} | Editar moto


# **createVehicle**
> Vehicle createVehicle(vehicleCreate)

Cadastrar moto

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final VehicleCreate vehicleCreate = ; // VehicleCreate | 

try {
    final response = api.createVehicle(vehicleCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->createVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **vehicleCreate** | [**VehicleCreate**](VehicleCreate.md)|  | 

### Return type

[**Vehicle**](Vehicle.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getVehicle**
> Vehicle getVehicle(id)

Ficha da moto

Clientes recebem só os campos públicos; staff recebe também telemetria e dados do rastreador.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getVehicle(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->getVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Vehicle**](Vehicle.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getVehicleByCode**
> Vehicle getVehicleByCode(code)

Moto pelo código (QR ou número)

Aceita o código impresso (`VLT-0001`), só o número (`0001` ou `1`) ou o conteúdo do QR (`volti://v/VLT-0001`, URL-encoded).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String code = VLT-0001; // String | 

try {
    final response = api.getVehicleByCode(code);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->getVehicleByCode: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **String**|  | 

### Return type

[**Vehicle**](Vehicle.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getVehicleTrack**
> Track getVehicleTrack(id, from, to)

Trajeto da moto no período (replay)

Pontos gravados durante aluguéis (LGPD — fora de aluguel não há trajeto). Janela máxima de 7 dias; retenção de 90 dias.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.getVehicleTrack(id, from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->getVehicleTrack: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 

### Return type

[**Track**](Track.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listNearbyVehicles**
> NearbyVehicles listNearbyVehicles(lat, lng, radiusM, minRangeKm)

Motos próximas

Motos disponíveis (`free`) dentro do raio, ordenadas por distância (PostGIS). Para staff, inclui todos os status. `minRangeKm` filtra pela autonomia estimada.  Retirada em galpão: para o cliente, exclui motos com `depotId` (ficam no galpão e só saem pela entrega, `GET /depots/{id}/vehicles`) e motos `awaiting_pickup` (esperando recolhimento). Staff continua vendo todas. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final double lat = -23.56; // double | 
final double lng = -46.69; // double | 
final int radiusM = 56; // int | Raio em metros.
final double minRangeKm = 1.2; // double | Autonomia mínima estimada, em km.

try {
    final response = api.listNearbyVehicles(lat, lng, radiusM, minRangeKm);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->listNearbyVehicles: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **lat** | **double**|  | 
 **lng** | **double**|  | 
 **radiusM** | **int**| Raio em metros. | [optional] [default to 1000]
 **minRangeKm** | **double**| Autonomia mínima estimada, em km. | [optional] 

### Return type

[**NearbyVehicles**](NearbyVehicles.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listVehicles**
> VehiclePage listVehicles(cursor, limit, status, q, maxBatteryPct)

Listar frota

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final VehicleStatus status = ; // VehicleStatus | 
final String q = q_example; // String | Busca por código ou thingName.
final int maxBatteryPct = 56; // int | Só motos com bateria até este valor (fila de troca de bateria).

try {
    final response = api.listVehicles(cursor, limit, status, q, maxBatteryPct);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->listVehicles: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**VehicleStatus**](.md)|  | [optional] 
 **q** | **String**| Busca por código ou thingName. | [optional] 
 **maxBatteryPct** | **int**| Só motos com bateria até este valor (fila de troca de bateria). | [optional] 

### Return type

[**VehiclePage**](VehiclePage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **ringVehicle**
> VehicleCommand ringVehicle(id)

Buzinar e piscar (cliente)

Ajuda o cliente a achar a moto. Só para a moto da reserva ou do aluguel ativo do próprio cliente (senão `403`). Gera um comando `horn`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.ringVehicle(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->ringVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**VehicleCommand**](VehicleCommand.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **setVehicleStatus**
> Vehicle setVehicleStatus(id, vehicleStatusChange)

Mudar status operacional (manutenção ou disponível)

Só entre `free` e `maintenance`, e só sem aluguel ou reserva ativa (senão `409`). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final VehicleStatusChange vehicleStatusChange = ; // VehicleStatusChange | 

try {
    final response = api.setVehicleStatus(id, vehicleStatusChange);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->setVehicleStatus: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **vehicleStatusChange** | [**VehicleStatusChange**](VehicleStatusChange.md)|  | 

### Return type

[**Vehicle**](Vehicle.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateVehicle**
> Vehicle updateVehicle(id, vehicleUpdate)

Editar moto

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getVehiclesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final VehicleUpdate vehicleUpdate = ; // VehicleUpdate | 

try {
    final response = api.updateVehicle(id, vehicleUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling VehiclesApi->updateVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **vehicleUpdate** | [**VehicleUpdate**](VehicleUpdate.md)|  | 

### Return type

[**Vehicle**](Vehicle.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

