# volti_api.model.InsurancePolicy

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**rentalId** | **String** |  | 
**customerId** | **String** |  | 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**premiumCents** | **int** |  | 
**payoutCents** | **int** | Repasse à seguradora. | [optional] 
**status** | [**PolicyStatus**](PolicyStatus.md) |  | 
**providerPolicyId** | **String** |  | [optional] 
**issuedAt** | [**DateTime**](DateTime.md) |  | 
**canceledAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


