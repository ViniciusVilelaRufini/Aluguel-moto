# volti_api.model.Rental

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**customerId** | **String** |  | 
**vehicleId** | **String** | Moto atual (muda após troca). | 
**vehicleCode** | **String** |  | 
**planCode** | [**PlanCode**](PlanCode.md) |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**status** | [**RentalStatus**](RentalStatus.md) |  | 
**startedAt** | [**DateTime**](DateTime.md) |  | 
**pausedAt** | [**DateTime**](DateTime.md) | Início da pausa atual. | [optional] 
**endedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**elapsedSeconds** | **int** |  | 
**pausedSeconds** | **int** | Total em pausa. | 
**costCents** | **int** | Valor parcial estimado durante o aluguel; valor final depois do encerramento. | 
**breakdown** | [**PriceBreakdown**](PriceBreakdown.md) |  | [optional] 
**couponCode** | **String** |  | [optional] 
**depositId** | **String** |  | 
**insurancePolicyId** | **String** |  | [optional] 
**paymentId** | **String** | Pagamento da liquidação. | [optional] 
**endZoneId** | **String** |  | [optional] 
**returnPhotoObjectKey** | **String** |  | [optional] 
**forceEndReason** | **String** | staff. | [optional] 
**forcedEndById** | **String** | staff. | [optional] 
**rating** | **int** |  | [optional] 
**speedLimitKmh** | **int** | Limite em vigor agora. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


