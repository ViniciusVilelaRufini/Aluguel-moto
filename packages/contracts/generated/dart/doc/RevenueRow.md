# volti_api.model.RevenueRow

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**periodStart** | [**DateTime**](DateTime.md) |  | 
**planCode** | [**PlanCode**](PlanCode.md) |  | [optional] 
**rentals** | **int** |  | 
**grossCents** | **int** |  | 
**discountCents** | **int** |  | 
**insuranceCents** | **int** |  | 
**feesCents** | **int** |  | 
**walletCents** | **int** | Créditos da carteira usados nos aluguéis. `netCents` = `grossCents` − `discountCents` + `insuranceCents` + `feesCents` − `walletCents`. | [optional] 
**refundsCents** | **int** |  | [optional] 
**netCents** | **int** |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


