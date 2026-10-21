# volti_api.model.CouponInput

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **String** |  | 
**description** | **String** |  | [optional] 
**discountType** | [**DiscountType**](DiscountType.md) |  | 
**percentOff** | **int** |  | [optional] 
**amountOffCents** | **int** |  | [optional] 
**planCodes** | [**BuiltList&lt;PlanCode&gt;**](PlanCode.md) |  | [optional] 
**validFrom** | [**DateTime**](DateTime.md) |  | [optional] 
**validUntil** | [**DateTime**](DateTime.md) |  | [optional] 
**maxRedemptions** | **int** |  | [optional] 
**maxRedemptionsPerCustomer** | **int** |  | [optional] 
**active** | **bool** |  | [optional] [default to true]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


