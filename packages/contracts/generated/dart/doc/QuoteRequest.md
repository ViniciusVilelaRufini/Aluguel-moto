# volti_api.model.QuoteRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**planCode** | [**PlanCode**](PlanCode.md) |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**couponCode** | **String** |  | [optional] 
**estimatedMinutes** | **int** | Duração prevista para estimar o valor (padrão 30 no plano `minute`, 1 unidade nos demais). | [optional] 
**vehicleId** | **String** | Usa o preço por minuto do modelo da moto (plano `minute`). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


