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
**paymentMethod** | [**PaymentMethod**](PaymentMethod.md) |  | [optional] 
**cardLast4** | **String** |  | [optional] 
**pdfUrl** | **String** | URL pré-assinada do PDF (expira em 15 min). | [optional] 
**invoiceNumber** | **String** | Número da NFS-e, quando emitida. | [optional] 
**track** | [**BuiltList&lt;TrackPoint&gt;**](TrackPoint.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


