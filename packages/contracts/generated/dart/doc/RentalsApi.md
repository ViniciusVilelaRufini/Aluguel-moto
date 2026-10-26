# volti_api.api.RentalsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createReturnPhotoUpload**](RentalsApi.md#createreturnphotoupload) | **POST** /rentals/{id}/return-photo | URL pré-assinada para a foto de devolução
[**endRental**](RentalsApi.md#endrental) | **POST** /rentals/{id}/end | Encerrar aluguel
[**endRentalTest**](RentalsApi.md#endrentaltest) | **POST** /rentals/{id}/test-end | Encerrar aluguel fora do ponto verde (só em ambiente de teste)
[**forceEndRental**](RentalsApi.md#forceendrental) | **POST** /rentals/{id}/force-end | Encerramento forçado (staff)
[**getCurrentRental**](RentalsApi.md#getcurrentrental) | **GET** /rentals/current | Aluguel em andamento do cliente
[**getRental**](RentalsApi.md#getrental) | **GET** /rentals/{id} | Detalhe do aluguel
[**getRentalReceipt**](RentalsApi.md#getrentalreceipt) | **GET** /rentals/{id}/receipt | Recibo do aluguel
[**getRentalTrack**](RentalsApi.md#getrentaltrack) | **GET** /rentals/{id}/track | Trajeto do aluguel
[**listRentalEvents**](RentalsApi.md#listrentalevents) | **GET** /rentals/{id}/events | Linha do tempo do aluguel
[**listRentals**](RentalsApi.md#listrentals) | **GET** /rentals | Listar aluguéis
[**pauseRental**](RentalsApi.md#pauserental) | **POST** /rentals/{id}/pause | Pausar aluguel
[**rateRental**](RentalsApi.md#raterental) | **POST** /rentals/{id}/rating | Avaliar aluguel
[**respondWellbeingCheck**](RentalsApi.md#respondwellbeingcheck) | **POST** /rentals/{id}/wellbeing | Responder \&quot;você está bem?\&quot;
[**resumeRental**](RentalsApi.md#resumerental) | **POST** /rentals/{id}/resume | Retomar aluguel
[**shareRentalLocation**](RentalsApi.md#sharerentallocation) | **POST** /rentals/{id}/location-share | Compartilhar localização (SOS)
[**startRental**](RentalsApi.md#startrental) | **POST** /rentals | Iniciar aluguel
[**swapRentalVehicle**](RentalsApi.md#swaprentalvehicle) | **POST** /rentals/{id}/swap | Trocar de moto


# **createReturnPhotoUpload**
> PresignedUpload createReturnPhotoUpload(id, uploadRequest)

URL pré-assinada para a foto de devolução

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final UploadRequest uploadRequest = ; // UploadRequest | 

try {
    final response = api.createReturnPhotoUpload(id, uploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->createReturnPhotoUpload: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **uploadRequest** | [**UploadRequest**](UploadRequest.md)|  | 

### Return type

[**PresignedUpload**](PresignedUpload.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **endRental**
> Rental endRental(id, endRentalRequest, idempotencyKey)

Encerrar aluguel

Só dentro de uma zona `return` (`422` `rental-outside-return-zone`) e com a foto enviada (`422` `return-photo-missing`). Com troca de bateria na estação em andamento (`currentStationSwap` em `GET /rentals/current`) → `409` `swap-open` (termine ou cancele a troca antes; o encerramento forçado pelo staff continua permitido). Pede o travamento ao rastreador: - travada confirmada → `200`, status `ended`, valor final calculado (plano + seguro − cupom) e   liquidado uma única vez; - sem confirmação ainda → `202`, status `ending`; o servidor tenta de novo e o cliente acompanha por   `rental.updated` ou `GET /rentals/{id}`. Moto com bloqueio da equipe ou do sistema no encerramento (normal ou forçado) volta como `maintenance`, não `free`, com alerta `command_failed` para a operação liberar.  Liquidação idempotente por `rentalId`: no máximo uma liquidação por aluguel, não importa quantas vezes a chamada seja repetida (com ou sem `Idempotency-Key`). A `Idempotency-Key` opcional faz a repetição devolver a mesma resposta. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final EndRentalRequest endRentalRequest = ; // EndRentalRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.endRental(id, endRentalRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->endRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **endRentalRequest** | [**EndRentalRequest**](EndRentalRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **endRentalTest**
> Rental endRentalTest(id, endRentalRequest, idempotencyKey)

Encerrar aluguel fora do ponto verde (só em ambiente de teste)

**Só existe em ambiente de teste**: a API registra esta rota apenas com `ALLOW_TEST_HANDOVER=true` (a mesma flag dos atalhos de teste; em produção, só junto com `PAYMENT_PROVIDER=fake` e `ALLOW_FAKE_PAYMENTS=true`). Fora disso a rota não existe e responde `404`.  Igual a `POST /rentals/{id}/end`, pulando **apenas** a conferência da zona `return`: fora de qualquer ponto verde o encerramento segue sem zona (`endZoneId` nulo, evento `ending` marcado como teste) e sem taxa de encerramento forçado. Dentro de uma zona `return` se comporta exatamente como o encerramento normal. Todo o resto é o mesmo: aluguel de outro cliente → `404`; fora de andamento → `409` `rental-not-active`; troca na estação em andamento → `409` `swap-open`; sem a foto → `422` `return-photo-missing`; travamento pelo bloqueio seguro (redução gradual, trava só abaixo de 3 km/h) e encerramento só com a confirmação (`200` `ended` ou `202` `ending`); liquidação única por `rentalId`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final EndRentalRequest endRentalRequest = ; // EndRentalRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.endRentalTest(id, endRentalRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->endRentalTest: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **endRentalRequest** | [**EndRentalRequest**](EndRentalRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **forceEndRental**
> Rental forceEndRental(id, forceEndRentalRequest, idempotencyKey)

Encerramento forçado (staff)

`reason` obrigatório (`400` sem ele). Dispensa a foto. Status final `force_ended`; trava a moto com bloqueio seguro. Fora de uma zona `return`, só `admin` pode forçar (`403` `force-end-outside-zone-requires-admin`) e soma a taxa `force_end_outside_return_zone` (1500). Grava AuditLog. Liquidação idempotente por `rentalId` (no máximo uma por aluguel, mesmo com repetições); a `Idempotency-Key` opcional faz a repetição devolver a mesma resposta. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final ForceEndRentalRequest forceEndRentalRequest = ; // ForceEndRentalRequest | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.forceEndRental(id, forceEndRentalRequest, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->forceEndRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **forceEndRentalRequest** | [**ForceEndRentalRequest**](ForceEndRentalRequest.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**Rental**](Rental.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCurrentRental**
> CurrentRental getCurrentRental()

Aluguel em andamento do cliente

Sempre `200`; `rental` fica ausente quando não há aluguel `active`, `paused` ou `ending`. Usado ao reabrir o app.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();

try {
    final response = api.getCurrentRental();
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->getCurrentRental: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CurrentRental**](CurrentRental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRental**
> Rental getRental(id)

Detalhe do aluguel

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getRental(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->getRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRentalReceipt**
> Receipt getRentalReceipt(id)

Recibo do aluguel

Disponível após `ended`/`force_ended` (senão `409`). Inclui o trajeto, a situação do pagamento (`paymentStatus`) e, só com o pagamento recebido (`paid`), o link do PDF. Ordem de liquidação no fechamento: carteira (linha `wallet` do `breakdown`) → caução (a caução Pix abate o valor; só o saldo é devolvido, `depositUsedCents` / `depositReleasedCents`) → cartão salvo → o restante vira dívida (`pending`, `amountDueCents`), paga pelo cliente em `POST /payments/{paymentId}/retry` (Pix ou cartão). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getRentalReceipt(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->getRentalReceipt: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Receipt**](Receipt.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRentalTrack**
> Track getRentalTrack(id)

Trajeto do aluguel

Pontos gravados durante o aluguel (expiram após 90 dias). Usado no recibo e no replay.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getRentalTrack(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->getRentalTrack: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Track**](Track.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listRentalEvents**
> RentalEventList listRentalEvents(id)

Linha do tempo do aluguel

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.listRentalEvents(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->listRentalEvents: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**RentalEventList**](RentalEventList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listRentals**
> RentalPage listRentals(cursor, limit, status, customerId, vehicleId, from, to)

Listar aluguéis

Cliente vê só os próprios (filtros de staff são ignorados). Ordem decrescente por início.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final RentalStatus status = ; // RentalStatus | 
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | Só staff.
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.listRentals(cursor, limit, status, customerId, vehicleId, from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->listRentals: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **status** | [**RentalStatus**](.md)|  | [optional] 
 **customerId** | **String**| Só staff. | [optional] 
 **vehicleId** | **String**| Só staff. | [optional] 
 **from** | **DateTime**| Início do período (inclusive), UTC. | [optional] 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | [optional] 

### Return type

[**RentalPage**](RentalPage.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pauseRental**
> Rental pauseRental(id)

Pausar aluguel

Trava a moto (bloqueio seguro) e passa a cobrar a tarifa de pausa. Só de `active` (senão `409` `rental-not-active`).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.pauseRental(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->pauseRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **rateRental**
> Rental rateRental(id, ratingRequest)

Avaliar aluguel

Uma avaliação por aluguel encerrado (repetir substitui).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final RatingRequest ratingRequest = ; // RatingRequest | 

try {
    final response = api.rateRental(id, ratingRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->rateRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **ratingRequest** | [**RatingRequest**](RatingRequest.md)|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **respondWellbeingCheck**
> respondWellbeingCheck(id, wellbeingResponse)

Responder \"você está bem?\"

Resposta ao evento `device.event` de queda. `ok: false` (ou nenhuma resposta em 60 s) gera alerta `critical` do tipo `customer_not_ok`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final WellbeingResponse wellbeingResponse = ; // WellbeingResponse | 

try {
    api.respondWellbeingCheck(id, wellbeingResponse);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->respondWellbeingCheck: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **wellbeingResponse** | [**WellbeingResponse**](WellbeingResponse.md)|  | 

### Return type

void (empty response body)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resumeRental**
> Rental resumeRental(id)

Retomar aluguel

Destrava a moto. Só de `paused` (senão `409` `rental-not-active`). Se a moto foi travada pela equipe ou pelo sistema (cerca, limite segurado em 0 depois de não parar, modo roubada), `409` `vehicle-locked-by-staff` (\"A moto foi bloqueada pela equipe. Fale com o suporte.\") e o aluguel continua `paused`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.resumeRental(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->resumeRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **shareRentalLocation**
> LocationShare shareRentalLocation(id, locationShareRequest)

Compartilhar localização (SOS)

Gera um link temporário com a posição ao vivo da moto do aluguel, para o cliente enviar a um contato. Expira no fim do aluguel ou em `durationMinutes`, o que vier primeiro.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final LocationShareRequest locationShareRequest = ; // LocationShareRequest | 

try {
    final response = api.shareRentalLocation(id, locationShareRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->shareRentalLocation: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **locationShareRequest** | [**LocationShareRequest**](LocationShareRequest.md)|  | 

### Return type

[**LocationShare**](LocationShare.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startRental**
> RentalStartResult startRental(idempotencyKey, startRentalRequest)

Iniciar aluguel

Exige KYC aprovado (`403` `kyc-not-approved`), cliente não inadimplente (`403` `customer-delinquent`), consentimento de localização (`403` `location-consent-required`, ver `PUT /lgpd/consents`), seguro (`coverage`; `basic` é o mínimo obrigatório) e caução.  Moto do galpão: moto com `depotId`, ou separada por uma reserva de galpão (mesmo do próprio cliente), responde `409` `vehicle-unavailable` aqui; ela só sai do galpão pelo aceite da entrega (`POST /handovers/{id}/accept`). A moto precisa estar `free` ou reservada pelo próprio cliente (senão `409` `vehicle-unavailable`). Moto com bloqueio da equipe ou do sistema (cerca, limite segurado em 0, modo roubada) → `409` `vehicle-unavailable` (\"A moto está bloqueada pela equipe. Escolha outra.\") antes de reter a caução.  Caução (`depositMethod`): - `card`: pré-autoriza 5000 no cartão (`cardId` ou o cartão padrão). Sucesso → `201` com   `outcome: started`, aluguel `active` e desbloqueio pedido ao módulo IoT. Sem nenhum cartão ativo →   `422` `card-required`. - `pix`: gera a cobrança Pix → `202` com `outcome: awaiting_deposit` e `deposit.pix`. A resposta cria   (ou estende) uma reserva do cliente para essa moto válida até `pix.expiresAt`, com as mesmas regras   das reservas (uma por cliente, KYC aprovado, sem bloqueio) e no máximo o prazo do Pix. Depois do   pagamento (`GET /payments/deposits/{id}` com `held`), o app chama `POST /rentals` de novo, com   **nova** `Idempotency-Key` e `depositId`, e recebe `201`. Caução paga cujo aluguel não chega a   iniciar (reserva expirada, `409` na segunda chamada, cancelamento) é liberada/estornada   automaticamente (`DepositStatus` → `released`).  Idempotência: a mesma `Idempotency-Key` devolve a mesma resposta e não cria outro aluguel. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final StartRentalRequest startRentalRequest = ; // StartRentalRequest | 

try {
    final response = api.startRental(idempotencyKey, startRentalRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->startRental: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **startRentalRequest** | [**StartRentalRequest**](StartRentalRequest.md)|  | 

### Return type

[**RentalStartResult**](RentalStartResult.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **swapRentalVehicle**
> Rental swapRentalVehicle(id, swapVehicleRequest)

Trocar de moto

Troca a moto do aluguel em andamento (ex.: defeito). Trava a moto atual, que vai para `maintenance`, e destrava a nova (precisa estar `free`, fora do galpão, online, a até 200 m, sem aluguel nem reserva e não ser a moto fixa do plano de outro cliente; senão `409` `vehicle-unavailable` ou `vehicle-offline`). O preço continua o do início do aluguel, então a nova moto precisa ter preço por minuto (modelo do catálogo) igual ou menor (`409`). Nova moto com bloqueio da equipe ou do sistema → `409` `vehicle-unavailable` (\"A moto escolhida está bloqueada pela equipe.\"), sem trocar nada. Moto ATUAL com bloqueio da equipe ou do sistema (cerca, hold, modo roubada) → `409` `vehicle-locked-by-staff` (\"A moto foi bloqueada pela equipe. Fale com o suporte.\"), mesmo com incidente, sem trocar nada. Se o aluguel mudar de status (pausa/retomada) durante a troca → `409` `rental-not-active`. Com troca de bateria na estação em andamento (`currentStationSwap`) → `409` `swap-open`. O aluguel continua o mesmo, com evento `vehicle_swapped`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getRentalsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final SwapVehicleRequest swapVehicleRequest = ; // SwapVehicleRequest | 

try {
    final response = api.swapRentalVehicle(id, swapVehicleRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RentalsApi->swapRentalVehicle: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **swapVehicleRequest** | [**SwapVehicleRequest**](SwapVehicleRequest.md)|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

