# volti_api.api.DepotsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createDepot**](DepotsApi.md#createdepot) | **POST** /depots | Cadastrar galpão
[**getDepot**](DepotsApi.md#getdepot) | **GET** /depots/{id} | Galpão
[**listDepotPickups**](DepotsApi.md#listdepotpickups) | **GET** /depots/{id}/pickups | Agenda de retiradas do dia
[**listDepotVehicles**](DepotsApi.md#listdepotvehicles) | **GET** /depots/{id}/vehicles | Motos do galpão (\&quot;Escolher moto\&quot;)
[**listDepots**](DepotsApi.md#listdepots) | **GET** /depots | Galpões (home do cliente e painel)
[**updateDepot**](DepotsApi.md#updatedepot) | **PATCH** /depots/{id} | Editar galpão (horários, prazos, ativo)


# **createDepot**
> Depot createDepot(depotInput)

Cadastrar galpão

Endereço, posição, horário por dia da semana e prazos de retirada. Dia ausente em `openingHours` = fechado; `opensAt` precisa ser anterior a `closesAt` (`400`). Grava AuditLog (`depot.create`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final DepotInput depotInput = ; // DepotInput | 

try {
    final response = api.createDepot(depotInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->createDepot: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **depotInput** | [**DepotInput**](DepotInput.md)|  | 

### Return type

[**Depot**](Depot.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDepot**
> Depot getDepot(id)

Galpão

Cliente só vê galpão ativo (inativo → `404`); staff vê qualquer um.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getDepot(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->getDepot: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Depot**](Depot.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listDepotPickups**
> DepotPickupList listDepotPickups(id, date, status)

Agenda de retiradas do dia

Todas as reservas do galpão com retirada no dia informado (no fuso do galpão), `now` e `scheduled`, em ordem de horário (`pickupAt`, ou `createdAt` em `now`), em qualquer status (`active`, `handover`, `converted`, `canceled`, `expired`); `status` filtra. Do cliente, só `customerFirstName`; nunca vem `pickupCode`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final Date date = 2013-10-20; // Date | Dia da agenda (`YYYY-MM-DD`, fuso do galpão).
final ReservationStatus status = ; // ReservationStatus | Filtro opcional por status da reserva.

try {
    final response = api.listDepotPickups(id, date, status);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->listDepotPickups: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **date** | **Date**| Dia da agenda (`YYYY-MM-DD`, fuso do galpão). | 
 **status** | [**ReservationStatus**](.md)| Filtro opcional por status da reserva. | [optional] 

### Return type

[**DepotPickupList**](DepotPickupList.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listDepotVehicles**
> DepotVehicleList listDepotVehicles(id, status, vehicleModelId)

Motos do galpão (\"Escolher moto\")

Cliente: só as motos disponíveis para retirada (`free` com este `depotId`), com modelo, categoria, bateria, autonomia e preço do modelo; sem distância. Staff: todas as motos do galpão, com filtro por `status`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final VehicleStatus status = ; // VehicleStatus | Só staff (o cliente sempre recebe só `free`).
final String vehicleModelId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Filtro por modelo do catálogo.

try {
    final response = api.listDepotVehicles(id, status, vehicleModelId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->listDepotVehicles: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **status** | [**VehicleStatus**](.md)| Só staff (o cliente sempre recebe só `free`). | [optional] 
 **vehicleModelId** | **String**| Filtro por modelo do catálogo. | [optional] 

### Return type

[**DepotVehicleList**](DepotVehicleList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listDepots**
> DepotList listDepots(lat, lng, includeInactive)

Galpões (home do cliente e painel)

Galpões ativos (staff com `includeInactive=true` vê todos). Com `lat`/`lng`, ordena pelo mais perto e preenche `distanceM` (seletor de galpão no app); sem eles, ordem alfabética. `availableVehicleCount` conta as motos `free` com o `depotId` do galpão. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final double lat = 1.2; // double | 
final double lng = 1.2; // double | 
final bool includeInactive = true; // bool | Só staff.

try {
    final response = api.listDepots(lat, lng, includeInactive);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->listDepots: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **lat** | **double**|  | [optional] 
 **lng** | **double**|  | [optional] 
 **includeInactive** | **bool**| Só staff. | [optional] [default to false]

### Return type

[**DepotList**](DepotList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateDepot**
> Depot updateDepot(id, depotUpdate)

Editar galpão (horários, prazos, ativo)

Campos ausentes não mudam; `openingHours`, quando enviado, substitui a lista inteira. Mudança de horário ou prazo vale para reservas criadas depois. Grava AuditLog (`depot.update`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getDepotsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DepotUpdate depotUpdate = ; // DepotUpdate | 

try {
    final response = api.updateDepot(id, depotUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling DepotsApi->updateDepot: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **depotUpdate** | [**DepotUpdate**](DepotUpdate.md)|  | 

### Return type

[**Depot**](Depot.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

