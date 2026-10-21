# volti_api.model.Deposit

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**rentalId** | **String** | Aluguel (ou o ID já reservado para ele no fluxo Pix). | [optional] 
**customerId** | **String** |  | 
**method** | [**DepositMethod**](DepositMethod.md) |  | 
**status** | [**DepositStatus**](DepositStatus.md) |  | 
**amountCents** | **int** |  | 
**capturedCents** | **int** |  | [optional] 
**pix** | [**PixCharge**](PixCharge.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


