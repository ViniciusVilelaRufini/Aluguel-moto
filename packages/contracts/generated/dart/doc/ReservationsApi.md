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
[**createTestHandover**](ReservationsApi.md#createtesthandover) | **POST** /reservations/{id}/test-handover | Entrega simulada (só em ambiente de teste)
[**getCurrentReservation**](ReservationsApi.md#getcurrentreservation) | **GET** /reservations/current | Reserva ativa do cliente


# **cancelReservation**
> cancelReservation(id)

Cancelar reserva

Grátis. A moto volta a `free` e, em reserva de galpão antiga feita com caução, a caução é liberada (pré-autorização cancelada ou Pix estornado); a pré-reserva atual não tem caução. Reserva com status `handover` (entrega aberta) → `409` `reservation-in-handover`: o operador cancela a entrega. Reserva já encerrada → `409`. 

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

Uma reserva ativa por cliente (`409` `reservation-already-active`). Dura 15 minutos (TTL no Redis); ao expirar, a moto volta a `free`. Exige KYC aprovado (`403` `kyc-not-approved`) e cliente sem bloqueio. Cliente inadimplente ou com dívida em aberto (pagamento de aluguel/assinatura `failed` não quitado, ou débito do balcão `pending` com método de balcão) → `409` `payment-pending` (\"Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.\"); a dívida é acertada no balcão (`POST /payments/{id}/counter-settle`).  Sem `depotId` (reserva de rua): moto com `depotId`, separada por reserva de galpão ou `awaiting_pickup` → `409` `vehicle-unavailable`. Moto do galpão só sai pela entrega.  **Pré-reserva no galpão** (com `depotId`): exige `Idempotency-Key` e `pickupMode` (e `pickupAt` em `scheduled`). Sem caução, sem plano e sem pagamento no app: `planCode`, `coverage`, `depositMethod`, `cardId` e `couponCode` são aceitos (apps antigos) e **ignorados**; plano, seguro, contrato e pagamento são feitos no balcão (`POST /handovers/{id}/counter-checkout`). Além do KYC, exige termos vigentes e consentimento de localização (`403` `location-consent-required`; o contrato em papel não substitui o consentimento digital). Valida galpão ativo (`422` `depot-inactive`), horário dentro do funcionamento (`422` `pickup-outside-hours`) e de `maxScheduleDays` (`422` `pickup-too-far-ahead`), moto `free` no galpão (`409` `vehicle-unavailable`, inclusive quando outro cliente reservou no mesmo instante) e cliente sem aluguel nem reserva aberta (`409` `rental-already-active` / `reservation-open`), e separa a moto (`free` → `reserved`). A resposta traz `pickupCode` (QR de retirada). Cancelar (`DELETE /reservations/{id}`) é grátis; ao vencer `expiresAt`, um job expira a reserva. 

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

# **createTestHandover**
> Handover createTestHandover(id)

Entrega simulada (só em ambiente de teste)

**Só existe em ambiente de teste**: a API registra esta rota apenas com `ALLOW_TEST_HANDOVER=true` (em produção, só junto com `PAYMENT_PROVIDER=fake` e `ALLOW_FAKE_PAYMENTS=true`). Fora disso a rota não existe e responde `404`.  Faz o papel da equipe do galpão para o app de teste: na reserva de galpão `active` do próprio cliente, assina o `pickupCode` da reserva e cria a entrega de saída como em `POST /handovers` (`pickup`), com checklist de teste (`[{ code: teste, ok: true }]`), sem fotos e com a bateria atual da moto. Mesmas verificações de `POST /handovers` (moto `reserved`, uma entrega aberta por reserva). Em seguida simula também o checkout do balcão (`POST /handovers/{id}/counter-checkout`) com plano `day`, quantidade 1, seguro `basic`, sem fotos de contrato e pagamento `cash` de teste (`reference: teste`) no valor da prévia: o aluguel começa, a reserva é convertida e a moto destrava. Devolve a entrega já `accepted` (com `rentalId`). O operador da entrega é um ator de sistema (o cliente vê \"Equipe Volti\").  Reserva inexistente, de outro cliente ou sem galpão → `404`. Reserva fora de `active` (entrega já aberta, encerrada) ou moto não separada → `409` (`conflict`, `vehicle-unavailable`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReservationsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.createTestHandover(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReservationsApi->createTestHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**Handover**](Handover.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCurrentReservation**
> CurrentReservation getCurrentReservation()

Reserva ativa do cliente

Sempre `200`; `reservation` fica ausente quando não há reserva aberta. Reserva aberta = `active` ou `handover` (entrega de galpão aberta, aguardando o checkout no balcão; o app mostra \"Sua moto está sendo preparada\" com `handoverId`). 

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

