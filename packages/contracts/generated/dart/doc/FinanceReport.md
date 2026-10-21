# volti_api.model.FinanceReport

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**from** | [**DateTime**](DateTime.md) |  | 
**to** | [**DateTime**](DateTime.md) |  | 
**revenueByPlan** | [**BuiltList&lt;PlanRevenue&gt;**](PlanRevenue.md) |  | 
**totalRevenueCents** | **int** |  | 
**depositsHeldCount** | **int** | Cauções retidas agora. | 
**depositsHeldCents** | **int** |  | 
**delinquentCustomers** | **int** |  | 
**delinquentAmountCents** | **int** |  | 
**refundsCents** | **int** |  | 
**walletTopUpsCents** | **int** |  | [optional] 
**insurancePremiumsCents** | **int** |  | 
**insurancePayoutsCents** | **int** | Repasses à seguradora. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


