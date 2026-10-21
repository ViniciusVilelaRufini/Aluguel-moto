# volti_api.api.WebhooksApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**receiveMercadoPagoWebhook**](WebhooksApi.md#receivemercadopagowebhook) | **POST** /webhooks/mercadopago | Webhook do Mercado Pago


# **receiveMercadoPagoWebhook**
> WebhookAck receiveMercadoPagoWebhook(xSignature, xRequestId, mercadoPagoWebhookEvent)

Webhook do Mercado Pago

Público. Valida `x-signature` (HMAC-SHA256 com `MERCADOPAGO_WEBHOOK_SECRET` sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`); assinatura inválida → `401` e nada é enfileirado. Evento válido é enfileirado e processado de forma idempotente (deduplicação por id do evento): o mesmo evento duas vezes gera um efeito só. Os campos do corpo seguem o formato do Mercado Pago (snake_case). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getWebhooksApi();
final String xSignature = xSignature_example; // String | `ts=<epoch>,v1=<hmac hex>`.
final String xRequestId = xRequestId_example; // String | 
final MercadoPagoWebhookEvent mercadoPagoWebhookEvent = ; // MercadoPagoWebhookEvent | 

try {
    final response = api.receiveMercadoPagoWebhook(xSignature, xRequestId, mercadoPagoWebhookEvent);
    print(response);
} on DioException catch (e) {
    print('Exception when calling WebhooksApi->receiveMercadoPagoWebhook: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xSignature** | **String**| `ts=<epoch>,v1=<hmac hex>`. | 
 **xRequestId** | **String**|  | 
 **mercadoPagoWebhookEvent** | [**MercadoPagoWebhookEvent**](MercadoPagoWebhookEvent.md)|  | 

### Return type

[**WebhookAck**](WebhookAck.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

