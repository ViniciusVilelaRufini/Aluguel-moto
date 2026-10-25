# volti_api.model.StartRentalRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**vehicleId** | **String** |  | 
**planCode** | [**PlanCode**](PlanCode.md) |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**depositMethod** | [**DepositMethod**](DepositMethod.md) |  | 
**couponCode** | **String** |  | [optional] 
**cardId** | **String** | Cartão para a caução e a cobrança final (padrão do cliente se ausente). | [optional] 
**depositId** | **String** | Caução Pix já paga (segunda chamada do fluxo Pix). | [optional] 
**useWalletCredits** | **bool** | Ignorado (R2-01, Task 16 das lacunas): no fechamento a carteira sempre abate primeiro (ordem carteira → caução → cartão → dívida), com a linha `wallet` no `breakdown`.  | [optional] [default to false]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


