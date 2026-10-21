# volti_api.model.Subscription

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**planCode** | [**SubscriptionPlanCode**](SubscriptionPlanCode.md) |  | 
**status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  | 
**cardId** | **String** |  | [optional] 
**priceCents** | **int** |  | 
**currentPeriodStart** | [**DateTime**](DateTime.md) |  | 
**currentPeriodEnd** | [**DateTime**](DateTime.md) |  | 
**cancelAtPeriodEnd** | **bool** |  | [optional] 
**canceledAt** | [**DateTime**](DateTime.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


