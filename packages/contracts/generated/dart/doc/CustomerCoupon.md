# volti_api.model.CustomerCoupon

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
**percentOff** | **int** |  | [optional] 
**amountOffCents** | **int** |  | [optional] 
**planCodes** | [**BuiltList&lt;PlanCode&gt;**](PlanCode.md) | Planos elegíveis (vazio = todos). | [optional] 
**validUntil** | [**DateTime**](DateTime.md) |  | [optional] 
**usesRemaining** | **int** | Usos que ainda restam para o cliente (ausente = sem limite). | [optional] 
**status** | [**CustomerCouponStatus**](CustomerCouponStatus.md) |  | 
**source_** | [**CustomerCouponSource**](CustomerCouponSource.md) |  | 
**addedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


