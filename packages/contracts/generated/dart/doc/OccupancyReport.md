# volti_api.model.OccupancyReport

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**from** | [**DateTime**](DateTime.md) |  | 
**to** | [**DateTime**](DateTime.md) |  | 
**groupBy** | [**ReportGroupBy**](ReportGroupBy.md) |  | 
**occupancyPct** | **double** | Ocupação do intervalo inteiro (`from`–`to`, até agora), ponderada pelo tempo: soma do tempo em aluguel ÷ soma do tempo de frota. Use esta, não a média simples das linhas. | [optional] 
**rows** | [**BuiltList&lt;OccupancyRow&gt;**](OccupancyRow.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


