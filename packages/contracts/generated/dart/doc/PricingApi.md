# volti_api.api.PricingApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**addMyCoupon**](PricingApi.md#addmycoupon) | **POST** /me/coupons | Adicionar cupom à conta
[**createCoupon**](PricingApi.md#createcoupon) | **POST** /pricing/coupons | Criar cupom
[**createFee**](PricingApi.md#createfee) | **POST** /pricing/fees | Criar taxa
[**createPricingPlan**](PricingApi.md#createpricingplan) | **POST** /pricing/plans | Criar plano
[**deleteCoupon**](PricingApi.md#deletecoupon) | **DELETE** /pricing/coupons/{id} | Desativar cupom
[**deleteFee**](PricingApi.md#deletefee) | **DELETE** /pricing/fees/{id} | Desativar taxa
[**deletePricingPlan**](PricingApi.md#deletepricingplan) | **DELETE** /pricing/plans/{id} | Desativar plano
[**getCoupon**](PricingApi.md#getcoupon) | **GET** /pricing/coupons/{id} | Detalhe do cupom
[**getPricingPlan**](PricingApi.md#getpricingplan) | **GET** /pricing/plans/{id} | Detalhe do plano
[**listCoupons**](PricingApi.md#listcoupons) | **GET** /pricing/coupons | Listar cupons
[**listFees**](PricingApi.md#listfees) | **GET** /pricing/fees | Listar taxas
[**listMyCoupons**](PricingApi.md#listmycoupons) | **GET** /me/coupons | Cupons salvos na conta
[**listPricingPlans**](PricingApi.md#listpricingplans) | **GET** /pricing/plans | Planos disponíveis
[**quotePrice**](PricingApi.md#quoteprice) | **POST** /pricing/quote | Cotar aluguel
[**updateCoupon**](PricingApi.md#updatecoupon) | **PUT** /pricing/coupons/{id} | Atualizar cupom
[**updateFee**](PricingApi.md#updatefee) | **PUT** /pricing/fees/{id} | Atualizar taxa
[**updatePricingPlan**](PricingApi.md#updatepricingplan) | **PUT** /pricing/plans/{id} | Atualizar plano
[**validateMyCoupon**](PricingApi.md#validatemycoupon) | **POST** /me/coupons/validate | Validar cupom sem salvar


# **addMyCoupon**
> CustomerCoupon addMyCoupon(couponCodeRequest)

Adicionar cupom à conta

Valida o código (mesmas regras do aluguel: ativo, vigência, limite total e por cliente) e o salva na conta. Código inválido → `422` `coupon-invalid` (`detail` com o motivo em pt-BR); já salvo → `409` `conflict`. Códigos de indicação não são cupons: use `POST /me/referral/redeem`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final CouponCodeRequest couponCodeRequest = ; // CouponCodeRequest | 

try {
    final response = api.addMyCoupon(couponCodeRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->addMyCoupon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **couponCodeRequest** | [**CouponCodeRequest**](CouponCodeRequest.md)|  | 

### Return type

[**CustomerCoupon**](CustomerCoupon.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createCoupon**
> Coupon createCoupon(couponInput)

Criar cupom

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final CouponInput couponInput = ; // CouponInput | 

try {
    final response = api.createCoupon(couponInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->createCoupon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **couponInput** | [**CouponInput**](CouponInput.md)|  | 

### Return type

[**Coupon**](Coupon.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createFee**
> Fee createFee(feeInput)

Criar taxa

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final FeeInput feeInput = ; // FeeInput | 

try {
    final response = api.createFee(feeInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->createFee: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **feeInput** | [**FeeInput**](FeeInput.md)|  | 

### Return type

[**Fee**](Fee.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createPricingPlan**
> PricingPlan createPricingPlan(pricingPlanInput)

Criar plano

Um plano ativo por `code` (`409` se já existir). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final PricingPlanInput pricingPlanInput = ; // PricingPlanInput | 

try {
    final response = api.createPricingPlan(pricingPlanInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->createPricingPlan: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **pricingPlanInput** | [**PricingPlanInput**](PricingPlanInput.md)|  | 

### Return type

[**PricingPlan**](PricingPlan.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteCoupon**
> deleteCoupon(id)

Desativar cupom

Exclusão lógica. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deleteCoupon(id);
} on DioException catch (e) {
    print('Exception when calling PricingApi->deleteCoupon: $e\n');
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

# **deleteFee**
> deleteFee(id)

Desativar taxa

Exclusão lógica. As taxas de sistema (`deposit`, `force_end_outside_return_zone`, `battery_swap_fee`) não podem ser desativadas (`409`). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deleteFee(id);
} on DioException catch (e) {
    print('Exception when calling PricingApi->deleteFee: $e\n');
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

# **deletePricingPlan**
> deletePricingPlan(id)

Desativar plano

Exclusão lógica (`active: false`); o histórico de aluguéis é preservado. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deletePricingPlan(id);
} on DioException catch (e) {
    print('Exception when calling PricingApi->deletePricingPlan: $e\n');
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

# **getCoupon**
> Coupon getCoupon(id)

Detalhe do cupom

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getCoupon(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->getCoupon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Coupon**](Coupon.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPricingPlan**
> PricingPlan getPricingPlan(id)

Detalhe do plano

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getPricingPlan(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->getPricingPlan: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**PricingPlan**](PricingPlan.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCoupons**
> CouponPage listCoupons(cursor, limit, active, q)

Listar cupons

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final bool active = true; // bool | 
final String q = q_example; // String | Busca pelo código.

try {
    final response = api.listCoupons(cursor, limit, active, q);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->listCoupons: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **active** | **bool**|  | [optional] 
 **q** | **String**| Busca pelo código. | [optional] 

### Return type

[**CouponPage**](CouponPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listFees**
> FeeList listFees()

Listar taxas

Inclui `deposit` (caução, 5000), `force_end_outside_return_zone` (1500) e `battery_swap_fee` (troca de bateria na estação nos planos por minuto/hora, 500).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();

try {
    final response = api.listFees();
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->listFees: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**FeeList**](FeeList.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyCoupons**
> CustomerCouponList listMyCoupons()

Cupons salvos na conta

Cupons que o cliente adicionou à conta (`POST /me/coupons`) ou ganhou por indicação. `status` é calculado na leitura: `used` quando o limite por cliente foi atingido, `expired` quando passou de `validUntil` ou o cupom foi desativado. Para usar, o app envia `couponCode` em `POST /pricing/quote` e `POST /rentals`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();

try {
    final response = api.listMyCoupons();
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->listMyCoupons: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CustomerCouponList**](CustomerCouponList.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPricingPlans**
> PricingPlanList listPricingPlans(includeInactive)

Planos disponíveis

Clientes recebem só os planos ativos; staff pode pedir os inativos.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final bool includeInactive = true; // bool | Só staff.

try {
    final response = api.listPricingPlans(includeInactive);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->listPricingPlans: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **includeInactive** | **bool**| Só staff. | [optional] [default to false]

### Return type

[**PricingPlanList**](PricingPlanList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **quotePrice**
> Quote quotePrice(quoteRequest)

Cotar aluguel

Resumo de valores antes de contratar (plano, seguro, cupom, caução). Cupom inválido não falha a cotação: volta `couponApplied: false` com `couponMessage`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final QuoteRequest quoteRequest = ; // QuoteRequest | 

try {
    final response = api.quotePrice(quoteRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->quotePrice: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **quoteRequest** | [**QuoteRequest**](QuoteRequest.md)|  | 

### Return type

[**Quote**](Quote.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateCoupon**
> Coupon updateCoupon(id, couponInput)

Atualizar cupom

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final CouponInput couponInput = ; // CouponInput | 

try {
    final response = api.updateCoupon(id, couponInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->updateCoupon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **couponInput** | [**CouponInput**](CouponInput.md)|  | 

### Return type

[**Coupon**](Coupon.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateFee**
> Fee updateFee(id, feeInput)

Atualizar taxa

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final FeeInput feeInput = ; // FeeInput | 

try {
    final response = api.updateFee(id, feeInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->updateFee: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **feeInput** | [**FeeInput**](FeeInput.md)|  | 

### Return type

[**Fee**](Fee.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updatePricingPlan**
> PricingPlan updatePricingPlan(id, pricingPlanInput)

Atualizar plano

Vale para aluguéis iniciados depois da alteração (o aluguel guarda o preço do início). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final PricingPlanInput pricingPlanInput = ; // PricingPlanInput | 

try {
    final response = api.updatePricingPlan(id, pricingPlanInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->updatePricingPlan: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **pricingPlanInput** | [**PricingPlanInput**](PricingPlanInput.md)|  | 

### Return type

[**PricingPlan**](PricingPlan.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateMyCoupon**
> CouponValidation validateMyCoupon(couponCodeRequest)

Validar cupom sem salvar

Sempre `200`; `valid = false` traz `message` com o motivo. `planCode` opcional restringe a validação a um plano.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPricingApi();
final CouponCodeRequest couponCodeRequest = ; // CouponCodeRequest | 

try {
    final response = api.validateMyCoupon(couponCodeRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PricingApi->validateMyCoupon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **couponCodeRequest** | [**CouponCodeRequest**](CouponCodeRequest.md)|  | 

### Return type

[**CouponValidation**](CouponValidation.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

