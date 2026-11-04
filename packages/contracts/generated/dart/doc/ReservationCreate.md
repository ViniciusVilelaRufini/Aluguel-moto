# volti_api.model.ReservationCreate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**vehicleId** | **String** |  | 
**depotId** | **String** |  | [optional] 
**pickupMode** | [**PickupMode**](PickupMode.md) |  | [optional] 
**pickupAt** | [**DateTime**](DateTime.md) | Obrigatório em `scheduled`: dentro do funcionamento e de `maxScheduleDays`. | [optional] 
**planCode** | [**PlanCode**](PlanCode.md) |  | [optional] 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | [optional] 
**depositMethod** | [**DepositMethod**](DepositMethod.md) |  | [optional] 
**cardId** | **String** | Ignorado (apps antigos): a pré-reserva não tem caução. | [optional] 
**couponCode** | **String** | Ignorado (apps antigos): cupom não vale no balcão nesta fase. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


