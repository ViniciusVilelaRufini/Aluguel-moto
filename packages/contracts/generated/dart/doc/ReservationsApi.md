# volti_api.api.ReservationsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**cancelReservation**](ReservationsApi.md#cancelreservation) | **DELETE** /reservations/{id} | Cancelar reserva
[**createReservation**](ReservationsApi.md#createreservation) | **POST** /reservations | Reservar moto
[**getCurrentReservation**](ReservationsApi.md#getcurrentreservation) | **GET** /reservations/current | Reserva ativa do cliente


# **cancelReservation**
> cancelReservation(id)

Cancelar reserva

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReservationsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.cancelReservation(id);
} on DioException catch (e) {
    print('Exception when calling ReservationsApi->cancelReservation: $e\n');
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

# **createReservation**
> Reservation createReservation(reservationCreate, idempotencyKey)

Reservar moto

Uma reserva ativa por cliente (`409` `reservation-already-active`). Dura 15 minutos (TTL no Redis); ao expirar, a moto volta a `free`. Exige KYC aprovado (`403` `kyc-not-approved`) e cliente sem bloqueio nem inadimplência.  **Retirada em galpão** (com `depotId`): exige `Idempotency-Key`, `pickupMode`, `planCode`, `coverage` e `depositMethod`. Valida galpão ativo (`422` `depot-inactive`), horário dentro do funcionamento (`422` `pickup-outside-hours`) e de `maxScheduleDays` (`422` `pickup-too-far-ahead`), moto `free` no galpão (`409` `vehicle-unavailable`, inclusive quando outro cliente reservou no mesmo instante) e cliente sem aluguel nem reserva aberta (`409` `rental-already-active` / `reservation-open`). Bloqueia a caução (cartão: pré-autorização, recusa → `422` `payment-declined`; Pix: `deposit.pix` com o QR) e separa a moto (`free` → `reserved`). O plano só é cobrado no aceite da entrega. A resposta traz `pickupCode` (QR de retirada). Cancelar (`DELETE /reservations/{id}`) é grátis e libera a caução; ao vencer `expiresAt`, um job expira a reserva. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReservationsApi();
final ReservationCreate reservationCreate = {"vehicleId":"3f1c2a9e-0b4d-4c8e-9a55-7d6e5f4a3b2c"}; // ReservationCreate | 
final String idempotencyKey = idempotencyKey_example; // String | Recomendado para reenvios da fila offline. Válida por 24 h.

try {
    final response = api.createReservation(reservationCreate, idempotencyKey);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReservationsApi->createReservation: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reservationCreate** | [**ReservationCreate**](ReservationCreate.md)|  | 
 **idempotencyKey** | **String**| Recomendado para reenvios da fila offline. Válida por 24 h. | [optional] 

### Return type

[**Reservation**](Reservation.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCurrentReservation**
> CurrentReservation getCurrentReservation()

Reserva ativa do cliente

Sempre `200`; `reservation` fica ausente quando não há reserva ativa.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReservationsApi();

try {
    final response = api.getCurrentReservation();
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReservationsApi->getCurrentReservation: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CurrentReservation**](CurrentReservation.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

