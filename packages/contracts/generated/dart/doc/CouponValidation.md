# volti_api.model.CouponValidation

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **String** |  | 
**valid** | **bool** |  | 
**message** | **String** | Motivo da recusa (pt-BR) ou \"Cupom válido.\". | [optional] 
**description** | **String** |  | [optional] 
**discountType** | [**DiscountType**](DiscountType.md) |  | [optional] 
**percentOff** | **int** |  | [optional] 
**amountOffCents** | **int** |  | [optional] 
**planCodes** | [**BuiltList&lt;PlanCode&gt;**](PlanCode.md) |  | [optional] 
**validUntil** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


