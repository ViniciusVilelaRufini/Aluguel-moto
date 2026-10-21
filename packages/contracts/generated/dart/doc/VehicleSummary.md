# volti_api.model.VehicleSummary

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**code** | **String** |  | 
**model** | **String** |  | 
**status** | [**VehicleStatus**](VehicleStatus.md) |  | 
**lat** | **double** |  | 
**lng** | **double** |  | 
**batteryPct** | **int** |  | 
**estimatedRangeKm** | **double** | Autonomia estimada com a carga atual. | 
**distanceM** | **int** | Distância até o ponto da busca (só em `nearby`). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


