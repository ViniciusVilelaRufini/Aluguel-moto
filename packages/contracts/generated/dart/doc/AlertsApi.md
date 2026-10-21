# volti_api.api.AlertsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**assignAlert**](AlertsApi.md#assignalert) | **POST** /alerts/{id}/assign | Atribuir alerta
[**getAlert**](AlertsApi.md#getalert) | **GET** /alerts/{id} | Detalhe do alerta
[**listAlerts**](AlertsApi.md#listalerts) | **GET** /alerts | Fila de alertas
[**resolveAlert**](AlertsApi.md#resolvealert) | **POST** /alerts/{id}/resolve | Resolver alerta


# **assignAlert**
> Alert assignAlert(id, alertAssignRequest)

Atribuir alerta

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAlertsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final AlertAssignRequest alertAssignRequest = ; // AlertAssignRequest | 

try {
    final response = api.assignAlert(id, alertAssignRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AlertsApi->assignAlert: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **alertAssignRequest** | [**AlertAssignRequest**](AlertAssignRequest.md)|  | 

### Return type

[**Alert**](Alert.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAlert**
> Alert getAlert(id)

Detalhe do alerta

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAlertsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getAlert(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AlertsApi->getAlert: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Alert**](Alert.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listAlerts**
> AlertPage listAlerts(cursor, limit, status, priority, type, vehicleId, assigneeId)

Fila de alertas

Ordenados por prioridade (critical primeiro) e depois por criação. Novos alertas chegam por `alert.created` (sala `fleet`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAlertsApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final AlertStatus status = ; // AlertStatus | 
final AlertPriority priority = ; // AlertPriority | 
final AlertType type = ; // AlertType | 
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String assigneeId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listAlerts(cursor, limit, status, priority, type, vehicleId, assigneeId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AlertsApi->listAlerts: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**AlertStatus**](.md)|  | [optional] 
 **priority** | [**AlertPriority**](.md)|  | [optional] 
 **type** | [**AlertType**](.md)|  | [optional] 
 **vehicleId** | **String**|  | [optional] 
 **assigneeId** | **String**|  | [optional] 

### Return type

[**AlertPage**](AlertPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resolveAlert**
> Alert resolveAlert(id, alertResolveRequest)

Resolver alerta

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAlertsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final AlertResolveRequest alertResolveRequest = ; // AlertResolveRequest | 

try {
    final response = api.resolveAlert(id, alertResolveRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AlertsApi->resolveAlert: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **alertResolveRequest** | [**AlertResolveRequest**](AlertResolveRequest.md)|  | 

### Return type

[**Alert**](Alert.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

