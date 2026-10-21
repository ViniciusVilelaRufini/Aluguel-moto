# volti_api.model.VehicleCommand

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**vehicleId** | **String** |  | 
**type** | [**CommandType**](CommandType.md) |  | 
**status** | [**CommandStatus**](CommandStatus.md) |  | 
**statusReason** | [**CommandStatusReason**](CommandStatusReason.md) |  | [optional] 
**reason** | **String** | Motivo informado por quem pediu. | 
**speedLimitKmh** | **int** |  | [optional] 
**on_** | **bool** |  | [optional] 
**requestedById** | **String** |  | [optional] 
**requestedByName** | **String** |  | [optional] 
**requestedByType** | [**ActorType**](ActorType.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 
**confirmedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


