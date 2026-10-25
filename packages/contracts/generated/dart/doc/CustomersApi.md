# volti_api.api.CustomersApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**addRestriction**](CustomersApi.md#addrestriction) | **POST** /customer-restrictions | Incluir CPF na lista de restrição
[**blockCustomer**](CustomersApi.md#blockcustomer) | **POST** /customers/{id}/block | Bloquear conta
[**clearCustomerDelinquency**](CustomersApi.md#clearcustomerdelinquency) | **POST** /customers/{id}/delinquency/clear | Registrar quitação manual da inadimplência
[**getCustomer**](CustomersApi.md#getcustomer) | **GET** /customers/{id} | Ficha do cliente
[**listCustomers**](CustomersApi.md#listcustomers) | **GET** /customers | Buscar clientes
[**listRestrictions**](CustomersApi.md#listrestrictions) | **GET** /customer-restrictions | Lista de restrição
[**removeRestriction**](CustomersApi.md#removerestriction) | **DELETE** /customer-restrictions/{id} | Remover CPF da lista de restrição
[**unblockCustomer**](CustomersApi.md#unblockcustomer) | **POST** /customers/{id}/unblock | Desbloquear conta


# **addRestriction**
> RestrictionEntry addRestriction(restrictionEntryCreate)

Incluir CPF na lista de restrição

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final RestrictionEntryCreate restrictionEntryCreate = ; // RestrictionEntryCreate | 

try {
    final response = api.addRestriction(restrictionEntryCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->addRestriction: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **restrictionEntryCreate** | [**RestrictionEntryCreate**](RestrictionEntryCreate.md)|  | 

### Return type

[**RestrictionEntry**](RestrictionEntry.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **blockCustomer**
> Customer blockCustomer(id, customerBlockRequest)

Bloquear conta

Impede novas reservas e aluguéis (aluguel em andamento continua até o fim). Opcionalmente inclui o CPF na lista de restrição. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final CustomerBlockRequest customerBlockRequest = ; // CustomerBlockRequest | 

try {
    final response = api.blockCustomer(id, customerBlockRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->blockCustomer: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **customerBlockRequest** | [**CustomerBlockRequest**](CustomerBlockRequest.md)|  | 

### Return type

[**Customer**](Customer.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **clearCustomerDelinquency**
> Customer clearCustomerDelinquency(id, delinquencyClearRequest)

Registrar quitação manual da inadimplência

O financeiro registra que a dívida foi paga fora do app (ex.: transferência, acordo). Marca como quitados (`debtSettledAt`, `debtSettlement: manual`) todos os pagamentos `failed` de aluguel/assinatura ainda em aberto e tira a flag `delinquent`. Grava AuditLog com o motivo e o valor quitado. Cliente sem inadimplência → `409` `debt-not-payable`; cobrança ainda em retentativa automática no gateway → `409` `debt-in-collection` (evita cobrar de novo o que foi pago fora). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DelinquencyClearRequest delinquencyClearRequest = ; // DelinquencyClearRequest | 

try {
    final response = api.clearCustomerDelinquency(id, delinquencyClearRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->clearCustomerDelinquency: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **delinquencyClearRequest** | [**DelinquencyClearRequest**](DelinquencyClearRequest.md)|  | 

### Return type

[**Customer**](Customer.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCustomer**
> Customer getCustomer(id)

Ficha do cliente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getCustomer(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->getCustomer: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Customer**](Customer.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCustomers**
> CustomerPage listCustomers(cursor, limit, q, status, kycStatus, delinquent)

Buscar clientes

`q` busca por nome, e-mail, telefone ou CPF. CPF mascarado para quem não é `admin`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final String q = q_example; // String | 
final CustomerStatus status = ; // CustomerStatus | 
final KycStatus kycStatus = ; // KycStatus | 
final bool delinquent = true; // bool | 

try {
    final response = api.listCustomers(cursor, limit, q, status, kycStatus, delinquent);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->listCustomers: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **q** | **String**|  | [optional] 
 **status** | [**CustomerStatus**](.md)|  | [optional] 
 **kycStatus** | [**KycStatus**](.md)|  | [optional] 
 **delinquent** | **bool**|  | [optional] 

### Return type

[**CustomerPage**](CustomerPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listRestrictions**
> RestrictionEntryPage listRestrictions(cursor, limit)

Lista de restrição

CPFs impedidos de criar conta ou alugar.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.

try {
    final response = api.listRestrictions(cursor, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->listRestrictions: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]

### Return type

[**RestrictionEntryPage**](RestrictionEntryPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **removeRestriction**
> removeRestriction(id)

Remover CPF da lista de restrição

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.removeRestriction(id);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->removeRestriction: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unblockCustomer**
> Customer unblockCustomer(id, reasonRequest)

Desbloquear conta

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCustomersApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final ReasonRequest reasonRequest = ; // ReasonRequest | 

try {
    final response = api.unblockCustomer(id, reasonRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CustomersApi->unblockCustomer: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **reasonRequest** | [**ReasonRequest**](ReasonRequest.md)|  | 

### Return type

[**Customer**](Customer.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

