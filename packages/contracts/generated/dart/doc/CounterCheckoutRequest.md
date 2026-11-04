# volti_api.model.CounterCheckoutRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**planCode** | [**CounterPlanCode**](CounterPlanCode.md) |  | 
**quantity** | **int** | Quantidade do período: diária 1–30, semana 1–4, mês 1–3. | [optional] [default to 1]
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | 
**contractPhotoKeys** | **BuiltList&lt;String&gt;** | Fotos do contrato assinado: 1 a 4 chaves de `POST /handovers/uploads` com `purpose: contract`. Nenhuma → `422` `contract-photos-required`. | [optional] 
**payment** | [**CounterPaymentInput**](CounterPaymentInput.md) |  | 
**deposit** | [**CounterDepositInput**](CounterDepositInput.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


