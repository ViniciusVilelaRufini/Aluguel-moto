# volti_api.api.MaintenanceApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createMaintenanceTask**](MaintenanceApi.md#createmaintenancetask) | **POST** /maintenance/tasks | Agendar manutenção
[**getMaintenanceTask**](MaintenanceApi.md#getmaintenancetask) | **GET** /maintenance/tasks/{id} | Detalhe da manutenção
[**listMaintenanceTasks**](MaintenanceApi.md#listmaintenancetasks) | **GET** /maintenance/tasks | Listar manutenções
[**updateMaintenanceTask**](MaintenanceApi.md#updatemaintenancetask) | **PATCH** /maintenance/tasks/{id} | Atualizar manutenção


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

