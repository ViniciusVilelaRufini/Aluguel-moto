# volti_api.model.Wallet

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**balanceCents** | **int** | Soma dos lançamentos em reais. | 
**minutesBalance** | **int** | Minutos de pacotes ainda disponíveis. | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 
**topUpMinCents** | **int** | Menor recarga de valor livre aceita agora. | [optional] 
**topUpMaxCents** | **int** | Maior recarga de valor livre aceita agora. | [optional] 
**suggestedTopUpAmountsCents** | **BuiltList&lt;int&gt;** | Valores sugeridos para os atalhos da tela de recarga (centavos). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


