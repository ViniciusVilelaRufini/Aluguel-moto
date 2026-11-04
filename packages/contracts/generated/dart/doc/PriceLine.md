# volti_api.model.PriceLine

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **String** | `unlock`, `time`, `pause`, `insurance`, `coupon`, `fee:<code>`, `subscription_covered`, `minute_package` (minutos do pacote da carteira abatidos da linha `time`, negativo), `wallet`. Aluguel do balcão: `counter_plan` (plano pré-pago × quantidade), `excess_day` (excedente por dia iniciado depois de `prepaidUntil`), `insurance_<coverage>` e `counter_prepaid` (\"Pago no balcão\", negativo). | 
**description** | **String** |  | 
**quantity** | **int** | Minutos, horas ou dias cobrados. | [optional] 
**unitCents** | **int** |  | [optional] 
**amountCents** | **int** | Negativo para descontos. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


