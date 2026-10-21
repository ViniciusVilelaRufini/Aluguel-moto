# volti_api.api.SupportApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createClaim**](SupportApi.md#createclaim) | **POST** /support/claims | Abrir sinistro
[**createDispute**](SupportApi.md#createdispute) | **POST** /support/disputes | Contestar cobrança
[**createIncident**](SupportApi.md#createincident) | **POST** /support/incidents | Reportar problema
[**createSupportConversation**](SupportApi.md#createsupportconversation) | **POST** /support/conversations | Abrir conversa com o suporte
[**createSupportUpload**](SupportApi.md#createsupportupload) | **POST** /support/uploads | URL pré-assinada para anexo (incidente, sinistro, chat)
[**getClaim**](SupportApi.md#getclaim) | **GET** /support/claims/{id} | Detalhe do sinistro
[**getDispute**](SupportApi.md#getdispute) | **GET** /support/disputes/{id} | Detalhe da contestação
[**getIncident**](SupportApi.md#getincident) | **GET** /support/incidents/{id} | Detalhe do incidente
[**listClaims**](SupportApi.md#listclaims) | **GET** /support/claims | Listar sinistros
[**listDisputes**](SupportApi.md#listdisputes) | **GET** /support/disputes | Listar contestações
[**listIncidents**](SupportApi.md#listincidents) | **GET** /support/incidents | Listar incidentes
[**listSupportConversations**](SupportApi.md#listsupportconversations) | **GET** /support/conversations | Conversas do chat de suporte
[**listSupportMessages**](SupportApi.md#listsupportmessages) | **GET** /support/conversations/{id}/messages | Mensagens da conversa
[**resolveDispute**](SupportApi.md#resolvedispute) | **POST** /support/disputes/{id}/resolve | Decidir contestação
[**sendSupportMessage**](SupportApi.md#sendsupportmessage) | **POST** /support/conversations/{id}/messages | Enviar mensagem
[**updateClaim**](SupportApi.md#updateclaim) | **PATCH** /support/claims/{id} | Atualizar status do sinistro
[**updateIncident**](SupportApi.md#updateincident) | **PATCH** /support/incidents/{id} | Atualizar status do incidente
[**updateSupportConversation**](SupportApi.md#updatesupportconversation) | **PATCH** /support/conversations/{id} | Encerrar ou reabrir conversa


# **createClaim**
> Claim createClaim(claimCreate)

Abrir sinistro

Vinculado a um aluguel com apólice. O sinistro é encaminhado à seguradora parceira pelo `InsuranceProvider`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final ClaimCreate claimCreate = ; // ClaimCreate | 

try {
    final response = api.createClaim(claimCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->createClaim: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **claimCreate** | [**ClaimCreate**](ClaimCreate.md)|  | 

### Return type

[**Claim**](Claim.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createDispute**
> Dispute createDispute(disputeCreate)

Contestar cobrança

Uma contestação aberta por aluguel (`409`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final DisputeCreate disputeCreate = ; // DisputeCreate | 

try {
    final response = api.createDispute(disputeCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->createDispute: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **disputeCreate** | [**DisputeCreate**](DisputeCreate.md)|  | 

### Return type

[**Dispute**](Dispute.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createIncident**
> Incident createIncident(incidentCreate)

Reportar problema

Cliente reporta problema na moto ou no aluguel; staff também pode abrir. Categoria `accident` ou `theft` gera alerta `high`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final IncidentCreate incidentCreate = ; // IncidentCreate | 

try {
    final response = api.createIncident(incidentCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->createIncident: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **incidentCreate** | [**IncidentCreate**](IncidentCreate.md)|  | 

### Return type

[**Incident**](Incident.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createSupportConversation**
> SupportConversation createSupportConversation(supportConversationCreate)

Abrir conversa com o suporte

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final SupportConversationCreate supportConversationCreate = ; // SupportConversationCreate | 

try {
    final response = api.createSupportConversation(supportConversationCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->createSupportConversation: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **supportConversationCreate** | [**SupportConversationCreate**](SupportConversationCreate.md)|  | 

### Return type

[**SupportConversation**](SupportConversation.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createSupportUpload**
> PresignedUpload createSupportUpload(uploadRequest)

URL pré-assinada para anexo (incidente, sinistro, chat)

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final UploadRequest uploadRequest = ; // UploadRequest | 

try {
    final response = api.createSupportUpload(uploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->createSupportUpload: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **uploadRequest** | [**UploadRequest**](UploadRequest.md)|  | 

### Return type

[**PresignedUpload**](PresignedUpload.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getClaim**
> Claim getClaim(id)

Detalhe do sinistro

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getClaim(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->getClaim: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Claim**](Claim.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDispute**
> Dispute getDispute(id)

Detalhe da contestação

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getDispute(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->getDispute: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Dispute**](Dispute.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getIncident**
> Incident getIncident(id)

Detalhe do incidente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getIncident(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->getIncident: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Incident**](Incident.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listClaims**
> ClaimPage listClaims(cursor, limit, status, customerId)

Listar sinistros

Cliente vê só os próprios.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final ClaimStatus status = ; // ClaimStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.

try {
    final response = api.listClaims(cursor, limit, status, customerId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->listClaims: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**ClaimStatus**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 

### Return type

[**ClaimPage**](ClaimPage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listDisputes**
> DisputePage listDisputes(cursor, limit, status, customerId)

Listar contestações

Cliente vê só as próprias.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final DisputeStatus status = ; // DisputeStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.

try {
    final response = api.listDisputes(cursor, limit, status, customerId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->listDisputes: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**DisputeStatus**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 

### Return type

[**DisputePage**](DisputePage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listIncidents**
> IncidentPage listIncidents(cursor, limit, status, customerId, vehicleId)

Listar incidentes

Cliente vê só os próprios.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final IncidentStatus status = ; // IncidentStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listIncidents(cursor, limit, status, customerId, vehicleId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->listIncidents: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**IncidentStatus**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 
 **vehicleId** | **String**|  | [optional] 

### Return type

[**IncidentPage**](IncidentPage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSupportConversations**
> SupportConversationPage listSupportConversations(cursor, limit, status, customerId)

Conversas do chat de suporte

Cliente vê só as próprias. Novas mensagens são obtidas por polling (sem evento WebSocket na v1).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final ConversationStatus status = ; // ConversationStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.

try {
    final response = api.listSupportConversations(cursor, limit, status, customerId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->listSupportConversations: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**ConversationStatus**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 

### Return type

[**SupportConversationPage**](SupportConversationPage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSupportMessages**
> SupportMessagePage listSupportMessages(id, cursor, limit, after)

Mensagens da conversa

Ordem cronológica crescente. `after` traz só as mensagens posteriores a esse instante (polling).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final DateTime after = 2013-10-20T19:20:30+01:00; // DateTime | 

try {
    final response = api.listSupportMessages(id, cursor, limit, after);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->listSupportMessages: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **after** | **DateTime**|  | [optional] 

### Return type

[**SupportMessagePage**](SupportMessagePage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resolveDispute**
> Dispute resolveDispute(id, disputeResolveRequest)

Decidir contestação

`accepted` com `refundAmountCents` gera estorno do pagamento do aluguel. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DisputeResolveRequest disputeResolveRequest = ; // DisputeResolveRequest | 

try {
    final response = api.resolveDispute(id, disputeResolveRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->resolveDispute: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **disputeResolveRequest** | [**DisputeResolveRequest**](DisputeResolveRequest.md)|  | 

### Return type

[**Dispute**](Dispute.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sendSupportMessage**
> SupportMessage sendSupportMessage(id, supportMessageCreate)

Enviar mensagem

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final SupportMessageCreate supportMessageCreate = ; // SupportMessageCreate | 

try {
    final response = api.sendSupportMessage(id, supportMessageCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->sendSupportMessage: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **supportMessageCreate** | [**SupportMessageCreate**](SupportMessageCreate.md)|  | 

### Return type

[**SupportMessage**](SupportMessage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateClaim**
> Claim updateClaim(id, claimUpdate)

Atualizar status do sinistro

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final ClaimUpdate claimUpdate = ; // ClaimUpdate | 

try {
    final response = api.updateClaim(id, claimUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->updateClaim: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **claimUpdate** | [**ClaimUpdate**](ClaimUpdate.md)|  | 

### Return type

[**Claim**](Claim.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateIncident**
> Incident updateIncident(id, incidentUpdate)

Atualizar status do incidente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final IncidentUpdate incidentUpdate = ; // IncidentUpdate | 

try {
    final response = api.updateIncident(id, incidentUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->updateIncident: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **incidentUpdate** | [**IncidentUpdate**](IncidentUpdate.md)|  | 

### Return type

[**Incident**](Incident.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateSupportConversation**
> SupportConversation updateSupportConversation(id, supportConversationUpdate)

Encerrar ou reabrir conversa

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSupportApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final SupportConversationUpdate supportConversationUpdate = ; // SupportConversationUpdate | 

try {
    final response = api.updateSupportConversation(id, supportConversationUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SupportApi->updateSupportConversation: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **supportConversationUpdate** | [**SupportConversationUpdate**](SupportConversationUpdate.md)|  | 

### Return type

[**SupportConversation**](SupportConversation.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

