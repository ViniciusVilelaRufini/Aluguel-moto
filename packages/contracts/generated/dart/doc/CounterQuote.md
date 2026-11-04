# volti_api.model.CounterQuote

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**planCode** | [**CounterPlanCode**](CounterPlanCode.md) |  | 
**quantity** | **int** |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**planUnitCents** | **int** | Preço de uma unidade do plano. | 
**planCents** | **int** | `planUnitCents` × `quantity`. | 
**insuranceCents** | **int** | Prêmio único do seguro (não multiplica pela quantidade). | 
**totalCents** | **int** | `planCents` + `insuranceCents`: o valor a receber no balcão. | 
**excessDayCents** | **int** | Preço de cada dia iniciado depois do período pré-pago (diária do plano `day`). | 
**periodDays** | **int** | Dias do período pré-pago (unidade × `quantity`). | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


