# volti_api.model.Inspection

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**fieldTaskId** | **String** |  | 
**vehicleId** | **String** |  | 
**inspectorId** | **String** |  | 
**brakes** | [**ChecklistItem**](ChecklistItem.md) |  | 
**tires** | [**ChecklistItem**](ChecklistItem.md) |  | 
**lights** | [**ChecklistItem**](ChecklistItem.md) |  | 
**bell** | [**ChecklistItem**](ChecklistItem.md) |  | 
**speedLimiter** | [**SpeedLimiterCheck**](SpeedLimiterCheck.md) |  | 
**photoObjectKeys** | **BuiltList&lt;String&gt;** |  | 
**notes** | **String** |  | [optional] 
**passed** | **bool** | Todos os itens ok. | 
**maintenanceTaskId** | **String** | Manutenção aberta automaticamente (limitador acima de 32 km/h). | [optional] 
**alertId** | **String** | Alerta `speed_limiter_noncompliant` aberto automaticamente. | [optional] 
**recordedAt** | [**DateTime**](DateTime.md) |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


