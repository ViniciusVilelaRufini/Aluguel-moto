# volti_api.model.Payment

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**customerId** | **String** |  | 
**rentalId** | **String** |  | [optional] 
**depositId** | **String** |  | [optional] 
**subscriptionId** | **String** |  | [optional] 
**kind** | [**PaymentKind**](PaymentKind.md) |  | 
**method** | [**PaymentMethod**](PaymentMethod.md) |  | 
**status** | [**PaymentStatus**](PaymentStatus.md) |  | 
**amountCents** | **int** |  | 
**refundedCents** | **int** |  | 
**cardLast4** | **String** |  | [optional] 
**failureReason** | **String** |  | [optional] 
**providerPaymentId** | **String** | staff. ID no gateway. | [optional] 
**receiptUrl** | **String** |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


