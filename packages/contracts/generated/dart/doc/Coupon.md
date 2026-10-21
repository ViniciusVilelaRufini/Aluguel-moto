# volti_api.model.Coupon

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**code** | **String** |  | 
**description** | **String** |  | [optional] 
**discountType** | [**DiscountType**](DiscountType.md) |  | 
**percentOff** | **int** | Quando `discountType = percent`. | [optional] 
**amountOffCents** | **int** | Quando `discountType = fixed`. | [optional] 
**planCodes** | [**BuiltList&lt;PlanCode&gt;**](PlanCode.md) | Planos elegíveis (vazio = todos). | [optional] 
**validFrom** | [**DateTime**](DateTime.md) |  | [optional] 
**validUntil** | [**DateTime**](DateTime.md) |  | [optional] 
**maxRedemptions** | **int** |  | [optional] 
**maxRedemptionsPerCustomer** | **int** |  | [optional] 
**redemptions** | **int** |  | 
**active** | **bool** |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


