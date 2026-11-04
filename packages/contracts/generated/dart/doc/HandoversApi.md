# volti_api.api.HandoversApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**acceptHandover**](HandoversApi.md#accepthandover) | **POST** /handovers/{id}/accept | Aceite antigo da entrega (desativado)
[**cancelHandover**](HandoversApi.md#cancelhandover) | **POST** /handovers/{id}/cancel | Cancelar a entrega de saída (operação)
[**counterCheckoutHandover**](HandoversApi.md#countercheckouthandover) | **POST** /handovers/{id}/counter-checkout | Contrato e pagamento no balcão (inicia o aluguel)
[**createHandover**](HandoversApi.md#createhandover) | **POST** /handovers | Registrar entrega (saída ou chegada no galpão)
[**createHandoverPhotoUpload**](HandoversApi.md#createhandoverphotoupload) | **POST** /handovers/uploads | URL de upload da foto da entrega ou do contrato
[**disputeHandover**](HandoversApi.md#disputehandover) | **POST** /handovers/{id}/dispute | Apontar problema na moto
[**getHandover**](HandoversApi.md#gethandover) | **GET** /handovers/{id} | Entrega (\&quot;Confira sua moto\&quot;)
[**getHandoverCounterQuote**](HandoversApi.md#gethandovercounterquote) | **GET** /handovers/{id}/counter-quote | Prévia do valor no balcão
[**listHandovers**](HandoversApi.md#listhandovers) | **GET** /handovers | Entregas (operação, painel e disputas)


# **acceptHandover**
> Rental acceptHandover(id, idempotencyKey)

Aceite antigo da entrega (desativado)

**Desativado (pré-reserva no balcão, 2026-11-04).** O aluguel de galpão é iniciado pelo atendente no balcão (`POST /handovers/{id}/counter-checkout`), depois do contrato assinado e do pagamento. Mantido só para os apps antigos: entrega de outro cliente → `404`; do cliente dono → sempre `409` `handover-counter-checkout` (\"O aluguel é iniciado pelo atendente no galpão.\"), sem ler caução, cobrar nada nem destravar. A resposta `201` não acontece mais; continua no contrato só por compatibilidade dos clientes gerados. 

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

# **cancelHandover**
> Handover cancelHandover(id, handoverCancel)

Cancelar a entrega de saída (operação)

Para a saída `pickup` com status `pending_customer` ou `disputed` (outro status ou `return_depot` → `422` `handover-not-pending`; já aceita ou com aceite em andamento → `409`). Na mesma transação: a entrega vira `canceled` (AuditLog `handover.cancel`, evento `handover.updated`) e a reserva volta a `active` se ainda estiver no prazo (`expiresAt` no futuro; o `pickupCode` volta em `GET /reservations/current` e o operador pode registrar uma nova saída); fora do prazo, a reserva vira `expired`, a caução é liberada e a moto volta a `free` no galpão. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final HandoverCancel handoverCancel = ; // HandoverCancel | 

try {
    final response = api.cancelHandover(id, handoverCancel);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->cancelHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **handoverCancel** | [**HandoverCancel**](HandoverCancel.md)|  | 

### Return type

[**Handover**](Handover.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **counterCheckoutHandover**
> Rental counterCheckoutHandover(id, idempotencyKey, counterCheckoutRequest)

Contrato e pagamento no balcão (inicia o aluguel)

O atendente registra o contrato assinado e o pagamento feitos no balcão e inicia o aluguel. Só a entrega de saída (`pickup`) `pending_customer` (inexistente ou outro tipo → `404`; cancelada ou disputada → `422` `handover-not-pending`). Entrega já `accepted` com aluguel → devolve o mesmo aluguel (convergência: dois balcões ou toque duplo, mesmo com `Idempotency-Key` diferentes, geram um aluguel e um pagamento). Outro checkout da mesma entrega em andamento → `409` `conflict`.  - `contractPhotoKeys`: 1 a 4 fotos do contrato (chaves de `POST /handovers/uploads` com `purpose: contract`).   Nenhuma foto → `422` `contract-photos-required` (\"Fotografe o contrato assinado (1 a 4 fotos).\"). - `payment.amountCents` precisa ser igual ao `totalCents` de `GET /handovers/{id}/counter-quote` com os mesmos   `planCode`, `coverage` e `quantity` (senão `422` `counter-amount-mismatch`, \"O valor não confere com o   calculado. Atualize o valor e tente de novo.\"). - Pagamento e caução não passam pelo gateway (o balcão não digita cartão: só método e referência, ex.: NSU ou   ID do Pix). Viram um `Payment` `kind: rental` `paid` com método de balcão (`recordedBy` = atendente, auditado)   e uma caução `Deposit` de balcão `held` (sem `deposit` → caução de balcão com `amountCents: 0`, mesmo método   do pagamento). Caução > 0 também gera um `Payment` `kind: deposit` `paid`. - O cliente precisa ter KYC aprovado, termos vigentes e consentimento de localização; consentimento revogado   depois da pré-reserva → `422` `location-consent-required` (\"Peça ao cliente para permitir a localização no   app.\").  Numa transação: cria o aluguel (`prepaidUntil` = início + período × `quantity`), grava os pagamentos e as fotos do contrato na entrega (`contractPhotoKeys`), converte a reserva, a entrega vira `accepted` e a moto vai de `reserved` a `rented` pelo comando de destravar existente (eventos `handover.updated` e `rental.updated`). Moto sem conexão ou sem confirmar o destravamento → `409` `vehicle-offline`: nada é registrado, a entrega continua `pending_customer` com `lastError` e o atendente pode tentar de novo. Moto já alugada → `409` `vehicle-unavailable`; cliente com aluguel ativo → `409` `rental-already-active`. `Idempotency-Key` ausente ou curta → `400`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String idempotencyKey = idempotencyKey_example; // String | Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
final CounterCheckoutRequest counterCheckoutRequest = {"planCode":"weekly","quantity":1,"coverage":"basic","contractPhotoKeys":["contracts/5b1e7c3a-2f4d-4a8e-9c11-3d2e1f0a9b8c.jpg"],"payment":{"method":"counter_pix","amountCents":27000,"reference":"E1234567820261104"},"deposit":{"method":"cash","amountCents":20000}}; // CounterCheckoutRequest | 

try {
    final response = api.counterCheckoutHandover(id, idempotencyKey, counterCheckoutRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->counterCheckoutHandover: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **idempotencyKey** | **String**| Chave única por intenção (UUID v4 recomendado). Válida por 24 h. | 
 **counterCheckoutRequest** | [**CounterCheckoutRequest**](CounterCheckoutRequest.md)|  | 

### Return type

[**Rental**](Rental.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createHandover**
> Handover createHandover(handoverCreate)

Registrar entrega (saída ou chegada no galpão)

- `pickup`: o operador lê o `pickupCode` da reserva (precisa estar `active`, no galpão, com a moto `reserved`),   envia checklist de saída, fotos (`POST /handovers/uploads`) e bateria. Cria a entrega `pending_customer`, a   reserva passa a `handover` e o cliente recebe o evento `handover.pending`. Código adulterado ou vencido → `404`. - `pickup` sem QR (só `admin`): no lugar do `pickupCode`, `reservationId` + `noCodeReason` (ex.: celular do   cliente sem bateria; o atendente confere o documento). Mesmas regras de reserva/galpão/moto do caminho com   código, mas reserva inexistente, sem galpão ou de outro galpão (`depotId` enviado) → `404`. Sem ser admin →   `403` `pickup-without-code-requires-admin`; `pickupCode` junto com `reservationId`/`noCodeReason`, ou só um   dos dois → `400`. Grava a auditoria `handover.pickup_without_code` (ator, reserva, motivo) na mesma transação. - `return_depot`: chegada do aluguel `rentalId` no galpão. A entrega já nasce `accepted`, o aluguel é encerrado   pelo fechamento normal e a moto volta a `free` com o `depotId` do galpão, ou vai para `maintenance` se algum   item do checklist vier com `ok: false`. O `depotId` precisa ser um galpão ativo (senão `404`) e a posição ao   vivo da moto (rastreador online) precisa estar a até 150 m dele; fora do raio ou sem posição ao vivo →   `422` `vehicle-not-at-depot` sem mudar nada (o escape é `POST /rentals/{id}/force-end`, do admin, com taxa e   auditoria). A chegada aceita grava a auditoria `rental.return_depot` (operador, aluguel, galpão e distância). 

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
> PresignedUpload createHandoverPhotoUpload(handoverUploadRequest)

URL de upload da foto da entrega ou do contrato

Upload direto ao bucket. `purpose: photo` (padrão; corpo antigo só com `contentType`) → `handovers/<uuid>.<ext>`; envie as chaves em `photoKeys` de `POST /handovers`. `purpose: contract` → `contracts/<uuid>.<ext>` (foto do contrato assinado no balcão); envie as chaves em `contractPhotoKeys` de `POST /handovers/{id}/counter-checkout`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final HandoverUploadRequest handoverUploadRequest = ; // HandoverUploadRequest | 

try {
    final response = api.createHandoverPhotoUpload(handoverUploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->createHandoverPhotoUpload: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **handoverUploadRequest** | [**HandoverUploadRequest**](HandoverUploadRequest.md)|  | 

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

Cliente: só a entrega da própria reserva ou aluguel (senão `404`). Traz checklist, bateria e as fotos em `photoUrls` (links assinados, 24 h). O operador acompanha o status e `lastError` (ex.: moto sem conexão no checkout do balcão). 

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

# **getHandoverCounterQuote**
> CounterQuote getHandoverCounterQuote(id, planCode, coverage, quantity)

Prévia do valor no balcão

Valor do plano do balcão × `quantity` + seguro, em centavos, para a entrega de saída `{id}` (`pickup`; outra entrega ou inexistente → `404`). Planos do balcão: `day`, `weekly` e `monthly`, pré-pagos pelo período (dia = 24 h, semana = 7 dias, mês = 30 dias, contados do início do aluguel; pausa não estende). `quantity`: diária 1–30, semana 1–4, mês 1–3 (acima do limite do plano → `400` `validation-error` com `field: quantity`). O seguro é um prêmio único por aluguel (não multiplica pela quantidade). `excessDayCents` = preço da diária (`unitPriceCents` do plano `day` ativo), cobrado por **dia iniciado** depois de `prepaidUntil` e acertado no galpão. Cupom e carteira não valem no balcão. O `payment.amountCents` de `counter-checkout` precisa ser igual a `totalCents`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getHandoversApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final CounterPlanCode planCode = ; // CounterPlanCode | 
final InsuranceCoverage coverage = ; // InsuranceCoverage | 
final int quantity = 56; // int | Quantidade do período (padrão 1; diária até 30, semana até 4, mês até 3).

try {
    final response = api.getHandoverCounterQuote(id, planCode, coverage, quantity);
    print(response);
} on DioException catch (e) {
    print('Exception when calling HandoversApi->getHandoverCounterQuote: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **planCode** | [**CounterPlanCode**](.md)|  | 
 **coverage** | [**InsuranceCoverage**](.md)|  | 
 **quantity** | **int**| Quantidade do período (padrão 1; diária até 30, semana até 4, mês até 3). | [optional] [default to 1]

### Return type

[**CounterQuote**](CounterQuote.md)

### Authorization

[staffAuth](../README.md#staffAuth)

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

