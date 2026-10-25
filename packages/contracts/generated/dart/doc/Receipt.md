# volti_api.model.Receipt

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rentalId** | **String** |  | 
**number** | **String** | Número do recibo. | 
**issuedAt** | [**DateTime**](DateTime.md) |  | 
**customerName** | **String** |  | [optional] 
**vehicleCode** | **String** |  | 
**planCode** | [**PlanCode**](PlanCode.md) |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**startedAt** | [**DateTime**](DateTime.md) |  | 
**endedAt** | [**DateTime**](DateTime.md) |  | 
**durationSeconds** | **int** |  | 
**breakdown** | [**PriceBreakdown**](PriceBreakdown.md) |  | 
**paymentId** | **String** | Pagamento do aluguel (o `id` de `POST /payments/{id}/retry` quando `paymentStatus` é `pending`). | [optional] 
**paymentStatus** | [**ReceiptPaymentStatus**](ReceiptPaymentStatus.md) |  | [optional] 
**paymentMethod** | [**PaymentMethod**](PaymentMethod.md) | Forma do valor recebido (a da quitação, quando a dívida foi paga depois). Ausente enquanto não pago e na quitação manual. | [optional] 
**cardLast4** | **String** |  | [optional] 
**depositUsedCents** | **int** | Parte da caução usada para abater o valor (caução capturada). Ausente quando a caução não foi usada. | [optional] 
**depositReleasedCents** | **int** | Parte da caução devolvida/liberada ao cliente depois do fechamento. | [optional] 
**amountDueCents** | **int** | Só com `paymentStatus` `pending`: saldo a pagar (o `outstandingCents` do pagamento). | [optional] 
**pdfUrl** | **String** | URL pré-assinada do PDF (expira em 15 min). Só com `paymentStatus` `paid`. | [optional] 
**invoiceNumber** | **String** | Número da NFS-e, quando emitida. | [optional] 
**track** | [**BuiltList&lt;TrackPoint&gt;**](TrackPoint.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


