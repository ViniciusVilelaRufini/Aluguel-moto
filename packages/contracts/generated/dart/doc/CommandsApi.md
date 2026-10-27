# volti_api.api.CommandsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getCommand**](CommandsApi.md#getcommand) | **GET** /commands/{id} | Estado do comando
[**listVehicleCommands**](CommandsApi.md#listvehiclecommands) | **GET** /vehicles/{id}/commands | Histórico de comandos da moto
[**sendVehicleCommand**](CommandsApi.md#sendvehiclecommand) | **POST** /vehicles/{id}/commands | Enviar comando à moto


# **getCommand**
> VehicleCommand getCommand(id)

Estado do comando

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCommandsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getCommand(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CommandsApi->getCommand: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**VehicleCommand**](VehicleCommand.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listVehicleCommands**
> VehicleCommandPage listVehicleCommands(id, cursor, limit)

Histórico de comandos da moto

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCommandsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.

try {
    final response = api.listVehicleCommands(id, cursor, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CommandsApi->listVehicleCommands: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]

### Return type

[**VehicleCommandPage**](VehicleCommandPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sendVehicleCommand**
> VehicleCommand sendVehicleCommand(id, sendCommandRequest)

Enviar comando à moto

Grava AuditLog (quem, quando, motivo) e delega ao módulo IoT. A resposta é `202` com o comando em `pending` ou `in_progress`; a confirmação chega pelo evento `command.updated` (sala `fleet`) ou por `GET /commands/{id}`. Moto offline → `pending` com `statusReason: offline`, aplicado ao reconectar. `lock` é sempre bloqueio seguro: com rastreador `speed_control`, rampa de limite até parar e trava abaixo de 3 km/h; com `relay_only`, nada é enviado até a moto estar parada de forma confirmada (2 telemetrias < 3 km/h em pelo menos 10 s) e só então o relé corta (`in_progress` enquanto espera; 120 s sem parar → `failed`/`did_not_stop`, nenhum corte enviado). `speed_limit` e `horn` em `relay_only` → `failed`/`unsupported_by_tracker`. Regras: `speed_limit` exige `speedLimitKmh` (0..32); `stolen_mode` exige `on`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCommandsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final SendCommandRequest sendCommandRequest = ; // SendCommandRequest | 

try {
    final response = api.sendVehicleCommand(id, sendCommandRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CommandsApi->sendVehicleCommand: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **sendCommandRequest** | [**SendCommandRequest**](SendCommandRequest.md)|  | 

### Return type

[**VehicleCommand**](VehicleCommand.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

