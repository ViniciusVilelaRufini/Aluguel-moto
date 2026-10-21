# volti_api.model.MaintenanceTaskCreate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**vehicleId** | **String** |  | 
**kind** | [**MaintenanceKind**](MaintenanceKind.md) |  | 
**title** | **String** |  | 
**description** | **String** |  | [optional] 
**scheduledFor** | [**DateTime**](DateTime.md) |  | [optional] 
**createFieldTask** | **bool** | Cria também uma tarefa de campo `maintenance`. | [optional] [default to false]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


