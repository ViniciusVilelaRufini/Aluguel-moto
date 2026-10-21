# volti_api.model.WalletEntry

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**type** | [**WalletEntryType**](WalletEntryType.md) |  | 
**amountCents** | **int** | Positivo = crédito; negativo = débito. | 
**minutes** | **int** | Variação de minutos (pacotes). | [optional] 
**balanceAfterCents** | **int** |  | 
**description** | **String** |  | 
**rentalId** | **String** |  | [optional] 
**paymentId** | **String** |  | [optional] 
**createdById** | **String** | staff que fez o ajuste. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


