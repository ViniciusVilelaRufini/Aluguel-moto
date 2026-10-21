# volti_api.api.PaymentsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**addPaymentCard**](PaymentsApi.md#addpaymentcard) | **POST** /payments/cards | Cadastrar cartão (token do gateway)
[**cancelSubscription**](PaymentsApi.md#cancelsubscription) | **DELETE** /payments/subscriptions/{id} | Cancelar assinatura
[**createSubscription**](PaymentsApi.md#createsubscription) | **POST** /payments/subscriptions | Assinar plano semanal ou mensal
[**deletePaymentCard**](PaymentsApi.md#deletepaymentcard) | **DELETE** /payments/cards/{id} | Remover cartão
[**getDeposit**](PaymentsApi.md#getdeposit) | **GET** /payments/deposits/{id} | Estado da caução
[**getPayment**](PaymentsApi.md#getpayment) | **GET** /payments/{id} | Detalhe do pagamento
[**listDeposits**](PaymentsApi.md#listdeposits) | **GET** /payments/deposits | Listar cauções
[**listPaymentCards**](PaymentsApi.md#listpaymentcards) | **GET** /payments/cards | Cartões do cliente
[**listPayments**](PaymentsApi.md#listpayments) | **GET** /payments | Listar pagamentos
[**listSubscriptions**](PaymentsApi.md#listsubscriptions) | **GET** /payments/subscriptions | Assinaturas do cliente (planos semanal e mensal)
[**refundPayment**](PaymentsApi.md#refundpayment) | **POST** /payments/{id}/refund | Estornar pagamento


# **addPaymentCard**
> PaymentCard addPaymentCard(idempotencyKey, paymentCardCreate)

Cadastrar cartão (token do gateway)

Recebe **só** o token gerado no app pelo SDK do Mercado Pago. Número, CVV e validade nunca chegam ao backend.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final PaymentCardCreate paymentCardCreate = ; // PaymentCardCreate | 

try {
    final response = api.addPaymentCard(idempotencyKey, paymentCardCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->addPaymentCard: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **paymentCardCreate** | [**PaymentCardCreate**](PaymentCardCreate.md)|  | 

### Return type

[**PaymentCard**](PaymentCard.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelSubscription**
> Subscription cancelSubscription(id)

Cancelar assinatura

Cancela a renovação; o período atual continua válido até `currentPeriodEnd`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.cancelSubscription(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->cancelSubscription: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Subscription**](Subscription.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createSubscription**
> Subscription createSubscription(idempotencyKey, subscriptionCreate)

Assinar plano semanal ou mensal

Cobrança recorrente no cartão. Com assinatura ativa, aluguéis com o mesmo `planCode` não cobram tempo (só seguro e taxas). Uma assinatura ativa por cliente (`409`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final SubscriptionCreate subscriptionCreate = ; // SubscriptionCreate | 

try {
    final response = api.createSubscription(idempotencyKey, subscriptionCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->createSubscription: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **subscriptionCreate** | [**SubscriptionCreate**](SubscriptionCreate.md)|  | 

### Return type

[**Subscription**](Subscription.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deletePaymentCard**
> deletePaymentCard(id)

Remover cartão

Não remove cartão com caução retida ou assinatura ativa (`409`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deletePaymentCard(id);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->deletePaymentCard: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDeposit**
> Deposit getDeposit(id)

Estado da caução

O app consulta enquanto espera o pagamento do Pix (`awaiting_pix` → `held`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getDeposit(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->getDeposit: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Deposit**](Deposit.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPayment**
> Payment getPayment(id)

Detalhe do pagamento

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getPayment(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->getPayment: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Payment**](Payment.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listDeposits**
> DepositPage listDeposits(cursor, limit, status, customerId)

Listar cauções

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final DepositStatus status = ; // DepositStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listDeposits(cursor, limit, status, customerId);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->listDeposits: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**DepositStatus**](.md)|  | [optional] 
 **customerId** | **String**|  | [optional] 

### Return type

[**DepositPage**](DepositPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPaymentCards**
> PaymentCardList listPaymentCards()

Cartões do cliente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();

try {
    final response = api.listPaymentCards();
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->listPaymentCards: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**PaymentCardList**](PaymentCardList.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPayments**
> PaymentPage listPayments(cursor, limit, status, kind, customerId, rentalId, from, to)

Listar pagamentos

Cliente vê só os próprios (filtros de staff são ignorados).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final PaymentStatus status = ; // PaymentStatus | 
final PaymentKind kind = ; // PaymentKind | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.
final String rentalId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.listPayments(cursor, limit, status, kind, customerId, rentalId, from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->listPayments: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**PaymentStatus**](.md)|  | [optional] 
 **kind** | [**PaymentKind**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 
 **rentalId** | **String**|  | [optional] 
 **from** | **DateTime**| Início do período (inclusive), UTC. | [optional] 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | [optional] 

### Return type

[**PaymentPage**](PaymentPage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSubscriptions**
> SubscriptionList listSubscriptions()

Assinaturas do cliente (planos semanal e mensal)

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();

try {
    final response = api.listSubscriptions();
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->listSubscriptions: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**SubscriptionList**](SubscriptionList.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **refundPayment**
> Payment refundPayment(id, idempotencyKey, refundRequest)

Estornar pagamento

Total (sem `amountCents`) ou parcial. Só de `paid`, `captured` ou `partially_refunded`, até o valor ainda não estornado (`422`). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPaymentsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final RefundRequest refundRequest = ; // RefundRequest | 

try {
    final response = api.refundPayment(id, idempotencyKey, refundRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PaymentsApi->refundPayment: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **refundRequest** | [**RefundRequest**](RefundRequest.md)|  | 

### Return type

[**Payment**](Payment.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

