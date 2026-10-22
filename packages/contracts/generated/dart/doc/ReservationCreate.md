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
**cardId** | **String** | Cartão da caução com `depositMethod: card` (ausente = cartão padrão). | [optional] 
**couponCode** | **String** | Cupom aplicado ao plano na entrega. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


