# volti_api.api.AuditApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**listAuditLogs**](AuditApi.md#listauditlogs) | **GET** /audit-logs | Log de auditoria


# **listAuditLogs**
> AuditLogPage listAuditLogs(cursor, limit, actorId, action, entityType, entityId, from, to)

Log de auditoria

Todos os comandos e alterações sensíveis (quem, quando, motivo). Somente leitura.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAuditApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final String actorId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String action = action_example; // String | Prefixo da ação, ex.: `vehicle.command`.
final String entityType = entityType_example; // String | 
final String entityId = entityId_example; // String | 
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.listAuditLogs(cursor, limit, actorId, action, entityType, entityId, from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AuditApi->listAuditLogs: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **actorId** | **String**|  | [optional] 
 **action** | **String**| Prefixo da ação, ex.: `vehicle.command`. | [optional] 
 **entityType** | **String**|  | [optional] 
 **entityId** | **String**|  | [optional] 
 **from** | **DateTime**| Início do período (inclusive), UTC. | [optional] 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | [optional] 

### Return type

[**AuditLogPage**](AuditLogPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

