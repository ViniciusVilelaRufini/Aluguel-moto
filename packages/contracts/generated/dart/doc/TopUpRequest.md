# volti_api.model.TopUpRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amountCents** | **int** | Crédito em reais (R$ 10 a R$ 1.000). Fora de `Wallet.topUpMinCents..topUpMaxCents` → `422` `top-up-amount-out-of-range`. | [optional] 
**packageId** | **String** |  | [optional] 
**method** | [**TopUpMethod**](TopUpMethod.md) |  | 
**cardId** | **String** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


