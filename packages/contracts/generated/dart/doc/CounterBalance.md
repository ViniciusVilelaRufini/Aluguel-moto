# volti_api.model.CounterBalance

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rentalId** | **String** |  | 
**customerId** | **String** |  | 
**customerFirstName** | **String** | Só o primeiro nome. | [optional] 
**rentalStatus** | [**RentalStatus**](RentalStatus.md) |  | 
**debtTotalCents** | **int** | Soma de `outstandingCents` das dívidas em aberto. | 
**debts** | [**BuiltList&lt;CounterDebt&gt;**](CounterDebt.md) |  | 
**deposits** | [**BuiltList&lt;CounterDepositBalance&gt;**](CounterDepositBalance.md) | Cauções de balcão do cliente com saldo disponível. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


