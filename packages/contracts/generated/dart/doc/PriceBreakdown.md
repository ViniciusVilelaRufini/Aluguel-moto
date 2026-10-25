# volti_api.model.PriceBreakdown

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**lines** | [**BuiltList&lt;PriceLine&gt;**](PriceLine.md) |  | 
**subtotalCents** | **int** | Desbloqueio + tempo + pausa. | 
**discountCents** | **int** |  | 
**insuranceCents** | **int** |  | 
**feesCents** | **int** |  | 
**walletAppliedCents** | **int** | Saldo da carteira abatido no fechamento (R2-01: a carteira abate primeiro). `totalCents` já vem descontado. | [optional] 
**totalCents** | **int** |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


