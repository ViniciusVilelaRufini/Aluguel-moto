# volti_api.model.FieldTask

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**type** | [**FieldTaskType**](FieldTaskType.md) |  | 
**status** | [**FieldTaskStatus**](FieldTaskStatus.md) |  | 
**priority** | [**TaskPriority**](TaskPriority.md) |  | 
**vehicleId** | **String** |  | 
**vehicleCode** | **String** |  | 
**vehicleLat** | **double** | Última posição conhecida da moto. | [optional] 
**vehicleLng** | **double** |  | [optional] 
**vehicleBatteryPct** | **int** |  | [optional] 
**targetLat** | **double** | Destino (reposicionar). | [optional] 
**targetLng** | **double** |  | [optional] 
**assigneeId** | **String** |  | [optional] 
**assigneeName** | **String** |  | [optional] 
**notes** | **String** |  | [optional] 
**dueAt** | [**DateTime**](DateTime.md) |  | [optional] 
**maintenanceTaskId** | **String** |  | [optional] 
**createdById** | **String** |  | [optional] 
**completionNotes** | **String** |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 
**startedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**completedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


