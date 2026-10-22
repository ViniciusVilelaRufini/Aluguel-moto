# volti_api.api.HandoversApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**acceptHandover**](HandoversApi.md#accepthandover) | **POST** /handovers/{id}/accept | Aceitar a moto e destravar
[**createHandover**](HandoversApi.md#createhandover) | **POST** /handovers | Registrar entrega (saída ou chegada no galpão)
[**createHandoverPhotoUpload**](HandoversApi.md#createhandoverphotoupload) | **POST** /handovers/uploads | URL de upload da foto da entrega
[**disputeHandover**](HandoversApi.md#disputehandover) | **POST** /handovers/{id}/dispute | Apontar problema na moto
[**getHandover**](HandoversApi.md#gethandover) | **GET** /handovers/{id} | Entrega (\&quot;Confira sua moto\&quot;)
[**listHandovers**](HandoversApi.md#listhandovers) | **GET** /handovers | Entregas (operação, painel e disputas)


# **acceptHandover**
> Rental acceptHandover(id, idempotencyKey)

Aceitar a moto e destravar

Só o cliente dono (outro cliente → `404`) e só com a entrega `pending_customer` (senão `422` `handover-not-pending`). Numa transação idempotente por entrega: cria o aluguel com o plano, o seguro e a caução da reserva, cobra o plano (assinatura em `weekly`/`monthly`), converte a reserva, pede o destravamento e a moto vai de `reserved` a `rented`. Aceites repetidos (mesma ou outra `Idempotency-Key`) devolvem o mesmo aluguel, com uma única cobrança. Exige consentimento de localização (`403` `location-consent-required`).  Pagamento recusado → `422` `payment-declined`: nada muda, a entrega continua `pending_customer` com `lastError` e a moto não destrava. Gateway fora → `503` `gateway-unavailable`. Aluguel já ativo → `409` `rental-already-active`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.

try {
    final response = api.acceptHandover(id, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->acceptHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createHandover**
> Handover createHandover(handoverCreate)

Registrar entrega (saída ou chegada no galpão)

- `pickup`: o operador lê o `pickupCode` da reserva (precisa estar `active`, no galpão, com a moto `reserved`),   envia checklist de saída, fotos (`POST /handovers/uploads`) e bateria. Cria a entrega `pending_customer`, a   reserva passa a `handover` e o cliente recebe o evento `handover.pending`. Código adulterado ou vencido → `404`. - `return_depot`: chegada do aluguel `rentalId` no galpão. A entrega já nasce `accepted`, o aluguel é encerrado   pelo fechamento normal e a moto volta a `free` com o `depotId` do galpão, ou vai para `maintenance` se algum   item do checklist vier com `ok: false`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final HandoverCreate handoverCreate = {"type":"pickup","depotId":"9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c","pickupCode":"v1.6c1f0a52-8f3e-4b8e-9d55-0d6a7f1e2c11.1792663200.Zm9vYmFy","checklist":[{"code":"freios","ok":true},{"code":"pneus","ok":true},{"code":"carenagem","ok":true,"note":"Risco leve no lado direito, já registrado."}],"photoKeys":["handovers/2c4e9a10.jpg","handovers/7d1b3c22.jpg"],"batteryPct":98,"batterySerial":"BT-190577"}; // HandoverCreate | 

try {
    final response = api.createHandover(handoverCreate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->createHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **handoverCreate** | [**HandoverCreate**](HandoverCreate.md)|  | 

### Return type

[**Handover**](Handover.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createHandoverPhotoUpload**
> PresignedUpload createHandoverPhotoUpload(uploadRequest)

URL de upload da foto da entrega

Upload direto ao bucket (`handovers/<uuid>.<ext>`); depois envie as chaves em `photoKeys` de `POST /handovers`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final UploadRequest uploadRequest = ; // UploadRequest | 

try {
    final response = api.createHandoverPhotoUpload(uploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->createHandoverPhotoUpload: $e\n');
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

# **disputeHandover**
> Handover disputeHandover(id, handoverDispute)

Apontar problema na moto

Só o cliente dono (outro cliente → `404`) e só com a entrega `pending_customer` (`422` `handover-not-pending`). A entrega passa a `disputed`, abre um ticket de suporte e a moto continua separada (`reserved`) até o suporte resolver. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final HandoverDispute handoverDispute = ; // HandoverDispute | 

try {
    final response = api.disputeHandover(id, handoverDispute);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->disputeHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **handoverDispute** | [**HandoverDispute**](HandoverDispute.md)|  | 

### Return type

[**Handover**](Handover.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHandover**
> Handover getHandover(id)

Entrega (\"Confira sua moto\")

Cliente: só a entrega da própria reserva ou aluguel (senão `404`). Traz checklist, bateria e as fotos em `photoUrls` (links assinados, 24 h). O operador acompanha o status e `lastError` (ex.: pagamento não aprovado). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getHandover(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->getHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Handover**](Handover.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listHandovers**
> HandoverPage listHandovers(cursor, limit, status, depotId, type)

Entregas (operação, painel e disputas)

Mais recentes primeiro. `suporte` usa `status=disputed` para a fila de disputas.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final HandoverStatus status = ; // HandoverStatus | 
final String depotId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final HandoverType type = ; // HandoverType | 

try {
    final response = api.listHandovers(cursor, limit, status, depotId, type);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->listHandovers: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**HandoverStatus**](.md)|  | [optional] 
 **depotId** | **String**|  | [optional] 
 **type** | [**HandoverType**](.md)|  | [optional] 

### Return type

[**HandoverPage**](HandoverPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

