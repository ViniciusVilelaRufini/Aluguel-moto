# volti_api.model.Subscription

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**planCode** | [**SubscriptionPlanCode**](SubscriptionPlanCode.md) |  | 
**status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  | 
**cardId** | **String** |  | [optional] 
**priceCents** | **int** |  | 
**currentPeriodStart** | [**DateTime**](DateTime.md) |  | 
**currentPeriodEnd** | [**DateTime**](DateTime.md) |  | 
**cancelAtPeriodEnd** | **bool** |  | [optional] 
**canceledAt** | [**DateTime**](DateTime.md) |  | [optional] 
**nextChargeAt** | [**DateTime**](DateTime.md) | Próxima cobrança recorrente (ausente se cancelada ou pausada). | [optional] 
**nextChargeCents** | **int** |  | [optional] 
**cardBrand** | **String** | Bandeira do cartão da recorrência. | [optional] 
**cardLast4** | **String** |  | [optional] 
**lastPaymentStatus** | [**PaymentStatus**](PaymentStatus.md) |  | [optional] 
**lastPaymentAt** | [**DateTime**](DateTime.md) |  | [optional] 
**pausedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**pauseEndsAt** | [**DateTime**](DateTime.md) | Retomada automática. | [optional] 
**maxPauseDays** | **int** | Dias por pausa (3 no semanal, 7 no mensal). | [optional] 
**pausesRemainingInPeriod** | **int** |  | [optional] 
**assignedVehicleId** | **String** | Moto fixa do plano. | [optional] 
**assignedVehicle** | [**VehicleSummary**](VehicleSummary.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


