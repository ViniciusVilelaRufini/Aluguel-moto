# volti_api.model.Battery

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**serial** | **String** |  | 
**chargePct** | **int** |  | 
**cycleCount** | **int** | Ciclos de carga (+1 a cada instalação numa moto). | 
**status** | [**BatteryStatus**](BatteryStatus.md) |  | 
**vehicleId** | **String** |  | [optional] 
**vehicleCode** | **String** |  | [optional] 
**holderId** | **String** | Operador com a bateria na van. | [optional] 
**stationId** | **String** |  | [optional] 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


