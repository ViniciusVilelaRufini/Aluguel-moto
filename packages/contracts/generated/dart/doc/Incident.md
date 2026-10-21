# volti_api.model.Incident

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**customerId** | **String** |  | [optional] 
**rentalId** | **String** |  | [optional] 
**vehicleId** | **String** |  | [optional] 
**category** | [**IncidentCategory**](IncidentCategory.md) |  | 
**status** | [**IncidentStatus**](IncidentStatus.md) |  | 
**description** | **String** |  | 
**photoObjectKeys** | **BuiltList&lt;String&gt;** |  | [optional] 
**lat** | **double** |  | [optional] 
**lng** | **double** |  | [optional] 
**resolutionNote** | **String** |  | [optional] 
**createdById** | **String** |  | [optional] 
**createdByType** | [**ActorType**](ActorType.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


