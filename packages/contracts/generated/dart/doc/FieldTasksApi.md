# volti_api.api.FieldTasksApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**completeFieldTask**](FieldTasksApi.md#completefieldtask) | **POST** /field-tasks/{id}/complete | Concluir tarefa
[**createFieldTask**](FieldTasksApi.md#createfieldtask) | **POST** /field-tasks | Criar tarefa de campo
[**createFieldTaskUpload**](FieldTasksApi.md#createfieldtaskupload) | **POST** /field-tasks/uploads | URL pré-assinada para foto de inspeção
[**getFieldTask**](FieldTasksApi.md#getfieldtask) | **GET** /field-tasks/{id} | Detalhe da tarefa
[**listFieldTasks**](FieldTasksApi.md#listfieldtasks) | **GET** /field-tasks | Listar tarefas de campo
[**serviceUnlockVehicle**](FieldTasksApi.md#serviceunlockvehicle) | **POST** /vehicles/{id}/service-unlock | Destravar em modo serviço
[**startFieldTask**](FieldTasksApi.md#startfieldtask) | **POST** /field-tasks/{id}/start | Iniciar tarefa
[**submitBatterySwap**](FieldTasksApi.md#submitbatteryswap) | **POST** /field-tasks/{id}/battery-swap | Registrar troca de bateria
[**submitInspection**](FieldTasksApi.md#submitinspection) | **POST** /field-tasks/{id}/inspection | Registrar checklist de inspeção
[**updateFieldTask**](FieldTasksApi.md#updatefieldtask) | **PATCH** /field-tasks/{id} | Atualizar ou atribuir tarefa


# **completeFieldTask**
> FieldTask completeFieldTask(id, fieldTaskCompleteRequest, idempotencyKey)

Concluir tarefa

Tarefas `inspection` exigem uma inspeção registrada e `battery_swap` uma troca registrada (`422`). `vehicleStatus` muda a moto para `free` ou `maintenance` no mesmo passo.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final FieldTaskCompleteRequest fieldTaskCompleteRequest = ; // FieldTaskCompleteRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.completeFieldTask(id, fieldTaskCompleteRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->completeFieldTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **fieldTaskCompleteRequest** | [**FieldTaskCompleteRequest**](FieldTaskCompleteRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**FieldTask**](FieldTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createFieldTask**
> FieldTask createFieldTask(fieldTaskCreate)

Criar tarefa de campo

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final FieldTaskCreate fieldTaskCreate = ; // FieldTaskCreate | 

try {
    final response = api.createFieldTask(fieldTaskCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->createFieldTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **fieldTaskCreate** | [**FieldTaskCreate**](FieldTaskCreate.md)|  | 

### Return type

[**FieldTask**](FieldTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createFieldTaskUpload**
> PresignedUpload createFieldTaskUpload(uploadRequest)

URL pré-assinada para foto de inspeção

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final UploadRequest uploadRequest = ; // UploadRequest | 

try {
    final response = api.createFieldTaskUpload(uploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->createFieldTaskUpload: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **uploadRequest** | [**UploadRequest**](UploadRequest.md)|  | 

### Return type

[**PresignedUpload**](PresignedUpload.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getFieldTask**
> FieldTask getFieldTask(id)

Detalhe da tarefa

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getFieldTask(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->getFieldTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**FieldTask**](FieldTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listFieldTasks**
> FieldTaskPage listFieldTasks(cursor, limit, status, type, assigneeId, vehicleId)

Listar tarefas de campo

Para o grupo `campo`, por padrão só as atribuídas ao próprio operador (`assigneeId=me`). Ordem por prioridade e prazo.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final FieldTaskStatus status = ; // FieldTaskStatus | 
final FieldTaskType type = ; // FieldTaskType | 
final String assigneeId = assigneeId_example; // String | UUID do operador ou `me`.
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listFieldTasks(cursor, limit, status, type, assigneeId, vehicleId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->listFieldTasks: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**FieldTaskStatus**](.md)|  | [optional] 
 **type** | [**FieldTaskType**](.md)|  | [optional] 
 **assigneeId** | **String**| UUID do operador ou `me`. | [optional] 
 **vehicleId** | **String**|  | [optional] 

### Return type

[**FieldTaskPage**](FieldTaskPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serviceUnlockVehicle**
> VehicleCommand serviceUnlockVehicle(id, serviceUnlockRequest)

Destravar em modo serviço

Destrava sem cobrança para o operador de campo, sem aluguel. Grava AuditLog (quem, quando, motivo, tarefa). Responde com o comando `unlock` criado.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final ServiceUnlockRequest serviceUnlockRequest = ; // ServiceUnlockRequest | 

try {
    final response = api.serviceUnlockVehicle(id, serviceUnlockRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->serviceUnlockVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **serviceUnlockRequest** | [**ServiceUnlockRequest**](ServiceUnlockRequest.md)|  | 

### Return type

[**VehicleCommand**](VehicleCommand.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startFieldTask**
> FieldTask startFieldTask(id)

Iniciar tarefa

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.startFieldTask(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->startFieldTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**FieldTask**](FieldTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **submitBatterySwap**
> BatterySwap submitBatterySwap(id, batterySwapRequest, idempotencyKey)

Registrar troca de bateria

Números de série da bateria retirada e da instalada (lidos por QR ou código de barras); precisam ser diferentes (`422` `battery-serials-must-differ`). Reenvio com a mesma `Idempotency-Key` não duplica.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final BatterySwapRequest batterySwapRequest = ; // BatterySwapRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.submitBatterySwap(id, batterySwapRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->submitBatterySwap: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **batterySwapRequest** | [**BatterySwapRequest**](BatterySwapRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**BatterySwap**](BatterySwap.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **submitInspection**
> Inspection submitInspection(id, inspectionRequest, idempotencyKey)

Registrar checklist de inspeção

Todos os itens são obrigatórios e é preciso ao menos uma foto. O limitador de velocidade é confirmado com `configuredMaxKmh` (no máximo 32; acima disso → `400`). `recordedAt` é o instante real do preenchimento (pode ser anterior ao envio, no modo offline). Reenvio com a mesma `Idempotency-Key` não duplica. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final InspectionRequest inspectionRequest = ; // InspectionRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.submitInspection(id, inspectionRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->submitInspection: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **inspectionRequest** | [**InspectionRequest**](InspectionRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**Inspection**](Inspection.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateFieldTask**
> FieldTask updateFieldTask(id, fieldTaskUpdate)

Atualizar ou atribuir tarefa

Atribuir (`assigneeId`) muda o status para `assigned`; `status: canceled` cancela.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getFieldTasksApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final FieldTaskUpdate fieldTaskUpdate = ; // FieldTaskUpdate | 

try {
    final response = api.updateFieldTask(id, fieldTaskUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling FieldTasksApi->updateFieldTask: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **fieldTaskUpdate** | [**FieldTaskUpdate**](FieldTaskUpdate.md)|  | 

### Return type

[**FieldTask**](FieldTask.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

