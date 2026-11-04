# volti_api.model.CounterDepositBalance

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**depositId** | **String** |  | 
**rentalId** | **String** |  | [optional] 
**method** | [**DepositMethod**](DepositMethod.md) |  | 
**status** | [**DepositStatus**](DepositStatus.md) |  | 
**amountCents** | **int** |  | 
**capturedCents** | **int** |  | 
**refundedCents** | **int** |  | 
**availableCents** | **int** | `amountCents` − `capturedCents` − `refundedCents`. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


