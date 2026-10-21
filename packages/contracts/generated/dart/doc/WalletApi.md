# volti_api.api.WalletApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createWalletAdjustment**](WalletApi.md#createwalletadjustment) | **POST** /customers/{id}/wallet/adjustments | Ajuste manual da carteira (lançamento)
[**createWalletTopUp**](WalletApi.md#createwallettopup) | **POST** /wallet/top-ups | Recarregar carteira
[**getWallet**](WalletApi.md#getwallet) | **GET** /wallet | Saldo da carteira
[**getWalletTopUp**](WalletApi.md#getwallettopup) | **GET** /wallet/top-ups/{id} | Estado da recarga
[**listMinutePackages**](WalletApi.md#listminutepackages) | **GET** /wallet/packages | Pacotes de minutos à venda
[**listWalletLedger**](WalletApi.md#listwalletledger) | **GET** /wallet/ledger | Extrato da carteira


# **createWalletAdjustment**
> WalletEntry createWalletAdjustment(id, idempotencyKey, walletAdjustmentRequest)

Ajuste manual da carteira (lançamento)

Cria um lançamento `adjustment` (positivo ou negativo, nunca zero). O saldo não é editado diretamente. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final WalletAdjustmentRequest walletAdjustmentRequest = ; // WalletAdjustmentRequest | 

try {
    final response = api.createWalletAdjustment(id, idempotencyKey, walletAdjustmentRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->createWalletAdjustment: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **walletAdjustmentRequest** | [**WalletAdjustmentRequest**](WalletAdjustmentRequest.md)|  | 

### Return type

[**WalletEntry**](WalletEntry.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createWalletTopUp**
> TopUp createWalletTopUp(idempotencyKey, topUpRequest)

Recarregar carteira

Crédito em reais (`amountCents`) ou pacote de minutos (`packageId`) — um dos dois (`400` se ambos ou nenhum). Pix → `pending` com `pix`; o lançamento no ledger só acontece quando o pagamento é confirmado.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final TopUpRequest topUpRequest = ; // TopUpRequest | 

try {
    final response = api.createWalletTopUp(idempotencyKey, topUpRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->createWalletTopUp: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **topUpRequest** | [**TopUpRequest**](TopUpRequest.md)|  | 

### Return type

[**TopUp**](TopUp.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getWallet**
> Wallet getWallet()

Saldo da carteira

O saldo é sempre a soma do ledger.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();

try {
    final response = api.getWallet();
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->getWallet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**Wallet**](Wallet.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getWalletTopUp**
> TopUp getWalletTopUp(id)

Estado da recarga

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getWalletTopUp(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->getWalletTopUp: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**TopUp**](TopUp.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMinutePackages**
> MinutePackageList listMinutePackages()

Pacotes de minutos à venda

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();

try {
    final response = api.listMinutePackages();
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->listMinutePackages: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**MinutePackageList**](MinutePackageList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listWalletLedger**
> WalletEntryPage listWalletLedger(cursor, limit)

Extrato da carteira

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWalletApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.

try {
    final response = api.listWalletLedger(cursor, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling WalletApi->listWalletLedger: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]

### Return type

[**WalletEntryPage**](WalletEntryPage.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

