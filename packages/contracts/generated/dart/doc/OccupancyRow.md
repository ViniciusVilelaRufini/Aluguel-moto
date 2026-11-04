# volti_api.model.OccupancyRow

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**periodStart** | [**DateTime**](DateTime.md) |  | 
**vehiclesTotal** | **int** |  | 
**vehiclesRented** | **int** | Média de motos em aluguel no período (tempo em aluguel ÷ duração do período), arredondada. | 
**occupancyPct** | **double** | Tempo em aluguel ÷ tempo de frota no período (motos cadastradas × duração), em %, uma casa decimal. O período é cortado em `from`, `to` e agora (o trecho futuro não conta). Aluguel em aberto (`active`, `paused`, `ending`) conta até agora: é a mesma definição de `DashboardSummary.occupancyPct` (motos com aluguel em aberto ÷ frota) integrada no tempo.  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


