# volti_api.model.ReferralReward

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**refereeName** | **String** | Primeiro nome do amigo (LGPD). | 
**status** | [**ReferralRewardStatus**](ReferralRewardStatus.md) |  | 
**amountCents** | **int** |  | 
**walletEntryId** | **String** | Lançamento `bonus` (quando `granted`). | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**grantedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


