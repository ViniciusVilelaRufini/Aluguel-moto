# volti_api.api.MaintenanceApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**cancelMyMaintenanceRequest**](MaintenanceApi.md#cancelmymaintenancerequest) | **DELETE** /me/maintenance-requests/{id} | Cancelar manutenção agendada
[**createMaintenanceTask**](MaintenanceApi.md#createmaintenancetask) | **POST** /maintenance/tasks | Agendar manutenção
[**createMyMaintenanceRequest**](MaintenanceApi.md#createmymaintenancerequest) | **POST** /me/maintenance-requests | Agendar manutenção da moto fixa do plano
[**getMaintenanceTask**](MaintenanceApi.md#getmaintenancetask) | **GET** /maintenance/tasks/{id} | Detalhe da manutenção
[**listMaintenanceTasks**](MaintenanceApi.md#listmaintenancetasks) | **GET** /maintenance/tasks | Listar manutenções
[**listMyMaintenanceRequests**](MaintenanceApi.md#listmymaintenancerequests) | **GET** /me/maintenance-requests | Manutenções agendadas pelo cliente
[**listMyMaintenanceSlots**](MaintenanceApi.md#listmymaintenanceslots) | **GET** /me/maintenance-slots | Horários livres para manutenção (plano semanal/mensal)
[**listVehicleServiceStatus**](MaintenanceApi.md#listvehicleservicestatus) | **GET** /maintenance/vehicles | Manutenção preventiva por km/horas (tabela \&quot;Manutenção\&quot;)
[**updateMaintenanceTask**](MaintenanceApi.md#updatemaintenancetask) | **PATCH** /maintenance/tasks/{id} | Atualizar manutenção


# **cancelMyMaintenanceRequest**
> CustomerMaintenanceRequest cancelMyMaintenanceRequest(id)

Cancelar manutenção agendada

Só enquanto `scheduled` (senão `409`). A manutenção vira `canceled`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.cancelMyMaintenanceRequest(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->cancelMyMaintenanceRequest: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**CustomerMaintenanceRequest**](CustomerMaintenanceRequest.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createMaintenanceTask**
> MaintenanceTask createMaintenanceTask(maintenanceTaskCreate)

Agendar manutenção

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final MaintenanceTaskCreate maintenanceTaskCreate = ; // MaintenanceTaskCreate | 

try {
    final response = api.createMaintenanceTask(maintenanceTaskCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->createMaintenanceTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **maintenanceTaskCreate** | [**MaintenanceTaskCreate**](MaintenanceTaskCreate.md)|  | 

### Return type

[**MaintenanceTask**](MaintenanceTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createMyMaintenanceRequest**
> CustomerMaintenanceRequest createMyMaintenanceRequest(customerMaintenanceRequestCreate)

Agendar manutenção da moto fixa do plano

Cria uma manutenção preventiva (`MaintenanceTask` com `source: customer`) para a moto fixa da assinatura ativa, visível na Operação do painel. Regras: assinatura ativa (`403` `subscription-required`), moto fixa definida (`422` `subscription-vehicle-required`), `slotStartsAt` igual ao início de uma janela livre de `GET /me/maintenance-slots` (`409` `maintenance-slot-unavailable`) e um pedido em aberto por vez (`409` `conflict`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final CustomerMaintenanceRequestCreate customerMaintenanceRequestCreate = ; // CustomerMaintenanceRequestCreate | 

try {
    final response = api.createMyMaintenanceRequest(customerMaintenanceRequestCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->createMyMaintenanceRequest: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **customerMaintenanceRequestCreate** | [**CustomerMaintenanceRequestCreate**](CustomerMaintenanceRequestCreate.md)|  | 

### Return type

[**CustomerMaintenanceRequest**](CustomerMaintenanceRequest.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getMaintenanceTask**
> MaintenanceTask getMaintenanceTask(id)

Detalhe da manutenção

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getMaintenanceTask(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->getMaintenanceTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**MaintenanceTask**](MaintenanceTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMaintenanceTasks**
> MaintenanceTaskPage listMaintenanceTasks(cursor, limit, status, kind, vehicleId)

Listar manutenções

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final MaintenanceStatus status = ; // MaintenanceStatus | 
final MaintenanceKind kind = ; // MaintenanceKind | 
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listMaintenanceTasks(cursor, limit, status, kind, vehicleId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->listMaintenanceTasks: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**MaintenanceStatus**](.md)|  | [optional] 
 **kind** | [**MaintenanceKind**](.md)|  | [optional] 
 **vehicleId** | **String**|  | [optional] 

### Return type

[**MaintenanceTaskPage**](MaintenanceTaskPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyMaintenanceRequests**
> CustomerMaintenanceRequestList listMyMaintenanceRequests()

Manutenções agendadas pelo cliente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();

try {
    final response = api.listMyMaintenanceRequests();
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->listMyMaintenanceRequests: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CustomerMaintenanceRequestList**](CustomerMaintenanceRequestList.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyMaintenanceSlots**
> MaintenanceSlotList listMyMaintenanceSlots(days)

Horários livres para manutenção (plano semanal/mensal)

Janelas de 1 h, segunda a sábado, 08:00–18:00 (America/Sao_Paulo), a partir da próxima hora cheia com 2 h de antecedência e até `days` dias. Cada janela tem capacidade fixa; janelas lotadas vêm com `available: false`. Exige assinatura semanal/mensal ativa (`403` `subscription-required`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final int days = 56; // int | Quantos dias à frente listar.

try {
    final response = api.listMyMaintenanceSlots(days);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->listMyMaintenanceSlots: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **days** | **int**| Quantos dias à frente listar. | [optional] [default to 7]

### Return type

[**MaintenanceSlotList**](MaintenanceSlotList.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listVehicleServiceStatus**
> VehicleServicePage listVehicleServiceStatus(cursor, limit, status, q)

Manutenção preventiva por km/horas (tabela \"Manutenção\")

Uma linha por moto com odômetro, horas de uso, km/horas desde a última revisão, próxima revisão e situação (`overdue` → `due_soon` → `ok`, depois por código). Intervalos do modelo (`VehicleModel.serviceIntervalKm`/ `serviceIntervalHours`; padrão 1000 km / 100 h). `due_soon` quando faltam 10% ou menos de qualquer intervalo. Revisão registrada = manutenção `preventive` concluída (`PATCH /maintenance/tasks/{id}` com `status: done`). \"Agendar\" usa `POST /maintenance/tasks` com o `vehicleId` da linha; a linha mostra a manutenção em aberto. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final VehicleServiceStatus status = ; // VehicleServiceStatus | 
final String q = q_example; // String | Busca por código da moto.

try {
    final response = api.listVehicleServiceStatus(cursor, limit, status, q);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->listVehicleServiceStatus: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**VehicleServiceStatus**](.md)|  | [optional] 
 **q** | **String**| Busca por código da moto. | [optional] 

### Return type

[**VehicleServicePage**](VehicleServicePage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateMaintenanceTask**
> MaintenanceTask updateMaintenanceTask(id, maintenanceTaskUpdate)

Atualizar manutenção

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getMaintenanceApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final MaintenanceTaskUpdate maintenanceTaskUpdate = ; // MaintenanceTaskUpdate | 

try {
    final response = api.updateMaintenanceTask(id, maintenanceTaskUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling MaintenanceApi->updateMaintenanceTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **maintenanceTaskUpdate** | [**MaintenanceTaskUpdate**](MaintenanceTaskUpdate.md)|  | 

### Return type

[**MaintenanceTask**](MaintenanceTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

