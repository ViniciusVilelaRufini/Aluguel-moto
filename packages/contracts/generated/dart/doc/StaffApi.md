# volti_api.api.StaffApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createStaffUser**](StaffApi.md#createstaffuser) | **POST** /staff | Convidar usuário interno
[**getStaffUser**](StaffApi.md#getstaffuser) | **GET** /staff/{id} | Detalhe do usuário interno
[**listStaffUsers**](StaffApi.md#liststaffusers) | **GET** /staff | Usuários internos
[**updateStaffUser**](StaffApi.md#updatestaffuser) | **PATCH** /staff/{id} | Alterar grupos ou desativar usuário interno


# **createStaffUser**
> StaffUser createStaffUser(staffUserCreate)

Convidar usuário interno

Cria o usuário no pool interno (MFA obrigatório no primeiro acesso) e envia o convite. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStaffApi();
final StaffUserCreate staffUserCreate = ; // StaffUserCreate | 

try {
    final response = api.createStaffUser(staffUserCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StaffApi->createStaffUser: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **staffUserCreate** | [**StaffUserCreate**](StaffUserCreate.md)|  | 

### Return type

[**StaffUser**](StaffUser.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getStaffUser**
> StaffUser getStaffUser(id)

Detalhe do usuário interno

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStaffApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getStaffUser(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StaffApi->getStaffUser: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**StaffUser**](StaffUser.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listStaffUsers**
> StaffUserPage listStaffUsers(cursor, limit, group, active, q)

Usuários internos

`operacao` e `suporte` usam para escolher responsáveis (tarefas, alertas).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStaffApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final StaffGroup group = ; // StaffGroup | 
final bool active = true; // bool | 
final String q = q_example; // String | 

try {
    final response = api.listStaffUsers(cursor, limit, group, active, q);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StaffApi->listStaffUsers: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **group** | [**StaffGroup**](.md)|  | [optional] 
 **active** | **bool**|  | [optional] 
 **q** | **String**|  | [optional] 

### Return type

[**StaffUserPage**](StaffUserPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateStaffUser**
> StaffUser updateStaffUser(id, staffUserUpdate)

Alterar grupos ou desativar usuário interno

Um admin não remove o próprio grupo `admin` nem se desativa (`409`). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStaffApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final StaffUserUpdate staffUserUpdate = ; // StaffUserUpdate | 

try {
    final response = api.updateStaffUser(id, staffUserUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StaffApi->updateStaffUser: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **staffUserUpdate** | [**StaffUserUpdate**](StaffUserUpdate.md)|  | 

### Return type

[**StaffUser**](StaffUser.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

